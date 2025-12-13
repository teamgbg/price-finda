import { db } from '@/db'
import { products, brands, retailers, retailerListings, priceHistory } from '@/db/schema'
import { eq, desc, and, gte } from 'drizzle-orm'

export interface ProductWithListings {
  id: string
  name: string
  brand: string
  brandSlug: string
  model: string | null
  slug: string
  description: string | null
  imageUrl: string | null
  screenSize: string | null
  screenType: string | null
  screenBrightness: number | null
  resolution: string | null
  touchscreen: boolean | null
  processor: string | null
  cpuBenchmark: number | null
  ram: number | null
  storage: number | null
  storageType: string | null
  batteryLife: number | null
  weight: number | null
  usbCPorts: number | null
  usbAPorts: number | null
  hdmiPort: boolean | null
  sdCardSlot: boolean | null
  backlitKeyboard: boolean | null
  wifi: string | null
  listings: {
    retailer: string
    retailerSlug: string
    price: number
    salePrice?: number
    inStock: boolean
    url: string
  }[]
  priceChange: number
}

/**
 * Get all products with their listings
 */
export async function getProducts(): Promise<ProductWithListings[]> {
  // Get all products with brand info
  const productsData = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      model: products.model,
      description: products.description,
      imageUrl: products.imageUrl,
      screenSize: products.screenSize,
      screenType: products.screenType,
      screenBrightness: products.screenBrightness,
      resolution: products.resolution,
      touchscreen: products.touchscreen,
      processor: products.processor,
      cpuBenchmark: products.cpuBenchmark,
      ram: products.ram,
      storage: products.storage,
      storageType: products.storageType,
      batteryLife: products.batteryLife,
      weight: products.weight,
      usbCPorts: products.usbCPorts,
      usbAPorts: products.usbAPorts,
      hdmiPort: products.hdmiPort,
      sdCardSlot: products.sdCardSlot,
      backlitKeyboard: products.backlitKeyboard,
      wifi: products.wifi,
      brandId: products.brandId,
      brandName: brands.name,
      brandSlug: brands.slug,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(eq(products.isActive, true))

  // Get all listings with retailer info
  const listingsData = await db
    .select({
      id: retailerListings.id,
      productId: retailerListings.productId,
      retailerName: retailers.name,
      retailerSlug: retailers.slug,
      retailerUrl: retailerListings.retailerUrl,
      currentPriceCents: retailerListings.currentPriceCents,
      salePriceCents: retailerListings.salePriceCents,
      inStock: retailerListings.inStock,
    })
    .from(retailerListings)
    .leftJoin(retailers, eq(retailerListings.retailerId, retailers.id))
    .where(eq(retailerListings.isActive, true))

  // Get price history for last 7 days to calculate price changes
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const historyData = await db
    .select({
      listingId: priceHistory.listingId,
      priceCents: priceHistory.priceCents,
      recordedAt: priceHistory.recordedAt,
    })
    .from(priceHistory)
    .where(gte(priceHistory.recordedAt, sevenDaysAgo))
    .orderBy(desc(priceHistory.recordedAt))

  // Group listings by product
  const listingsByProduct = new Map<string, typeof listingsData>()
  for (const listing of listingsData) {
    const existing = listingsByProduct.get(listing.productId) || []
    existing.push(listing)
    listingsByProduct.set(listing.productId, existing)
  }

  // Calculate price changes for each listing
  const priceChangeByListing = new Map<string, number>()
  for (const listing of listingsData) {
    const history = historyData.filter(h => h.listingId === listing.id)
    if (history.length >= 2) {
      const oldest = history[history.length - 1].priceCents
      const newest = history[0].priceCents
      priceChangeByListing.set(listing.id, newest - oldest)
    }
  }

  // Build the response
  return productsData.map(product => {
    const listings = listingsByProduct.get(product.id) || []

    // Calculate total price change for the product (using cheapest listing)
    let priceChange = 0
    if (listings.length > 0) {
      const listingChanges = listings
        .map(l => priceChangeByListing.get(l.id) || 0)
        .filter(c => c !== 0)
      if (listingChanges.length > 0) {
        priceChange = Math.min(...listingChanges)
      }
    }

    return {
      id: product.id,
      name: product.name,
      brand: product.brandName || 'Unknown',
      brandSlug: product.brandSlug || 'unknown',
      model: product.model,
      slug: product.slug,
      description: product.description,
      imageUrl: product.imageUrl || 'https://placehold.co/400x300/e2e8f0/475569?text=Chromebook',
      screenSize: product.screenSize,
      screenType: product.screenType,
      screenBrightness: product.screenBrightness,
      resolution: product.resolution,
      touchscreen: product.touchscreen,
      processor: product.processor,
      cpuBenchmark: product.cpuBenchmark,
      ram: product.ram,
      storage: product.storage,
      storageType: product.storageType,
      batteryLife: product.batteryLife,
      weight: product.weight,
      usbCPorts: product.usbCPorts,
      usbAPorts: product.usbAPorts,
      hdmiPort: product.hdmiPort,
      sdCardSlot: product.sdCardSlot,
      backlitKeyboard: product.backlitKeyboard,
      wifi: product.wifi,
      listings: listings.map(l => ({
        retailer: l.retailerName || 'Unknown',
        retailerSlug: l.retailerSlug || 'unknown',
        price: l.currentPriceCents || 0,
        salePrice: l.salePriceCents || undefined,
        inStock: l.inStock ?? true,
        url: l.retailerUrl,
      })),
      priceChange,
    }
  })
}

/**
 * Get a single product by slug
 */
export async function getProductBySlug(slug: string): Promise<ProductWithListings | null> {
  const allProducts = await getProducts()
  return allProducts.find(p => p.slug === slug) || null
}

/**
 * Get price history for a product's listings
 */
export async function getPriceHistoryForProduct(productId: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Get listings for this product
  const listings = await db
    .select({
      id: retailerListings.id,
      retailerName: retailers.name,
      retailerSlug: retailers.slug,
    })
    .from(retailerListings)
    .leftJoin(retailers, eq(retailerListings.retailerId, retailers.id))
    .where(eq(retailerListings.productId, productId))

  // Get history for all listings
  const history = await db
    .select()
    .from(priceHistory)
    .where(
      and(
        gte(priceHistory.recordedAt, thirtyDaysAgo)
      )
    )
    .orderBy(priceHistory.recordedAt)

  // Filter to only include history for this product's listings
  const listingIds = new Set(listings.map(l => l.id))
  const filteredHistory = history.filter(h => listingIds.has(h.listingId))

  // Build retailer name lookup
  const retailerByListing = new Map(listings.map(l => [l.id, l.retailerName]))

  return filteredHistory.map(h => ({
    date: h.recordedAt,
    retailer: retailerByListing.get(h.listingId) || 'Unknown',
    priceCents: h.priceCents,
    inStock: h.inStock,
    wasOnSale: h.wasOnSale,
  }))
}
