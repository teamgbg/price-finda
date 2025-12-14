import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { products, retailerListings, brands, retailers, categories } from '@/db/schema'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 second timeout for Vercel

const JINA_API_KEY = process.env.JINA_API_KEY || ''

// Each retailer's chromebook category page - these contain ONLY chromebooks
// NOTE: Harvey Norman has anti-bot protection, Officeworks is down for maintenance
const DISCOVERY_SOURCES = [
  { retailerSlug: 'jb-hifi', categoryUrl: 'https://www.jbhifi.com.au/collections/computers-tablets/chromebooks' },
  // { retailerSlug: 'officeworks', categoryUrl: 'https://www.officeworks.com.au/shop/officeworks/c/technology/laptops/chromebooks' }, // DOWN
  { retailerSlug: 'the-good-guys', categoryUrl: 'https://www.thegoodguys.com.au/computers-tablets-and-gaming/desktop-and-laptop/chromebook' },
  { retailerSlug: 'pbtech', categoryUrl: 'https://www.pbtech.com/au/category/computers/laptops/chromebooks' },
]

interface ProductLink {
  name: string
  url: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100)
    .trim()
}

function extractBrand(productName: string): string {
  const knownBrands = ['Lenovo', 'HP', 'ASUS', 'Acer', 'Samsung', 'Dell', 'Google']
  for (const brand of knownBrands) {
    if (productName.toLowerCase().includes(brand.toLowerCase())) {
      return brand
    }
  }
  return 'Unknown'
}

// ============================================================================
// RETAILER-SPECIFIC SCRAPERS - Each retailer has unique page structure
// ============================================================================

// JB Hi-Fi: Uses X-Target-Selector to get main product grid, /products/ URLs
async function fetchJBHiFiLinks(categoryUrl: string): Promise<ProductLink[]> {
  try {
    const response = await fetch('https://r.jina.ai/' + encodeURIComponent(categoryUrl), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'X-With-Links-Summary': 'true',
        'X-Target-Selector': 'main', // JB Hi-Fi: filter to main grid, removes sidebar promos
      },
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) return []
    const json = await response.json()
    const links: Record<string, string> = json.data?.links || {}

    return Object.entries(links)
      .filter(([, url]) => url.includes('/products/'))
      .filter(([, url]) => !url.includes('/collections/'))
      .map(([name, url]) => ({ name: name.replace(/[\d.]+\(\d+\)$/, '').trim(), url }))
      .filter((item, i, self) => i === self.findIndex(t => t.url === item.url))
  } catch { return [] }
}

// Officeworks: Uses /shop/officeworks/p/ URLs
async function fetchOfficeworksLinks(categoryUrl: string): Promise<ProductLink[]> {
  try {
    const response = await fetch('https://r.jina.ai/' + encodeURIComponent(categoryUrl), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'X-With-Links-Summary': 'true',
      },
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) return []
    const json = await response.json()
    const links: Record<string, string> = json.data?.links || {}

    return Object.entries(links)
      .filter(([, url]) => url.includes('/shop/officeworks/p/'))
      .filter(([, url]) => !url.includes('/c/'))
      .map(([name, url]) => ({ name: name.trim(), url }))
      .filter((item, i, self) => i === self.findIndex(t => t.url === item.url))
  } catch { return [] }
}

// The Good Guys: Extract product links from markdown content (JavaScript-loaded links not in summary)
async function fetchTheGoodGuysLinks(categoryUrl: string): Promise<ProductLink[]> {
  try {
    // Fetch as markdown to extract links embedded in content
    const response = await fetch('https://r.jina.ai/' + encodeURIComponent(categoryUrl), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'X-Return-Format': 'markdown',
        'X-With-Links-Summary': 'true',
      },
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) return []
    const json = await response.json()

    // Try links summary first
    const links: Record<string, string> = json.data?.links || {}
    const products: ProductLink[] = []

    // Check links summary for chromebook products
    for (const [name, url] of Object.entries(links)) {
      if (url.includes('.thegoodguys.com.au/') &&
          url.toLowerCase().includes('chromebook') &&
          !url.includes('/computers-tablets') &&
          !url.includes('/whats-new')) {
        if (name && !name.startsWith('*') && !name.startsWith('!')) {
          products.push({ name: name.trim(), url })
        }
      }
    }

    // Also extract markdown links [text](url) from content
    const markdown = json.data?.content || ''
    const linkRegex = /\[([^\]]+)\]\((https:\/\/www\.thegoodguys\.com\.au\/[^)]+chromebook[^)]+)\)/gi
    let match
    while ((match = linkRegex.exec(markdown)) !== null) {
      const name = match[1]
      const url = match[2]
      if (name && !name.startsWith('*') && !name.startsWith('!') &&
          !url.includes('/whats-new') && !url.includes('/computers-tablets')) {
        products.push({ name: name.trim(), url })
      }
    }

    // Deduplicate by URL
    return products.filter((item, i, self) => i === self.findIndex(t => t.url === item.url))
  } catch { return [] }
}

// Harvey Norman: Uses /chromebooks/ in URL path
async function fetchHarveyNormanLinks(categoryUrl: string): Promise<ProductLink[]> {
  try {
    const response = await fetch('https://r.jina.ai/' + encodeURIComponent(categoryUrl), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'X-With-Links-Summary': 'true',
      },
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) return []
    const json = await response.json()
    const links: Record<string, string> = json.data?.links || {}

    return Object.entries(links)
      .filter(([, url]) => url.includes('/chromebooks/') && !url.endsWith('/chromebooks') && !url.endsWith('/chromebooks/'))
      .filter(([name]) => !name.startsWith('*'))
      .map(([name, url]) => ({ name: name.trim(), url }))
      .filter((item, i, self) => i === self.findIndex(t => t.url === item.url))
  } catch { return [] }
}

