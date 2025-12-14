import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const JINA_API_KEY = process.env.JINA_API_KEY || ''
const url = process.argv[2]

if (!url) {
  console.log('Usage: bun run test-retailer2.mjs <url>')
  process.exit(1)
}

console.log('Testing URL:', url)

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

console.log('\n=== All links (first 30) ===')
let count = 0
for (const [name, linkUrl] of Object.entries(links)) {
  console.log(`${name.substring(0, 50).padEnd(50)} -> ${linkUrl.substring(0, 80)}`)
  count++
  if (count >= 30) break
}

console.log(`\nTotal links: ${Object.keys(links).length}`)
