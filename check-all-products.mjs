import { db } from './src/db/index.js'
import { products, retailerListings, retailers } from './src/db/schema.js'
import { eq } from 'drizzle-orm'

const allProducts = await db.select({
  name: products.name,
  processor: products.processor,
  ram: products.ram,
  storage: products.storage
}).from(products)

console.log('All products in database:')
allProducts.forEach((p, i) => {
  console.log(`${i+1}. ${p.name} (${p.processor}, ${p.ram}GB RAM, ${p.storage}GB)`)
})
console.log(`\nTotal: ${allProducts.length} products`)

// Check listings with URLs
const listings = await db.select({
  retailer: retailers.name,
  url: retailerListings.retailerUrl,
  price: retailerListings.currentPriceCents
}).from(retailerListings)
.leftJoin(retailers, eq(retailerListings.retailerId, retailers.id))

console.log('\n\nAll listings:')
listings.forEach((l, i) => {
  console.log(`${i+1}. ${l.retailer}: $${(l.price || 0)/100} - ${l.url}`)
})

process.exit(0)
