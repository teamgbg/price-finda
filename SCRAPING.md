# Price Finda - Scraping System Documentation

## Overview

Price Finda uses two different scraping approaches depending on the retailer:

1. **Jina AI Reader** - For retailers without anti-bot protection (JB Hi-Fi, Amazon AU, The Good Guys, PB Tech)
2. **Bright Data Scraping Browser** - For retailers with anti-bot protection (Officeworks, Harvey Norman)

## Bright Data Scraper

### Credentials
- **Customer ID**: hl_98a67688
- **Zone**: pricedinda
- **Country**: AU (Australian geo-targeting)
- **WebSocket**: `wss://brd-customer-hl_98a67688-zone-pricedinda-country-au:tf574lc1fotk@brd.superproxy.io:9222`

### Script Location
- `import-all-chromebooks.mjs` - Main import script for Officeworks and Harvey Norman

### Usage
```bash
# Import all retailers
node import-all-chromebooks.mjs

# Import specific retailer
node import-all-chromebooks.mjs officeworks
node import-all-chromebooks.mjs harvey-norman
```

### How It Works

1. Connects to Bright Data's Scraping Browser via WebSocket
2. Navigates to retailer's Chromebook category page
3. Extracts product links and prices from the page
4. Parses specs from product names (RAM, storage, screen size, processor)
5. Creates or updates products in the database
6. Creates retailer listings with current prices

### Retailer URL Patterns

**Officeworks**
- Category URL: `https://www.officeworks.com.au/shop/officeworks/c/technology/laptops/chromebooks`
- Product URLs contain `/p/`
- Names format: "Brand Screen CPU RAM/StorageGB Chromebook"

**Harvey Norman**
- Category URL: `https://www.harveynorman.com.au/computers-tablets/computers/chromebooks`
- Product URLs are direct paths like `/lenovo-chromebook-ideapad-slim-3`
- Names format: "Brand Chromebook Model Screen CPU/RAM/Storage"

### Spec Parsing

The `parseSpecs()` function extracts specs from product names:

**RAM/Storage Patterns:**
- Harvey Norman: `4GB/64GB` - XGB/YGB format
- Officeworks: `4/64GB` - X/YGB format

**Brand Detection:**
- HP, Hewlett-Packard
- Lenovo
- ASUS
- Acer
- Samsung

**Processor Detection:**
- Intel Celeron N4500, N5100
- Intel N100, N200
- Intel Core i3, i5, i7
- MediaTek Kompanio 520, 838
- Snapdragon 7c

## Jina AI Scraper (Inngest)

### Location
- `src/inngest/functions/discover-chromebooks.ts` - Daily discovery job
- `src/app/api/discover-direct/route.ts` - Manual API endpoint

### Schedule
- Runs daily at 8pm UTC (7am AEDT)

### Retailers
- JB Hi-Fi
- Amazon AU
- The Good Guys
- PB Tech

## Utility Scripts

### check-db.mjs
Shows all products grouped by retailer with specs.

```bash
node check-db.mjs
```

### check-duplicates.mjs
Identifies potential duplicate products (same brand + screen + RAM + storage).

```bash
node check-duplicates.mjs
```

### check-urls.mjs
Verifies URLs for a specific retailer.

```bash
node check-urls.mjs
```

### delete-harvey-norman.mjs
Deletes all Harvey Norman data (for re-import).

```bash
node delete-harvey-norman.mjs
```

### fix-officeworks-data.mjs
Cleans up bad import data (products with missing specs).

```bash
node fix-officeworks-data.mjs
```

## Known Issues

### Duplicate Products
Products may appear as duplicates when different retailers name them differently:
- "ASUS CX14 14" Chromebook" (JB Hi-Fi)
- "ASUS 14" CX14 Chromebook" (Officeworks)

These are the same product but have different slugs due to naming differences.

### Missing Images
Officeworks scraper doesn't reliably extract product images. Products without images show a placeholder laptop icon.

### Price Variations
Prices may differ between retailers for the same product. Some retailers show sale prices while others show regular prices.

## Database Schema

### Products Table
- `id` - UUID
- `name` - Product name
- `slug` - URL slug
- `brand` - Brand name (from brands table via brandId)
- `screenSize` - "14"", "15.6""
- `ram` - Integer in GB
- `storage` - Integer in GB
- `storageType` - "eMMC", "SSD"
- `processor` - Processor name
- `imageUrl` - Product image

### Retailer Listings Table
- `id` - UUID
- `productId` - Foreign key to products
- `retailerId` - Foreign key to retailers
- `retailerUrl` - Direct link to product on retailer site
- `currentPriceCents` - Price in cents
- `inStock` - Boolean

### Price History Table
- `id` - UUID
- `listingId` - Foreign key to retailer_listings
- `priceCents` - Price at time of check
- `inStock` - Stock status at time of check
- `createdAt` - Timestamp

## Maintenance

### Daily Tasks
- Inngest runs price checks at 6am AEDT
- Inngest runs product discovery at 7am AEDT

### Manual Re-import
If data gets corrupted or needs refresh:

1. Delete bad data: `node delete-harvey-norman.mjs`
2. Re-import: `node import-all-chromebooks.mjs harvey-norman`
3. Verify: `node check-db.mjs`

### Adding New Retailers

1. Add retailer to `RETAILER_CONFIGS` in `import-all-chromebooks.mjs`
2. Add URL pattern detection in `scrapeRetailer()` function
3. Test with: `node import-all-chromebooks.mjs new-retailer`
4. Add to Inngest functions if using Jina AI
