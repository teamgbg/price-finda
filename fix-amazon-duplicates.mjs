import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client)

// Get Amazon retailer ID
const amazonResult = await db.execute(sql`SELECT id FROM retailers WHERE slug = 'amazon-au'`)
const amazonId = amazonResult.rows[0].id

// Duplicates to merge: Amazon product -> existing product
const duplicatesToMerge = [
  {
    amazonName: 'Lenovo IdeaPad Slim 3 Chromebook 14M868',
    existingName: 'Lenovo IdeaPad Slim 3 14" HD Chromebook Laptop',
    amazonUrl: 'https://www.amazon.com.au/dp/B0CTZF875W'
  },
  {
    amazonName: 'Lenovo IdeaPad 3 Chrome 15IJL6',
    existingName: 'Lenovo IdeaPad 3 15.6" FHD Touchscreen Chromebook Laptop',
    amazonUrl: 'https://www.amazon.com.au/dp/B0FPCNV1XM'
  },
  {
    amazonName: 'ASUS ChromeBook CX1400',
    existingName: 'ASUS CX14 14" Chromebook Laptop (Intel N4500)[128GB/4GB]',
    amazonUrl: 'https://www.amazon.com.au/dp/B0F6YDJ13K'
  }
]

console.log('Merging duplicate Amazon products into existing products...\n')

for (const dup of duplicatesToMerge) {
  // Get the Amazon product
  const amazonProduct = await db.execute(sql`
    SELECT p.id, p.name FROM products p WHERE p.name = ${dup.amazonName}
  `)

  // Get the existing product
  const existingProduct = await db.execute(sql`
    SELECT p.id, p.name FROM products p WHERE p.name = ${dup.existingName}
  `)

  if (amazonProduct.rows.length === 0) {
    console.log(`⚠️  Amazon product not found: ${dup.amazonName}`)
    continue
  }

  if (existingProduct.rows.length === 0) {
    console.log(`⚠️  Existing product not found: ${dup.existingName}`)
    continue
  }

  const amazonId = amazonProduct.rows[0].id
  const existingId = existingProduct.rows[0].id

  console.log(`Merging: "${dup.amazonName}" -> "${dup.existingName}"`)

  // Get the Amazon listing
  const amazonListing = await db.execute(sql`
    SELECT * FROM retailer_listings WHERE product_id = ${amazonId}
  `)

  if (amazonListing.rows.length > 0) {
    const listing = amazonListing.rows[0]

    // Check if existing product already has an Amazon listing
    const existingAmazonListing = await db.execute(sql`
      SELECT id FROM retailer_listings
      WHERE product_id = ${existingId} AND retailer_url LIKE '%amazon.com.au%'
    `)

    if (existingAmazonListing.rows.length > 0) {
      console.log(`   - Existing product already has Amazon listing, updating URL`)
      await db.execute(sql`
        UPDATE retailer_listings
        SET retailer_url = ${dup.amazonUrl}
        WHERE id = ${existingAmazonListing.rows[0].id}
      `)
    } else {
      console.log(`   - Moving Amazon listing to existing product`)
      await db.execute(sql`
        UPDATE retailer_listings
        SET product_id = ${existingId}
        WHERE product_id = ${amazonId}
      `)
    }
  }

  // Delete the duplicate Amazon product
  console.log(`   - Deleting duplicate product`)
  await db.execute(sql`DELETE FROM retailer_listings WHERE product_id = ${amazonId}`)
  await db.execute(sql`DELETE FROM products WHERE id = ${amazonId}`)

  console.log(`   ✓ Merged successfully\n`)
}

// Show remaining products
const remaining = await db.execute(sql`SELECT COUNT(*) as count FROM products`)
console.log(`\nTotal products after merge: ${remaining.rows[0].count}`)
