// Debug script to see what URLs the scraper finds vs what's in the database

import { db } from './src/db/index.js'
import { retailerListings } from './src/db/schema.js'

const CATEGORY_URL = 'https://www.jbhifi.com.au/collections/computers-tablets/chromebooks'

// Fetch product links using same method as scraper
async function fetchProductLinks() {
  console.log('Fetching category page with Jina...')

  const response = await fetch('https://r.jina.ai/' + encodeURIComponent(CATEGORY_URL), {
    headers: {
      'Accept': 'application/json',
      'X-With-Links-Summary': 'true',
      'X-Target-Selector': 'main',
    },
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    console.error('Failed to fetch:', response.status)
    return []
  }

  const json = await response.json()
  const links = json.data?.links || {}

  // Filter for product URLs only
  const productLinks = Object.entries(links)
    .filter(([, url]) => url.includes('/products/'))
    .map(([name, url]) => ({
      name: name.replace(/[\d.]+\(\d+\)$/, '').trim(),
      url,
    }))

  return productLinks
}

// Main
const productLinks = await fetchProductLinks()

console.log(`\n=== FOUND ${productLinks.length} PRODUCT LINKS FROM CATEGORY PAGE ===\n`)
productLinks.forEach((p, i) => {
  console.log(`${i+1}. ${p.name}`)
  console.log(`   ${p.url}`)
})

// Get existing URLs from database
const existingListings = await db.select({ url: retailerListings.retailerUrl }).from(retailerListings)
const existingUrls = new Set(existingListings.map(l => l.url))

console.log(`\n=== DATABASE HAS ${existingUrls.size} LISTINGS ===\n`)

// Find URLs that are on the page but NOT in database
const missingUrls = productLinks.filter(p => !existingUrls.has(p.url))
console.log(`\n=== MISSING FROM DATABASE (${missingUrls.length}) ===\n`)
missingUrls.forEach((p, i) => {
  console.log(`${i+1}. ${p.name}`)
  console.log(`   ${p.url}`)
})

// Find URLs in database that are NOT on the page anymore
const removedUrls = [...existingUrls].filter(url => !productLinks.some(p => p.url === url))
console.log(`\n=== IN DATABASE BUT NOT ON PAGE (${removedUrls.length}) ===\n`)
removedUrls.forEach((url, i) => {
  console.log(`${i+1}. ${url}`)
})

process.exit(0)
