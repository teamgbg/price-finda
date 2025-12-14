import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const JINA_API_KEY = process.env.JINA_API_KEY || ''
const url = 'https://www.jbhifi.com.au/collections/computers-tablets/chromebooks'

console.log('Fetching:', url)

const response = await fetch('https://r.jina.ai/' + encodeURIComponent(url), {
  headers: {
    'Accept': 'application/json',
    'Authorization': `Bearer ${JINA_API_KEY}`,
    'X-Return-Format': 'markdown',
    'X-Target-Selector': 'main',
  },
  signal: AbortSignal.timeout(30000),
})

const json = await response.json()
console.log('Status:', response.status)
console.log('Title:', json.data?.title)

const markdown = json.data?.content || ''
console.log('\n=== First 3000 chars of markdown ===')
console.log(markdown.substring(0, 3000))
