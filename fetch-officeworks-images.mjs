import puppeteer from 'puppeteer-core'
import { config } from 'dotenv'
config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq } from 'drizzle-orm'
import { products, retailers, retailerListings } from './src/db/schema.ts'

const AUTH = 'brd-customer-hl_98a67688-zone-pricedinda-country-au:tf574lc1fotk'
const SBR_WS = 'wss://' + AUTH + '@brd.superproxy.io:9222'

const sqlClient = neon(process.env.DATABASE_URL)
const db = drizzle(sqlClient)

async function fetchImageFromPage(browser, url) {
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 3000))
    
    // Look for product images - Officeworks uses S3
    const imageUrl = await page.evaluate(() => {
      // Try multiple selectors for product images
      const selectors = [
        'img[src*="s3-ap-southeast-2.amazonaws.com/wc-prod-pim"]',
        'img[src*="wc-prod-pim"]',
        '.product-image img',
        '[data-testid="product-image"] img',
        'main img[src*="http"]'
      ]
      
      for (const selector of selectors) {
        const img = document.querySelector(selector)
        if (img && img.src && !img.src.includes('logo') && !img.src.includes('icon')) {
          return img.src
        }
      }
      
      // Fallback: find any large product image
      const allImages = document.querySelectorAll('img[src*="http"]')
      for (const img of allImages) {
        if (img.naturalWidth > 200 && !img.src.includes('logo') && !img.src.includes('icon')) {
          return img.src
        }
      }
      
      return null
    })
    
    await page.close()
    return imageUrl
  } catch (err) {
    console.error('Error fetching', url, ':', err.message)
    await page.close()
    return null
  }
}

async function main() {
  console.log('=== Fetching Officeworks Images ===\n')

  // Get Officeworks retailer
  const [officeworks] = await db.select().from(retailers).where(eq(retailers.slug, 'officeworks'))
  if (!officeworks) {
    console.log('Officeworks retailer not found')
    return
  }

  // Get all Officeworks listings for products without images
  const listings = await db.select({
    productId: retailerListings.productId,
    productName: products.name,
    url: retailerListings.retailerUrl,
    currentImage: products.imageUrl,
  })
    .from(retailerListings)
    .innerJoin(products, eq(retailerListings.productId, products.id))
    .where(eq(retailerListings.retailerId, officeworks.id))

  const needsImage = listings.filter(l => !l.currentImage)
  console.log('Products needing images:', needsImage.length, '\n')

  // Process in batches of 3 with fresh browser connections
  const BATCH_SIZE = 3

  for (let i = 0; i < needsImage.length; i += BATCH_SIZE) {
    const batch = needsImage.slice(i, i + BATCH_SIZE)
    console.log(`\n=== Batch ${Math.floor(i/BATCH_SIZE) + 1} (${batch.length} products) ===\n`)

    let browser
    try {
      browser = await puppeteer.connect({ browserWSEndpoint: SBR_WS })
      console.log('Connected to Bright Data')

      for (const listing of batch) {
        console.log('\nFetching:', listing.productName.slice(0, 50) + '...')
        console.log('  URL:', listing.url)

        const imageUrl = await fetchImageFromPage(browser, listing.url)

        if (imageUrl) {
          // Upgrade to larger image size
          const largeImageUrl = imageUrl.replace('JPEG_150x150', 'JPEG_1000x1000')
          console.log('  Found:', largeImageUrl.slice(0, 80) + '...')
          await db.update(products)
            .set({ imageUrl: largeImageUrl })
            .where(eq(products.id, listing.productId))
          console.log('  Updated!')
        } else {
          console.log('  No image found')
        }

        await new Promise(r => setTimeout(r, 1000))
      }

    } catch (err) {
      console.error('Batch error:', err.message)
    } finally {
      if (browser) await browser.close()
    }

    // Wait between batches
    if (i + BATCH_SIZE < needsImage.length) {
      console.log('\nWaiting 5s before next batch...')
      await new Promise(r => setTimeout(r, 5000))
    }
  }

  console.log('\nDone!')
}

main().catch(console.error)