// PB Tech: Uses /product/ in URL path - MUST filter for Chromebook products only
// NOTE: PB Tech category page shows "X reviews" as link text instead of product names
// We need to extract the product name from the URL slug instead
async function fetchPBTechLinks(categoryUrl: string): Promise<ProductLink[]> {
  try {
    const response = await fetch('https://r.jina.ai/' + encodeURIComponent(categoryUrl), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'X-With-Links-Summary': 'true',
      },
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) return []
    const json = await response.json()
    const links: Record<string, string> = json.data?.links || {}

    // PB Tech product URLs: /product/NBKXXX/Product-Name-Here?is-review=1
    return Object.entries(links)
      .filter(([, url]) => url.includes('/product/NBK'))  // Only notebook products
      .filter(([name, url]) => {
        // Must be chromebook-related (URL contains chromebook)
        return url.toLowerCase().includes('chromebook')
      })
      .map(([linkText, url]) => {
        // Clean URL - remove ?is-review=1 query param and fix path
        let cleanUrl = url.split('?')[0]

        // Fix URL path: /category/computers/laptops/product/NBK... -> /product/NBK...
        // The links from category page have wrong base path
        cleanUrl = cleanUrl.replace(/\/category\/[^/]+\/[^/]+\/product\//, '/product/')

        // Extract product name from URL slug if link text is just "X reviews"
        let name = linkText.trim()
        if (/^\d+\s+reviews?$/i.test(name)) {
          // URL format: /product/NBKXXX/Product-Name-Here
          const urlParts = cleanUrl.split('/')
          const slug = urlParts[urlParts.length - 1]
          // Convert slug to readable name: "ASUS-Chromebook-CX1500CKA-156-FHD" -> "ASUS Chromebook CX1500CKA 156 FHD"
          name = slug.replace(/-/g, ' ').trim()
        }

        return { name, url: cleanUrl }
      })
      .filter(item => item.name && item.name.length > 3)
      .filter((item, i, self) => i === self.findIndex(t => t.url === item.url))
  } catch { return [] }
}

// Router function to call the correct retailer-specific scraper
async function fetchProductLinks(categoryUrl: string, retailerSlug: string): Promise<ProductLink[]> {
  switch (retailerSlug) {
    case 'jb-hifi': return fetchJBHiFiLinks(categoryUrl)
    case 'officeworks': return fetchOfficeworksLinks(categoryUrl)
    case 'the-good-guys': return fetchTheGoodGuysLinks(categoryUrl)
    case 'harvey-norman': return fetchHarveyNormanLinks(categoryUrl)
    case 'pbtech': return fetchPBTechLinks(categoryUrl)
    default: return []
  }
}

interface JinaImage {
  label: string
  url: string
}

interface PageContent {
  url: string
  title: string  // Page title from Jina - use for product name
  markdown: string
  images: JinaImage[]
}

// Fetch a single page from Jina with images
async function fetchSinglePage(url: string): Promise<PageContent | null> {
  try {
    const response = await fetch('https://r.jina.ai/' + encodeURIComponent(url), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'X-Return-Format': 'markdown',
        'X-With-Images-Summary': 'all',
      },
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) return null
    const json = await response.json()

    const markdown = json.data?.content || ''
    // Images come directly from Jina's response as { "Image N: label": "url" }
    const rawImages: Record<string, string> = json.data?.images || {}
    const images: JinaImage[] = Object.entries(rawImages).map(([label, imgUrl]) => ({
      label,
      url: imgUrl,
    }))

    return {
      url,
      title: json.data?.title || '',
      markdown,
      images,
    }
  } catch {
    return null
  }
}

// Fetch MULTIPLE pages in parallel via Promise.all (Jina handles concurrent requests)
async function fetchPageContents(urls: string[]): Promise<Map<string, PageContent>> {
  const results = new Map<string, PageContent>()
  if (!urls.length) return results

  // Jina paid API handles concurrent requests well - fetch all in parallel
  const fetches = await Promise.all(urls.map(url => fetchSinglePage(url)))

  for (let i = 0; i < fetches.length; i++) {
    const content = fetches[i]
    if (content) {
      results.set(urls[i], content)
    }
  }

  return results
}

