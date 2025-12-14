import { eq } from 'drizzle-orm'
import OpenAI from 'openai'
import { db } from '../../db'
import { products, retailerListings, brands, retailers, categories } from '../../db/schema'
import { inngest } from '../client'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const JINA_API_KEY = process.env.JINA_API_KEY || ''

// Retailer category pages to discover products from
const DISCOVERY_SOURCES = [
  {
    retailerSlug: 'jb-hifi',
    categoryUrl: 'https://www.jbhifi.com.au/collections/computers-tablets/chromebooks',
  },
]

interface ProductLink {
  name: string
  url: string
}

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

// Fetch product links from a category page using Jina's JSON + links feature
async function fetchProductLinks(categoryUrl: string): Promise<ProductLink[]> {
  try {
    const response = await fetch('https://r.jina.ai/' + encodeURIComponent(categoryUrl), {
      headers: {
        'Accept': 'application/json',
        'X-With-Links-Summary': 'true',
        'X-Target-Selector': 'main', // Only get links from main content, not nav/footer
      },
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) return []

    const json = await response.json()
    const links: Record<string, string> = json.data?.links || {}

    // Filter for product URLs only (main selector already excludes nav junk)
    return Object.entries(links)
      .filter(([, url]) => url.includes('/products/'))
      .map(([name, url]) => ({
        // Remove rating suffix like "4.3(73)" from product names
        name: name.replace(/[\d.]+\(\d+\)$/, '').trim(),
        url,
      }))
  } catch (error) {
    console.error('Failed to fetch product links:', error)
    return []
  }
}

interface JinaImage {
  label: string
  url: string
}

interface PageContent {
  markdown: string
  images: JinaImage[]
}

// Fetch page content with images from Jina
async function fetchPageContent(url: string): Promise<PageContent | null> {
  try {
    const response = await fetch('https://r.jina.ai/' + encodeURIComponent(url), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'X-Return-Format': 'markdown',
        'X-With-Images-Summary': 'all',
      },
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) return null
    const json = await response.json()

    const markdown = json.data?.content || ''
    const rawImages: Record<string, string> = json.data?.images || {}
    const images: JinaImage[] = Object.entries(rawImages).map(([label, imgUrl]) => ({
      label,
      url: imgUrl,
    }))

    return { markdown, images }
  } catch {
    return null
  }
}

// Find the main product image from Jina's image list
function findMainProductImage(images: JinaImage[], retailerSlug: string): string {
  if (retailerSlug === 'jb-hifi') {
    // JB Hi-Fi pattern: https://www.jbhifi.com.au/cdn/shop/files/SKU-Product-0-I-xxx.jpg
    for (const img of images) {
      if (img.url.includes('jbhifi.com.au/cdn/shop/files') && img.url.includes('-Product-0-I-')) {
        return img.url
      }
    }
    // Fallback: any JB Hi-Fi product image
    for (const img of images) {
      if (img.url.includes('jbhifi.com.au/cdn/shop/files') && img.url.includes('-Product-')) {
        return img.url
      }
    }
  }
  return ''
}

// Use OpenAI GPT-5 mini to extract product data from individual product page
async function extractProductData(markdown: string, retailerSlug: string): Promise<{
  name: string
  price: number
  screenSize: string
  ram: number
  storage: number
  storageType: string
  processor: string
  touchscreen: boolean
  inStock: boolean
} | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini-2025-04-14',
      messages: [
        {
          role: 'user',
          content: `Extract Chromebook data from this ${retailerSlug} product page. Return JSON only.

CRITICAL: The price MUST be the EXACT dollar amount shown on the page (e.g. if page shows "$429" return 429, NOT 449 or any other number).

{"name":"Full product name", "price":429, "screenSize":"14", "ram":8, "storage":128, "storageType":"eMMC", "processor":"Intel Celeron N4500", "touchscreen":false, "inStock":true}

Rules:
- price: Extract the EXACT price shown (the main price, not variant prices)
- screenSize: Just the number (e.g. "14")
- touchscreen: Check if product has touchscreen (look for "Touchscreen: Yes/No")
- inStock: true only if "Add to Cart" button visible

Page content:
${markdown.slice(0, 12000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return null

    const p = JSON.parse(content)
    if (!p.name || !p.price) return null

    return {
      name: p.name,
      price: typeof p.price === 'number' ? p.price : parseInt(String(p.price).replace(/[^0-9]/g, '')),
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

      // Fetch all product links from the category page (uses Jina JSON + links)
      const productLinks = await step.run('fetch-products-' + source.retailerSlug, async () => {
        return await fetchProductLinks(source.categoryUrl)
      })

      if (!productLinks.length) continue
      discovered += productLinks.length

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

      for (const productLink of productLinks) {
        if (existingUrls.has(productLink.url)) continue

        const productData = await step.run('scrape-' + slugify(productLink.url), async () => {
          const content = await fetchPageContent(productLink.url)
          if (!content) return null
          const parsed = await extractProductData(content.markdown, source.retailerSlug)
          if (!parsed) return null
          const imageUrl = findMainProductImage(content.images, source.retailerSlug)
          return { ...parsed, url: productLink.url, imageUrl }
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

      // Fetch all product links from the category page (uses Jina JSON + links)
      const productLinks = await step.run('fetch-products-' + source.retailerSlug, async () => {
        return await fetchProductLinks(source.categoryUrl)
      })

      if (!productLinks.length) continue
      discovered += productLinks.length

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

      for (const productLink of productLinks) {
        if (existingUrls.has(productLink.url)) continue

        const productData = await step.run('scrape-' + slugify(productLink.url), async () => {
          const content = await fetchPageContent(productLink.url)
          if (!content) return null
          const parsed = await extractProductData(content.markdown, source.retailerSlug)
          if (!parsed) return null
          const imageUrl = findMainProductImage(content.images, source.retailerSlug)
          return { ...parsed, url: productLink.url, imageUrl }
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
