import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client)

// Merges: source product's listings → target product, then delete source
async function mergeProducts(sourceName, targetName) {
  console.log(`\nMerging "${sourceName}" → "${targetName}"`)

  // Get source product
  const sourceResult = await db.execute(sql`SELECT id, name FROM products WHERE name = ${sourceName}`)
  if (sourceResult.rows.length === 0) {
    console.log(`  ⚠️  Source not found: ${sourceName}`)
    return false
  }
  const sourceId = sourceResult.rows[0].id

  // Get target product
  const targetResult = await db.execute(sql`SELECT id, name FROM products WHERE name = ${targetName}`)
  if (targetResult.rows.length === 0) {
    console.log(`  ⚠️  Target not found: ${targetName}`)
    return false
  }
  const targetId = targetResult.rows[0].id

  // Get source listings
  const sourceListings = await db.execute(sql`
    SELECT rl.*, r.name as retailer_name
    FROM retailer_listings rl
    JOIN retailers r ON r.id = rl.retailer_id
    WHERE rl.product_id = ${sourceId}
  `)

  console.log(`  Source has ${sourceListings.rows.length} listings`)

  for (const listing of sourceListings.rows) {
    // Check if target already has this retailer
    const existingListing = await db.execute(sql`
      SELECT id FROM retailer_listings
      WHERE product_id = ${targetId} AND retailer_id = ${listing.retailer_id}
    `)

    if (existingListing.rows.length > 0) {
      console.log(`  - ${listing.retailer_name}: Target already has listing, updating URL and price`)
      await db.execute(sql`
        UPDATE retailer_listings
        SET retailer_url = ${listing.retailer_url},
            current_price_cents = COALESCE(${listing.current_price_cents}, current_price_cents)
        WHERE id = ${existingListing.rows[0].id}
      `)
    } else {
      console.log(`  - ${listing.retailer_name}: Moving listing to target`)
      await db.execute(sql`
        UPDATE retailer_listings SET product_id = ${targetId} WHERE id = ${listing.id}
      `)
    }
  }

  // Delete remaining source listings and product
  await db.execute(sql`DELETE FROM retailer_listings WHERE product_id = ${sourceId}`)
  await db.execute(sql`DELETE FROM products WHERE id = ${sourceId}`)

  console.log(`  ✓ Merged and deleted source product`)
  return true
}

console.log('=== MERGING DUPLICATE PRODUCTS ===')

// 1. Merge Duet 11
console.log('\n--- LENOVO DUET 11 ---')
await mergeProducts(
  'Lenovo Chromebook Duet 11',  // Amazon version (10.95")
  'Lenovo Duet 11" WUXGA Chromebook Laptop (MTK838)[128GB]'  // JB/TGG version (10.9")
)

// 2. Merge CX1400 8GB → CX14 8GB (both N4500, 8GB, 128GB)
console.log('\n--- ASUS CX1400 8GB (N4500) ---')
await mergeProducts(
  'ASUS ChromeBook CX1400 8GB',  // Amazon
  'ASUS CX14 14" Chromebook Laptop (Intel N4500)[128GB]'  // JB (8GB version)
)

// 3. Merge CX1403 Core 3 and TGG version → JB version
console.log('\n--- ASUS CX14 CORE 3 (N355) ---')
// First merge Amazon's CX1403 Core 3
await mergeProducts(
  'ASUS ChromeBook CX1403 Core 3',  // Amazon
  'ASUS CX14 14" Full HD Chromebook Laptop (Intel Core 3)[128GB]'  // JB
)
// Then merge TGG's N50 version
await mergeProducts(
  'Asus 14" N50 8GB 128GB Chromebook Laptop CX1405CTA-S58128',  // TGG
  'ASUS CX14 14" Full HD Chromebook Laptop (Intel Core 3)[128GB]'  // JB
)

// Final count
const remaining = await db.execute(sql`SELECT COUNT(*) as count FROM products`)
console.log(`\n=== Done! Total products: ${remaining.rows[0].count} ===`)
