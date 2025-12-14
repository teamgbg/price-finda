import { config } from 'dotenv'
config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { products, retailerListings, retailers, brands } from './src/db/schema.ts'
import { eq } from 'drizzle-orm'

const sqlClient = neon(process.env.DATABASE_URL)
const db = drizzle(sqlClient)

async function main() {
  console.log('=== Fixing Good Guys CX14 Listing ===\n')

  // Get ASUS brand
  const [asusBrand] = await db.select().from(brands).where(eq(brands.name, 'ASUS'))
  console.log('ASUS brand ID:', asusBrand.id)

  // Get The Good Guys retailer
  const [goodGuys] = await db.select().from(retailers).where(eq(retailers.slug, 'the-good-guys'))
  console.log('The Good Guys ID:', goodGuys.id)

  // Create new product for N50 variant
  const productName = 'ASUS CX14 14" Chromebook Laptop (Intel N50)[128GB]'
  const productSlug = 'asus-cx14-14-chromebook-laptop-intel-n50-128gb'

  console.log('\nCreating new product:', productName)

  const [newProduct] = await db.insert(products).values({
    name: productName,
    slug: productSlug,
    brandId: asusBrand.id,
    screenSize: '14"',
    ram: 8,
    storage: 128,
    storageType: 'SSD',
    processor: 'Intel N50',
    touchscreen: false,
  }).returning()

  console.log('Created product ID:', newProduct.id)

  // Find and update the Good Guys listing
  const goodGuysListings = await db.select({
    id: retailerListings.id,
    productId: retailerListings.productId,
    url: retailerListings.retailerUrl,
  })
    .from(retailerListings)
    .where(eq(retailerListings.retailerId, goodGuys.id))

  // Find the CX14 listing (URL contains n50)
  const cx14Listing = goodGuysListings.find(l => l.url.includes('n50'))
  
  if (cx14Listing) {
    console.log('\nUpdating listing:', cx14Listing.id)
    console.log('URL:', cx14Listing.url)
    
    await db.update(retailerListings)
      .set({ productId: newProduct.id })
      .where(eq(retailerListings.id, cx14Listing.id))
    
    console.log('Updated listing to new product!')
  } else {
    console.log('No N50 listing found at The Good Guys')
  }

  console.log('\nDone!')
}

main().catch(console.error)
