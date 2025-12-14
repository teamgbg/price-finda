import { config } from 'dotenv'
config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { products } from './src/db/schema.ts'
import { eq } from 'drizzle-orm'

const sqlClient = neon(process.env.DATABASE_URL)
const db = drizzle(sqlClient)

// Extract clean model name from full product name
function cleanName(fullName) {
  let name = fullName
  
  // Remove common suffixes and specs
  name = name.replace(/\s*-\s*\d+GB\s*RAM.*$/i, '')
  name = name.replace(/\s*\[\d+GB.*?\]/g, '')
  name = name.replace(/\s*\(\s*Intel.*?\)/gi, '')
  name = name.replace(/\s*\(\s*MTK.*?\)/gi, '')
  name = name.replace(/\s*\(\s*\d+GB.*?\)/g, '')
  name = name.replace(/\s*\d+GB\/\d+GB/g, '')
  name = name.replace(/\s*\d+\/\d+GB/g, '')
  name = name.replace(/\s*\d+GB\s*eMMC/gi, '')
  name = name.replace(/\s*\d+GB\s*SSD/gi, '')
  name = name.replace(/\s*Celeron[\s\-]?\w*/gi, '')
  name = name.replace(/\s*Intel\s+N\d+/gi, '')
  name = name.replace(/\s*N\d{3,4}/g, '')
  name = name.replace(/\s*i[357][\s\-]\w+/gi, '')
  name = name.replace(/\s*Core\s+i\d/gi, '')
  name = name.replace(/\s*Kompanio[\s\-]?\d+/gi, '')
  name = name.replace(/\s*Snapdragon.*?Gen\s*\d/gi, '')
  name = name.replace(/\s*SD\s*7c.*$/gi, '')
  name = name.replace(/\s*MediaTek/gi, '')
  
  // Remove screen specs
  name = name.replace(/\s*\d{1,2}(\.\d)?[""]?\s*(inch|")/gi, '')
  name = name.replace(/\s*FHD/gi, '')
  name = name.replace(/\s*HD/gi, '')
  name = name.replace(/\s*Full/gi, '')
  name = name.replace(/\s*WUXGA/gi, '')
  
  // Remove "Chromebook Laptop" variations
  name = name.replace(/\s*Chromebook\s*Laptop/gi, '')
  name = name.replace(/\s*Laptop/gi, '')
  name = name.replace(/\s*2-in-1/gi, '')
  name = name.replace(/\s*2in1/gi, '')
  name = name.replace(/\s*Flip/gi, '')
  
  // Remove trailing specs and junk
  name = name.replace(/\s*-\s*Glacier Silver/gi, ' Silver')
  name = name.replace(/\s*-\s*Abyss Blue/gi, ' Blue')
  name = name.replace(/\s*Grey$/i, '')
  name = name.replace(/\s*Silver$/i, '')
  name = name.replace(/\s*with Gemini/gi, ' Plus')
  name = name.replace(/\s*\(13th Gen.*?\)/gi, '')
  name = name.replace(/\s*\.\.\./g, '')
  name = name.replace(/\s*\(\s*\)/g, '')
  name = name.replace(/\s*\(\s*NX\..*?\)/g, '')
  
  // Clean up whitespace
  name = name.replace(/\s+/g, ' ').trim()
  
  // Remove trailing punctuation
  name = name.replace(/[\s\-,]+$/, '')
  
  return name
}

async function main() {
  console.log('=== Cleaning Product Names ===\n')

  const allProducts = await db.select({
    id: products.id,
    name: products.name,
  }).from(products)

  console.log('Processing', allProducts.length, 'products\n')

  for (const product of allProducts) {
    const cleanedName = cleanName(product.name)
    
    if (cleanedName !== product.name) {
      console.log('Before:', product.name)
      console.log('After: ', cleanedName)
      console.log()
      
      await db.update(products)
        .set({ name: cleanedName })
        .where(eq(products.id, product.id))
    }
  }

  console.log('Done!')
}

main().catch(console.error)
