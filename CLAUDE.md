# Max's Price Finda - Project Context

## Overview
Australian price comparison site for Chromebooks (and future product categories). Tracks prices across major retailers, shows price history, and helps users find the best deals.

## Stack
- **Framework**: Next.js 16.0.7 (App Router, Turbopack)
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4 (uses `@theme` block in globals.css)
- **Database**: Drizzle ORM + Neon PostgreSQL
- **Background Jobs**: Inngest (daily price checks at 6am AEDT)
- **Charts**: Recharts (price history graphs)
- **AI Extraction**: Groq (free tier - Llama 3.1 for parsing retailer pages)
- **Package Manager**: Bun (never use npm)
- **Process Manager**: PM2

## Development Server
- **PM2 Name**: `price-finda`
- **Port**: 3400
- **URL**: http://localhost:3400
- **Commands**:
  - `pm2 restart price-finda` - Restart server
  - `pm2 logs price-finda --lines 50 --nostream` - View logs
  - `bun run dev` - Run directly (if not using PM2)

## Key Directories
```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Homepage - product listing
│   ├── compare/            # Product comparison page
│   ├── product/[slug]/     # Product detail with price history
│   └── api/inngest/        # Inngest webhook endpoint
├── components/
│   ├── header.tsx          # Site header with search
│   ├── filters.tsx         # All product filters
│   ├── product-grid.tsx    # Product listing grid
│   ├── product-card.tsx    # Individual product cards
│   ├── price-history-chart.tsx  # Recharts price graph
│   └── compare/            # Comparison feature components
├── db/
│   ├── index.ts            # Drizzle client setup
│   └── schema.ts           # Database schema
├── inngest/
│   ├── client.ts           # Inngest client
│   ├── index.ts            # Function exports
│   └── functions/          # Background job functions
└── lib/
    ├── utils.ts            # Common utilities (cn, formatPrice)
    ├── affiliate.ts        # Amazon AU affiliate link support
    └── ai-extractor.ts     # Groq AI for spec extraction
```

## Database Schema
Tables:
- `retailers` - JB Hi-Fi, Officeworks, Harvey Norman, The Good Guys, Amazon AU, Bing Lee
- `categories` - Product categories (Chromebooks, Laptops, etc.)
- `brands` - Lenovo, HP, ASUS, Acer, Samsung, Dell
- `products` - Canonical product entries with full specs
- `retailerListings` - Product at a specific retailer (price, stock, URL)
- `priceHistory` - Daily price snapshots for graphs
- `scrapeJobs` - Track scraping job status

### Extended Product Specs
- Basic: screenSize, ram, storage, storageType, processor, resolution, touchscreen
- Extended: batteryLife, cpuBenchmark, screenBrightness, screenType, weight
- Ports: usbCPorts, usbAPorts, hdmiPort, sdCardSlot

## Environment Variables
Required in `.env.local`:
```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://..."

# Inngest
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="signkey-prod-..."

# Amazon Affiliate
AMAZON_AFFILIATE_TAG="maxpricefinda-22"

# Groq AI (free tier)
GROQ_API_KEY="gsk_..."
```

## Key Features

### 1. Product Listing & Filters
- Filter by: Brand, Retailer, Screen Size, RAM, Storage, Price Range
- Quick filters: In Stock, On Sale, Touchscreen
- Sort by: Price (low/high), Name, Brand, Price Drops

### 2. Product Comparison
- Compare up to 4 products side-by-side
- Highlights best values (highest RAM, longest battery, etc.)
- Uses `CompareProvider` context in layout.tsx

### 3. Price History Charts
- Per-retailer price lines with color coding
- Date range: Last 30 days
- Shows price drops/increases

### 4. Amazon Affiliate Links
- Auto-adds affiliate tag to Amazon AU URLs
- Uses `addAffiliateTag()` from `lib/affiliate.ts`
- Tag configurable via `AMAZON_AFFILIATE_TAG` env var

### 5. Daily Price Checks (Inngest)
- Runs at 6am AEDT daily
- Uses Jina Reader API to fetch retailer pages
- Uses Groq AI (llama-3.3-70b-versatile) to extract product specs
- Records price history for graphs

### 6. Product Discovery (Inngest)
- Runs at 8pm UTC (7am AEDT) daily
- Two-phase scraping:
  1. **Category page**: Fetch with `X-Target-Selector: main` to get only product grid links
  2. **Individual pages**: Fetch each product URL for detailed specs
- Key Jina headers:
  - `Accept: application/json` - Returns JSON with `data.links` map
  - `X-With-Links-Summary: true` - Includes all page links
  - `X-Target-Selector: main` - **CRITICAL**: Only scrapes main content, excludes nav/footer/promos

## Inngest Setup
- **Cloud-only**: Inngest runs in the cloud and calls the production Vercel deployment
- **Local testing**: Use `/api/discover-direct` endpoint (bypasses Inngest, same logic)
- **Dev server**: Uses Inngest Dev CLI (`npx inngest-cli@latest dev`) if needed
- **Same database**: Local and production share the same Neon PostgreSQL database

## Retailers Tracked
| Retailer | Slug | Color |
|----------|------|-------|
| JB Hi-Fi | jb-hifi | Yellow |
| Officeworks | officeworks | Green |
| Harvey Norman | harvey-norman | Blue |
| The Good Guys | the-good-guys | Orange |
| Amazon AU | amazon-au | Amber |
| Bing Lee | bing-lee | Red |

## Development Workflow

### Adding New Products
1. Add product to `products` table with all specs
2. Add `retailerListings` for each retailer selling it
3. Price history will auto-populate from daily checks

