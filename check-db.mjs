import { config } from 'dotenv'
config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { products, retailerListings, retailers, brands } from './src/db/schema.ts'
import { eq } from 'drizzle-orm'

const sql = neon(process.env.DATABASE_URL)
const db = drizzle(sql)

const all = await db.select({
  name: products.name,
  brandName: brands.name,
  ram: products.ram,
  storage: products.storage,
  processor: products.processor,
  screenSize: products.screenSize,
  price: retailerListings.currentPriceCents,
  retailer: retailers.name,
  inStock: retailerListings.inStock,
}).from(products)
  .leftJoin(brands, eq(products.brandId, brands.id))
  .leftJoin(retailerListings, eq(products.id, retailerListings.productId))
  .leftJoin(retailers, eq(retailerListings.retailerId, retailers.id))

console.log('=== Products in Database ===')
console.log('Total listings:', all.length)
console.log('')

// Group by retailer
const byRetailer = {}
for (const p of all) {
  const r = p.retailer || 'No listing'
  if (!byRetailer[r]) byRetailer[r] = []
  byRetailer[r].push(p)
}

for (const [retailer, prods] of Object.entries(byRetailer)) {
  console.log(`\n=== ${retailer} (${prods.length} listings) ===`)
  for (const p of prods.slice(0, 20)) {
    const stock = p.inStock ? '✓' : '✗'
    const price = p.price ? '$' + (p.price/100) : 'N/A'
    console.log(`${stock} ${price} | ${p.brandName || '-'} | ${p.screenSize || '-'} | ${p.ram || '-'}GB/${p.storage || '-'}GB | ${p.processor || '-'}`)
    console.log(`   ${p.name.slice(0,70)}...`)
  }
}
