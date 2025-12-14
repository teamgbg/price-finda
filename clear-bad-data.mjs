import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client)

// Clear all data in correct order (foreign key dependencies)
await db.execute(sql`DELETE FROM price_history`)
await db.execute(sql`DELETE FROM retailer_listings`)
await db.execute(sql`DELETE FROM products`)
console.log('Cleared all listings and products')

// Show remaining data
const listings = await db.execute(sql`SELECT COUNT(*) FROM retailer_listings`)
const products = await db.execute(sql`SELECT COUNT(*) FROM products`)
console.log('Listings:', listings.rows[0].count)
console.log('Products:', products.rows[0].count)
