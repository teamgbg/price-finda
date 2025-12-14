import { config } from 'dotenv'
config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { products, retailerListings, retailers, brands } from './src/db/schema.ts'
import { eq } from 'drizzle-orm'

const sqlClient = neon(process.env.DATABASE_URL)
const db = drizzle(sqlClient)

console.log('=== Checking for Duplicate Products ===\n')

// Get all products with brand names
const allProducts = await db.select({
  id: products.id,
  name: products.name,
  brand: brands.name,
  screenSize: products.screenSize,
  ram: products.ram,
  storage: products.storage,
  processor: products.processor,
}).from(products)
  .leftJoin(brands, eq(products.brandId, brands.id))

// Group by key specs (brand + screen + ram + storage)
const groups = {}
for (const p of allProducts) {
  const key = [p.brand, p.screenSize, p.ram, p.storage].join('|')
  if (!groups[key]) groups[key] = []
  groups[key].push(p)
}

// Find duplicates
const duplicateGroups = Object.entries(groups).filter(([_, prods]) => prods.length > 1)

if (duplicateGroups.length === 0) {
  console.log('No duplicate products found!\n')
} else {
  console.log('Found', duplicateGroups.length, 'potential duplicate groups:\n')

  for (const [key, prods] of duplicateGroups) {
    const [brand, screen, ram, storage] = key.split('|')
    console.log('\n--- ' + brand + ' ' + screen + ' ' + ram + 'GB/' + storage + 'GB ---')

    for (const p of prods) {
      const listings = await db.select({
        retailerName: retailers.name,
        price: retailerListings.currentPriceCents,
        inStock: retailerListings.inStock,
      })
        .from(retailerListings)
        .innerJoin(retailers, eq(retailerListings.retailerId, retailers.id))
        .where(eq(retailerListings.productId, p.id))

      const listingInfo = listings.map(l => {
        const stockStatus = l.inStock ? '' : ' (out)'
        return l.retailerName + ': $' + (l.price/100) + stockStatus
      }).join(', ')

      console.log('  [' + p.id + '] ' + p.name.slice(0, 60) + '...')
      console.log('       Processor: ' + (p.processor || 'N/A'))
      console.log('       Listings: ' + listingInfo)
    }
  }
}

// Print summary
console.log('\n=== Summary ===')
console.log('Total products:', allProducts.length)
const allListings = await db.select().from(retailerListings)
console.log('Total listings:', allListings.length)
