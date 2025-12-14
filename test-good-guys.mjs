import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const JINA_API_KEY = process.env.JINA_API_KEY || ''

console.log('Testing The Good Guys with X-With-Links-Summary...')

const response = await fetch('https://r.jina.ai/' + encodeURIComponent('https://www.thegoodguys.com.au/computers-tablets-and-gaming/desktop-and-laptop/chromebook'), {
  headers: {
    'Accept': 'application/json',
    'Authorization': 'Bearer ' + JINA_API_KEY,
    'X-With-Links-Summary': 'true',
  },
  signal: AbortSignal.timeout(30000),
})

const json = await response.json()
const links = json.data?.links || {}

console.log('\n=== Links containing "chromebook" in URL ===')
let count = 0
for (const [name, url] of Object.entries(links)) {
  if (url.toLowerCase().includes('chromebook') && !url.includes('/desktop-and-laptop/chromebook')) {
    console.log(name.substring(0, 60) + ' -> ' + url)
    count++
  }
}
console.log('\nTotal chromebook product links: ' + count)
console.log('Total links: ' + Object.keys(links).length)
