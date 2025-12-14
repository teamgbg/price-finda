import { config } from 'dotenv'
config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { products, retailerListings, retailers, priceHistory } from './src/db/schema.ts'
import { eq, sql as sqlFn } from 'drizzle-orm'

const sqlClient = neon(process.env.DATABASE_URL)
const db = drizzle(sqlClient)

async function main() {
  console.log('=== Deleting Harvey Norman Imports ===\n')

  const [harveyNorman] = await db.select().from(retailers).where(eq(retailers.slug, 'harvey-norman'))
  if (!harveyNorman) {
    console.log('Harvey Norman retailer not found')
    return
  }

  // Get all Harvey Norman listings
  const listings = await db.select({
    listingId: retailerListings.id,
    productId: retailerListings.productId,
    productName: products.name,
  })
    .from(retailerListings)
    .innerJoin(products, eq(retailerListings.productId, products.id))
    .where(eq(retailerListings.retailerId, harveyNorman.id))

  console.log(`Found ${listings.length} Harvey Norman listings:`)

  for (const listing of listings) {
    console.log(`  Deleting: ${listing.productName.slice(0, 60)}...`)

    // Delete price history
    await db.delete(priceHistory).where(eq(priceHistory.listingId, listing.listingId))

    // Delete listing
    await db.delete(retailerListings).where(eq(retailerListings.id, listing.listingId))

    // Check if product has other listings
    const otherListings = await db.select({ id: retailerListings.id })
      .from(retailerListings)
      .where(eq(retailerListings.productId, listing.productId))

    if (otherListings.length === 0) {
      // No other listings - delete product
      console.log(`    -> Also deleting orphaned product`)
      await db.delete(products).where(eq(products.id, listing.productId))
    }
  }

  console.log('\n=== Summary ===')
  const remaining = await db.select({ count: sqlFn`count(*)` }).from(products)
  const remainingListings = await db.select({ count: sqlFn`count(*)` }).from(retailerListings)
  console.log(`Remaining products: ${remaining[0].count}`)
  console.log(`Remaining listings: ${remainingListings[0].count}`)
}

main().catch(console.error)
