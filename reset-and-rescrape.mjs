import { db } from './src/db/index.js'
import { products, retailerListings, priceHistory } from './src/db/schema.js'

console.log('Deleting all price history...')
await db.delete(priceHistory)

console.log('Deleting all listings...')
await db.delete(retailerListings)

console.log('Deleting all products...')
await db.delete(products)

console.log('Done. Database cleared.')
process.exit(0)
