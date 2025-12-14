import { db } from '@/db'
import { products, retailerListings, priceHistory } from '@/db/schema'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // Delete in order due to foreign keys
    await db.delete(priceHistory)
    await db.delete(retailerListings)
    await db.delete(products)

    return Response.json({
      success: true,
      message: 'Cleared all products, listings, and price history',
    })
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({
    message: 'POST to this endpoint to clear all products and listings',
    warning: 'This will DELETE all data!',
  })
}
