import puppeteer from 'puppeteer-core'
import { config } from 'dotenv'
config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq, and, sql } from 'drizzle-orm'
import { products, retailers, retailerListings, priceHistory, brands } from './src/db/schema.ts'

const AUTH = 'brd-customer-hl_98a67688-zone-pricedinda-country-au:tf574lc1fotk'
const SBR_WS = `wss://${AUTH}@brd.superproxy.io:9222`

const sqlClient = neon(process.env.DATABASE_URL)
const db = drizzle(sqlClient)

const RETAILER_CONFIGS = {
  officeworks: {
    name: 'Officeworks',
    url: 'https://www.officeworks.com.au/shop/officeworks/c/technology/laptops/chromebooks',
    linkPattern: '/shop/officeworks/p/',
  },
  'harvey-norman': {
    name: 'Harvey Norman',
    url: 'https://www.harveynorman.com.au/computers-tablets/computers/chromebooks',
    linkPattern: 'harveynorman.com.au',
  }
}

// Parse specs from name
function parseSpecs(name) {
  const specs = { brand: null, screenSize: null, ram: null, storage: null, storageType: 'eMMC', processor: null, touchscreen: false }

  // Brand
  if (/\bHP\b/i.test(name)) specs.brand = 'HP'
  else if (/\bLenovo\b/i.test(name)) specs.brand = 'Lenovo'
  else if (/\bASUS\b/i.test(name)) specs.brand = 'ASUS'
  else if (/\bAcer\b/i.test(name)) specs.brand = 'Acer'

  // Screen size - "14-inch", "14"", "14 inch"
  const screenMatch = name.match(/(\d{1,2}(?:\.\d+)?)["-]?\s*(?:inch|")/i)
  if (screenMatch) specs.screenSize = screenMatch[1] + '"'

  // RAM/Storage like "4GB/64GB" or "4/64GB" or "N4500/4GB/64GB"
  const ramStorageMatch = name.match(/(\d+)\s*(?:GB)?\/(\d+)\s*GB/i)
  if (ramStorageMatch) {
    const first = parseInt(ramStorageMatch[1])
    const second = parseInt(ramStorageMatch[2])
    // If first is small (<=32) it's RAM, second is storage
    if (first <= 32 && second >= 32) {
      specs.ram = first
      specs.storage = second
    }
  }

  // Also check for explicit "XGB RAM" or "XGB eMMC"
  if (!specs.ram) {
    const ramMatch = name.match(/(\d+)\s*GB\s*RAM/i)
    if (ramMatch) specs.ram = parseInt(ramMatch[1])
  }
  if (!specs.storage) {
    const storageMatch = name.match(/(\d+)\s*GB\s*(?:eMMC|SSD)/i)
    if (storageMatch) specs.storage = parseInt(storageMatch[1])
  }

  // Storage type
  if (/SSD/i.test(name)) specs.storageType = 'SSD'

  // Processor
  const cpuPatterns = [
    { regex: /Celeron[- ]?N?(\d+)/i, name: 'Intel Celeron N$1' },
    { regex: /\bN(\d{3,4})\b/i, name: 'Intel N$1' },
    { regex: /Kompanio[- ]?(\d+)/i, name: 'MediaTek Kompanio $1' },
    { regex: /Core[- ]?i(\d)/i, name: 'Intel Core i$1' },
  ]
  for (const { regex, name: cpuName } of cpuPatterns) {
    const match = name.match(regex)
    if (match) {
      specs.processor = cpuName.replace('$1', match[1])
      break
    }
  }

  // Touchscreen
  specs.touchscreen = /\btouch\b/i.test(name)

  return specs
}

function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100)
}

async function scrapeRetailer(browser, retailerKey) {
  const config = RETAILER_CONFIGS[retailerKey]
  console.log(`\n=== Scraping ${config.name} ===`)

  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(120000)

  try {
    await page.goto(config.url, { waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 5000))

    // Get page content and all links
    const data = await page.evaluate(() => {
      const text = document.body.innerText
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
        href: a.href,
        text: a.textContent?.trim() || ''
      }))
      return { text, links }
    })

    // Parse products from text - look for price followed by product name
    const lines = data.text.split('\n').map(l => l.trim()).filter(l => l)
    const products = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const priceMatch = line.match(/^\$(\d+)$/)

      if (priceMatch) {
        const price = parseInt(priceMatch[1])
        if (price >= 100 && price <= 2500) {
          // Look ahead for product name
          for (let j = 1; j <= 5; j++) {
            if (i + j < lines.length) {
              const nameLine = lines[i + j]
              if (nameLine.length > 30 && /chromebook/i.test(nameLine) && !/^\$/.test(nameLine)) {
                // Find matching URL
                const nameWords = nameLine.toLowerCase().split(/\s+/)
                let url = null
                for (const link of data.links) {
                  if (link.href.includes(config.linkPattern)) {
                    const linkWords = link.text.toLowerCase().split(/\s+/)
                    // Check if at least 3 significant words match
                    const matches = nameWords.filter(w => w.length > 3 && linkWords.some(lw => lw.includes(w)))
                    if (matches.length >= 3) {
                      url = link.href
                      break
                    }
                  }
                }

                // Check if unavailable
                const inStock = !['unavailable', 'out of stock'].some(s =>
                  lines.slice(i, i + 10).join(' ').toLowerCase().includes(s)
                )

                products.push({
                  name: nameLine,
                  price,
                  url: url || config.url,
                  inStock
                })
                break
              }
            }
          }
        }
      }
    }

    // Dedupe by name
    const seen = new Set()
    const unique = products.filter(p => {
      const key = p.name.toLowerCase().slice(0, 50)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    console.log(`Found ${unique.length} products`)
    unique.forEach(p => {
      const status = p.inStock ? '✓' : '✗'
      console.log(`  ${status} $${p.price} - ${p.name.slice(0, 60)}...`)
    })

    await page.close()
    return unique

  } catch (err) {
    console.error(`Error: ${err.message}`)
    await page.close()
    return []
  }
}

