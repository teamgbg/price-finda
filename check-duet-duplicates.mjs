import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client)

console.log('=== Lenovo Chromebook Duet 11 Variations ===\n')

// Find all Duet 11 products
const duetProducts = await db.execute(sql`
  SELECT
    p.id,
    p.name,
    p.screen_size,
    p.ram,
    p.storage,
    p.processor,
    p.resolution,
    p.touchscreen,
    b.name as brand,
    array_agg(DISTINCT r.name) as retailers,
    array_agg(DISTINCT rl.current_price_cents) as prices
  FROM products p
  JOIN brands b ON b.id = p.brand_id
  LEFT JOIN retailer_listings rl ON rl.product_id = p.id
  LEFT JOIN retailers r ON r.id = rl.retailer_id
  WHERE p.name ILIKE '%duet%' OR p.name ILIKE '%duet 11%'
  GROUP BY p.id, p.name, p.screen_size, p.ram, p.storage, p.processor, p.resolution, p.touchscreen, b.name
  ORDER BY p.name
`)

if (duetProducts.rows.length === 0) {
  console.log('No Duet products found. Searching for all Lenovo products with ~11" screen...\n')

  const lenovoSmall = await db.execute(sql`
    SELECT
      p.id,
      p.name,
      p.screen_size,
      p.ram,
      p.storage,
      p.processor,
      p.resolution,
      p.touchscreen,
      array_agg(DISTINCT r.name) as retailers,
      array_agg(DISTINCT rl.current_price_cents) as prices
    FROM products p
    JOIN brands b ON b.id = p.brand_id
    LEFT JOIN retailer_listings rl ON rl.product_id = p.id
    LEFT JOIN retailers r ON r.id = rl.retailer_id
    WHERE b.name = 'Lenovo' AND (p.screen_size LIKE '10%' OR p.screen_size LIKE '11%')
    GROUP BY p.id, p.name, p.screen_size, p.ram, p.storage, p.processor, p.resolution, p.touchscreen
    ORDER BY p.name
  `)

  for (const p of lenovoSmall.rows) {
    console.log(`Product: ${p.name}`)
    console.log(`  Screen: ${p.screen_size}`)
    console.log(`  RAM: ${p.ram}GB, Storage: ${p.storage}GB`)
    console.log(`  Processor: ${p.processor}`)
    console.log(`  Resolution: ${p.resolution}`)
    console.log(`  Touchscreen: ${p.touchscreen}`)
    console.log(`  Retailers: ${p.retailers?.join(', ') || 'none'}`)
    console.log(`  Prices: ${p.prices?.filter(Boolean).map(c => `$${c/100}`).join(', ') || 'none'}`)
    console.log()
  }
} else {
  for (const p of duetProducts.rows) {
    console.log(`Product: ${p.name}`)
    console.log(`  Screen: ${p.screen_size}`)
    console.log(`  RAM: ${p.ram}GB, Storage: ${p.storage}GB`)
    console.log(`  Processor: ${p.processor}`)
    console.log(`  Resolution: ${p.resolution}`)
    console.log(`  Touchscreen: ${p.touchscreen}`)
    console.log(`  Retailers: ${p.retailers?.join(', ') || 'none'}`)
    console.log(`  Prices: ${p.prices?.filter(Boolean).map(c => `$${c/100}`).join(', ') || 'none'}`)
    console.log()
  }
}

console.log('\n=== CX14 / CX1400 Variations ===\n')

// Find all CX14/CX1400 products
const cxProducts = await db.execute(sql`
  SELECT
    p.id,
    p.name,
    p.screen_size,
    p.ram,
    p.storage,
    p.processor,
    p.resolution,
    b.name as brand,
    array_agg(DISTINCT r.name) as retailers,
    array_agg(DISTINCT rl.current_price_cents) as prices
  FROM products p
  JOIN brands b ON b.id = p.brand_id
  LEFT JOIN retailer_listings rl ON rl.product_id = p.id
  LEFT JOIN retailers r ON r.id = rl.retailer_id
  WHERE p.name ILIKE '%cx14%' OR p.name ILIKE '%cx1400%' OR p.name ILIKE '%cx1403%'
  GROUP BY p.id, p.name, p.screen_size, p.ram, p.storage, p.processor, p.resolution, b.name
  ORDER BY p.ram, p.storage, p.name
`)

for (const p of cxProducts.rows) {
  console.log(`Product: ${p.name}`)
  console.log(`  Screen: ${p.screen_size}`)
  console.log(`  RAM: ${p.ram}GB, Storage: ${p.storage}GB`)
  console.log(`  Processor: ${p.processor}`)
  console.log(`  Resolution: ${p.resolution}`)
  console.log(`  Retailers: ${p.retailers?.join(', ') || 'none'}`)
  console.log(`  Prices: ${p.prices?.filter(Boolean).map(c => `$${c/100}`).join(', ') || 'none'}`)
  console.log()
}

console.log('\nTotal CX products:', cxProducts.rows.length)
