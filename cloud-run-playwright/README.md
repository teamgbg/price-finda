# Price Finda Stealth Scraper

Cloud Run service for scraping bot-protected retail sites (Amazon AU, Harvey Norman, Officeworks).

## Features

- **Stealth Playwright** - Uses `playwright-extra` with stealth plugin to bypass bot detection
- **Cloudflare bypass** - Waits for challenges and simulates human mouse movement
- **Multiple retailers** - Dedicated endpoints for Amazon, Harvey Norman, Officeworks

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/scrape-amazon` | POST | Scrape Amazon AU product |
| `/api/scrape-harvey-norman` | POST | Scrape Harvey Norman product |
| `/api/scrape-officeworks` | POST | Scrape Officeworks product |
| `/api/scrape-amazon-batch` | POST | Scrape multiple Amazon URLs |
| `/api/scrape` | POST | Generic scrape with screenshot |

## Deployment to Cloud Run

### Prerequisites

1. Google Cloud account with billing enabled
2. `gcloud` CLI installed and authenticated

### Deploy

```bash
cd cloud-run-playwright

# Deploy to Cloud Run
gcloud run deploy price-finda-scraper \
  --source . \
  --region australia-southeast1 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --concurrency 1 \
  --allow-unauthenticated
```

### After Deployment

1. Copy the Cloud Run URL (e.g., `https://price-finda-scraper-xxxxx.australia-southeast1.run.app`)
2. Add to Vercel environment variables:
   ```
   PLAYWRIGHT_CLOUD_RUN_URL=https://price-finda-scraper-xxxxx.australia-southeast1.run.app
   ```

## Usage Examples

### Scrape Amazon Product

```bash
curl -X POST https://your-cloud-run-url/api/scrape-amazon \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.amazon.com.au/dp/B0DN8WG55D"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "title": "HP Chromebook 14a...",
    "price": "$349.00",
    "priceCents": 34900,
    "image": "https://...",
    "inStock": true,
    "asin": "B0DN8WG55D"
  },
  "duration": 5234
}
```

### Batch Scrape Amazon Products

```bash
curl -X POST https://your-cloud-run-url/api/scrape-amazon-batch \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://www.amazon.com.au/dp/B0DN8WG55D", "https://www.amazon.com.au/dp/B0F2DTJ43S"]}'
```

## Local Development

```bash
cd cloud-run-playwright
npm install
npm run dev
```

Server runs on `http://localhost:8080`

## Cost Estimation

- Cloud Run free tier: 180,000 vCPU-seconds/month
- With 2 vCPU, ~30 second scrapes: ~3,000 scrapes/month free
- Beyond free tier: ~$0.00002400/vCPU-second

For 100 products scraped daily: ~$5-10/month
