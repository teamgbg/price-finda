import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client)

const listings = await db.execute(sql`
  SELECT 
    p.name as product_name,
    r.name as retailer_name,
    rl.current_price_cents,
    rl.retailer_url
  FROM retailer_listings rl
  JOIN products p ON rl.product_id = p.id
  JOIN retailers r ON rl.retailer_id = r.id
  ORDER BY r.name, p.name
  LIMIT 10
`)

console.log('\n=== LISTINGS WITH PRICES AND URLs ===\n')
for (const l of listings.rows) {
  console.log(l.product_name.substring(0, 50))
  console.log('  Retailer: ' + l.retailer_name)
  console.log('  Price: $' + (l.current_price_cents / 100))
  console.log('  URL: ' + l.retailer_url)
  console.log('')
}
