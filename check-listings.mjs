import { db } from './src/db/index.js'
import { retailerListings, retailers } from './src/db/schema.js'
import { eq } from 'drizzle-orm'

const listings = await db.select({
  retailer: retailers.name,
  url: retailerListings.retailerUrl,
  price: retailerListings.currentPriceCents
}).from(retailerListings)
.leftJoin(retailers, eq(retailerListings.retailerId, retailers.id))
.limit(5)

console.log('Sample listings in database:')
listings.forEach(l => {
  const url = l.url ? l.url.slice(0, 60) + '...' : 'no url'
  console.log(`${l.retailer}: $${(l.price || 0)/100} - ${url}`)
})

process.exit(0)
