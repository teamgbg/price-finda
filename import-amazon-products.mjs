import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client)

// Manual Amazon AU Chromebook products
// These URLs are manually curated and will be scraped daily for price updates
const AMAZON_PRODUCTS = [
  {
    asin: 'B0DN8WG55D',
    name: 'HP Chromebook 14a Touchscreen',
    brand: 'HP',
    model: 'A1NF6PA',
    screenSize: '14"',
    ram: 4,
    storage: 64,
    storageType: 'eMMC',
    processor: 'Intel Processor N100',
    resolution: '1366x768',
    touchscreen: true,
    wifi: 'Wi-Fi 6E',
    // Price will be fetched by scraper - don't use placeholders
  },
  {
    asin: 'B0F2DTJ43S',
    name: 'HP Chromebook 14a',
    brand: 'HP',
    model: 'A1MT6PA',
    screenSize: '14"',
    ram: 4,
    storage: 64,
    storageType: 'eMMC',
    processor: 'Intel Processor N100',
    resolution: '1366x768',
    touchscreen: false,
    wifi: 'Wi-Fi 6E',
    // Price will be fetched by scraper
  },
  {
    asin: 'B0F6YDJ13K',
    name: 'ASUS ChromeBook CX1400',
    brand: 'ASUS',
    model: 'CX1400CNA',
    screenSize: '14"',
    ram: 4,
    storage: 128,
    storageType: 'eMMC',
    processor: 'Intel Celeron N4500',
    resolution: '1920x1080',
    touchscreen: false,
    wifi: 'Wi-Fi 6',
    // Price fetched by scraper
  },
  {
    asin: 'B0CTZF875W',
    name: 'Lenovo IdeaPad Slim 3 Chromebook 14M868',
    brand: 'Lenovo',
    model: '14M868',
    screenSize: '14"',
    ram: 4,
    storage: 128,
    storageType: 'eMMC',
    processor: 'MTK Kompanio 520',
    resolution: '1366x768',
    touchscreen: false,
    wifi: 'Wi-Fi 6',
    // Price fetched by scraper
  },
  {
    asin: 'B0DKHSD4CP',
    name: 'Lenovo Chromebook Duet 11',
    brand: 'Lenovo',
    model: 'Duet 11',
    screenSize: '10.95"',
    ram: 4,
    storage: 128,
    storageType: 'eMMC',
    processor: 'MTK Kompanio 838',
    resolution: '1920x1200',
    touchscreen: true,
    wifi: 'Wi-Fi 6',
    price: 549, // Placeholder
  },
  {
    asin: 'B0F6Y9BF82',
    name: 'ASUS ChromeBook CX1400 8GB',
    brand: 'ASUS',
    model: 'CX1400CNA-8G',
    screenSize: '14"',
    ram: 8,
    storage: 128,
    storageType: 'eMMC',
    processor: 'Intel Celeron N4500',
    resolution: '1920x1080',
    touchscreen: false,
    wifi: 'Wi-Fi 6',
    price: 449, // Placeholder
  },
  {
    asin: 'B0F6XM9Y8K',
    name: 'ASUS ChromeBook CX1403 Core 3',
    brand: 'ASUS',
    model: 'CX1403CNA',
    screenSize: '14"',
    ram: 8,
    storage: 128,
    storageType: 'eMMC',
    processor: 'Intel Core 3 N355',
    resolution: '1920x1080',
    touchscreen: false,
    wifi: 'Wi-Fi 6',
    price: 599, // Placeholder
  },
  {
    asin: 'B0FPCNV1XM',
    name: 'Lenovo IdeaPad 3 Chrome 15IJL6',
    brand: 'Lenovo',
    model: '15IJL6',
    screenSize: '15.6"',
    ram: 8,
    storage: 128,
    storageType: 'eMMC',
    processor: 'Intel Celeron N4500',
    resolution: '1920x1080',
    touchscreen: false,
    wifi: 'Wi-Fi 6',
    price: 449, // Placeholder
  },
]

// CPU Benchmark scores
const CPU_BENCHMARKS = {
  'Intel Processor N100': 5356,
  'Intel Celeron N4500': 1813,
  'Intel Core 3 N355': 10521,
  'MTK Kompanio 520': 3723,
  'MTK Kompanio 838': 4500,
}

// Get Amazon AU retailer ID
const retailerResult = await db.execute(sql`
  SELECT id FROM retailers WHERE slug = 'amazon-au'
`)
if (retailerResult.rows.length === 0) {
  console.error('Amazon AU retailer not found in database!')
  process.exit(1)
}
const amazonRetailerId = retailerResult.rows[0].id

// Get Chromebooks category ID
const categoryResult = await db.execute(sql`
  SELECT id FROM categories WHERE slug = 'chromebooks'
`)
if (categoryResult.rows.length === 0) {
  console.error('Chromebooks category not found!')
  process.exit(1)
}
const categoryId = categoryResult.rows[0].id

console.log(`Amazon AU Retailer ID: ${amazonRetailerId}`)
console.log(`Chromebooks Category ID: ${categoryId}`)
console.log('========================================')

for (const product of AMAZON_PRODUCTS) {
  const url = `https://www.amazon.com.au/dp/${product.asin}`
  const slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  const benchmark = CPU_BENCHMARKS[product.processor] || null

  // Check if product already exists (by ASIN in URL or slug)
  const existingProduct = await db.execute(sql`
    SELECT p.id FROM products p
    LEFT JOIN retailer_listings rl ON rl.product_id = p.id
    WHERE rl.retailer_url LIKE ${'%' + product.asin + '%'}
    OR p.slug = ${slug}
    LIMIT 1
  `)

  if (existingProduct.rows.length > 0) {
    console.log(`⏭ Skipping "${product.name}" - already exists`)
    continue
  }

  // Get brand ID
  const brandResult = await db.execute(sql`
    SELECT id FROM brands WHERE name = ${product.brand}
  `)
  if (brandResult.rows.length === 0) {
    console.log(`⚠ Brand "${product.brand}" not found, skipping ${product.name}`)
    continue
  }
  const brandId = brandResult.rows[0].id

  // Insert product
  const productInsert = await db.execute(sql`
    INSERT INTO products (
      name, slug, brand_id, category_id, model,
      screen_size, ram, storage, storage_type, processor,
      resolution, touchscreen, wifi, cpu_benchmark, image_url
    ) VALUES (
      ${product.name},
      ${slug},
      ${brandId},
      ${categoryId},
      ${product.model},
      ${product.screenSize},
      ${product.ram},
      ${product.storage},
      ${product.storageType},
      ${product.processor},
      ${product.resolution},
      ${product.touchscreen},
      ${product.wifi},
      ${benchmark},
      NULL
    )
    RETURNING id
  `)
  const productId = productInsert.rows[0].id

  // Insert retailer listing (Amazon AU)
  // Price is stored in cents
  await db.execute(sql`
    INSERT INTO retailer_listings (
      product_id, retailer_id, retailer_url, current_price_cents, in_stock
    ) VALUES (
      ${productId},
      ${amazonRetailerId},
      ${url},
      ${product.price * 100},
      true
    )
  `)

  console.log(`✓ Added "${product.name}" (${product.asin}) - $${product.price}`)
}

console.log('========================================')
console.log('Done! Amazon products imported.')
console.log('Run the price update scraper to get accurate prices.')
