import { config } from 'dotenv'
config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { products, retailerListings, retailers } from './src/db/schema.ts'
import { eq } from 'drizzle-orm'

const sql = neon(process.env.DATABASE_URL)
const db = drizzle(sql)

async function main() {
  const [officeworks] = await db.select().from(retailers).where(eq(retailers.slug, 'officeworks'))

  const listings = await db.select({
    name: products.name,
    price: retailerListings.currentPriceCents,
    url: retailerListings.retailerUrl,
  })
    .from(retailerListings)
    .innerJoin(products, eq(retailerListings.productId, products.id))
    .where(eq(retailerListings.retailerId, officeworks.id))

  console.log('=== Officeworks URLs ===\n')
  for (const l of listings) {
    console.log(`$${l.price/100} - ${l.name.slice(0, 50)}`)
    console.log(`  URL: ${l.url}`)
    console.log()
  }
}

main().catch(console.error)