### Adding New Retailers
1. Add to `retailers` table
2. Add color mapping in `product-card.tsx` RETAILER_COLORS
3. Implement scraping logic in Inngest function

### Database Commands
```bash
bun run db:push     # Push schema to Neon
bun run db:generate # Generate migrations
bun run db:studio   # Open Drizzle Studio
```

## CSS/Styling
- Single source: `src/app/globals.css`
- Tailwind v4 with `@theme` block
- Custom classes: `.card-surface`, `.price-up`, `.price-down`, `.retailer-badge`

## CRITICAL: Path Handling (Windows Bug Workaround)
There is a known Claude Code bug on Windows where file edits fail with "File has been unexpectedly modified" errors. The root cause is path format mismatch in the cache.

**MANDATORY**: Always use Windows backslash paths for Read/Edit/Write/Glob/Grep tools:
- Correct: `C:\code\price-finda\src\file.ts`
- Wrong: `C:/code/price-finda/src/file.ts`

Bash tool uses Unix paths: `/c/code/price-finda`

## Task Tracking
**IMPORTANT**: When the user gives instructions or asks for features:
1. Immediately add todo items for all requested tasks
2. Break complex tasks into smaller steps
3. Mark tasks as in_progress when starting
4. Mark tasks as completed when done
5. Keep the user informed of progress

## Never Do
- Use npm (always use bun)
- Push directly to main (work on dev branch)
- Hardcode affiliate tags (use env var)
- Skip price history recording

## CRITICAL: Working Scraper Patterns (DO NOT BREAK)

### Price Extraction (VERIFIED WORKING - Dec 2024)
The price extraction in `src/app/api/discover-direct/route.ts` uses this priority order:

1. **PRIORITY 1**: Standalone `$XXX` on its own line (regex: `/^\$(\d+)$/`)
   - JB Hi-Fi shows prices on their own line like `"$479"`
   - This is the MOST RELIABLE pattern
   - **DO NOT** prioritize markdown link `[$XXX]` format - it picks up promo/related product prices

2. **PRIORITY 2**: `$` on one line, number on next (JB Hi-Fi specific)

3. **PRIORITY 3**: Inline like "Now $449", "Price: $599", "RRP $999"

4. **PRIORITY 4**: Price at start of line like "$499 Add to cart"

5. **PRIORITY 5**: Any `$XXX` in short lines (skip lines with "GB", "under $", "for $")

6. **PRIORITY 6 (LAST RESORT)**: Markdown link `[$XXX]` - only if nothing else works

**WARNING**: The `[$XXX](url)` pattern matches promo links like "Gifts under $159" and related product prices. NEVER make this the first priority.

### JB Hi-Fi Scraping (VERIFIED WORKING)
- Uses `X-Target-Selector: main` header to filter out sidebar promos
- Filters for `/products/` URLs only
- Price appears as standalone `$XXX` on its own line

### The Good Guys Scraping (VERIFIED WORKING)
- Extracts markdown links `[text](url)` containing "chromebook"
- Uses `X-With-Links-Summary: true` header
- Price appears as standalone `$XXX` on its own line

### Product Deduplication (VERIFIED WORKING)
- Matches by: brand + RAM + storage + screenSize + processor family
- Screen sizes are normalized (10.95" → 11") to help matching
- Processor families: N4500, N5100, N100, Core3, i3, i5, i7, MTK, Celeron

### Spec Extraction Fallbacks (VERIFIED WORKING)
- `extractSpecsFromName()` extracts RAM, storage, screen from product name
- `normalizeScreenSize()` rounds to common sizes for better deduplication
- Name-based specs override table specs when table values are invalid

## Image Fetching Methods (Dec 2024)

### What DOES NOT Work
- **Jina Reader for Officeworks**: Returns 404 for all Officeworks URLs (blocked)
- **Direct S3 URL guessing**: Officeworks images require exact filename, S3 returns 403 on pattern guesses
- **Bright Data bulk scraping**: Hits navigation limits after ~3-5 pages per session

### What WORKS
- **Bright Data with batching**: Connect → scrape 3 pages → disconnect → wait 5s → repeat
  - Script: `fetch-officeworks-images.mjs`
  - Uses fresh browser connection per batch to avoid nav limits
- **JB Hi-Fi/Harvey Norman images**: Can be scraped via their product pages
- **Images from other retailers**: Products with listings at JB Hi-Fi often have images from there

### Image URL Patterns
- **Officeworks S3**: `https://s3-ap-southeast-2.amazonaws.com/wc-prod-pim/JPEG_1000x1000/{SKU}_{description}.jpg`
  - SKU is in the URL: `/p/product-name-{SKU}` → extract last part
  - Requires exact filename match (can't guess description part)
- **JB Hi-Fi CDN**: `https://www.jbhifi.com.au/cdn/shop/files/{product-id}.jpg`

## CPU Benchmark Sources (VERIFIED Dec 2024)

**Always look up benchmarks from PassMark - DO NOT GUESS!**
- Source: https://www.cpubenchmark.net/cpu_list.php
- Use WebFetch to get actual scores

### Verified Benchmark Scores
| Processor | PassMark Score |
|-----------|----------------|
| Intel N50 | 2609 |
| Intel N100 | 5356 |
| Intel N200 | 5500 |
| Intel N4500 | 1813 |
| Intel Core i3-N305 | 9587 |
| Intel Core 3 N355 | 10521 |
| Intel Core i5-1334U | 13302 |
| MediaTek Kompanio 520 | 3723 |
| MediaTek Kompanio 838 | 5343 |
| Snapdragon 7c Gen 2 | 2200 |

**WARNING**: Never assign the same benchmark to different processors as a placeholder.
If you don't know a benchmark, look it up or leave it null.