// Find the main product image from Jina's image list
function findMainProductImage(images: JinaImage[], retailerSlug: string): string {
  // JB Hi-Fi: https://www.jbhifi.com.au/cdn/shop/files/659559-Product-0-I-xxx.jpg
  if (retailerSlug === 'jb-hifi') {
    for (const img of images) {
      if (img.url.includes('jbhifi.com.au/cdn/shop/files') && img.url.includes('-Product-0-I-')) {
        return img.url
      }
    }
    for (const img of images) {
      if (img.url.includes('jbhifi.com.au/cdn/shop/files') && img.url.includes('-Product-')) {
        return img.url
      }
    }
  }

  // Officeworks: Look for product images
  if (retailerSlug === 'officeworks') {
    for (const img of images) {
      if (img.url.includes('officeworks.com.au') && img.url.includes('/medias/')) {
        return img.url
      }
    }
  }

  // The Good Guys: Look for product images
  if (retailerSlug === 'the-good-guys') {
    for (const img of images) {
      if (img.url.includes('thegoodguys.com.au') && img.url.includes('/product_images/')) {
        return img.url
      }
    }
  }

  // PB Tech: Look for product images - prioritize /imgprod/ URLs (actual product photos)
  if (retailerSlug === 'pbtech') {
    // First priority: main product image (without __N suffix or NBKXXX.jpg)
    for (const img of images) {
      if (img.url.includes('/imgprod/') && !img.url.includes('__')) {
        return img.url
      }
    }
    // Second priority: /imgprod/ with __1 suffix (first angle)
    for (const img of images) {
      if (img.url.includes('/imgprod/') && img.url.includes('__1.')) {
        return img.url
      }
    }
    // Third priority: any /imgprod/ URL
    for (const img of images) {
      if (img.url.includes('/imgprod/')) {
        return img.url
      }
    }
    // Fourth priority: /thumbs/ large URLs (smaller but still product images)
    for (const img of images) {
      if (img.url.includes('/thumbs/') && img.url.includes('.large.')) {
        return img.url
      }
    }
  }

  // Generic fallback: First image that looks like a product image
  for (const img of images) {
    // Avoid logo/icon/placeholder images
    if (img.url.includes('logo') || img.url.includes('icon') || img.url.includes('placeholder')) {
      continue
    }
    // Look for larger images (likely product photos)
    if (img.url.match(/\.(jpg|jpeg|png|webp)/i)) {
      return img.url
    }
  }

  return ''
}

// Extract price using regex - more reliable than AI for exact numbers
function extractPriceFromMarkdown(markdown: string, retailerSlug: string): number | null {
  const lines = markdown.split('\n')

  // PRIORITY 1: Standalone "$XXX" on its own line - MOST RELIABLE
  // JB Hi-Fi shows the price on its own line like "$479"
  for (const line of lines) {
    const trimmed = line.trim()
    const exactMatch = trimmed.match(/^\$(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{2})?$/)
    if (exactMatch) {
      const price = parseInt(exactMatch[1].replace(/,/g, ''))
      if (price >= 100 && price <= 5000) return price
    }
  }

  // PRIORITY 2: JB Hi-Fi specific format - "$" on one line, then number on next line
  if (retailerSlug === 'jb-hifi') {
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim()
      const nextLine = lines[i + 1].trim()
      if (line === '$' && /^\d+$/.test(nextLine)) {
        const price = parseInt(nextLine)
        if (price >= 100 && price <= 5000) return price
      }
    }
  }

  // PRIORITY 3: Price inline like "Now $449" or "Price: $599" or "RRP $999"
  const inlineMatch = markdown.match(/(?:Now|Price|Sale|Only|Was|From|RRP)[\s:]*\$(\d{1,3}(?:,\d{3})*|\d+)/i)
  if (inlineMatch) {
    const price = parseInt(inlineMatch[1].replace(/,/g, ''))
    if (price >= 100 && price <= 5000) return price
  }

  // PRIORITY 4: Price at start of line like "$499 Add to cart"
  for (const line of lines) {
    const trimmed = line.trim()
    const startMatch = trimmed.match(/^\$(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{2})?\s/)
    if (startMatch) {
      const price = parseInt(startMatch[1].replace(/,/g, ''))
      if (price >= 100 && price <= 5000) return price
    }
  }

  // PRIORITY 5: Any $XXX in short lines (less reliable, avoid storage values)
  for (const line of lines) {
    const trimmed = line.trim()
    // Skip lines that look like storage specs or promo text
    if (trimmed.match(/\d+\s*GB/i)) continue
    if (trimmed.toLowerCase().includes('under $')) continue
    if (trimmed.toLowerCase().includes('for $')) continue
    const priceMatch = trimmed.match(/\$(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{2})?/)
    if (priceMatch && trimmed.length < 30) {
      const price = parseInt(priceMatch[1].replace(/,/g, ''))
      if (price >= 100 && price <= 5000) return price
    }
  }

  // PRIORITY 6 (LAST RESORT): Markdown link format [$XXX] - often picks up promo links
  // Only use if nothing else worked, and look for higher prices (avoid $30 promos)
  const linkPriceMatches = markdown.match(/\[\$(\d{3,4})\]/g)
  if (linkPriceMatches) {
    for (const match of linkPriceMatches) {
      const price = parseInt(match.replace(/[\[\$\]]/g, ''))
      if (price >= 200 && price <= 5000) return price
    }
  }

  return null
}

