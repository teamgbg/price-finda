/**
 * Scraper utility for fetching and parsing retailer pages
 * Uses native fetch for production runtime (Jina MCP is only for Claude)
 */

import { extractPriceFromMarkdown } from './ai-extractor'

interface ScrapedPrice {
  priceCents: number | null
  salePriceCents: number | null
  inStock: boolean
  productName?: string
  lastChecked: Date
  error?: string
}

// Retailer-specific scraping configurations
const RETAILER_CONFIGS: Record<string, {
  priceSelector: RegExp
  stockPatterns: { inStock: RegExp[]; outOfStock: RegExp[] }
}> = {
  'jb-hifi': {
    priceSelector: /\$([0-9,]+(?:\.[0-9]{2})?)/g,
    stockPatterns: {
      inStock: [/in\s*stock/i, /available/i, /add\s*to\s*cart/i],
      outOfStock: [/out\s*of\s*stock/i, /sold\s*out/i, /unavailable/i, /currently\s*unavailable/i],
    },
  },
  'officeworks': {
    priceSelector: /\$([0-9,]+(?:\.[0-9]{2})?)/g,
    stockPatterns: {
      inStock: [/in\s*stock/i, /available/i, /add\s*to\s*cart/i],
      outOfStock: [/out\s*of\s*stock/i, /unavailable\s*online/i, /not\s*available/i],
    },
  },
  'harvey-norman': {
    priceSelector: /\$([0-9,]+(?:\.[0-9]{2})?)/g,
    stockPatterns: {
      inStock: [/in\s*stock/i, /available/i],
      outOfStock: [/out\s*of\s*stock/i, /sold\s*out/i],
    },
  },
  'the-good-guys': {
    priceSelector: /\$([0-9,]+(?:\.[0-9]{2})?)/g,
    stockPatterns: {
      inStock: [/in\s*stock/i, /available/i, /add\s*to\s*cart/i],
      outOfStock: [/out\s*of\s*stock/i, /sold\s*out/i],
    },
  },
  'amazon-au': {
    priceSelector: /\$([0-9,]+(?:\.[0-9]{2})?)/g,
    stockPatterns: {
      inStock: [/in\s*stock/i, /available/i, /add\s*to\s*cart/i],
      outOfStock: [/currently\s*unavailable/i, /out\s*of\s*stock/i],
    },
  },
  'bing-lee': {
    priceSelector: /\$([0-9,]+(?:\.[0-9]{2})?)/g,
    stockPatterns: {
      inStock: [/in\s*stock/i, /available/i],
      outOfStock: [/out\s*of\s*stock/i, /sold\s*out/i],
    },
  },
}

/**
 * Convert price string to cents
 */
function priceToCents(priceStr: string): number {
  // Remove commas and convert to number
  const cleaned = priceStr.replace(/,/g, '')
  const amount = parseFloat(cleaned)
  return Math.round(amount * 100)
}

/**
 * Extract prices from HTML/text content
 */
function extractPrices(content: string): number[] {
  const prices: number[] = []
  const priceRegex = /\$([0-9,]+(?:\.[0-9]{2})?)/g
  let match

  while ((match = priceRegex.exec(content)) !== null) {
    const cents = priceToCents(match[1])
    // Filter out unrealistic prices (< $50 or > $5000 for Chromebooks)
    if (cents >= 5000 && cents <= 500000) {
      prices.push(cents)
    }
  }

  return prices
}

/**
 * Check stock status from content
 */
function checkStock(content: string, retailerSlug: string): boolean {
  const config = RETAILER_CONFIGS[retailerSlug] || RETAILER_CONFIGS['jb-hifi']

  // Check for out of stock patterns first (more specific)
  for (const pattern of config.stockPatterns.outOfStock) {
    if (pattern.test(content)) {
      return false
    }
  }

  // Then check for in stock patterns
  for (const pattern of config.stockPatterns.inStock) {
    if (pattern.test(content)) {
      return true
    }
  }

  // Default to true if no patterns match (assume in stock)
  return true
}

/**
 * Fetch and parse a retailer page
 */
export async function scrapeRetailerPage(
  url: string,
  retailerSlug: string
): Promise<ScrapedPrice> {
  const now = new Date()

  try {
    // Use Jina Reader API for clean text extraction (free tier available)
    // This converts any page to clean markdown, perfect for AI extraction
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`

    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'text',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    if (!response.ok) {
      // Fallback to direct fetch if Jina fails
      const directResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(30000),
      })

      if (!directResponse.ok) {
        return {
          priceCents: null,
          salePriceCents: null,
          inStock: false,
          lastChecked: now,
          error: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const html = await directResponse.text()
      return parseContent(html, retailerSlug, now)
    }

    const content = await response.text()
    return parseContent(content, retailerSlug, now)
  } catch (error) {
    return {
      priceCents: null,
      salePriceCents: null,
      inStock: false,
      lastChecked: now,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Parse content and extract price/stock info
 */
async function parseContent(
  content: string,
  retailerSlug: string,
  now: Date
): Promise<ScrapedPrice> {
  // First try AI extraction for better accuracy
  const aiResult = await extractPriceFromMarkdown(content)

  if (aiResult && aiResult.priceCents) {
    return {
      priceCents: aiResult.priceCents,
      salePriceCents: aiResult.salePriceCents || null,
      inStock: aiResult.inStock,
      lastChecked: now,
    }
  }

  // Fallback to regex extraction
  const prices = extractPrices(content)
  const inStock = checkStock(content, retailerSlug)

  if (prices.length === 0) {
    return {
      priceCents: null,
      salePriceCents: null,
      inStock,
      lastChecked: now,
      error: 'Could not extract price from page',
    }
  }

  // First price is usually the current price
  // If there are two prices close together, the lower might be sale price
  const sortedPrices = [...prices].sort((a, b) => a - b)
  const lowestPrice = sortedPrices[0]
  const highestPrice = sortedPrices[sortedPrices.length - 1]

  // If there's a significant difference, assume it's a sale
  const priceDiffPercent = ((highestPrice - lowestPrice) / highestPrice) * 100
  const isOnSale = priceDiffPercent > 5 && priceDiffPercent < 50

  return {
    priceCents: isOnSale ? highestPrice : lowestPrice,
    salePriceCents: isOnSale ? lowestPrice : null,
    inStock,
    lastChecked: now,
  }
}

/**
 * Batch scrape multiple URLs with rate limiting
 */
export async function batchScrapeUrls(
  listings: Array<{ url: string; retailerSlug: string; listingId: string }>
): Promise<Map<string, ScrapedPrice>> {
  const results = new Map<string, ScrapedPrice>()
  const BATCH_SIZE = 5 // Process 5 at a time
  const DELAY_MS = 2000 // 2 second delay between batches

  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const batch = listings.slice(i, i + BATCH_SIZE)

    const batchResults = await Promise.all(
      batch.map(async ({ url, retailerSlug, listingId }) => {
        const result = await scrapeRetailerPage(url, retailerSlug)
        return { listingId, result }
      })
    )

    for (const { listingId, result } of batchResults) {
      results.set(listingId, result)
    }

    // Delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < listings.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
  }

  return results
}
