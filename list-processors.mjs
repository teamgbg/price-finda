import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client)

// Get unique processors from the database
const processors = await db.execute(sql`
  SELECT DISTINCT processor, COUNT(*) as count
  FROM products
  WHERE processor IS NOT NULL
  GROUP BY processor
  ORDER BY count DESC
`)

console.log('Unique processors in database:')
console.log('==============================')
for (const row of processors.rows) {
  console.log(`${row.processor} (${row.count} products)`)
}
console.log(`\nTotal unique processors: ${processors.rows.length}`)
