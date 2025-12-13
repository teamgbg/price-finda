import { config } from 'dotenv'
config({ path: '.env.local' })

import { db } from './index'
import { products, retailerListings, priceHistory } from './schema'

async function clearFakeData() {
  console.log('Deleting all fake data...')

  // Delete in correct order (foreign key constraints)
  const historyDeleted = await db.delete(priceHistory)
  console.log('Deleted price history')

  const listingsDeleted = await db.delete(retailerListings)
  console.log('Deleted retailer listings')

  const productsDeleted = await db.delete(products)
  console.log('Deleted products')

  console.log('Done! Database is now clean.')
  console.log('Trigger the product discovery function to populate with real products.')
}

clearFakeData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
