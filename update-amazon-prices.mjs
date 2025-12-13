import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'

const SCRAPER_URL = 'http://localhost:8080'

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client)

// Get all Amazon listings
const amazonListings = await db.execute(sql`
  SELECT
    rl.id,
    rl.product_id,
    rl.retailer_url,
    rl.current_price_cents,
    p.name as product_name
  FROM retailer_listings rl
  JOIN products p ON p.id = rl.product_id
  WHERE rl.retailer_url LIKE '%amazon.com.au%'
`)

console.log(`Found ${amazonListings.rows.length} Amazon listings to update\n`)

for (const listing of amazonListings.rows) {
  console.log(`Scraping: ${listing.product_name}`)
  console.log(`URL: ${listing.retailer_url}`)

  try {
    const response = await fetch(`${SCRAPER_URL}/api/scrape-amazon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: listing.retailer_url })
    })

    const result = await response.json()

    if (result.success && result.data.priceCents) {
      const priceCents = result.data.priceCents
      console.log(`  Price: $${(priceCents / 100).toFixed(2)}`)

      // Update the listing
      await db.execute(sql`
        UPDATE retailer_listings
        SET current_price_cents = ${priceCents},
            updated_at = NOW()
        WHERE id = ${listing.id}
      `)

      // Record price history
      await db.execute(sql`
        INSERT INTO price_history (listing_id, price_cents, recorded_at)
        VALUES (${listing.id}, ${priceCents}, NOW())
      `)

      console.log(`  ✓ Updated!\n`)
    } else {
      console.log(`  ⚠️ No price found`)
      if (result.data?.title) {
        console.log(`  Title: ${result.data.title}`)
      }
      console.log()
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 2000))

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`)
  }
}

console.log('Done!')
