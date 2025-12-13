import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { products, retailerListings, brands, retailers, categories } from '../../db/schema'
import { inngest } from '../client'

// Retailer category pages to discover products from
const DISCOVERY_SOURCES = [
  {
    retailerSlug: 'jb-hifi',
    categoryUrl: 'https://www.jbhifi.com.au/collections/computers-tablets/chromebooks',
    productUrlPattern: /https:\/\/www\.jbhifi\.com\.au\/products\/[a-z0-9-]+/gi,
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

function extractProductUrls(content: string, pattern: RegExp): string[] {
  const matches = content.match(pattern) || []
  return [...new Set(matches)]
}

function parseProductPage(content: string): {
  name: string
  price: number
  imageUrl: string
  screenSize: string
  ram: number
  storage: number
  processor: string
  touchscreen: boolean
  inStock: boolean
} | null {
  const nameMatch = content.match(/^#\s*(.+?)(?:\s*-\s*JB Hi-Fi)?$/m)
  const name = nameMatch ? nameMatch[1].trim() : null
  if (!name) return null

  const priceMatch = content.match(/\$([0-9,]+)/)
  const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0
  if (price < 100 || price > 5000) return null

  const imageMatch = content.match(/https:\/\/www\.jbhifi\.com\.au\/cdn\/shop\/files\/[^\s\)\"]+\.(?:jpg|png|webp)/i)
  const imageUrl = imageMatch ? imageMatch[0] : ''

  const screenMatch = content.match(/(\d+(?:\.\d+)?)["\u201d\s]*(?:inch)?/i)
  const ramMatch = content.match(/(\d+)\s*GB\s*RAM/i)
  const storageMatch = content.match(/(\d+)\s*GB\s*(?:eMMC|SSD|storage)/i)
  const processorMatch = content.match(/(?:Intel|MediaTek|MTK|AMD|Kompanio)[^\n,\|]+/i)

  return {
    name,
    price,
    imageUrl,
    screenSize: screenMatch ? screenMatch[1] + '"' : '14"',
    ram: ramMatch ? parseInt(ramMatch[1]) : 4,
    storage: storageMatch ? parseInt(storageMatch[1]) : 128,
    processor: processorMatch ? processorMatch[0].trim() : 'Unknown',
    touchscreen: /touchscreen/i.test(content),
    inStock: /add\s*to\s*cart/i.test(content) && !/out\s*of\s*stock/i.test(content),
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

      const productUrls = extractProductUrls(categoryContent, source.productUrlPattern)
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
          const parsed = parseProductPage(content)
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
            storageType: 'eMMC',
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

      const productUrls = extractProductUrls(categoryContent, source.productUrlPattern)
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
          const parsed = parseProductPage(content)
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
            storageType: 'eMMC',
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