async function getOrCreateRetailer(slug, name) {
  let [retailer] = await db.select().from(retailers).where(eq(retailers.slug, slug))
  if (!retailer) {
    const [created] = await db.insert(retailers).values({
      name,
      slug,
      websiteUrl: RETAILER_CONFIGS[slug]?.url || 'https://example.com',
    }).returning()
    retailer = created
  }
  return retailer
}

async function getOrCreateBrand(brandName) {
  if (!brandName) return null
  let [brand] = await db.select().from(brands).where(eq(brands.name, brandName))
  if (!brand) {
    const [created] = await db.insert(brands).values({
      name: brandName,
      slug: brandName.toLowerCase(),
    }).returning()
    brand = created
  }
  return brand
}

async function importProduct(scraped, retailer) {
  const specs = parseSpecs(scraped.name)
  const slug = generateSlug(scraped.name)

  // Check if product exists
  let [product] = await db.select().from(products).where(eq(products.slug, slug))

  if (!product) {
    const brand = await getOrCreateBrand(specs.brand)
    console.log(`  Creating: ${scraped.name.slice(0, 50)}...`)
    console.log(`    Specs: ${specs.brand} | ${specs.screenSize} | ${specs.ram}GB/${specs.storage}GB | ${specs.processor}`)

    const [created] = await db.insert(products).values({
      name: scraped.name,
      slug,
      brand: specs.brand || 'Unknown',
      brandId: brand?.id,
      model: scraped.name,
      screenSize: specs.screenSize,
      ram: specs.ram,
      storage: specs.storage,
      storageType: specs.storageType,
      processor: specs.processor,
      touchscreen: specs.touchscreen,
    }).returning()
    product = created
  } else {
    console.log(`  Exists: ${product.name.slice(0, 50)}...`)
  }

  // Create or update listing
  const priceCents = scraped.price * 100
  const [existing] = await db.select().from(retailerListings).where(and(
    eq(retailerListings.productId, product.id),
    eq(retailerListings.retailerId, retailer.id)
  ))

  if (existing) {
    await db.update(retailerListings).set({
      currentPriceCents: priceCents,
      inStock: scraped.inStock,
      lastChecked: new Date(),
    }).where(eq(retailerListings.id, existing.id))

    if (existing.currentPriceCents !== priceCents) {
      await db.insert(priceHistory).values({ listingId: existing.id, priceCents, inStock: scraped.inStock })
    }
  } else {
    const [listing] = await db.insert(retailerListings).values({
      productId: product.id,
      retailerId: retailer.id,
      retailerUrl: scraped.url,
      retailerProductName: scraped.name,
      currentPriceCents: priceCents,
      inStock: scraped.inStock,
      lastChecked: new Date(),
    }).returning()

    await db.insert(priceHistory).values({ listingId: listing.id, priceCents, inStock: scraped.inStock })
  }
}

async function main() {
  const retailerKey = process.argv[2] || 'officeworks'
  console.log(`=== Clean Import: ${retailerKey} ===\n`)

  const browser = await puppeteer.connect({ browserWSEndpoint: SBR_WS })
  console.log('Connected to Bright Data')

  try {
    const scraped = await scrapeRetailer(browser, retailerKey)
    const retailer = await getOrCreateRetailer(retailerKey, RETAILER_CONFIGS[retailerKey].name)

    console.log(`\n=== Importing to Database ===`)
    for (const product of scraped) {
      await importProduct(product, retailer)
    }

    const productCount = await db.select({ count: sql`count(*)` }).from(products)
    const listingCount = await db.select({ count: sql`count(*)` }).from(retailerListings)
    console.log(`\n=== Done ===`)
    console.log(`Total products: ${productCount[0].count}`)
    console.log(`Total listings: ${listingCount[0].count}`)

  } finally {
    await browser.close()
  }
}

main().catch(console.error)
