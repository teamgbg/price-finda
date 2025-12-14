import { config } from 'dotenv'
config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { products, retailerListings, retailers, priceHistory } from './src/db/schema.ts'
import { eq, like, isNull, sql as sqlFn } from 'drizzle-orm'

const sqlClient = neon(process.env.DATABASE_URL)
const db = drizzle(sqlClient)

async function main() {
  console.log('=== Cleaning Up Bad Import Data ===\n')

  // Get Officeworks and Harvey Norman retailer IDs
  const [officeworks] = await db.select().from(retailers).where(eq(retailers.slug, 'officeworks'))
  const [harveyNorman] = await db.select().from(retailers).where(eq(retailers.slug, 'harvey-norman'))

  console.log('Retailers:', officeworks?.name, harveyNorman?.name)

  // Find all products that ONLY have listings from our bad import (Officeworks/Harvey Norman from today)
  // and have null RAM (indicator of bad import)
  const badProducts = await db.select({
    id: products.id,
    name: products.name,
    ram: products.ram,
  })
    .from(products)
    .where(isNull(products.ram))

  console.log(`\nFound ${badProducts.length} products with missing RAM (from bad import):`)

  let deleted = 0
  for (const product of badProducts) {
    // Check if this product has listings from other retailers (good data)
    const listings = await db.select({
      retailerId: retailerListings.retailerId,
      retailerName: retailers.name,
    })
      .from(retailerListings)
      .innerJoin(retailers, eq(retailerListings.retailerId, retailers.id))
      .where(eq(retailerListings.productId, product.id))

    const retailerNames = listings.map(l => l.retailerName)
    const onlyBadRetailers = listings.every(l =>
      l.retailerId === officeworks?.id || l.retailerId === harveyNorman?.id
    )

    if (onlyBadRetailers && listings.length > 0) {
      console.log(`  Deleting: ${product.name.slice(0, 50)}... (only from: ${retailerNames.join(', ')})`)

      // Delete price history first
      for (const listing of listings) {
        const [listingRecord] = await db.select({ id: retailerListings.id })
          .from(retailerListings)
          .where(eq(retailerListings.productId, product.id))

        if (listingRecord) {
          await db.delete(priceHistory).where(eq(priceHistory.listingId, listingRecord.id))
        }
      }

      // Delete listings
      await db.delete(retailerListings).where(eq(retailerListings.productId, product.id))

      // Delete product
      await db.delete(products).where(eq(products.id, product.id))
      deleted++
    } else if (listings.length === 0) {
      // Product with no listings - delete it
      console.log(`  Deleting orphan: ${product.name.slice(0, 50)}...`)
      await db.delete(products).where(eq(products.id, product.id))
      deleted++
    } else {
      // Has listings from good retailers - just delete the bad listings
      console.log(`  Keeping: ${product.name.slice(0, 50)}... (has listings from: ${retailerNames.join(', ')})`)
    }
  }

  // Also delete the junk "designed with safety" product
  const junkProducts = await db.select({ id: products.id, name: products.name })
    .from(products)
    .where(like(products.name, '%designed with safety%'))

  for (const junk of junkProducts) {
    console.log(`  Deleting junk: ${junk.name.slice(0, 50)}...`)
    const junkListings = await db.select({ id: retailerListings.id })
      .from(retailerListings)
      .where(eq(retailerListings.productId, junk.id))

    for (const listing of junkListings) {
      await db.delete(priceHistory).where(eq(priceHistory.listingId, listing.id))
    }
    await db.delete(retailerListings).where(eq(retailerListings.productId, junk.id))
    await db.delete(products).where(eq(products.id, junk.id))
    deleted++
  }

  console.log(`\n=== Summary ===`)
  console.log(`Deleted ${deleted} bad products`)

  // Count remaining
  const remaining = await db.select({ count: sqlFn`count(*)` }).from(products)
  const listings = await db.select({ count: sqlFn`count(*)` }).from(retailerListings)
  console.log(`Remaining products: ${remaining[0].count}`)
  console.log(`Remaining listings: ${listings[0].count}`)
}

main().catch(console.error)
