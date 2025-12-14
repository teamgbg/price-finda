import puppeteer from 'puppeteer-core'
import { config } from 'dotenv'
config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq, and, sql } from 'drizzle-orm'
import { products, retailers, retailerListings, priceHistory, brands } from './src/db/schema.ts'

// Bright Data
const AUTH = 'brd-customer-hl_98a67688-zone-pricedinda-country-au:tf574lc1fotk'
const SBR_WS = `wss://${AUTH}@brd.superproxy.io:9222`

// Database
const sqlClient = neon(process.env.DATABASE_URL)
const db = drizzle(sqlClient)

// Retailer configs
const RETAILER_CONFIGS = {
  officeworks: {
    name: 'Officeworks',
    url: 'https://www.officeworks.com.au/shop/officeworks/c/technology/laptops/chromebooks',
  },
  'harvey-norman': {
    name: 'Harvey Norman',
    url: 'https://www.harveynorman.com.au/computers-tablets/computers/chromebooks',
  }
}

// Parse product specs from name
function parseSpecs(name) {
  const specs = {
    brand: null,
    screenSize: null,
    ram: null,
    storage: null,
    storageType: null,
    processor: null,
    touchscreen: false,
  }

  // Brand
  const brandPatterns = [
    { pattern: /\b(HP|Hewlett.?Packard)\b/i, brand: 'HP' },
    { pattern: /\bLenovo\b/i, brand: 'Lenovo' },
    { pattern: /\bASUS\b/i, brand: 'ASUS' },
    { pattern: /\bAcer\b/i, brand: 'Acer' },
    { pattern: /\bSamsung\b/i, brand: 'Samsung' },
  ]
  for (const { pattern, brand } of brandPatterns) {
    if (pattern.test(name)) {
      specs.brand = brand
      break
    }
  }

  // Screen size
  const screenMatch = name.match(/(\d{1,2}(?:\.\d{1,2})?)["\s-]*(?:inch|")/i)
  if (screenMatch) {
    specs.screenSize = screenMatch[1] + '"'
  }

  // RAM/Storage patterns - multiple formats:
  // Harvey Norman: "N4500/4GB/64GB eMMC" → XGB/YGB format
  // Officeworks: "Celeron 4/64GB" or "8/128GB" → X/YGB format

  // Try XGB/YGB format first (Harvey Norman style)
  const ramStorageGBMatch = name.match(/(\d+)GB\/(\d+)(?:GB)?(?:\s*eMMC|\s*SSD)?/i)
  if (ramStorageGBMatch) {
    const first = parseInt(ramStorageGBMatch[1])
    const second = parseInt(ramStorageGBMatch[2])
    // First number is RAM (small), second is storage (larger)
    if (first <= 16 && second >= 32) {
      specs.ram = first
      specs.storage = second
    }
  }

  // Try X/YGB format (Officeworks style) - only if not already set
  if (!specs.ram || !specs.storage) {
    const ramStorageMatch = name.match(/\b(\d{1,2})\/(\d{2,3})(?:GB)?/i)
    if (ramStorageMatch) {
      const first = parseInt(ramStorageMatch[1])
      const second = parseInt(ramStorageMatch[2])
      // Validate: RAM should be small (4-16), storage should be larger (32-512)
      if (first <= 16 && first >= 2 && second >= 32 && second <= 512) {
        specs.ram = first
        specs.storage = second
      }
    }
  }

  // Fallback: Explicit RAM like "4GB RAM" or "8GB DDR"
  if (!specs.ram) {
    const ramMatch = name.match(/(\d+)\s*GB\s*(?:RAM|DDR|memory)/i)
    if (ramMatch) {
      specs.ram = parseInt(ramMatch[1])
    }
  }

  // Fallback: Storage with type "64GB eMMC" or "128GB SSD"
  if (!specs.storage) {
    const storageMatch = name.match(/(\d+)\s*GB\s*(eMMC|SSD)/i)
    if (storageMatch) {
      specs.storage = parseInt(storageMatch[1])
      specs.storageType = storageMatch[2].toUpperCase()
    }
  }

  // Storage type if not already set
  if (specs.storage && !specs.storageType) {
    if (/eMMC/i.test(name)) specs.storageType = 'eMMC'
    else if (/SSD/i.test(name)) specs.storageType = 'SSD'
    else specs.storageType = 'eMMC'
  }

  // Processor - order matters (more specific first)
  const procPatterns = [
    { pattern: /\bIntel\s*(Core[- ]?i\d+)/i, name: (m) => m[1] },
    { pattern: /\b(Core[- ]?i\d+)/i, name: (m) => m[1] },
    { pattern: /\b(Celeron[- ]?N?\d*)/i, name: (m) => m[1] },
    { pattern: /\b(N\d{3,4})\b/i, name: (m) => `Intel ${m[1]}` }, // N100, N200, N4500
    { pattern: /\b(Kompanio[- ]?\d+)/i, name: (m) => `MediaTek ${m[1]}` },
    { pattern: /\bMediaTek\s*(\w+)/i, name: (m) => `MediaTek ${m[1]}` },
    { pattern: /\bSD\s*(\d+c?\s*Gen\s*\d)/i, name: (m) => `Snapdragon ${m[1]}` },
    { pattern: /\b(Pentium[- ]?\w+)/i, name: (m) => m[1] },
  ]
  for (const { pattern, name: getName } of procPatterns) {
    const match = name.match(pattern)
    if (match) {
      specs.processor = getName(match)
      break
    }
  }

  // Touchscreen
  specs.touchscreen = /\btouch\b/i.test(name)

  return specs
}

// Generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
}

// Scrape a retailer
async function scrapeRetailer(browser, retailerKey) {
  const config = RETAILER_CONFIGS[retailerKey]
  console.log(`\n=== Scraping ${config.name} ===`)

  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(120000)

  try {
    await page.goto(config.url, { waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 5000))

    const products = await page.evaluate((retailerKey) => {
      const results = []
      const main = document.querySelector('main') || document.body

      // Find all product links - different patterns for different retailers
      // Officeworks: /p/ in URL
      // Harvey Norman: product links with chromebook in text
      const allLinks = Array.from(main.querySelectorAll('a[href]'))
      const productLinks = allLinks.filter(link => {
        const href = link.href || ''
        const text = link.textContent || ''
        const isChromebook = /chromebook/i.test(text) && text.length > 20

        // Officeworks pattern
        if (href.includes('/p/') && isChromebook) return true

        // Harvey Norman pattern - product URLs are like /product-name-here
        // Exclude category pages and filter/sort URLs
        if (href.includes('harveynorman.com.au') && isChromebook &&
            !href.includes('/computers-tablets/computers/chromebooks?') &&
            !href.includes('?') &&
            !href.endsWith('/chromebooks')) return true

        return false
      })

      // Dedupe by href
      const seen = new Set()
      const uniqueLinks = productLinks.filter(link => {
        if (seen.has(link.href)) return false
        seen.add(link.href)
        return true
      })

      for (const link of uniqueLinks) {
        const name = link.textContent?.trim()
        if (!name || name.length < 20) continue

        // Find closest parent that might be a product card
        let card = link.closest('div')
        let attempts = 0
        while (card && attempts < 5) {
          const cardText = card.innerText || ''
          // A valid card should have price and be reasonably sized
          if (/\$\d+/.test(cardText) && cardText.length < 800) break
          card = card.parentElement?.closest('div')
          attempts++
        }

        if (!card) card = link.parentElement

        // Extract price from the card
        const cardText = card?.innerText || ''
        const prices = cardText.match(/\$(\d+(?:\.\d{2})?)/g) || []
        let price = null

        // Find a reasonable price (not $0, $1, or too high)
        for (const p of prices) {
          const val = parseFloat(p.replace('$', ''))
          if (val >= 100 && val <= 2500) {
            price = val
            break
          }
        }

        // Check stock status
        const isUnavailable = /unavailable|out of stock|sold out/i.test(cardText)

        // Find image
        let imageUrl = null
        const img = card?.querySelector('img[src*="http"]')
        if (img && !img.src.includes('logo') && !img.src.includes('icon')) {
          imageUrl = img.src
        }

        if (price && name) {
          results.push({
            name,
            price,
            url: link.href,
            imageUrl,
            inStock: !isUnavailable,
          })
        }
      }

      return { results, containerUsed: main.tagName, totalLinks: uniqueLinks.length }
    }, retailerKey)

    console.log(`Container: <${products.containerUsed}>, Links found: ${products.totalLinks}`)
    console.log(`Products with valid prices: ${products.results.length}`)
    products.results.forEach(p => {
      const stockStatus = p.inStock ? '✓' : '✗'
      const imgStatus = p.imageUrl ? '📷' : ''
      console.log(`  ${stockStatus} $${p.price} ${imgStatus} - ${p.name.slice(0, 50)}...`)
    })

    await page.close()
    return products.results

  } catch (err) {
    console.error(`Error scraping ${config.name}:`, err.message)
    await page.close()
    return []
  }
}

