import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const JINA_API_KEY = process.env.JINA_API_KEY || ''
const url = process.argv[2]

if (!url) {
  console.log('Usage: bun run test-links.mjs <url>')
  process.exit(1)
}

console.log('Testing URL:', url)
console.log('Using Jina API key:', JINA_API_KEY ? 'YES' : 'NO')

const response = await fetch('https://r.jina.ai/' + encodeURIComponent(url), {
  headers: {
    'Accept': 'application/json',
    'Authorization': `Bearer ${JINA_API_KEY}`,
    'X-With-Links-Summary': 'true',
  },
  signal: AbortSignal.timeout(30000),
})

const json = await response.json()
const links = json.data?.links || {}

console.log('\n=== All links (first 50) ===')
let count = 0
for (const [name, linkUrl] of Object.entries(links)) {
  const shortName = name.substring(0, 60).padEnd(60)
  console.log(shortName + ' -> ' + linkUrl)
  count++
  if (count >= 50) break
}

console.log('\nTotal links: ' + Object.keys(links).length)
