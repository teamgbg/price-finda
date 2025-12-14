import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { products, retailerListings, brands, retailers, categories } from '@/db/schema'

export const dynamic = 'force-dynamic'

// Real JB Hi-Fi Chromebook products as of Dec 2025
const JB_HIFI_CHROMEBOOKS = [
  { name: 'HP 14a-nf0005TU 14" HD Touchscreen Chromebook Laptop', price: 479, screenSize: '14', ram: 4, storage: 64, processor: 'Intel N100', brand: 'HP', touchscreen: true },
  { name: 'Lenovo IdeaPad 3 15.6" FHD Touchscreen Chromebook Laptop', price: 599, screenSize: '15.6', ram: 8, storage: 128, processor: 'Intel N4500', brand: 'Lenovo', touchscreen: true },
  { name: 'Lenovo Duet 11" WUXGA Chromebook Laptop', price: 599, screenSize: '11', ram: 4, storage: 128, processor: 'MTK838', brand: 'Lenovo', touchscreen: true },
  { name: 'ASUS CX14 14" Chromebook Laptop', price: 499, screenSize: '14', ram: 8, storage: 128, processor: 'Intel N4500', brand: 'ASUS', touchscreen: false },
  { name: 'Lenovo IdeaPad Slim 3 14" HD Chromebook Laptop', price: 449, screenSize: '14', ram: 4, storage: 128, processor: 'MTK8183', brand: 'Lenovo', touchscreen: false },
  { name: 'HP 14a-nf0007TU 14" HD Chromebook Laptop', price: 429, screenSize: '14', ram: 4, storage: 64, processor: 'Intel N100', brand: 'HP', touchscreen: false },
  { name: 'ASUS CX14 14" Chromebook Laptop (4GB)', price: 429, screenSize: '14', ram: 4, storage: 128, processor: 'Intel N4500', brand: 'ASUS', touchscreen: false },
  { name: 'ASUS CX14 14" Full HD Chromebook Laptop', price: 749, screenSize: '14', ram: 8, storage: 128, processor: 'Intel Core 3', brand: 'ASUS', touchscreen: false },
  { name: 'HP 15a-nb0009TU 15.6" Full HD Chromebook Laptop with Gemini', price: 749, screenSize: '15.6', ram: 8, storage: 128, processor: 'Intel i3', brand: 'HP', touchscreen: false },
  { name: 'ASUS CX34 14" Full HD Chromebook Laptop with Gemini', price: 999, screenSize: '14', ram: 16, storage: 256, processor: 'Intel i5', brand: 'ASUS', touchscreen: false },
  { name: 'Lenovo 14" OLED Touchscreen Chromebook Plus Laptop with Gemini', price: 1199, screenSize: '14', ram: 8, storage: 256, processor: 'Intel i5', brand: 'Lenovo', touchscreen: true },
  { name: 'ASUS CX34 14" FHD Chromebook Laptop with Gemini (i5)', price: 1029, screenSize: '14', ram: 16, storage: 256, processor: 'Intel i5', brand: 'ASUS', touchscreen: false },
]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100)
    .trim()
}

export async function POST() {
  const logs: string[] = []
  const log = (msg: string) => {
    console.log(msg)
    logs.push(msg)
  }

  try {
    let added = 0

    // Get JB Hi-Fi retailer
    const [retailer] = await db.select().from(retailers).where(eq(retailers.slug, 'jb-hifi'))
    if (!retailer) {
      return Response.json({ error: 'JB Hi-Fi retailer not found' }, { status: 500 })
    }
    log(`Found retailer: ${retailer.name}`)

    // Get or create Chromebooks category
    let [category] = await db.select().from(categories).where(eq(categories.slug, 'chromebooks'))
    if (!category) {
      [category] = await db.insert(categories).values({
        name: 'Chromebooks',
        slug: 'chromebooks',
      }).returning()
      log('Created Chromebooks category')
    }

    // Get existing products
    const existingProducts = await db.select({ slug: products.slug }).from(products)
    const existingSlugs = new Set(existingProducts.map(p => p.slug))
    log(`${existingSlugs.size} existing products`)

    for (const chromebook of JB_HIFI_CHROMEBOOKS) {
      const productSlug = slugify(chromebook.name)

      if (existingSlugs.has(productSlug)) {
        log(`Skipping existing: ${chromebook.name}`)
        continue
      }

      // Get or create brand
      const brandSlug = slugify(chromebook.brand)
      let [brand] = await db.select().from(brands).where(eq(brands.slug, brandSlug))
      if (!brand) {
        [brand] = await db.insert(brands).values({
          name: chromebook.brand,
          slug: brandSlug,
        }).returning()
        log(`Created brand: ${chromebook.brand}`)
      }

      // Insert product
      const [newProduct] = await db.insert(products).values({
        brandId: brand.id,
        categoryId: category.id,
        name: chromebook.name,
        slug: productSlug,
        imageUrl: '',
        screenSize: chromebook.screenSize + '"',
        ram: chromebook.ram,
        storage: chromebook.storage,
        processor: chromebook.processor,
        touchscreen: chromebook.touchscreen,
        storageType: 'eMMC',
      }).returning()
      log(`Created product: ${newProduct.name}`)

      // Insert listing
      const productUrl = `https://www.jbhifi.com.au/products/${productSlug}`
      await db.insert(retailerListings).values({
        productId: newProduct.id,
        retailerId: retailer.id,
        retailerUrl: productUrl,
        retailerProductName: chromebook.name,
        currentPriceCents: chromebook.price * 100,
        inStock: true,
        lastChecked: new Date(),
      })
      log(`Created listing at $${chromebook.price}`)

      added++
    }

    return Response.json({
      success: true,
      message: `Seeded ${added} products from JB Hi-Fi`,
      added,
      logs,
    })
  } catch (error) {
    log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs,
    }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({
    message: 'POST to this endpoint to seed JB Hi-Fi Chromebook products',
    products: JB_HIFI_CHROMEBOOKS.length,
  })
}
