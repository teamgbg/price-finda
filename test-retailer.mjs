import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const JINA_API_KEY = process.env.JINA_API_KEY || ''
const url = process.argv[2]

if (!url) {
  console.log('Usage: bun run test-retailer.mjs <url>')
  process.exit(1)
}

console.log('Testing URL:', url)
console.log('Using Jina API key:', JINA_API_KEY ? 'YES' : 'NO')

// Test category page for links
const response = await fetch('https://r.jina.ai/' + encodeURIComponent(url), {
  headers: {
    'Accept': 'application/json',
    'Authorization': `Bearer ${JINA_API_KEY}`,
    'X-With-Links-Summary': 'true',
    'X-Target-Selector': 'main',
  },
  signal: AbortSignal.timeout(30000),
})

const json = await response.json()
const links = json.data?.links || {}

console.log('\n=== Links containing "product" ===')
let count = 0
for (const [name, linkUrl] of Object.entries(links)) {
  if (linkUrl.includes('/product')) {
    console.log(`${name.substring(0, 60)}: ${linkUrl}`)
    count++
    if (count >= 15) break
  }
}

console.log(`\nTotal links with "product": ${Object.entries(links).filter(([,u]) => u.includes('/product')).length}`)
