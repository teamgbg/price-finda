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
- Uses Jina MCP to fetch retailer pages
- Uses Groq AI to extract prices when structured scraping fails
- Records price history for graphs

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

## Path Handling (Windows)
- Bash: Unix paths `/c/code/teamgbg/price-finda`
- Read/Write/Edit tools: Windows paths `C:\code\teamgbg\price-finda`

## Never Do
- Use npm (always use bun)
- Push directly to main (work on dev branch)
- Hardcode affiliate tags (use env var)
- Skip price history recording
