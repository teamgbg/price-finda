import puppeteer from 'puppeteer-core'

const AUTH = 'brd-customer-hl_98a67688-zone-pricedinda-country-au:tf574lc1fotk'
const SBR_WS = `wss://${AUTH}@brd.superproxy.io:9222`
const TEST_URL = 'https://www.harveynorman.com.au/computers-tablets/computers/chromebooks'

async function main() {
  console.log('Scraping Harvey Norman Chromebooks...')
  console.log('URL:', TEST_URL)

  const browser = await puppeteer.connect({ browserWSEndpoint: SBR_WS })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(120000)

  await page.goto(TEST_URL, { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 5000))

  console.log('Title:', await page.title())

  const data = await page.evaluate(() => {
    const text = document.body.innerText
    const prices = text.match(/\$[\d,]+(?:\.\d{2})?/g) || []
    const validPrices = prices
      .map(p => parseFloat(p.replace('$', '').replace(',', '')))
      .filter(p => p >= 150 && p <= 2000)

    return {
      prices: [...new Set(validPrices)],
      snippet: text.slice(0, 3000)
    }
  })

  console.log('\nPrices found:', data.prices.map(p => '$' + p).join(', '))
  console.log('\n--- Page Content ---')
  console.log(data.snippet)

  await browser.close()
}

main()
