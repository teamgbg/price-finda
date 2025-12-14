import { chromium as chromiumExtra } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import * as fs from 'fs'

chromiumExtra.use(StealthPlugin())

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function testHarveyNorman() {
  const browser = await chromiumExtra.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--window-size=1920,1080',
      '--start-maximized',
      '--disable-gpu',
      '--enable-webgl',
      '--ignore-certificate-errors'
    ]
  })

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: USER_AGENT,
    locale: 'en-AU',
    timezoneId: 'Australia/Sydney',
    geolocation: { longitude: 151.2093, latitude: -33.8688 }, // Sydney
    permissions: ['geolocation'],
    extraHTTPHeaders: {
      'Accept-Language': 'en-AU,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    }
  })
  const page = await context.newPage()

  // Override webdriver detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] })
    Object.defineProperty(navigator, 'languages', { get: () => ['en-AU', 'en'] })
    // @ts-ignore
    window.chrome = { runtime: {} }
    // @ts-ignore
    delete navigator.__proto__.webdriver
  })

  // Add human-like behavior
  await page.mouse.move(100, 100)
  await page.waitForTimeout(500)
  await page.mouse.move(200, 200)
  await page.waitForTimeout(500)

  console.log('Navigating to Harvey Norman...')
  await page.goto('https://www.harveynorman.com.au/lenovo-ideapad-slim-3i-chromebook-plus-15-6-core-3-100u-256gb-128gb-8gb-laptop-arctic-grey-83gd0003au-sku-1150816', {
    waitUntil: 'networkidle',
    timeout: 60000
  })

  // Check for Cloudflare
  console.log('Checking for Cloudflare...')
  let content = await page.content()
  let attempts = 0
  while (attempts < 10 && (content.includes('challenge-platform') || content.includes('Just a moment') || content.includes('Checking your browser'))) {
    console.log(`Cloudflare detected, waiting... (attempt ${attempts + 1})`)
    await page.mouse.move(Math.random() * 500 + 100, Math.random() * 500 + 100)
    await page.waitForTimeout(5000)
    content = await page.content()
    attempts++
  }

  if (attempts >= 10) {
    console.log('Could not bypass Cloudflare')
    await page.screenshot({ path: 'harvey-norman-blocked.png', fullPage: true })
  } else {
    console.log('Cloudflare passed or not present')
    await page.screenshot({ path: 'harvey-norman-success.png', fullPage: true })
  }

  // Wait for page to fully load
  await page.waitForTimeout(5000)

  // Log page title and URL
  console.log('Page title:', await page.title())
  console.log('Page URL:', page.url())

  // Try to find product elements
  const title = await page.evaluate(() => {
    return document.querySelector('h1')?.textContent?.trim() ||
           document.querySelector('[data-testid="product-title"]')?.textContent?.trim() ||
           document.querySelector('.product-name')?.textContent?.trim()
  })
  console.log('Found title:', title)

  // Try to find price
  const price = await page.evaluate(() => {
    const priceSelectors = [
      '.price-value',
      '.product-price',
      '[data-price]',
      '.price',
      '.pdp-price',
      '[data-testid="price"]',
      '.now-price',
      '.selling-price'
    ]
    for (const sel of priceSelectors) {
      const el = document.querySelector(sel)
      if (el?.textContent?.includes('$')) {
        return { selector: sel, value: el.textContent.trim() }
      }
    }
    // Search all text for price
    const allText = document.body.innerText
    const priceMatch = allText.match(/\$\d{2,4}(\.\d{2})?/)
    return priceMatch ? { selector: 'text', value: priceMatch[0] } : null
  })
  console.log('Found price:', price)

  // Save HTML content
  fs.writeFileSync('harvey-norman-content.html', content)
  console.log('Saved HTML content to harvey-norman-content.html')

  await browser.close()
  console.log('Test complete')
}

testHarveyNorman().catch(console.error)
