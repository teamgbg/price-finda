import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { retailers, retailerListings, priceHistory, scrapeJobs } from '../../db/schema'
import { batchScrapeUrls } from '../../lib/scraper'
import { inngest } from '../client'

// Daily price check function
// Runs every day at 6am AEDT (which is 7pm UTC during daylight saving, 8pm UTC otherwise)
export const checkPrices = inngest.createFunction(
  { id: 'check-prices-daily', name: 'Daily Price Check' },
  { cron: '0 19 * * *' }, // 7pm UTC = 6am AEDT
  async ({ step }) => {
    // Step 1: Create a scrape job record
    const job = await step.run('create-job', async () => {
      const [newJob] = await db
        .insert(scrapeJobs)
        .values({
          status: 'running',
          startedAt: new Date(),
        })
        .returning()
      return newJob
    })

    // Step 2: Get all active retailer listings with their retailer info
    const listings = await step.run('get-listings', async () => {
      const result = await db
        .select({
          id: retailerListings.id,
          retailerUrl: retailerListings.retailerUrl,
          currentPriceCents: retailerListings.currentPriceCents,
          retailerId: retailerListings.retailerId,
          productId: retailerListings.productId,
        })
        .from(retailerListings)
        .where(eq(retailerListings.isActive, true))

      // Get retailer slugs
      const retailerData = await db
        .select({ id: retailers.id, slug: retailers.slug })
        .from(retailers)

      const retailerMap = new Map(retailerData.map(r => [r.id, r.slug]))

      return result.map(listing => ({
        ...listing,
        retailerSlug: retailerMap.get(listing.retailerId) || 'unknown',
      }))
    })

    if (listings.length === 0) {
      await step.run('complete-job-empty', async () => {
        await db
          .update(scrapeJobs)
          .set({
            status: 'completed',
            completedAt: new Date(),
            productsChecked: 0,
          })
          .where(eq(scrapeJobs.id, job.id))
      })

      return { message: 'No active listings to check', checked: 0, changed: 0 }
    }

    // Step 3: Scrape all retailer pages
    const scrapedData = await step.run('scrape-prices', async () => {
      const listingsToScrape = listings.map(l => ({
        url: l.retailerUrl,
        retailerSlug: l.retailerSlug,
        listingId: l.id,
      }))

      const results = await batchScrapeUrls(listingsToScrape)
      return Object.fromEntries(results)
    })

    // Step 4: Update prices and record history
    const updates = await step.run('update-prices', async () => {
      let priceChanges = 0
      const errors: Array<{ listingId: string; error: string }> = []
      const now = new Date()

      for (const listing of listings) {
        const scraped = scrapedData[listing.id]
        if (!scraped) continue

        if (scraped.error) {
          errors.push({ listingId: listing.id, error: scraped.error })
          continue
        }

        const newPrice = scraped.salePriceCents || scraped.priceCents
        const oldPrice = listing.currentPriceCents

        // Check if price changed
        const priceChanged = newPrice && oldPrice && newPrice !== oldPrice

        if (priceChanged) {
          priceChanges++
        }

        // Update the listing
        await db
          .update(retailerListings)
          .set({
            currentPriceCents: scraped.priceCents,
            salePriceCents: scraped.salePriceCents,
            wasOnSale: scraped.salePriceCents !== null,
            inStock: scraped.inStock,
            lastChecked: now,
            lastPriceChange: priceChanged ? now : undefined,
            updatedAt: now,
          })
          .where(eq(retailerListings.id, listing.id))

        // Record price history
        if (newPrice) {
          await db.insert(priceHistory).values({
            listingId: listing.id,
            priceCents: newPrice,
            wasOnSale: scraped.salePriceCents !== null,
            inStock: scraped.inStock,
            recordedAt: now,
          })
        }
      }

      return { priceChanges, errors }
    })

    // Step 5: Complete the job
    await step.run('complete-job', async () => {
      await db
        .update(scrapeJobs)
        .set({
          status: 'completed',
          completedAt: new Date(),
          productsChecked: listings.length,
          priceChanges: updates.priceChanges,
          errors: updates.errors.length > 0 ? updates.errors : null,
        })
        .where(eq(scrapeJobs.id, job.id))
    })

    return {
      message: `Price check complete. Checked ${listings.length} listings, ${updates.priceChanges} price changes detected.`,
      checked: listings.length,
      changed: updates.priceChanges,
      errors: updates.errors.length,
    }
  }
)