// Parse specs table from markdown - pure regex, no AI
function parseSpecsTable(markdown: string, retailerSlug: string): Record<string, string> {
  const specs: Record<string, string> = {}

  // Known field names across retailers (expanded for different retailers)
  // Sorted by length DESC so longer matches are tried first (e.g., "Screen Size (Inches)" before "Screen Size")
  const fieldNames = [
    // JB Hi-Fi fields
    'Computer type', 'Display size (inches)', 'Screen size range', 'Resolution (Pixels)',
    'Screen Resolution', 'Display type', 'Processor Type', 'Processor Model Number',
    'Processor Cores', 'Processor Clock Speed (GHz)', 'Processor Max. Clock Speed (GHz)',
    'RAM (GB)', 'RAM type', 'eMMC storage', 'SSD Storage', 'Total Storage', 'Storage Type',
    'USB 3.2 Ports', 'USB-C Ports', 'USB (Type-C) Port', 'Card reader', 'Headphone port (3.5mm)',
    'Webcam', 'Bluetooth', 'Wi-Fi', 'Battery WHr', 'Operating system', 'Colour',
    'Product Height (mm)', 'Product Width (mm)', 'Product Depth (mm)', 'Product Weight (kg)',
    'Manufacturer\'s warranty', 'Touch Screen', 'Backlit Keyboard', 'Panel Type',
    // Officeworks/Other retailer fields
    'Screen Size', 'Processor', 'Memory', 'Hard Drive', 'Hard Drive Type', 'Battery Life',
    'Weight', 'Operating System', 'Display', 'RAM', 'Storage', 'CPU', 'Touchscreen',
    // PB Tech fields
    'Display Size', 'CPU Model', 'Memory Size', 'Storage Size', 'Battery',
    // The Good Guys fields (concatenated format)
    'Screen Size (Inches)', 'Model Number', 'Brand',
    // The Good Guys additional fields
    'Processor Specifications', 'Processor Brand', 'Graphics Processing Unit',
    'Display Resolution (px)', 'Peak Brightness (Nits)', 'Screen Size Range',
    'Wired Connections', 'Memory', 'Type', 'Family',
  ].sort((a, b) => b.length - a.length) // Sort by length DESC for matching

  const lines = markdown.split('\n')

  // Format 1 (with Jina auth): "FieldName Value" on same line
  // e.g. "Processor Type MTK", "RAM (GB)4", "Battery WHr 47"
  for (const line of lines) {
    const trimmed = line.trim()
    for (const field of fieldNames) {
      // Check if line starts with field name
      if (trimmed.startsWith(field)) {
        // Extract value after field name
        const value = trimmed.slice(field.length).trim()
        if (value && !fieldNames.includes(value)) {
          specs[field] = value
        }
        break
      }
    }
  }

  // Format 2 (without auth): SPECS section with alternating field/value lines
  if (Object.keys(specs).length === 0) {
    const specsIndex = markdown.indexOf('SPECS')
    if (specsIndex > -1) {
      const specsEnd = markdown.indexOf('REVIEWS', specsIndex)
      const specsSection = markdown.slice(specsIndex, specsEnd > -1 ? specsEnd : undefined)
      const specsLines = specsSection.split('\n').map(l => l.trim()).filter(l => l.length > 0)

      for (let i = 0; i < specsLines.length - 1; i++) {
        const lineTxt = specsLines[i]
        if (fieldNames.includes(lineTxt)) {
          const value = specsLines[i + 1]
          if (value && !fieldNames.includes(value)) {
            specs[lineTxt] = value
          }
        }
      }
    }
  }

  // Format 3: "Key: Value" pattern (common in many retailers)
  // This handles BOTH single key:value per line AND multiple on same line
  for (const line of lines) {
    // Single key:value per line
    const colonMatch = line.match(/^([^:]+):\s*(.+)$/)
    if (colonMatch) {
      const [, key, value] = colonMatch
      const trimmedKey = key.trim()
      const trimmedValue = value.trim()
      if (trimmedKey && trimmedValue && trimmedKey.length < 50) {
        // Only add if not already set (Format 1/2 takes priority)
        if (!specs[trimmedKey]) {
          specs[trimmedKey] = trimmedValue
        }
      }
    }
  }

  // Format 4: The Good Guys concatenated format
  // e.g., "Brand:Lenovo Model Number:82N4005GAU Screen Size (Inches):15.6 Storage:128GB eMMC Memory:8GB"
  // Also handles PB Tech which has similar format
  if (retailerSlug === 'the-good-guys' || retailerSlug === 'pbtech' || Object.keys(specs).length < 3) {
    // Build regex to find all Key:Value pairs where Key is a known field
    for (const line of lines) {
      const trimmed = line.trim()
      // Skip short lines
      if (trimmed.length < 20) continue

      // Try each field name to extract its value
      for (const field of fieldNames) {
        // Look for "FieldName:" followed by value (up to next field or end)
        // Case-insensitive match for field name
        const fieldRegex = new RegExp(field.replace(/[()]/g, '\\$&') + '\\s*[:\\s]\\s*([^:]+?)(?=(?:' +
          fieldNames.map(f => f.replace(/[()]/g, '\\$&')).join('|') + ')|$)', 'i')
        const match = trimmed.match(fieldRegex)
        if (match && match[1]) {
          const value = match[1].trim()
          if (value && value.length > 0 && value.length < 100) {
            // Normalize field name to standard form
            if (!specs[field]) {
              specs[field] = value
            }
          }
        }
      }
    }
  }

  // Format 5: Markdown table rows "| Key | Value |"
  if (Object.keys(specs).length < 3) {
    for (const line of lines) {
      const tableMatch = line.match(/^\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|$/)
      if (tableMatch) {
        const [, key, value] = tableMatch
        const trimmedKey = key.trim()
        const trimmedValue = value.trim()
        if (trimmedKey && trimmedValue && trimmedKey !== '---' && trimmedKey.length < 50) {
          if (!specs[trimmedKey]) {
            specs[trimmedKey] = trimmedValue
          }
        }
      }
    }
  }

  return specs
}

