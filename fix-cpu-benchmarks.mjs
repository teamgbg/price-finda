import { config } from 'dotenv'
config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { products } from './src/db/schema.ts'
import { eq, isNull, or, like } from 'drizzle-orm'

const sqlClient = neon(process.env.DATABASE_URL)
const db = drizzle(sqlClient)

// Benchmark scores from Geekbench (approximate single-core scores)
const CPU_BENCHMARKS = {
  // Intel Celeron
  'N4500': 1813,
  'N4020': 1200,
  'N5100': 1900,
  'N5105': 1900,
  
  // Intel N-series (Alder Lake)
  'N100': 5356,
  'N200': 5500,
  'N305': 5800,
  
  // Intel Core (newer)
  'i3-N305': 5800,
  'Core i3': 5800,
  'Core 3': 5800,
  'i5-1334U': 8500,
  'i5-1335U': 8500,
  'Core i5': 8500,
  
  // MediaTek
  'Kompanio 520': 1500,
  'Kompanio 838': 2000,
  'MTK 838': 2000,
  
  // Snapdragon
  '7c Gen 2': 2200,
  
  // Intel N50
  'N50': 4500,
}

async function main() {
  console.log('=== Fixing CPU Benchmark Scores ===\n')

  // Get all products missing CPU benchmarks
  const allProducts = await db.select({
    id: products.id,
    name: products.name,
    processor: products.processor,
    cpuBenchmark: products.cpuBenchmark,
  }).from(products)

  const needsUpdate = allProducts.filter(p => !p.cpuBenchmark && p.processor)
  console.log('Products needing benchmark update:', needsUpdate.length, '\n')

  let updated = 0
  for (const product of needsUpdate) {
    // Find matching benchmark
    let benchmark = null
    const proc = product.processor || ''
    
    for (const [key, score] of Object.entries(CPU_BENCHMARKS)) {
      if (proc.includes(key)) {
        benchmark = score
        break
      }
    }
    
    if (benchmark) {
      console.log('Updating:', product.name.slice(0, 45))
      console.log('  Processor:', proc)
      console.log('  Benchmark:', benchmark)
      
      await db.update(products)
        .set({ cpuBenchmark: benchmark })
        .where(eq(products.id, product.id))
      
      updated++
    } else {
      console.log('No match:', proc, '|', product.name.slice(0, 40))
    }
  }

  console.log('\nUpdated', updated, 'products')
}

main().catch(console.error)
