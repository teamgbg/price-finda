import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'

const SCRAPER_URL = 'http://localhost:8080'

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client)

// Get products with Amazon listings but no image
const products = await db.execute(sql`
  SELECT DISTINCT
    p.id,
    p.name,
    p.image_url,
    rl.retailer_url
  FROM products p
  JOIN retailer_listings rl ON rl.product_id = p.id
  WHERE rl.retailer_url LIKE '%amazon.com.au%'
    AND (p.image_url IS NULL OR p.image_url = '')
`)

console.log(`Found ${products.rows.length} products needing images\n`)

for (const product of products.rows) {
  console.log(`Fetching image for: ${product.name}`)
  console.log(`  URL: ${product.retailer_url}`)

  try {
    const response = await fetch(`${SCRAPER_URL}/api/scrape-amazon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: product.retailer_url })
    })

    const result = await response.json()

    if (result.success && result.data.image) {
      console.log(`  Image found: ${result.data.image.substring(0, 60)}...`)

      // Update the product with the image
      await db.execute(sql`
        UPDATE products
        SET image_url = ${result.data.image}
        WHERE id = ${product.id}
      `)

      console.log(`  ✓ Updated!\n`)
    } else {
      console.log(`  ⚠️ No image found\n`)
    }

    // Small delay
    await new Promise(r => setTimeout(r, 2000))

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`)
  }
}

console.log('Done!')