// Get or create retailer
async function getOrCreateRetailer(slug, name) {
  let [retailer] = await db.select().from(retailers).where(eq(retailers.slug, slug))

  if (!retailer) {
    const baseUrl = RETAILER_CONFIGS[slug]?.url
    const websiteUrl = baseUrl ? new URL(baseUrl).origin : 'https://example.com'
    console.log(`Creating retailer: ${name} (${websiteUrl})`)
    const [created] = await db.insert(retailers).values({
      name,
      slug,
      websiteUrl,
    }).returning()
    retailer = created
  }

  return retailer
}

// Get or create brand
async function getOrCreateBrand(brandName) {
  if (!brandName) return null

  let [brand] = await db.select().from(brands).where(eq(brands.name, brandName))

  if (!brand) {
    console.log(`Creating brand: ${brandName}`)
    const [created] = await db.insert(brands).values({
      name: brandName,
      slug: brandName.toLowerCase(),
    }).returning()
    brand = created
  }

  return brand
}

// Find matching product or create new
async function findOrCreateProduct(scrapedProduct, retailer) {
  const specs = parseSpecs(scrapedProduct.name)
  const slug = generateSlug(scrapedProduct.name)

  // First check if product with this slug already exists
  const [existingBySlug] = await db.select().from(products).where(eq(products.slug, slug))
  if (existingBySlug) {
    console.log(`  Found existing product by slug: ${existingBySlug.name.slice(0, 50)}...`)
    return existingBySlug
  }

  // Try to find existing product with similar specs
  const existingProducts = await db.select().from(products)

  let matchedProduct = null
  for (const existing of existingProducts) {
    // Match by brand + RAM + storage + screen size
    const sameSpecs =
      existing.brand === specs.brand &&
      existing.ram === specs.ram &&
      existing.storage === specs.storage &&
      existing.screenSize === specs.screenSize

    if (sameSpecs) {
      matchedProduct = existing
      console.log(`  Matched existing product: ${existing.name}`)
      break
    }
  }

  if (!matchedProduct) {
    // Create new product
    const brand = await getOrCreateBrand(specs.brand)

    console.log(`  Creating new product: ${scrapedProduct.name.slice(0, 50)}...`)
    const [created] = await db.insert(products).values({
      name: scrapedProduct.name,
      slug,
      brand: specs.brand || 'Unknown',
      brandId: brand?.id,
      model: scrapedProduct.name,
      screenSize: specs.screenSize,
      ram: specs.ram,
      storage: specs.storage,
      storageType: specs.storageType,
      processor: specs.processor,
      touchscreen: specs.touchscreen,
      imageUrl: scrapedProduct.imageUrl,
    }).returning()

    matchedProduct = created
  }

  return matchedProduct
}