// Extract product name from Jina page title (preferred) or fallback to markdown
function extractProductName(jinaTitle: string, markdown: string, retailerSlug: string): string {
  const knownBrands = ['Lenovo', 'HP', 'ASUS', 'Acer', 'Samsung', 'Dell', 'Google', 'MSI', 'Toshiba']

  // Helper to check if text contains a known brand
  const hasBrand = (text: string) => knownBrands.some(b => text.toLowerCase().includes(b.toLowerCase()))

  // Helper to check if text looks like garbage (testimonials, reviews, etc.)
  const isGarbage = (text: string) => {
    if (text.startsWith('[') || text.startsWith('By:') || text.startsWith('"')) return true
    if (text.includes('purchased') || text.includes('testimonial')) return true
    if (text.includes('review') && !text.toLowerCase().includes('chromebook')) return true
    return false
  }

  // Clean up a product name
  const cleanName = (name: string): string => {
    let cleaned = name.trim()
    // Remove retailer suffixes
    cleaned = cleaned.replace(/ - JB Hi-Fi$/i, '')
    cleaned = cleaned.replace(/ - Officeworks$/i, '')
    cleaned = cleaned.replace(/ \| The Good Guys$/i, '')
    cleaned = cleaned.replace(/ - PB Tech$/i, '')
    cleaned = cleaned.replace(/ - PBTech.*$/i, '')
    cleaned = cleaned.replace(/ - Harvey Norman$/i, '')
    // Remove PB Tech "Buy the..." prefix
    cleaned = cleaned.replace(/^Buy the\s+/i, '')
    // Remove "online" suffix and model numbers in parentheses at end
    cleaned = cleaned.replace(/\s+online$/i, '')
    cleaned = cleaned.replace(/\s+\(\s*[A-Z0-9-]+\s*\)\s*$/i, '')  // e.g., "( 82V00000AU )"
    // Truncate if too long (some descriptions are cut off with ...)
    if (cleaned.includes('...')) {
      cleaned = cleaned.replace(/\.\.\.\s*$/, '')
    }
    return cleaned.trim()
  }

  // PREFER: Jina's page title (most accurate source)
  if (jinaTitle && hasBrand(jinaTitle) && !isGarbage(jinaTitle)) {
    return cleanName(jinaTitle)
  }

  // FALLBACK: Parse from markdown if title didn't work
  const lines = markdown.split('\n')

  // First line is usually the product name
  const firstLine = lines[0]?.trim() || ''
  if (hasBrand(firstLine) && !isGarbage(firstLine)) {
    return cleanName(firstLine)
  }

  // Look for H1 header (# Product Name)
  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)$/)
    if (h1Match && hasBrand(h1Match[1]) && !isGarbage(h1Match[1])) {
      return cleanName(h1Match[1])
    }
  }

  // Look for H2 header containing brand + Chromebook
  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/)
    if (h2Match && hasBrand(h2Match[1]) && h2Match[1].toLowerCase().includes('chromebook') && !isGarbage(h2Match[1])) {
      return cleanName(h2Match[1])
    }
  }

  // Fallback: look for line after "Chromebooks" breadcrumb
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'Chromebooks' && lines[i + 1]) {
      const name = lines[i + 1].trim()
      if (hasBrand(name) && !isGarbage(name)) {
        return cleanName(name)
      }
    }
  }

  // Last resort: find first line with a known brand and "chromebook"
  for (const line of lines) {
    const trimmed = line.trim()
    if (hasBrand(trimmed) && trimmed.toLowerCase().includes('chromebook') &&
        trimmed.length > 10 && trimmed.length < 150 && !isGarbage(trimmed)) {
      return cleanName(trimmed)
    }
  }

  return ''
}

