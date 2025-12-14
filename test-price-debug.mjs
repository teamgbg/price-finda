import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const JINA_API_KEY = process.env.JINA_API_KEY || ''

// Fetch a specific product page
const url = 'https://www.jbhifi.com.au/products/hp-14a-nf0005tu-14-hd-touchscreen-chromebook-laptop-intel-n10064gb'
console.log('Fetching:', url)

const response = await fetch('https://r.jina.ai/' + encodeURIComponent(url), {
  headers: {
    'Accept': 'application/json',
    'Authorization': `Bearer ${JINA_API_KEY}`,
    'X-Return-Format': 'markdown',
    'X-With-Images-Summary': 'all',
  },
  signal: AbortSignal.timeout(30000),
})

const json = await response.json()
const markdown = json.data?.content || ''

console.log('Title:', json.data?.title)
console.log('\n=== Looking for [$XXX] patterns ===')
const linkPriceMatches = markdown.match(/\[\$\d+(?:,\d{3})*(?:\.\d{2})?\]/g)
console.log('Link price matches:', linkPriceMatches)

console.log('\n=== All $ occurrences (first 20) ===')
const dollarMatches = markdown.match(/\$\d+(?:,\d{3})*(?:\.\d{2})?/g)
console.log(dollarMatches?.slice(0, 20))

console.log('\n=== Lines containing $ (first 10) ===')
const lines = markdown.split('\n')
let count = 0
for (const line of lines) {
  if (line.includes('$') && count < 10) {
    console.log(line.substring(0, 150))
    count++
  }
}