// Add or update listing
async function addOrUpdateListing(product, retailer, scrapedProduct) {
  const priceCents = Math.round(scrapedProduct.price * 100)
  const productUrl = scrapedProduct.url || RETAILER_CONFIGS[retailer.slug]?.url || 'https://example.com'
  const inStock = scrapedProduct.inStock !== false

  // Check for existing listing
  const [existing] = await db.select()
    .from(retailerListings)
    .where(and(
      eq(retailerListings.productId, product.id),
      eq(retailerListings.retailerId, retailer.id)
    ))

  if (existing) {
    // Update existing
    if (existing.currentPriceCents !== priceCents || existing.inStock !== inStock) {
      console.log(`  Updating: $${existing.currentPriceCents/100} → $${scrapedProduct.price} (${inStock ? 'in stock' : 'unavailable'})`)
      await db.update(retailerListings)
        .set({
          currentPriceCents: priceCents,
          lastChecked: new Date(),
          inStock,
        })
        .where(eq(retailerListings.id, existing.id))

      // Add price history
      await db.insert(priceHistory).values({
        listingId: existing.id,
        priceCents,
        inStock,
      })
    } else {
      console.log(`  Price unchanged: $${scrapedProduct.price} (${inStock ? 'in stock' : 'unavailable'})`)
    }
  } else {
    // Create new listing
    console.log(`  Creating listing: $${scrapedProduct.price} (${inStock ? 'in stock' : 'unavailable'}) - ${productUrl.slice(0, 50)}...`)
    const [listing] = await db.insert(retailerListings).values({
      productId: product.id,
      retailerId: retailer.id,
      retailerUrl: productUrl,
      retailerProductName: scrapedProduct.name,
      currentPriceCents: priceCents,
      inStock,
      lastChecked: new Date(),
    }).returning()

    // Add initial price history
    await db.insert(priceHistory).values({
      listingId: listing.id,
      priceCents,
      inStock,
    })
  }
}

async function main() {
  const args = process.argv.slice(2)
  const onlyRetailer = args[0] // e.g., "officeworks" or "harvey-norman"

  console.log('=== Full Chromebook Import ===\n')

  const browser = await puppeteer.connect({ browserWSEndpoint: SBR_WS })
  console.log('Connected to Bright Data\n')

  try {
    // Scrape retailers
    const allProducts = {}
    for (const [key, config] of Object.entries(RETAILER_CONFIGS)) {
      if (onlyRetailer && key !== onlyRetailer) continue
      allProducts[key] = await scrapeRetailer(browser, key)
      // Wait between retailers to avoid rate limits
      await new Promise(r => setTimeout(r, 3000))
    }

    // Import to database
    console.log('\n=== Importing to Database ===\n')

    for (const [retailerSlug, scrapedProducts] of Object.entries(allProducts)) {
      const config = RETAILER_CONFIGS[retailerSlug]
      console.log(`\nProcessing ${config.name} (${scrapedProducts.length} products)`)

      const retailer = await getOrCreateRetailer(retailerSlug, config.name)

      for (const scraped of scrapedProducts) {
        const product = await findOrCreateProduct(scraped, retailer)
        await addOrUpdateListing(product, retailer, scraped)
      }
    }

    console.log('\n=== Import Complete ===')

    // Summary
    const productCount = await db.select({ count: sql`count(*)` }).from(products)
    const listingCount = await db.select({ count: sql`count(*)` }).from(retailerListings)
    console.log(`Total products: ${productCount[0].count}`)
    console.log(`Total listings: ${listingCount[0].count}`)

  } finally {
    await browser.close()
  }
}

main().catch(console.error)
