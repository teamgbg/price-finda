import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client)

// CPU Benchmark multi-threaded scores from CPUBenchmark.net (PassMark)
// Source: https://www.cpubenchmark.net
// Last updated: December 2024
const CPU_BENCHMARKS = {
  // Intel N-series (budget/efficiency)
  'N4500': 1813,
  'N100': 5356,
  'N150': 5800,    // Estimated based on N100+
  'N200': 6200,    // Estimated

  // Intel Core i3 N-series
  'N305': 9587,
  'i3-N305': 9587,

  // Intel Core 3 N-series (newer naming)
  'N355': 10521,
  '3 N355': 10521,
  '3-N355': 10521,

  // Intel Core i5 (laptop)
  'i5-1334U': 13302,
  'i5-1335U': 13500,  // Similar to 1334U
  'i5-1340P': 17000,  // P-series higher

  // Intel Core i7 (laptop)
  'i7-1355U': 14200,
  'i7-1365U': 14500,

  // Intel Celeron (older)
  'N4020': 1300,
  'N5100': 3300,
  'N5105': 3400,

  // MediaTek Kompanio (ARM)
  'Kompanio 520': 3723,
  'MT8186': 3723,
  'Kompanio 528': 3900,
  'MT8186T': 3900,
  'Kompanio 838': 4500,    // Estimated
  'MTK 838': 4500,
  'MTK Ultra 910': 5500,   // Higher-end MediaTek, estimated

  // Qualcomm Snapdragon (if any)
  'Snapdragon 7c': 3200,
  'Snapdragon 7c Gen 2': 3500,
}

// Normalize processor name to match our lookup
function normalizeProcessor(processor) {
  if (!processor) return null

  const upper = processor.toUpperCase()

  // Direct model number extraction
  for (const [key, score] of Object.entries(CPU_BENCHMARKS)) {
    if (upper.includes(key.toUpperCase())) {
      return score
    }
  }

  // Special cases
  if (upper.includes('CELERON') && upper.includes('N4500')) return CPU_BENCHMARKS['N4500']
  if (upper.includes('N100')) return CPU_BENCHMARKS['N100']
  if (upper.includes('N305')) return CPU_BENCHMARKS['N305']
  if (upper.includes('N355')) return CPU_BENCHMARKS['N355']
  if (upper.includes('1334U')) return CPU_BENCHMARKS['i5-1334U']
  if (upper.includes('KOMPANIO 520')) return CPU_BENCHMARKS['Kompanio 520']
  if (upper.includes('KOMPANIO 528')) return CPU_BENCHMARKS['Kompanio 528']
  if (upper.includes('KOMPANIO 838') || upper.includes('MTK 838')) return CPU_BENCHMARKS['MTK 838']
  if (upper.includes('ULTRA 910')) return CPU_BENCHMARKS['MTK Ultra 910']

  return null
}

// Get all products with processors
const products = await db.execute(sql`
  SELECT id, processor, cpu_benchmark
  FROM products
  WHERE processor IS NOT NULL
`)

console.log(`Found ${products.rows.length} products with processors`)
console.log('========================================')

let updated = 0
let skipped = 0
let noMatch = []

for (const product of products.rows) {
  const benchmark = normalizeProcessor(product.processor)

  if (benchmark) {
    if (product.cpu_benchmark !== benchmark) {
      await db.execute(sql`
        UPDATE products
        SET cpu_benchmark = ${benchmark}
        WHERE id = ${product.id}
      `)
      console.log(`✓ Updated "${product.processor}" → ${benchmark}`)
      updated++
    } else {
      console.log(`- Already set: "${product.processor}" = ${benchmark}`)
      skipped++
    }
  } else {
    console.log(`✗ No match: "${product.processor}"`)
    noMatch.push(product.processor)
  }
}

console.log('========================================')
console.log(`Updated: ${updated}`)
console.log(`Already correct: ${skipped}`)
console.log(`No match: ${noMatch.length}`)
if (noMatch.length > 0) {
  console.log('\nProcessors without benchmark matches:')
  for (const p of [...new Set(noMatch)]) {
    console.log(`  - ${p}`)
  }
}