// Manual price check for a single product
export const checkSingleProduct = inngest.createFunction(
  { id: 'check-single-product', name: 'Check Single Product Price' },
  { event: 'product/check-price' },
  async ({ event, step }) => {
    const { productId } = event.data

    // Get all listings for this product
    const listings = await step.run('get-product-listings', async () => {
      const result = await db
        .select({
          id: retailerListings.id,
          retailerUrl: retailerListings.retailerUrl,
          currentPriceCents: retailerListings.currentPriceCents,
          retailerId: retailerListings.retailerId,
        })
        .from(retailerListings)
        .where(eq(retailerListings.productId, productId))

      const retailerData = await db
        .select({ id: retailers.id, slug: retailers.slug })
        .from(retailers)

      const retailerMap = new Map(retailerData.map(r => [r.id, r.slug]))

      return result.map(listing => ({
        ...listing,
        retailerSlug: retailerMap.get(listing.retailerId) || 'unknown',
      }))
    })

    if (listings.length === 0) {
      return { productId, error: 'No listings found for this product' }
    }

    // Scrape all listings
    const scrapedData = await step.run('scrape-product-listings', async () => {
      const listingsToScrape = listings.map(l => ({
        url: l.retailerUrl,
        retailerSlug: l.retailerSlug,
        listingId: l.id,
      }))

      const results = await batchScrapeUrls(listingsToScrape)
      return Object.fromEntries(results)
    })

    // Update prices
    const result = await step.run('update-product-prices', async () => {
      let priceChanges = 0
      const now = new Date()

      for (const listing of listings) {
        const scraped = scrapedData[listing.id]
        if (!scraped || scraped.error) continue

        const newPrice = scraped.salePriceCents || scraped.priceCents
        const priceChanged = newPrice && listing.currentPriceCents && newPrice !== listing.currentPriceCents

        if (priceChanged) priceChanges++

        await db
          .update(retailerListings)
          .set({
            currentPriceCents: scraped.priceCents,
            salePriceCents: scraped.salePriceCents,
            wasOnSale: scraped.salePriceCents !== null,
            inStock: scraped.inStock,
            lastChecked: now,
            lastPriceChange: priceChanged ? now : undefined,
            updatedAt: now,
          })
          .where(eq(retailerListings.id, listing.id))

        if (newPrice) {
          await db.insert(priceHistory).values({
            listingId: listing.id,
            priceCents: newPrice,
            wasOnSale: scraped.salePriceCents !== null,
            inStock: scraped.inStock,
            recordedAt: now,
          })
        }
      }

      return { priceChanges }
    })

    return {
      productId,
      listingsChecked: listings.length,
      priceChanged: result.priceChanges > 0,
      priceChanges: result.priceChanges,
    }
  }
)

// Manual trigger for full price check (for testing or manual refresh)
export const manualPriceCheck = inngest.createFunction(
  { id: 'manual-price-check', name: 'Manual Full Price Check' },
  { event: 'prices/check-all' },
  async ({ event, step }) => {
    // This is a wrapper that triggers the same logic as daily check
    // It will be picked up by Inngest and run the full scraping process

    // Get all active retailer listings
    const listings = await step.run('get-all-listings', async () => {
      const result = await db
        .select({
          id: retailerListings.id,
          retailerUrl: retailerListings.retailerUrl,
          currentPriceCents: retailerListings.currentPriceCents,
          retailerId: retailerListings.retailerId,
        })
        .from(retailerListings)
        .where(eq(retailerListings.isActive, true))

      const retailerData = await db
        .select({ id: retailers.id, slug: retailers.slug })
        .from(retailers)

      const retailerMap = new Map(retailerData.map(r => [r.id, r.slug]))

      return result.map(listing => ({
        ...listing,
        retailerSlug: retailerMap.get(listing.retailerId) || 'unknown',
      }))
    })

    if (listings.length === 0) {
      return { message: 'No listings to check', checked: 0 }
    }

    // Scrape and update prices
    const scrapedData = await step.run('manual-scrape', async () => {
      const listingsToScrape = listings.map(l => ({
        url: l.retailerUrl,
        retailerSlug: l.retailerSlug,
        listingId: l.id,
      }))
      const results = await batchScrapeUrls(listingsToScrape)
      return Object.fromEntries(results)
    })

    const updates = await step.run('manual-update', async () => {
      let priceChanges = 0
      const now = new Date()

      for (const listing of listings) {
        const scraped = scrapedData[listing.id]
        if (!scraped || scraped.error) continue

        const newPrice = scraped.salePriceCents || scraped.priceCents
        const priceChanged = newPrice && listing.currentPriceCents && newPrice !== listing.currentPriceCents

        if (priceChanged) priceChanges++

        await db
          .update(retailerListings)
          .set({
            currentPriceCents: scraped.priceCents,
            salePriceCents: scraped.salePriceCents,
            inStock: scraped.inStock,
            lastChecked: now,
            updatedAt: now,
          })
          .where(eq(retailerListings.id, listing.id))

        if (newPrice) {
          await db.insert(priceHistory).values({
            listingId: listing.id,
            priceCents: newPrice,
            wasOnSale: scraped.salePriceCents !== null,
            inStock: scraped.inStock,
            recordedAt: now,
          })
        }
      }

      return { priceChanges }
    })

    return {
      message: `Manual check complete. Checked ${listings.length} listings.`,
      checked: listings.length,
      changed: updates.priceChanges,
    }
  }
)
