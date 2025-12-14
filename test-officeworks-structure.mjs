import puppeteer from 'puppeteer-core'

const AUTH = 'brd-customer-hl_98a67688-zone-pricedinda-country-au:tf574lc1fotk'
const SBR_WS = `wss://${AUTH}@brd.superproxy.io:9222`

async function main() {
  console.log('Analyzing Officeworks product structure...\n')

  const browser = await puppeteer.connect({ browserWSEndpoint: SBR_WS })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(120000)

  await page.goto('https://www.officeworks.com.au/shop/officeworks/c/technology/laptops/chromebooks', { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 5000))

  // Analyze the page structure
  const analysis = await page.evaluate(() => {
    const results = {
      productCards: [],
      potentialSelectors: [],
    }

    // Look for common product card patterns
    const cardSelectors = [
      '[data-testid*="product"]',
      '[class*="product-card"]',
      '[class*="ProductCard"]',
      '[class*="product-tile"]',
      '[class*="plp-product"]',
      '.product-item',
      'article[class*="product"]',
      '[data-product-id]',
      '[data-sku]',
    ]

    for (const selector of cardSelectors) {
      const elements = document.querySelectorAll(selector)
      if (elements.length > 0) {
        results.potentialSelectors.push({ selector, count: elements.length })
      }
    }

    // Look for product links with prices
    const links = Array.from(document.querySelectorAll('a[href*="/p/"]'))
    results.productLinks = links.length

    // Find all elements that look like prices
    const priceElements = document.querySelectorAll('[class*="price"], [class*="Price"]')
    results.priceElements = priceElements.length

    // Try to find product tiles - look for repeated structures
    const main = document.querySelector('main') || document.body
    const allDivs = main.querySelectorAll('div')

    // Find divs that contain both a price and "Chromebook"
    const productDivs = []
    for (const div of allDivs) {
      const text = div.innerText
      const hasPrice = /\$\d+/.test(text)
      const hasChromebook = /chromebook/i.test(text)
      const hasLink = div.querySelector('a[href*="/p/"]')

      if (hasPrice && hasChromebook && hasLink) {
        // Check if it's a reasonable size (not too large = whole page)
        if (text.length < 500) {
          const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/)
          const price = priceMatch ? parseFloat(priceMatch[1]) : null

          // Look for product name
          const linkText = hasLink.textContent?.trim()
          if (linkText && linkText.includes('Chromebook')) {
            productDivs.push({
              price,
              name: linkText,
              url: hasLink.href,
              textLength: text.length,
            })
          }
        }
      }
    }

    // Dedupe by URL
    const seen = new Set()
    results.productCards = productDivs.filter(p => {
      if (seen.has(p.url)) return false
      seen.add(p.url)
      return true
    })

    return results
  })

  console.log('=== Page Analysis ===')
  console.log('Product selectors found:', analysis.potentialSelectors)
  console.log('Product links (/p/):', analysis.productLinks)
  console.log('Price elements:', analysis.priceElements)
  console.log('\n=== Products Found ===')
  console.log(`Total: ${analysis.productCards.length}`)

  analysis.productCards.forEach((p, i) => {
    console.log(`\n${i + 1}. $${p.price} - ${p.name?.slice(0, 60)}...`)
    console.log(`   URL: ${p.url?.slice(0, 60)}...`)
  })

  await browser.close()
}

main().catch(console.error)
