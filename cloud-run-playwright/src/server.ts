import express from 'express'
import { chromium, Browser, Page } from 'playwright'
import { chromium as chromiumExtra } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

// Add stealth plugin to bypass bot detection
chromiumExtra.use(StealthPlugin())

const app = express()
app.use(express.json())

let browser: Browser | null = null
let stealthBrowser: Browser | null = null

// Initialize browsers on startup
async function initBrowsers() {
  console.log('Initializing browsers...')

  // Regular browser for simple pages
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  // Stealth browser for bot-protected sites (Amazon, Harvey Norman, etc.)
  stealthBrowser = await chromiumExtra.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  })

  console.log('Browsers initialized')
}

// Get stealth browser instance
async function getStealthBrowser(): Promise<Browser> {
  if (!stealthBrowser) {
    await initBrowsers()
  }
  return stealthBrowser!
}

// Modern Chrome user agent
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Wait for Cloudflare challenge to complete
async function waitForCloudflare(page: Page, maxAttempts = 6): Promise<boolean> {
  let attempts = 0
  while (attempts < maxAttempts) {
    const content = await page.content()
    if (!content.includes('challenge-platform') &&
        !content.includes('Just a moment') &&
        !content.includes('Checking your browser')) {
      return true
    }
    console.log(`Waiting for Cloudflare challenge (attempt ${attempts + 1}/${maxAttempts})...`)
    // Simulate human mouse movement
    await page.mouse.move(Math.random() * 500 + 100, Math.random() * 500 + 100)
    await page.waitForTimeout(5000)
    attempts++
  }
  return false
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', browsers: { regular: !!browser, stealth: !!stealthBrowser } })
})

