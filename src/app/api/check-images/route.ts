import { db } from '@/db'
import { products } from '@/db/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  const allProducts = await db.select({ name: products.name, imageUrl: products.imageUrl }).from(products).limit(5)
  return Response.json(allProducts)
}