// Extract specs from product name (e.g., "Lenovo Duet 11 11" MTK 838 4GB 128GB")
// This is used as a fallback/validation for table-based spec extraction
function extractSpecsFromName(name: string): { ram?: number; storage?: number; screenSize?: number } {
  const result: { ram?: number; storage?: number; screenSize?: number } = {}

  // RAM patterns: "4GB RAM", "8GB", etc. - look for GB preceded by small number
  const ramMatch = name.match(/\b(\d{1,2})\s*GB\s*(?:RAM|DDR|memory|soldered)?/i)
  if (ramMatch) {
    const ram = parseInt(ramMatch[1])
    if (ram >= 2 && ram <= 32) result.ram = ram
  }

  // Storage patterns: "64GB", "128GB", "256GB" - look for larger GB values
  const storageMatches = name.match(/\b(\d{2,4})\s*GB\b/gi) || []
  for (const match of storageMatches) {
    const storage = parseInt(match)
    if (storage >= 32 && storage <= 2048 && storage !== result.ram) {
      // Take the larger value as storage (RAM is usually smaller)
      if (!result.storage || storage > result.storage) {
        result.storage = storage
      }
    }
  }

  // Screen size patterns: 11", 14", 15.6", etc.
  const screenMatch = name.match(/\b(\d{1,2}(?:\.\d{1,2})?)\s*["″]|\b(\d{1,2}(?:\.\d{1,2})?)\s*(?:inch|in)\b/i)
  if (screenMatch) {
    const screen = parseFloat(screenMatch[1] || screenMatch[2])
    if (screen >= 10 && screen <= 18) result.screenSize = screen
  }

  return result
}

// Normalize screen size to common values (helps with deduplication)
function normalizeScreenSize(size: number): number {
  // Common Chromebook sizes: 11, 11.6, 12, 13.3, 14, 15.6
  // Round to nearest common size if within 0.1 of it
  const commonSizes = [10, 10.1, 10.9, 11, 11.6, 12, 12.3, 13, 13.3, 14, 15, 15.6, 16, 17]
  for (const common of commonSizes) {
    if (Math.abs(size - common) <= 0.15) return common
  }
  // Round to one decimal place
  return Math.round(size * 10) / 10
}

// Extract product specs from markdown using regex - NO AI
function extractProductData(jinaTitle: string, markdown: string, retailerSlug: string): {
  name: string
  price: number
  screenSize: string
  ram: number
  storage: number
  storageType: string
  processor: string
  touchscreen: boolean
  inStock: boolean
  resolution: string
  screenType: string
  weight: number
  batteryWhr: number
  usbCPorts: number
  usbAPorts: number
  backlitKeyboard: boolean
  wifi: string
} | null {
  const price = extractPriceFromMarkdown(markdown, retailerSlug)
  if (!price) {
    console.error('Could not extract price from markdown')
    return null
  }

  const name = extractProductName(jinaTitle, markdown, retailerSlug)
  if (!name) {
    console.error('Could not extract product name from markdown')
    return null
  }

  // CRITICAL: Validate this is actually a Chromebook product
  const lowerName = name.toLowerCase()
  const lowerMarkdown = markdown.toLowerCase()
  if (!lowerName.includes('chromebook') && !lowerMarkdown.includes('chromeos') && !lowerMarkdown.includes('chrome os')) {
    console.error('Not a Chromebook product: ' + name.substring(0, 50))
    return null
  }

  const specs = parseSpecsTable(markdown, retailerSlug)

  // Helper to get spec from multiple possible field names
  const getSpec = (...keys: string[]) => {
    for (const key of keys) {
      if (specs[key]) return specs[key]
    }
    return ''
  }

  // Helper to extract first number from a string (for values like "8GB soldered memory")
  const extractNumber = (str: string, fallback: number = 0): number => {
    if (!str) return fallback
    // Try to extract number at the start (e.g., "8GB", "128GB", "15.6")
    const match = str.match(/^(\d+(?:\.\d+)?)\s*(?:GB|gb|"|inches?)?/i)
    if (match) return parseFloat(match[1])
    // Fallback: extract any number
    const anyNum = str.match(/(\d+(?:\.\d+)?)/)
    if (anyNum) return parseFloat(anyNum[1])
    return fallback
  }

  // Build processor name from type + model (try various field names)
  // The Good Guys uses "Processor Specifications" with full details like "3-N355 Processor 1.9 GHz"
  let processorType = getSpec('Processor Type', 'Processor', 'CPU', 'CPU Model', 'Processor Specifications')
  let processorModel = getSpec('Processor Model Number', 'Processor Model')

  // Clean up garbage values (e.g., "Brand:Intel Processo" from bad parsing)
  const cleanProcessor = (val: string): string => {
    if (!val) return ''
    // Remove "Brand:" prefix and anything after it if it looks like a field name
    let cleaned = val.replace(/Brand:[^:]+$/i, '').trim()
    // Remove "Family:" prefix
    cleaned = cleaned.replace(/Family:[^:]+$/i, '').trim()
    // Remove trailing colons and field names
    cleaned = cleaned.replace(/\s*\w+:.*$/i, '').trim()
    // If nothing left or too short, return empty
    if (cleaned.length < 2) return ''
    return cleaned
  }

  processorType = cleanProcessor(processorType)
  processorModel = cleanProcessor(processorModel)

  // Build final processor name
  let processor = 'Unknown'
  if (processorType && processorModel && !processorType.includes(processorModel)) {
    processor = `${processorType} ${processorModel}`.trim()
  } else if (processorType) {
    processor = processorType
  } else if (processorModel) {
    processor = processorModel
  }

  // Check if processor looks like garbage (doesn't contain processor-related keywords)
  const processorKeywords = /intel|amd|mtk|mediatek|celeron|pentium|core|atom|n\d{3,4}|i[357]/i
  const isGarbageProcessor = processor === 'Unknown' ||
    processor.length < 3 ||
    processor.length > 80 ||
    processor.includes(':') ||
    !processorKeywords.test(processor)

  // If processor still looks bad, try multiple extraction strategies
  if (isGarbageProcessor) {
    let extracted = false

    // STRATEGY 1: Look for "Processor Specifications:" in the markdown (The Good Guys format)
    const procSpecMatch = markdown.match(/Processor\s+Specifications\s*:\s*([^:]+?)(?:Graphics|$)/i)
    if (procSpecMatch) {
      const specValue = procSpecMatch[1].trim()
      // Extract the processor model from values like "3-N355 Processor 1.9 GHz (6MB Cache...)"
      const modelMatch = specValue.match(/^(\d-N\d{3,4}|[A-Za-z]+\s*\d+|i[357]-\d+)/i)
      if (modelMatch) {
        processor = modelMatch[1]
        extracted = true
      }
    }

    // STRATEGY 2: Try common processor patterns in product name
    if (!extracted) {
      const procPatterns = [
        /Intel\s+(?:Core\s+)?(?:i[357]|N\d{3,4}|Celeron\s+N?\d*)/i,
        /MTK\s*\d+/i,
        /MediaTek\s+(?:Kompanio\s+)?\w+/i,
        /Kompanio\s+\d+/i,
        /Celeron\s+N?\d+/i,
        /N\d{3,4}/i, // Standalone Intel N-series like N4500, N100
        /\b[35]-N\d{3,4}\b/i, // Intel Core 3-N355, 5-N305, etc.
        /\bi[357]\b/i, // Standalone i3, i5, i7 (no Intel prefix)
      ]
      for (const pattern of procPatterns) {
        const match = name.match(pattern)
        if (match) {
          processor = match[0]
          break
        }
      }
    }
  }

  // Determine storage type from available fields
  let storageType = 'eMMC'
  const storageTypeStr = getSpec('Storage Type', 'Hard Drive Type')
  const storageRaw = getSpec('Total Storage', 'eMMC storage', 'SSD Storage', 'Storage', 'Hard Drive', 'Storage Size')
  if (storageTypeStr) {
    storageType = storageTypeStr.toUpperCase().includes('SSD') ? 'SSD' : storageTypeStr
  } else if (specs['SSD Storage']) {
    storageType = 'SSD'
  } else if (specs['eMMC storage'] || storageRaw.toLowerCase().includes('emmc')) {
    storageType = 'eMMC'
  } else if (storageRaw.toLowerCase().includes('ssd')) {
    storageType = 'SSD'
  }

  // Extract specs from product name as a fallback/validation source
  const nameSpecs = extractSpecsFromName(name)

  // Get storage amount (try various field names, then name fallback)
  // IMPORTANT: Only use table value if it was actually extracted (not default)
  let storageFromTable = 0
  if (storageRaw) {
    storageFromTable = extractNumber(storageRaw, 0)
  }
  // Also try to extract from markdown directly (The Good Guys "Total Storage:128GB" format)
  if (!storageFromTable) {
    const storageMatch = markdown.match(/Total\s+Storage\s*:\s*(\d+)\s*GB/i)
    if (storageMatch) {
      storageFromTable = parseInt(storageMatch[1])
    }
  }
  // Prefer name-based storage if table extraction failed or looks suspicious
  // Name usually has accurate specs like "8GB 128GB"
  let validStorage = nameSpecs.storage || 64
  if (storageFromTable >= 32 && storageFromTable <= 2048) {
    // Both sources available - prefer name if they differ significantly
    if (nameSpecs.storage && Math.abs(storageFromTable - nameSpecs.storage) > 64) {
      // They differ by more than 64GB, prefer the larger (likely correct) value
      validStorage = Math.max(storageFromTable, nameSpecs.storage)
    } else {
      validStorage = storageFromTable
    }
  }

  // Get screen size (try various field names - including The Good Guys specific)
  const screenSizeStr = getSpec('Display size (inches)', 'Screen Size (Inches)', 'Screen Size', 'Display Size', 'Display')
  let screenSizeNum = extractNumber(screenSizeStr, 0)
  // Use name-based screen size if table value is missing or looks wrong
  if (screenSizeNum < 10 || screenSizeNum > 18) {
    screenSizeNum = nameSpecs.screenSize || 14
  }
  // Normalize screen size to help with deduplication (10.95 -> 11, etc.)
  const normalizedScreenSize = normalizeScreenSize(screenSizeNum)
  const screenSize = normalizedScreenSize + '"'

  // Get RAM (try various field names, then name fallback)
  const ramStr = getSpec('RAM (GB)', 'RAM', 'Memory', 'Memory Size') || '4'
  const ramFromTable = extractNumber(ramStr, 4)
  // Use name-based RAM if table value looks suspicious (e.g., too high because it grabbed storage)
  let ram = ramFromTable
  if (ramFromTable < 2 || ramFromTable > 32) {
    ram = nameSpecs.ram || 4
  }
  // Additional validation: if RAM is same as storage, probably wrong - use name-based
  if (ram === validStorage && nameSpecs.ram && nameSpecs.ram !== validStorage) {
    ram = nameSpecs.ram
  }

  // Get weight (try various field names)
  const weightStr = getSpec('Product Weight (kg)', 'Weight')
  let weight = 0
  if (weightStr) {
    const weightNum = parseFloat(weightStr.replace(/[^0-9.]/g, '')) || 0
    // Convert kg to grams if needed
    weight = weightNum < 50 ? Math.round(weightNum * 1000) : Math.round(weightNum)
  }

  return {
    name,
    price,
    screenSize,
    ram,
    storage: validStorage,
    storageType,
    processor,
    touchscreen: getSpec('Touch Screen', 'Touchscreen').toLowerCase() === 'yes',
    inStock: markdown.toLowerCase().includes('add to cart') || markdown.toLowerCase().includes('buy now'),
    resolution: getSpec('Resolution (Pixels)', 'Screen Resolution', 'Resolution', 'Display Resolution (px)'),
    screenType: getSpec('Display type', 'Panel Type', 'Screen Type'),
    weight,
    batteryWhr: parseInt(getSpec('Battery WHr', 'Battery', 'Battery Life').replace(/[^0-9]/g, '') || '0') || 0,
    usbCPorts: parseInt(getSpec('USB-C Ports', 'USB (Type-C) Port').replace(/[^0-9]/g, '') || '0') || 0,
    usbAPorts: parseInt(getSpec('USB 3.2 Ports', 'USB-A Ports').replace(/[^0-9]/g, '') || '0') || 0,
    backlitKeyboard: getSpec('Backlit Keyboard').toLowerCase() === 'yes',
    wifi: specs['Wi-Fi'] || '',
  }
}

export async function POST() {
  const logs: string[] = []
  const log = (msg: string) => {
    console.log(msg)
    logs.push(msg)
  }

  try {
    let discovered = 0
    let added = 0

    for (const source of DISCOVERY_SOURCES) {
      log(`Processing ${source.retailerSlug}...`)

      // Get retailer
      const [retailer] = await db.select().from(retailers).where(eq(retailers.slug, source.retailerSlug))
      if (!retailer) {
        log(`Retailer ${source.retailerSlug} not found`)
        continue
      }
      log(`Found retailer: ${retailer.name}`)

      // Fetch all product links from the category page (uses retailer-specific scraper)
      log(`Fetching product links from: ${source.categoryUrl}`)
      const productLinks = await fetchProductLinks(source.categoryUrl, source.retailerSlug)
      log(`Found ${productLinks.length} product links`)

      if (!productLinks.length) continue
      discovered += productLinks.length

      // Get existing listings by URL
      const existingListings = await db.select({ url: retailerListings.retailerUrl }).from(retailerListings)
      const existingUrls = new Set(existingListings.map(l => l.url))
      log(`${existingUrls.size} existing listings in database`)

      // Filter to only new products
      const newProductLinks = productLinks.filter(p => !existingUrls.has(p.url))
      log(`${newProductLinks.length} new products to scrape`)

      if (!newProductLinks.length) continue

      // Get or create category
      let [category] = await db.select().from(categories).where(eq(categories.slug, 'chromebooks'))
      if (!category) {
        [category] = await db.insert(categories).values({
          name: 'Chromebooks',
          slug: 'chromebooks',
        }).returning()
        log('Created Chromebooks category')
      }

      // BATCH: Fetch ALL product pages in ONE Jina call
      log(`Fetching ${newProductLinks.length} product pages via Jina batch...`)
      const urls = newProductLinks.map(p => p.url)
      const pageContents = await fetchPageContents(urls)
      log(`Fetched ${pageContents.size} pages from Jina`)

      // Extract data from all pages using regex (no AI)
      log(`Extracting data from ${pageContents.size} pages...`)
      const extractedData = newProductLinks.map((productLink) => {
        const content = pageContents.get(productLink.url)
        if (!content) return { productLink, data: null, imageUrl: '' }

        const data = extractProductData(content.title, content.markdown, source.retailerSlug)
        const imageUrl = findMainProductImage(content.images, source.retailerSlug)

        return { productLink, data, imageUrl }
      })
      log(`Extracted all product data`)

      // Sequential: Database inserts (need to handle brands/products properly)
      for (const { productLink, data, imageUrl } of extractedData) {
        if (!data) {
          log(`Skipping ${productLink.name} - no data extracted`)
          continue
        }

        log(`Processing: ${data.name} - $${data.price}`)

        // Get or create brand
        const brandName = extractBrand(data.name)
        let [brand] = await db.select().from(brands).where(eq(brands.slug, slugify(brandName)))
        if (!brand) {
          [brand] = await db.insert(brands).values({
            name: brandName,
            slug: slugify(brandName),
          }).returning()
          log(`Created brand: ${brandName}`)
        }

        // Try to find existing product by matching specs
        // Must match: brand + RAM + storage + screenSize + processor type
        // This handles cases where same product is sold by multiple retailers with different names
        const existingProducts = await db.select()
          .from(products)
          .where(eq(products.brandId, brand.id))

        // Helper to extract processor family for comparison (e.g., "N4500", "Core 3", "i3")
        const getProcessorFamily = (processor: string): string => {
          const lower = processor.toLowerCase()
          // Extract key processor identifiers
          if (lower.includes('n4500')) return 'N4500'
          if (lower.includes('n5100')) return 'N5100'
          if (lower.includes('n100')) return 'N100'
          if (lower.includes('n200')) return 'N200'
          if (lower.includes('core 3')) return 'Core3'
          if (lower.includes('core i3') || lower.includes('i3')) return 'i3'
          if (lower.includes('core i5') || lower.includes('i5')) return 'i5'
          if (lower.includes('core i7') || lower.includes('i7')) return 'i7'
          if (lower.includes('mtk') || lower.includes('mediatek')) return 'MTK'
          if (lower.includes('celeron')) return 'Celeron'
          return processor.substring(0, 10) // Fallback: first 10 chars
        }

        const dataProcessorFamily = getProcessorFamily(data.processor)

        let matchedProduct = existingProducts.find(p =>
          p.ram === data.ram &&
          p.storage === data.storage &&
          p.screenSize === data.screenSize &&
          // CRITICAL: Also match processor family to avoid merging different models
          getProcessorFamily(p.processor || '') === dataProcessorFamily
        )

        let productId: string

        if (matchedProduct) {
          // Found existing product - use it instead of creating new
          productId = matchedProduct.id
          log(`Found existing product: ${matchedProduct.name} (matching ${data.name})`)
        } else {
          // No match - create new product
          const [newProduct] = await db.insert(products).values({
            brandId: brand.id,
            categoryId: category.id,
            name: data.name,
            slug: slugify(data.name),
            imageUrl: imageUrl,
            screenSize: data.screenSize,
            ram: data.ram,
            storage: data.storage,
            processor: data.processor,
            touchscreen: data.touchscreen,
            storageType: data.storageType,
            resolution: data.resolution,
            screenType: data.screenType,
            weight: data.weight,
            batteryLife: data.batteryWhr, // Store WHr in batteryLife column
            usbCPorts: data.usbCPorts,
            usbAPorts: data.usbAPorts,
            backlitKeyboard: data.backlitKeyboard,
            wifi: data.wifi,
          }).returning()
          productId = newProduct.id
          log(`Created product: ${newProduct.name}`)
        }

        // Insert listing with REAL URL
        await db.insert(retailerListings).values({
          productId: productId,
          retailerId: retailer.id,
          retailerUrl: productLink.url,
          retailerProductName: data.name,
          currentPriceCents: data.price * 100,
          inStock: data.inStock,
          lastChecked: new Date(),
        })
        log(`Created listing at $${data.price}`)

        added++
      }
    }

    return Response.json({
      success: true,
      message: `Discovery complete. Found ${discovered} products, added ${added} new.`,
      discovered,
      added,
      logs,
    })
  } catch (error) {
    log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs,
    }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({
    message: 'POST to this endpoint to run direct product discovery (bypasses Inngest)',
  })
}