// Scrape Amazon AU product page
app.post('/api/scrape-amazon', async (req, res) => {
  const { url } = req.body
  const startTime = Date.now()

  if (!url || !url.includes('amazon.com.au')) {
    return res.status(400).json({ error: 'Invalid Amazon AU URL' })
  }

  let page: Page | null = null
  let context = null

  try {
    const browser = await getStealthBrowser()
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: USER_AGENT
    })
    page = await context.newPage()

    // Add human-like behavior
    await page.mouse.move(100, 100)
    await page.mouse.move(200, 200)

    console.log(`Navigating to Amazon: ${url}`)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

    // Wait for page to fully load
    await page.waitForTimeout(3000)

    // Extract product data
    const productData = await page.evaluate(() => {
      // Price extraction - try multiple selectors
      const priceSelectors = [
        '.a-price .a-offscreen',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '.a-price-whole',
        '[data-a-color="price"] .a-offscreen',
        '.priceToPay .a-offscreen'
      ]

      let price: string | null = null
      for (const selector of priceSelectors) {
        const el = document.querySelector(selector)
        if (el?.textContent) {
          price = el.textContent.trim()
          break
        }
      }

      // Product title
      const title = document.querySelector('#productTitle')?.textContent?.trim() || null

      // Main image
      const imageEl = document.querySelector('#landingImage') as HTMLImageElement
      const image = imageEl?.src || null

      // In stock check
      const availabilityEl = document.querySelector('#availability')
      const availability = availabilityEl?.textContent?.trim() || ''
      const inStock = availability.toLowerCase().includes('in stock') ||
                      !availability.toLowerCase().includes('unavailable')

      // ASIN from URL or page
      const asinMatch = window.location.href.match(/\/dp\/([A-Z0-9]{10})/)
      const asin = asinMatch ? asinMatch[1] : null

      return {
        title,
        price,
        image,
        inStock,
        asin,
        availability
      }
    })

    await context.close()

    // Parse price to cents
    let priceCents: number | null = null
    if (productData.price) {
      const priceMatch = productData.price.match(/\$?([\d,]+)\.?(\d{2})?/)
      if (priceMatch) {
        const dollars = parseInt(priceMatch[1].replace(/,/g, ''))
        const cents = priceMatch[2] ? parseInt(priceMatch[2]) : 0
        priceCents = dollars * 100 + cents
      }
    }

    const duration = Date.now() - startTime
    console.log(`Amazon scrape complete: ${productData.title} - ${productData.price} (${duration}ms)`)

    res.json({
      success: true,
      data: {
        ...productData,
        priceCents
      },
      duration
    })

  } catch (error) {
    console.error('Amazon scrape error:', error)
    if (context) await context.close()
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Scrape Harvey Norman product page
app.post('/api/scrape-harvey-norman', async (req, res) => {
  const { url } = req.body
  const startTime = Date.now()

  if (!url || !url.includes('harveynorman.com.au')) {
    return res.status(400).json({ error: 'Invalid Harvey Norman URL' })
  }

  let page: Page | null = null
  let context = null

  try {
    const browser = await getStealthBrowser()
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: USER_AGENT
    })
    page = await context.newPage()

    await page.mouse.move(100, 100)
    console.log(`Navigating to Harvey Norman: ${url}`)
    await page.goto(url, { waitUntil: 'load', timeout: 60000 })

    // Wait for Cloudflare if present
    const cloudflareCleared = await waitForCloudflare(page)
    if (!cloudflareCleared) {
      throw new Error('Could not bypass Cloudflare challenge')
    }

    await page.waitForTimeout(2000)

    const productData = await page.evaluate(() => {
      // Price
      const priceEl = document.querySelector('.price-value, .product-price, [data-price]')
      const price = priceEl?.textContent?.trim() || null

      // Title
      const title = document.querySelector('h1.product-name, h1')?.textContent?.trim() || null

      // Image
      const imageEl = document.querySelector('.product-image img, .gallery-image img') as HTMLImageElement
      const image = imageEl?.src || null

      // Specs
      const specs: Record<string, string> = {}
      document.querySelectorAll('.product-specs tr, .specifications tr').forEach(row => {
        const label = row.querySelector('th, td:first-child')?.textContent?.trim()
        const value = row.querySelector('td:last-child')?.textContent?.trim()
        if (label && value) {
          specs[label] = value
        }
      })

      // Stock
      const stockEl = document.querySelector('.stock-status, .availability')
      const inStock = !stockEl?.textContent?.toLowerCase().includes('out of stock')

      return { title, price, image, specs, inStock }
    })

    await context.close()

    // Parse price
    let priceCents: number | null = null
    if (productData.price) {
      const priceMatch = productData.price.match(/\$?([\d,]+)\.?(\d{2})?/)
      if (priceMatch) {
        const dollars = parseInt(priceMatch[1].replace(/,/g, ''))
        const cents = priceMatch[2] ? parseInt(priceMatch[2]) : 0
        priceCents = dollars * 100 + cents
      }
    }

    const duration = Date.now() - startTime
    console.log(`Harvey Norman scrape complete: ${productData.title} - ${productData.price} (${duration}ms)`)

    res.json({
      success: true,
      data: { ...productData, priceCents },
      duration
    })

  } catch (error) {
    console.error('Harvey Norman scrape error:', error)
    if (context) await context.close()
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Scrape Officeworks product page
app.post('/api/scrape-officeworks', async (req, res) => {
  const { url } = req.body
  const startTime = Date.now()

  if (!url || !url.includes('officeworks.com.au')) {
    return res.status(400).json({ error: 'Invalid Officeworks URL' })
  }

  let page: Page | null = null
  let context = null

  try {
    const browser = await getStealthBrowser()
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: USER_AGENT
    })
    page = await context.newPage()

    await page.mouse.move(100, 100)
    console.log(`Navigating to Officeworks: ${url}`)
    await page.goto(url, { waitUntil: 'load', timeout: 60000 })

    // Wait for Cloudflare
    await waitForCloudflare(page)
    await page.waitForTimeout(2000)

    const productData = await page.evaluate(() => {
      // Price
      const priceEl = document.querySelector('[data-testid="price"], .price, .product-price')
      const price = priceEl?.textContent?.trim() || null

      // Title
      const title = document.querySelector('h1')?.textContent?.trim() || null

      // Image
      const imageEl = document.querySelector('.product-image img, [data-testid="product-image"] img') as HTMLImageElement
      const image = imageEl?.src || null

      // Specs
      const specs: Record<string, string> = {}
      document.querySelectorAll('.specifications tr, .product-specs li').forEach(el => {
        const text = el.textContent || ''
        const parts = text.split(':')
        if (parts.length === 2) {
          specs[parts[0].trim()] = parts[1].trim()
        }
      })

      // Stock
      const stockEl = document.querySelector('[data-testid="availability"], .stock-status')
      const inStock = !stockEl?.textContent?.toLowerCase().includes('out of stock')

      return { title, price, image, specs, inStock }
    })

    await context.close()

    // Parse price
    let priceCents: number | null = null
    if (productData.price) {
      const priceMatch = productData.price.match(/\$?([\d,]+)\.?(\d{2})?/)
      if (priceMatch) {
        const dollars = parseInt(priceMatch[1].replace(/,/g, ''))
        const cents = priceMatch[2] ? parseInt(priceMatch[2]) : 0
        priceCents = dollars * 100 + cents
      }
    }

    const duration = Date.now() - startTime
    console.log(`Officeworks scrape complete: ${productData.title} - ${productData.price} (${duration}ms)`)

    res.json({
      success: true,
      data: { ...productData, priceCents },
      duration
    })

  } catch (error) {
    console.error('Officeworks scrape error:', error)
    if (context) await context.close()
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Generic scrape endpoint - works for any URL
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body
  const startTime = Date.now()

  if (!url) {
    return res.status(400).json({ error: 'URL required' })
  }

  let page: Page | null = null
  let context = null

  try {
    const browser = await getStealthBrowser()
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: USER_AGENT
    })
    page = await context.newPage()

    await page.mouse.move(100, 100)
    console.log(`Navigating to: ${url}`)
    await page.goto(url, { waitUntil: 'load', timeout: 60000 })

    await waitForCloudflare(page)
    await page.waitForTimeout(2000)

    // Get full page content
    const content = await page.content()
    const title = await page.title()

    // Take screenshot
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 })
    const screenshotBase64 = screenshot.toString('base64')

    await context.close()

    const duration = Date.now() - startTime
    console.log(`Generic scrape complete: ${title} (${duration}ms)`)

    res.json({
      success: true,
      data: {
        title,
        contentLength: content.length,
        screenshot: screenshotBase64
      },
      duration
    })

  } catch (error) {
    console.error('Generic scrape error:', error)
    if (context) await context.close()
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Batch scrape multiple Amazon URLs
app.post('/api/scrape-amazon-batch', async (req, res) => {
  const { urls } = req.body
  const startTime = Date.now()

  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: 'URLs array required' })
  }

  const results = []

  for (const url of urls) {
    try {
      // Call single scrape endpoint logic
      const browser = await getStealthBrowser()
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: USER_AGENT
      })
      const page = await context.newPage()

      await page.mouse.move(100, 100)
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForTimeout(3000)

      const productData = await page.evaluate(() => {
        const priceSelectors = [
          '.a-price .a-offscreen',
          '#priceblock_ourprice',
          '.priceToPay .a-offscreen'
        ]

        let price: string | null = null
        for (const selector of priceSelectors) {
          const el = document.querySelector(selector)
          if (el?.textContent) {
            price = el.textContent.trim()
            break
          }
        }

        const title = document.querySelector('#productTitle')?.textContent?.trim() || null
        const imageEl = document.querySelector('#landingImage') as HTMLImageElement
        const image = imageEl?.src || null
        const asinMatch = window.location.href.match(/\/dp\/([A-Z0-9]{10})/)
        const asin = asinMatch ? asinMatch[1] : null

        return { title, price, image, asin }
      })

      await context.close()

      let priceCents: number | null = null
      if (productData.price) {
        const priceMatch = productData.price.match(/\$?([\d,]+)\.?(\d{2})?/)
        if (priceMatch) {
          const dollars = parseInt(priceMatch[1].replace(/,/g, ''))
          const cents = priceMatch[2] ? parseInt(priceMatch[2]) : 0
          priceCents = dollars * 100 + cents
        }
      }

      results.push({
        url,
        success: true,
        data: { ...productData, priceCents }
      })

      // Small delay between requests
      await new Promise(r => setTimeout(r, 1000))

    } catch (error) {
      results.push({
        url,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const duration = Date.now() - startTime
  console.log(`Batch scrape complete: ${results.filter(r => r.success).length}/${urls.length} successful (${duration}ms)`)

  res.json({
    success: true,
    results,
    duration
  })
})

const PORT = process.env.PORT || 8080

// Initialize browsers and start server
initBrowsers().then(() => {
  app.listen(PORT, () => {
    console.log(`Price Finda Scraper running on port ${PORT}`)
    console.log('Endpoints:')
    console.log('  POST /api/scrape-amazon')
    console.log('  POST /api/scrape-harvey-norman')
    console.log('  POST /api/scrape-officeworks')
    console.log('  POST /api/scrape-amazon-batch')
    console.log('  POST /api/scrape')
    console.log('  GET  /health')
  })
})
