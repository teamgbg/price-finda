import { pgTable, text, integer, timestamp, boolean, jsonb, uuid, index } from 'drizzle-orm/pg-core'

// Retailers we track
export const retailers = pgTable('retailers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // JB Hi-Fi, Officeworks, etc.
  slug: text('slug').notNull().unique(), // jb-hifi, officeworks, etc.
  websiteUrl: text('website_url').notNull(),
  logoUrl: text('logo_url'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Product categories (Chromebooks, Laptops, etc.)
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Brands (Lenovo, HP, ASUS, Acer, etc.)
export const brands = pgTable('brands', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Products (canonical product entries)
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  brandId: uuid('brand_id').references(() => brands.id),
  categoryId: uuid('category_id').references(() => categories.id),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  model: text('model'), // Model number
  description: text('description'),
  imageUrl: text('image_url'),

  // Basic Specs
  screenSize: text('screen_size'), // "14 inch", "15.6 inch"
  ram: integer('ram'), // in GB
  storage: integer('storage'), // in GB
  storageType: text('storage_type'), // "SSD", "eMMC"
  processor: text('processor'), // "Intel Celeron N4500", etc.
  resolution: text('resolution'), // "1920x1080", "1366x768"
  touchscreen: boolean('touchscreen').default(false),

  // Extended Specs (for comparison)
  batteryLife: integer('battery_life'), // in hours
  cpuBenchmark: integer('cpu_benchmark'), // Geekbench/Passmark score
  screenBrightness: integer('screen_brightness'), // in nits
  screenType: text('screen_type'), // "IPS", "TN", "OLED"
  weight: integer('weight'), // in grams

  // Ports and connectivity
  usbCPorts: integer('usb_c_ports'),
  usbAPorts: integer('usb_a_ports'),
  hdmiPort: boolean('hdmi_port').default(false),
  sdCardSlot: boolean('sd_card_slot').default(false),

  // Keyboard and wireless
  backlitKeyboard: boolean('backlit_keyboard').default(false),
  wifi: text('wifi'), // "Wi-Fi 6E", "Wi-Fi 6", etc.

  // Additional specs stored as JSON for flexibility
  specs: jsonb('specs'),

  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('products_brand_idx').on(table.brandId),
  index('products_category_idx').on(table.categoryId),
])

// Retailer listings (a product at a specific retailer)
export const retailerListings = pgTable('retailer_listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  retailerId: uuid('retailer_id').references(() => retailers.id).notNull(),

  retailerSku: text('retailer_sku'), // Retailer's SKU/product code
  retailerUrl: text('retailer_url').notNull(), // Direct link to product
  retailerProductName: text('retailer_product_name'), // Name as shown on retailer site

  // Current price info
  currentPriceCents: integer('current_price_cents'), // Price in cents
  wasOnSale: boolean('was_on_sale').default(false),
  salePriceCents: integer('sale_price_cents'), // If on sale

  inStock: boolean('in_stock').default(true),
  lastChecked: timestamp('last_checked'),
  lastPriceChange: timestamp('last_price_change'),

  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('listings_product_idx').on(table.productId),
  index('listings_retailer_idx').on(table.retailerId),
])

// Price history (for graphs and tracking)
export const priceHistory = pgTable('price_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').references(() => retailerListings.id).notNull(),
  priceCents: integer('price_cents').notNull(),
  wasOnSale: boolean('was_on_sale').default(false),
  inStock: boolean('in_stock').default(true),
  recordedAt: timestamp('recorded_at').defaultNow(),
}, (table) => [
  index('price_history_listing_idx').on(table.listingId),
  index('price_history_date_idx').on(table.recordedAt),
])

// Scrape jobs (for tracking daily price checks)
export const scrapeJobs = pgTable('scrape_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  retailerId: uuid('retailer_id').references(() => retailers.id),
  status: text('status').notNull().default('pending'), // pending, running, completed, failed
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  productsChecked: integer('products_checked').default(0),
  priceChanges: integer('price_changes').default(0),
  errors: jsonb('errors'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Types
export type Retailer = typeof retailers.$inferSelect
export type Category = typeof categories.$inferSelect
export type Brand = typeof brands.$inferSelect
export type Product = typeof products.$inferSelect
export type RetailerListing = typeof retailerListings.$inferSelect
export type PriceHistory = typeof priceHistory.$inferSelect
export type ScrapeJob = typeof scrapeJobs.$inferSelect
