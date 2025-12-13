import { eq } from 'drizzle-orm'
import Groq from 'groq-sdk'
import { db } from '../../db'
import { products, retailerListings, brands, retailers, categories } from '../../db/schema'
import { inngest } from '../client'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

// Retailer category pages to discover products from
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

// Use Groq AI to extract product URLs from category page
async function extractProductUrls(markdown: string, retailerSlug: string): Promise<string[]> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: `Extract all product URLs from this ${retailerSlug} category page. Return JSON: {"urls": ["https://..."]}

Page:
${markdown.slice(0, 6000)}`,
        },
      ],
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return []

    const parsed = JSON.parse(content)
    const urls = Array.isArray(parsed) ? parsed : (parsed.urls || [])
    return urls.filter((url: string) => typeof url === 'string' && url.includes('/products/'))
  } catch (error) {
    console.error('Failed to extract URLs:', error)
    return []
  }
}

// Use Groq AI to extract product data from individual product page
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

// Daily product discovery - finds NEW products from retailer pages
export const discoverProducts = inngest.createFunction(
  { id: 'discover-products-daily', name: 'Daily Product Discovery' },
  { cron: '0 20 * * *' }, // 8pm UTC = 7am AEDT
  async ({ step }) => {
    let discovered = 0
    let added = 0

    for (const source of DISCOVERY_SOURCES) {
      const retailer = await step.run('get-retailer-' + source.retailerSlug, async () => {
        const [r] = await db.select().from(retailers).where(eq(retailers.slug, source.retailerSlug))
        return r
      })

      if (!retailer) continue

      const categoryContent = await step.run('fetch-category-' + source.retailerSlug, async () => {
        return await fetchWithJina(source.categoryUrl)
      })

      if (!categoryContent) continue

      const productUrls = await step.run('extract-urls-' + source.retailerSlug, async () => {
        return await extractProductUrls(categoryContent, source.retailerSlug)
      })
      discovered += productUrls.length

      const existingListings = await step.run('get-existing-' + source.retailerSlug, async () => {
        return await db.select({ url: retailerListings.retailerUrl }).from(retailerListings)
      })
      const existingUrls = new Set(existingListings.map(l => l.url))

      const category = await step.run('get-category', async () => {
        let [cat] = await db.select().from(categories).where(eq(categories.slug, 'chromebooks'))
        if (!cat) {
          [cat] = await db.insert(categories).values({
            name: 'Chromebooks',
            slug: 'chromebooks',
          }).returning()
        }
        return cat
      })

      for (const productUrl of productUrls) {
        if (existingUrls.has(productUrl)) continue

        const productData = await step.run('scrape-' + slugify(productUrl), async () => {
          const content = await fetchWithJina(productUrl)
          if (!content) return null
          const parsed = await extractProductData(content, source.retailerSlug)
          if (!parsed) return null
          return { ...parsed, url: productUrl }
        })

        if (!productData) continue

        const brandName = extractBrand(productData.name)
        const brand = await step.run('brand-' + slugify(brandName), async () => {
          let [b] = await db.select().from(brands).where(eq(brands.slug, slugify(brandName)))
          if (!b) {
            [b] = await db.insert(brands).values({
              name: brandName,
              slug: slugify(brandName),
            }).returning()
          }
          return b
        })

        await step.run('insert-' + slugify(productData.name), async () => {
          const [newProduct] = await db.insert(products).values({
            brandId: brand.id,
            categoryId: category.id,
            name: productData.name,
            slug: slugify(productData.name),
            imageUrl: productData.imageUrl,
            screenSize: productData.screenSize,
            ram: productData.ram,
            storage: productData.storage,
            processor: productData.processor,
            touchscreen: productData.touchscreen,
            storageType: productData.storageType,
          }).returning()

          await db.insert(retailerListings).values({
            productId: newProduct.id,
            retailerId: retailer.id,
            retailerUrl: productData.url,
            retailerProductName: productData.name,
            currentPriceCents: productData.price * 100,
            inStock: productData.inStock,
            lastChecked: new Date(),
          })

          return newProduct
        })

        added++
      }
    }

    return {
      message: 'Discovery complete. Found ' + discovered + ' products, added ' + added + ' new.',
      discovered,
      added,
    }
  }
)

// Manual trigger for product discovery
export const manualDiscovery = inngest.createFunction(
  { id: 'manual-discover-products', name: 'Manual Product Discovery' },
  { event: 'products/discover' },
  async ({ step }) => {
    let discovered = 0
    let added = 0

    for (const source of DISCOVERY_SOURCES) {
      const retailer = await step.run('get-retailer-' + source.retailerSlug, async () => {
        const [r] = await db.select().from(retailers).where(eq(retailers.slug, source.retailerSlug))
        return r
      })

      if (!retailer) continue

      const categoryContent = await step.run('fetch-category-' + source.retailerSlug, async () => {
        return await fetchWithJina(source.categoryUrl)
      })

      if (!categoryContent) continue

      const productUrls = await step.run('extract-urls-' + source.retailerSlug, async () => {
        return await extractProductUrls(categoryContent, source.retailerSlug)
      })
      discovered += productUrls.length

      const existingListings = await step.run('get-existing-' + source.retailerSlug, async () => {
        return await db.select({ url: retailerListings.retailerUrl }).from(retailerListings)
      })
      const existingUrls = new Set(existingListings.map(l => l.url))

      const category = await step.run('get-category', async () => {
        let [cat] = await db.select().from(categories).where(eq(categories.slug, 'chromebooks'))
        if (!cat) {
          [cat] = await db.insert(categories).values({
            name: 'Chromebooks',
            slug: 'chromebooks',
          }).returning()
        }
        return cat
      })

      for (const productUrl of productUrls) {
        if (existingUrls.has(productUrl)) continue

        const productData = await step.run('scrape-' + slugify(productUrl), async () => {
          const content = await fetchWithJina(productUrl)
          if (!content) return null
          const parsed = await extractProductData(content, source.retailerSlug)
          if (!parsed) return null
          return { ...parsed, url: productUrl }
        })

        if (!productData) continue

        const brandName = extractBrand(productData.name)
        const brand = await step.run('brand-' + slugify(brandName), async () => {
          let [b] = await db.select().from(brands).where(eq(brands.slug, slugify(brandName)))
          if (!b) {
            [b] = await db.insert(brands).values({
              name: brandName,
              slug: slugify(brandName),
            }).returning()
          }
          return b
        })

        await step.run('insert-' + slugify(productData.name), async () => {
          const [newProduct] = await db.insert(products).values({
            brandId: brand.id,
            categoryId: category.id,
            name: productData.name,
            slug: slugify(productData.name),
            imageUrl: productData.imageUrl,
            screenSize: productData.screenSize,
            ram: productData.ram,
            storage: productData.storage,
            processor: productData.processor,
            touchscreen: productData.touchscreen,
            storageType: productData.storageType,
          }).returning()

          await db.insert(retailerListings).values({
            productId: newProduct.id,
            retailerId: retailer.id,
            retailerUrl: productData.url,
            retailerProductName: productData.name,
            currentPriceCents: productData.price * 100,
            inStock: productData.inStock,
            lastChecked: new Date(),
          })

          return newProduct
        })

        added++
      }
    }

    return {
      message: 'Discovery complete. Found ' + discovered + ' products, added ' + added + ' new.',
      discovered,
      added,
    }
  }
)
