import { db } from '@/db'
import { products, retailers, retailerListings, brands, categories } from '@/db/schema'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [productCount] = await db.select({ count: sql<number>`count(*)` }).from(products)
    const [retailerCount] = await db.select({ count: sql<number>`count(*)` }).from(retailers)
    const [listingCount] = await db.select({ count: sql<number>`count(*)` }).from(retailerListings)
    const [brandCount] = await db.select({ count: sql<number>`count(*)` }).from(brands)
    const [categoryCount] = await db.select({ count: sql<number>`count(*)` }).from(categories)

    const allProducts = await db.select().from(products).limit(10)
    const allRetailers = await db.select().from(retailers)
    const allBrands = await db.select().from(brands)

    return Response.json({
      counts: {
        products: productCount.count,
        retailers: retailerCount.count,
        listings: listingCount.count,
        brands: brandCount.count,
        categories: categoryCount.count,
      },
      sampleProducts: allProducts,
      retailers: allRetailers,
      brands: allBrands,
      databaseUrl: process.env.DATABASE_URL?.substring(0, 50) + '...',
    })
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      databaseUrl: process.env.DATABASE_URL?.substring(0, 50) + '...',
    }, { status: 500 })
  }
}
