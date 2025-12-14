import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const JINA_API_KEY = process.env.JINA_API_KEY || ''
const url = 'https://www.jbhifi.com.au/products/hp-14a-nf0005tu-14-hd-touchscreen-chromebook-laptop-intel-n10064gb'

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

// Find lines containing $479 (the actual price)
console.log('=== Lines containing $479 ===')
const lines = markdown.split('\n')
for (const line of lines) {
  if (line.includes('$479')) {
    console.log('Line:', JSON.stringify(line))
    console.log('')
  }
}

// Also check for "Add to cart" near prices
console.log('=== Lines containing "Add to cart" ===')
for (const line of lines) {
  if (line.toLowerCase().includes('add to cart')) {
    console.log('Line:', JSON.stringify(line))
  }
}
