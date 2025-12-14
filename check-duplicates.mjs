import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client)

// Check for potential duplicates by looking at similar product specs
const products = await db.execute(sql`
  SELECT p.id, p.name, p.ram, p.storage, p.processor, p.screen_size,
         b.name as brand,
         array_agg(DISTINCT r.name) as retailers
  FROM products p
  JOIN brands b ON b.id = p.brand_id
  LEFT JOIN retailer_listings rl ON rl.product_id = p.id
  LEFT JOIN retailers r ON r.id = rl.retailer_id
  GROUP BY p.id, p.name, p.ram, p.storage, p.processor, p.screen_size, b.name
  ORDER BY b.name, p.ram, p.storage, p.processor
`)

console.log('All products by brand/specs:')
console.log('===========================')

// Group by key specs to find potential duplicates
const byKey = new Map()
for (const p of products.rows) {
  // Create a key based on brand + key specs
  const key = `${p.brand}-${p.ram}GB-${p.storage}GB-${p.screen_size}`
  if (!byKey.has(key)) {
    byKey.set(key, [])
  }
  byKey.get(key).push(p)
}

// Show potential duplicates
let duplicateCount = 0
for (const [key, prods] of byKey) {
  if (prods.length > 1) {
    duplicateCount++
    console.log(`\n⚠️  POTENTIAL DUPLICATES (${key}):`)
    for (const p of prods) {
      console.log(`   - ${p.name}`)
      console.log(`     Processor: ${p.processor}`)
      console.log(`     Retailers: ${p.retailers?.join(', ') || 'none'}`)
    }
  }
}

if (duplicateCount === 0) {
  console.log('\n✓ No potential duplicates found!')
}

console.log(`\nTotal products: ${products.rows.length}`)
console.log(`Potential duplicate groups: ${duplicateCount}`)
