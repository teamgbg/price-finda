import puppeteer from 'puppeteer-core'
import { config } from 'dotenv'
config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq, and } from 'drizzle-orm'
import { products, retailers, retailerListings, priceHistory } from './src/db/schema.ts'

// Bright Data Scraping Browser with Australian geo-targeting
const BRIGHTDATA_CUSTOMER = process.env.BRIGHTDATA_CUSTOMER || 'hl_98a67688'
const BRIGHTDATA_ZONE = process.env.BRIGHTDATA_ZONE || 'pricedinda'
const BRIGHTDATA_PASSWORD = process.env.BRIGHTDATA_PASSWORD || 'tf574lc1fotk'
const AUTH = `brd-customer-${BRIGHTDATA_CUSTOMER}-zone-${BRIGHTDATA_ZONE}-country-au:${BRIGHTDATA_PASSWORD}`
const SBR_WS = `wss://${AUTH}@brd.superproxy.io:9222`

// Database
const sql = neon(process.env.DATABASE_URL)
const db = drizzle(sql)

// Retailer configs
const RETAILERS = {
  officeworks: {
    name: 'Officeworks',
    categoryUrl: 'https://www.officeworks.com.au/shop/officeworks/c/technology/laptops/chromebooks',
    productUrlPattern: /officeworks\.com\.au\/shop\/officeworks\/p\//,
  }
}

async function scrapeRetailer(retailerKey) {
  const config = RETAILERS[retailerKey]
  console.log(`\n=== Scraping ${config.name} ===`)
  console.log(`URL: ${config.categoryUrl}`)

  const browser = await puppeteer.connect({
    browserWSEndpoint: SBR_WS,
  })

  try {
    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(120000)

    await page.goto(config.categoryUrl, { waitUntil: 'networkidle2' })
    console.log('✓ Page loaded')

    // Wait for products to render
    await new Promise(r => setTimeout(r, 5000))

    // Extract products
    const products = await page.evaluate((urlPattern) => {
      const results = []

      // Find all product cards/items
      const text = document.body.innerText
      const lines = text.split('\n')

      // Parse the content looking for price + product name patterns
      let currentPrice = null

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        // Look for price lines like "$697.00"
        const priceMatch = line.match(/^\$(\d+(?:\.\d{2})?)$/)
        if (priceMatch) {
          currentPrice = parseFloat(priceMatch[1])
          continue
        }

        // Look for product names that follow prices
        if (currentPrice && line.length > 20 && line.includes('Chromebook')) {
          results.push({
            name: line,
            price: currentPrice,
          })
          currentPrice = null
        }
      }

      // Also try to extract product URLs
      const links = Array.from(document.querySelectorAll('a'))
        .map(a => ({ href: a.href, text: a.textContent?.trim() }))
        .filter(l => l.href.includes('/p/') && l.text?.includes('Chromebook'))

      // Match URLs to products
      for (const product of results) {
        const matchingLink = links.find(l =>
          l.text?.toLowerCase().includes(product.name.toLowerCase().slice(0, 30))
        )
        if (matchingLink) {
          product.url = matchingLink.href
        }
      }

      return results
    })

    console.log(`Found ${products.length} products:`)
    products.forEach(p => {
      console.log(`  $${p.price} - ${p.name.slice(0, 50)}...`)
      if (p.url) console.log(`    URL: ${p.url}`)
    })

    await page.close()
    return products

  } catch (err) {
    console.error('Error:', err.message)
    return []
  } finally {
    await browser.close()
  }
}

async function updatePrices(retailerSlug, scrapedProducts) {
  console.log(`\n=== Updating ${retailerSlug} prices in database ===`)

  // Get retailer
  const [retailer] = await db.select().from(retailers).where(eq(retailers.slug, retailerSlug))
  if (!retailer) {
    console.log(`Retailer ${retailerSlug} not found`)
    return
  }

  // Get all listings for this retailer
  const listings = await db.select({
    listingId: retailerListings.id,
    productId: retailerListings.productId,
    url: retailerListings.url,
    currentPrice: retailerListings.price,
    productName: products.name,
  })
  .from(retailerListings)
  .innerJoin(products, eq(retailerListings.productId, products.id))
  .where(eq(retailerListings.retailerId, retailer.id))

  console.log(`Found ${listings.length} existing listings`)

  let updated = 0
  for (const listing of listings) {
    // Try to match with scraped product
    const scraped = scrapedProducts.find(p =>
      listing.productName.toLowerCase().includes(p.name.toLowerCase().slice(0, 20)) ||
      p.name.toLowerCase().includes(listing.productName.toLowerCase().slice(0, 20))
    )

    if (scraped) {
      const newPriceCents = Math.round(scraped.price * 100)

      if (newPriceCents !== listing.currentPrice) {
        console.log(`  Updating ${listing.productName}: $${listing.currentPrice/100} → $${scraped.price}`)

        // Update listing
        await db.update(retailerListings)
          .set({
            price: newPriceCents,
            lastChecked: new Date(),
            inStock: true
          })
          .where(eq(retailerListings.id, listing.listingId))

        // Add price history
        await db.insert(priceHistory).values({
          listingId: listing.listingId,
          priceCents: newPriceCents,
          inStock: true,
        })

        updated++
      } else {
        console.log(`  ${listing.productName}: price unchanged ($${scraped.price})`)
      }
    } else {
      console.log(`  No match found for: ${listing.productName}`)
    }
  }

  console.log(`\nUpdated ${updated} prices`)
}

async function main() {
  const args = process.argv.slice(2)
  const retailerKey = args[0] || 'officeworks'
  const updateDb = args.includes('--update')

  console.log('Bright Data Chromebook Scraper')
  console.log('==============================')
  console.log(`Retailer: ${retailerKey}`)
  console.log(`Update DB: ${updateDb}`)

  const products = await scrapeRetailer(retailerKey)

  if (updateDb && products.length > 0) {
    await updatePrices(retailerKey, products)
  } else if (!updateDb) {
    console.log('\nRun with --update to save prices to database')
  }
}

main().catch(console.error)
