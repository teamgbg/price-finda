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

  // RAM
  const ramMatch = name.match(/(\d+)\s*GB(?:\s*RAM)?/i)
  if (ramMatch) {
    const ram = parseInt(ramMatch[1])
    if (ram <= 32) specs.ram = ram
  }

  // Storage
  const storageMatch = name.match(/(\d+)\s*GB\s*(eMMC|SSD)?/gi)
  if (storageMatch) {
    for (const match of storageMatch) {
      const m = match.match(/(\d+)\s*GB\s*(eMMC|SSD)?/i)
      if (m) {
        const size = parseInt(m[1])
        if (size >= 32 && size <= 1024) {
          specs.storage = size
          specs.storageType = m[2]?.toUpperCase() || 'eMMC'
        }
      }
    }
  }

  // Processor
  const procPatterns = [
    /\b(Celeron[- ]?N?\d*)\b/i,
    /\b(N\d{3,4})\b/i,
    /\b(Kompanio[- ]?\d+)\b/i,
    /\b(MediaTek[- ]?\w+)\b/i,
    /\b(Core[- ]?i\d)\b/i,
    /\b(Pentium[- ]?\w+)\b/i,
  ]
  for (const pattern of procPatterns) {
    const match = name.match(pattern)
    if (match) {
      specs.processor = match[1]
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
      const text = document.body.innerText
      const lines = text.split('\n').map(l => l.trim()).filter(l => l)

      // Find products by looking for price + name patterns
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // Price pattern
        const priceMatch = line.match(/^\$(\d+(?:\.\d{2})?)$/)
        if (priceMatch) {
          const price = parseFloat(priceMatch[1])
          if (price >= 150 && price <= 2000) {
            // Look for product name in next few lines
            for (let j = 1; j <= 3; j++) {
              if (i + j < lines.length) {
                const nameLine = lines[i + j]
                // Must contain Chromebook, have specs (RAM/storage), be reasonable length
                const isProductName = nameLine.length > 20 &&
                    nameLine.length < 200 &&
                    (nameLine.includes('Chromebook') || nameLine.includes('chromebook')) &&
                    !nameLine.includes('$') &&
                    // Must have spec-like content (numbers for RAM/storage)
                    /\d+GB|\d+\/\d+|\d{1,2}["″-]?(?:inch)?/i.test(nameLine)

                if (isProductName) {
                  results.push({
                    name: nameLine,
                    price: price,
                  })
                  break
                }
              }
            }
          }
        }
      }

      // Check for "Unavailable" or "Out of Stock" near each product
      for (const product of results) {
        const nameIndex = lines.findIndex(l => l === product.name)
        if (nameIndex !== -1) {
          // Check next 5 lines for stock status
          for (let k = 1; k <= 5; k++) {
            if (nameIndex + k < lines.length) {
              const checkLine = lines[nameIndex + k].toLowerCase()
              if (checkLine.includes('unavailable') || checkLine.includes('out of stock')) {
                product.inStock = false
                break
              }
            }
          }
        }
        if (product.inStock === undefined) product.inStock = true
      }

      // Extract URLs
      const links = Array.from(document.querySelectorAll('a[href]'))
      for (const product of results) {
        const nameWords = product.name.toLowerCase().split(/\s+/).slice(0, 5)
        for (const link of links) {
          const href = link.href
          const text = link.textContent?.toLowerCase() || ''
          if (href.includes('/p/') || href.includes('sku-')) {
            if (nameWords.some(w => w.length > 3 && text.includes(w))) {
              product.url = href
              break
            }
          }
        }
      }

      // Extract images
      const images = Array.from(document.querySelectorAll('img[src]'))
      for (const product of results) {
        const nameWords = product.name.toLowerCase().split(/\s+/).slice(0, 3)
        for (const img of images) {
          const alt = img.alt?.toLowerCase() || ''
          const src = img.src
          if (src.includes('http') && !src.includes('logo') && !src.includes('icon')) {
            if (nameWords.some(w => w.length > 3 && alt.includes(w))) {
              product.imageUrl = src
              break
            }
          }
        }
      }

      return results
    }, retailerKey)

    console.log(`Found ${products.length} products`)
    products.forEach(p => console.log(`  $${p.price} - ${p.name.slice(0, 60)}...`))

    await page.close()
    return products

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
