import { eq } from 'drizzle-orm'
import Groq from 'groq-sdk'
import { db } from '@/db'
import { products, retailerListings, brands, retailers, categories } from '@/db/schema'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 second timeout for Vercel

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

const DISCOVERY_SOURCES = [
  {
    retailerSlug: 'jb-hifi',
    categoryUrl: 'https://www.jbhifi.com.au/collections/computers-tablets/chromebooks',
  },
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

function extractBrand(productName: string): string {
  const knownBrands = ['Lenovo', 'HP', 'ASUS', 'Acer', 'Samsung', 'Dell', 'Google']
  for (const brand of knownBrands) {
    if (productName.toLowerCase().includes(brand.toLowerCase())) {
      return brand
    }
  }
  return 'Unknown'
}

async function fetchWithJina(url: string): Promise<string | null> {
  try {
    const jinaUrl = 'https://r.jina.ai/' + encodeURIComponent(url)
    const response = await fetch(jinaUrl, {
      headers: { 'Accept': 'text/plain' },
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

interface ProductFromPage {
  name: string
  price: number
  screenSize: string
  ram: number
  storage: number
  processor: string
}

async function extractProductsFromCategoryPage(markdown: string, retailerSlug: string): Promise<ProductFromPage[]> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are extracting Chromebook products from a ${retailerSlug} category page. Extract all products with their names, prices, and specs.`,
        },
        {
          role: 'user',
          content: `Extract ALL Chromebook products from this page. Return JSON array:
{"products": [
  {"name": "HP 14a-nf0005TU 14\" HD Touchscreen Chromebook", "price": 479, "screenSize": "14", "ram": 4, "storage": 64, "processor": "Intel N100"},
  ...
]}

Rules:
- Extract EVERY product listed
- price in dollars (479 not $479)
- screenSize just the number (14 not 14")
- ram in GB (4, 8, 16)
- storage in GB (64, 128, 256)
- processor: Intel N100, Intel N4500, Intel i3, Intel i5, etc.

Page content:
${markdown.slice(0, 12000)}`,
        },
      ],
      temperature: 0,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return []

    const parsed = JSON.parse(content)
    const products = Array.isArray(parsed) ? parsed : (parsed.products || [])
    return products.filter((p: ProductFromPage) => p.name && p.price)
  } catch (error) {
    console.error('Failed to extract products:', error)
    return []
  }
}

async function extractProductData(markdown: string, retailerSlug: string): Promise<{
  name: string
  price: number
  imageUrl: string
  screenSize: string
  ram: number
  storage: number
  storageType: string
  processor: string
  touchscreen: boolean
  inStock: boolean
} | null> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Extract product data from ${retailerSlug}. Use Australian Dollar prices.`,
        },
        {
          role: 'user',
          content: `Extract Chromebook data as JSON:
{"name":"Full product name", "price":499, "imageUrl":"https://...", "screenSize":"14", "ram":8, "storage":128, "storageType":"eMMC", "processor":"Intel Celeron N4500", "touchscreen":false, "inStock":true}

Rules:
- price in dollars (499 not 49900)
- screenSize just the number
- inStock true only if "Add to Cart" visible and no "Out of Stock"

Page:
${markdown.slice(0, 8000)}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return null

    const p = JSON.parse(content)
    if (!p.name || !p.price) return null

    return {
      name: p.name,
      price: typeof p.price === 'number' ? p.price : parseInt(String(p.price).replace(/[^0-9]/g, '')),
      imageUrl: p.imageUrl || '',
      screenSize: String(p.screenSize || '14').replace(/[^0-9.]/g, '') + '"',
      ram: parseInt(p.ram) || 4,
      storage: parseInt(p.storage) || 64,
      storageType: p.storageType || 'eMMC',
      processor: p.processor || 'Unknown',
      touchscreen: Boolean(p.touchscreen),
      inStock: Boolean(p.inStock),
    }
  } catch (error) {
    console.error('Failed to extract product:', error)
    return null
  }
}

export async function POST() {
  const logs: string[] = []
  const log = (msg: string) => {
    console.log(msg)
    logs.push(msg)
  }

  try {
    let discovered = 0
    let added = 0

    for (const source of DISCOVERY_SOURCES) {
      log(`Processing ${source.retailerSlug}...`)

      // Get retailer
      const [retailer] = await db.select().from(retailers).where(eq(retailers.slug, source.retailerSlug))
      if (!retailer) {
        log(`Retailer ${source.retailerSlug} not found`)
        continue
      }
      log(`Found retailer: ${retailer.name}`)

      // Fetch category page
      log(`Fetching category page: ${source.categoryUrl}`)
      const categoryContent = await fetchWithJina(source.categoryUrl)
      if (!categoryContent) {
        log('Failed to fetch category page')
        continue
      }
      log(`Fetched ${categoryContent.length} characters`)

      // Extract products directly from category page
      log('Extracting products with Groq AI...')
      const extractedProducts = await extractProductsFromCategoryPage(categoryContent, source.retailerSlug)
      log(`Found ${extractedProducts.length} products`)
      discovered += extractedProducts.length

      // Get existing products by name
      const existingProducts = await db.select({ name: products.name }).from(products)
      const existingNames = new Set(existingProducts.map(p => p.name.toLowerCase()))
      log(`${existingNames.size} existing products in database`)

      // Get or create category
      let [category] = await db.select().from(categories).where(eq(categories.slug, 'chromebooks'))
      if (!category) {
        [category] = await db.insert(categories).values({
          name: 'Chromebooks',
          slug: 'chromebooks',
        }).returning()
        log('Created Chromebooks category')
      }

      // Process each product
      for (const productData of extractedProducts) {
        // Skip if product already exists
        if (existingNames.has(productData.name.toLowerCase())) {
          log(`Skipping existing: ${productData.name}`)
          continue
        }

        log(`Adding: ${productData.name} - $${productData.price}`)

        // Get or create brand
        const brandName = extractBrand(productData.name)
        let [brand] = await db.select().from(brands).where(eq(brands.slug, slugify(brandName)))
        if (!brand) {
          [brand] = await db.insert(brands).values({
            name: brandName,
            slug: slugify(brandName),
          }).returning()
          log(`Created brand: ${brandName}`)
        }

        // Construct product URL from name (JB Hi-Fi format)
        const productSlug = slugify(productData.name)
        const productUrl = `https://www.jbhifi.com.au/products/${productSlug}`

        // Insert product
        const [newProduct] = await db.insert(products).values({
          brandId: brand.id,
          categoryId: category.id,
          name: productData.name,
          slug: productSlug,
          imageUrl: '', // Will be populated later
          screenSize: productData.screenSize + '"',
          ram: productData.ram,
          storage: productData.storage,
          processor: productData.processor,
          touchscreen: productData.name.toLowerCase().includes('touchscreen'),
          storageType: 'eMMC',
        }).returning()
        log(`Created product: ${newProduct.name}`)

        // Insert listing
        await db.insert(retailerListings).values({
          productId: newProduct.id,
          retailerId: retailer.id,
          retailerUrl: productUrl,
          retailerProductName: productData.name,
          currentPriceCents: productData.price * 100,
          inStock: true,
          lastChecked: new Date(),
        })
        log(`Created listing at $${productData.price}`)

        added++
      }
    }

    return Response.json({
      success: true,
      message: `Discovery complete. Found ${discovered} products, added ${added} new.`,
      discovered,
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
    message: 'POST to this endpoint to run direct product discovery (bypasses Inngest)',
  })
}
