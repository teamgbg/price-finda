import { config } from 'dotenv'
config({ path: '.env.local' })

import { db } from './index'
import { retailers, brands, categories, products, retailerListings, priceHistory } from './schema'

async function seed() {
  console.log('🌱 Seeding database...')

  // 1. Seed Retailers
  console.log('Adding retailers...')
  const [jbhifi, officeworks, harveyNorman, theGoodGuys, amazonAu, bingLee] = await db
    .insert(retailers)
    .values([
      { name: 'JB Hi-Fi', slug: 'jb-hifi', websiteUrl: 'https://www.jbhifi.com.au', logoUrl: '/logos/jbhifi.png' },
      { name: 'Officeworks', slug: 'officeworks', websiteUrl: 'https://www.officeworks.com.au', logoUrl: '/logos/officeworks.png' },
      { name: 'Harvey Norman', slug: 'harvey-norman', websiteUrl: 'https://www.harveynorman.com.au', logoUrl: '/logos/harveynorman.png' },
      { name: 'The Good Guys', slug: 'the-good-guys', websiteUrl: 'https://www.thegoodguys.com.au', logoUrl: '/logos/thegoodguys.png' },
      { name: 'Amazon AU', slug: 'amazon-au', websiteUrl: 'https://www.amazon.com.au', logoUrl: '/logos/amazon.png' },
      { name: 'Bing Lee', slug: 'bing-lee', websiteUrl: 'https://www.binglee.com.au', logoUrl: '/logos/binglee.png' },
    ])
    .returning()

  // 2. Seed Brands
  console.log('Adding brands...')
  const [lenovo, hp, asus, acer, samsung, dell] = await db
    .insert(brands)
    .values([
      { name: 'Lenovo', slug: 'lenovo' },
      { name: 'HP', slug: 'hp' },
      { name: 'ASUS', slug: 'asus' },
      { name: 'Acer', slug: 'acer' },
      { name: 'Samsung', slug: 'samsung' },
      { name: 'Dell', slug: 'dell' },
    ])
    .returning()

  // 3. Seed Categories
  console.log('Adding categories...')
  const [chromebooks] = await db
    .insert(categories)
    .values([
      { name: 'Chromebooks', slug: 'chromebooks', description: 'Laptops running Chrome OS' },
    ])
    .returning()

  // 4. Seed Products (real Chromebooks available in Australia)
  console.log('Adding products...')
  const productData = [
    {
      brandId: lenovo.id,
      categoryId: chromebooks.id,
      name: 'IdeaPad Duet 3 Chromebook',
      slug: 'lenovo-ideapad-duet-3',
      model: '82T6000PAU',
      description: 'Compact 2-in-1 Chromebook with detachable keyboard. Perfect for students.',
      imageUrl: 'https://placehold.co/400x300/e2e8f0/475569?text=Duet+3',
      screenSize: '10.95"',
      screenType: 'IPS',
      screenBrightness: 400,
      resolution: '2000x1200',
      touchscreen: true,
      processor: 'Qualcomm Snapdragon 7c Gen 2',
      cpuBenchmark: 2850,
      ram: 4,
      storage: 128,
      storageType: 'eMMC',
      batteryLife: 12,
      weight: 920,
      usbCPorts: 1,
      usbAPorts: 0,
      hdmiPort: false,
      sdCardSlot: false,
    },
    {
      brandId: hp.id,
      categoryId: chromebooks.id,
      name: 'Chromebook 14a',
      slug: 'hp-chromebook-14a',
      model: '14a-na0052AU',
      description: 'Affordable 14" Chromebook for everyday use.',
      imageUrl: 'https://placehold.co/400x300/e2e8f0/475569?text=HP+14a',
      screenSize: '14"',
      screenType: 'IPS',
      screenBrightness: 250,
      resolution: '1920x1080',
      touchscreen: false,
      processor: 'Intel Celeron N4500',
      cpuBenchmark: 2100,
      ram: 8,
      storage: 64,
      storageType: 'eMMC',
      batteryLife: 10,
      weight: 1460,
      usbCPorts: 1,
      usbAPorts: 2,
      hdmiPort: false,
      sdCardSlot: true,
    },
    {
      brandId: asus.id,
      categoryId: chromebooks.id,
      name: 'Chromebook Flip CX3',
      slug: 'asus-chromebook-flip-cx3',
      model: 'CX3400FMA',
      description: 'Premium 2-in-1 Chromebook with Intel Core processor.',
      imageUrl: 'https://placehold.co/400x300/e2e8f0/475569?text=ASUS+CX3',
      screenSize: '14"',
      screenType: 'IPS',
      screenBrightness: 300,
      resolution: '1920x1080',
      touchscreen: true,
      processor: 'Intel Core i3-1115G4',
      cpuBenchmark: 5200,
      ram: 8,
      storage: 256,
      storageType: 'SSD',
      batteryLife: 10,
      weight: 1550,
      usbCPorts: 2,
      usbAPorts: 1,
      hdmiPort: true,
      sdCardSlot: true,
    },
    {
      brandId: acer.id,
      categoryId: chromebooks.id,
      name: 'Chromebook 315',
      slug: 'acer-chromebook-315',
      model: 'CB315-4HT',
      description: 'Large 15.6" touchscreen Chromebook for productivity.',
      imageUrl: 'https://placehold.co/400x300/e2e8f0/475569?text=Acer+315',
      screenSize: '15.6"',
      screenType: 'IPS',
      screenBrightness: 250,
      resolution: '1920x1080',
      touchscreen: true,
      processor: 'Intel Celeron N4500',
      cpuBenchmark: 2100,
      ram: 4,
      storage: 64,
      storageType: 'eMMC',
      batteryLife: 10,
      weight: 1630,
      usbCPorts: 1,
      usbAPorts: 2,
      hdmiPort: false,
      sdCardSlot: true,
    },
    {
      brandId: samsung.id,
      categoryId: chromebooks.id,
      name: 'Galaxy Chromebook 2',
      slug: 'samsung-galaxy-chromebook-2',
      model: 'XE530QDA',
      description: 'Premium QLED 2-in-1 Chromebook with stunning display.',
      imageUrl: 'https://placehold.co/400x300/e2e8f0/475569?text=Galaxy+CB2',
      screenSize: '13.3"',
      screenType: 'QLED',
      screenBrightness: 380,
      resolution: '1920x1080',
      touchscreen: true,
      processor: 'Intel Core i3-10110U',
      cpuBenchmark: 4800,
      ram: 8,
      storage: 128,
      storageType: 'SSD',
      batteryLife: 8,
      weight: 1230,
      usbCPorts: 2,
      usbAPorts: 0,
      hdmiPort: false,
      sdCardSlot: true,
    },
    {
      brandId: lenovo.id,
      categoryId: chromebooks.id,
      name: 'Chromebook Flex 5i',
      slug: 'lenovo-chromebook-flex-5i',
      model: '82M70009AU',
      description: 'Powerful 13.3" 2-in-1 with Intel Core i5.',
      imageUrl: 'https://placehold.co/400x300/e2e8f0/475569?text=Flex+5i',
      screenSize: '13.3"',
      screenType: 'IPS',
      screenBrightness: 300,
      resolution: '1920x1080',
      touchscreen: true,
      processor: 'Intel Core i5-1135G7',
      cpuBenchmark: 6500,
      ram: 8,
      storage: 256,
      storageType: 'SSD',
      batteryLife: 10,
      weight: 1350,
      usbCPorts: 2,
      usbAPorts: 1,
      hdmiPort: true,
      sdCardSlot: true,
    },
  ]

  const insertedProducts = await db.insert(products).values(productData).returning()
  console.log(`Added ${insertedProducts.length} products`)

  // 5. Seed Retailer Listings with prices
  console.log('Adding retailer listings...')
  const listingsData = [
    // Lenovo Duet 3
    { productId: insertedProducts[0].id, retailerId: jbhifi.id, retailerUrl: 'https://www.jbhifi.com.au/products/lenovo-ideapad-duet-3', currentPriceCents: 44900, salePriceCents: 39900, inStock: true },
    { productId: insertedProducts[0].id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/lenovo-duet-3', currentPriceCents: 44900, inStock: true },
    { productId: insertedProducts[0].id, retailerId: amazonAu.id, retailerUrl: 'https://www.amazon.com.au/dp/B0EXAMPLE1', currentPriceCents: 41900, inStock: true },
    { productId: insertedProducts[0].id, retailerId: harveyNorman.id, retailerUrl: 'https://www.harveynorman.com.au/lenovo-duet-3', currentPriceCents: 47900, inStock: false },

    // HP 14a
    { productId: insertedProducts[1].id, retailerId: jbhifi.id, retailerUrl: 'https://www.jbhifi.com.au/products/hp-chromebook-14a', currentPriceCents: 49900, inStock: true },
    { productId: insertedProducts[1].id, retailerId: theGoodGuys.id, retailerUrl: 'https://www.thegoodguys.com.au/hp-chromebook-14a', currentPriceCents: 47900, inStock: true },
    { productId: insertedProducts[1].id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/hp-chromebook-14a', currentPriceCents: 49900, inStock: true },

    // ASUS CX3
    { productId: insertedProducts[2].id, retailerId: jbhifi.id, retailerUrl: 'https://www.jbhifi.com.au/products/asus-chromebook-flip-cx3', currentPriceCents: 79900, inStock: true },
    { productId: insertedProducts[2].id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/asus-cx3', currentPriceCents: 82900, inStock: true },
    { productId: insertedProducts[2].id, retailerId: amazonAu.id, retailerUrl: 'https://www.amazon.com.au/dp/B0EXAMPLE2', currentPriceCents: 77500, inStock: true },

    // Acer 315
    { productId: insertedProducts[3].id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/acer-chromebook-315', currentPriceCents: 59900, inStock: true },
    { productId: insertedProducts[3].id, retailerId: bingLee.id, retailerUrl: 'https://www.binglee.com.au/acer-315', currentPriceCents: 59900, inStock: false },
    { productId: insertedProducts[3].id, retailerId: harveyNorman.id, retailerUrl: 'https://www.harveynorman.com.au/acer-315', currentPriceCents: 62900, inStock: true },

    // Samsung Galaxy Chromebook 2
    { productId: insertedProducts[4].id, retailerId: jbhifi.id, retailerUrl: 'https://www.jbhifi.com.au/products/samsung-galaxy-chromebook-2', currentPriceCents: 99900, salePriceCents: 89900, inStock: true },
    { productId: insertedProducts[4].id, retailerId: harveyNorman.id, retailerUrl: 'https://www.harveynorman.com.au/samsung-galaxy-cb2', currentPriceCents: 99900, inStock: true },

    // Lenovo Flex 5i
    { productId: insertedProducts[5].id, retailerId: jbhifi.id, retailerUrl: 'https://www.jbhifi.com.au/products/lenovo-flex-5i', currentPriceCents: 119900, inStock: true },
    { productId: insertedProducts[5].id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/lenovo-flex-5i', currentPriceCents: 124900, inStock: true },
    { productId: insertedProducts[5].id, retailerId: amazonAu.id, retailerUrl: 'https://www.amazon.com.au/dp/B0EXAMPLE3', currentPriceCents: 115900, inStock: true },
  ]

  const insertedListings = await db.insert(retailerListings).values(listingsData).returning()
  console.log(`Added ${insertedListings.length} retailer listings`)

  // 6. Seed some price history (last 7 days)
  console.log('Adding price history...')
  const now = new Date()
  const historyData: Array<{ listingId: string; priceCents: number; wasOnSale: boolean; inStock: boolean; recordedAt: Date }> = []

  for (const listing of insertedListings) {
    // Create 7 days of price history with slight variations
    for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
      const date = new Date(now)
      date.setDate(date.getDate() - daysAgo)

      // Simulate some price changes
      let price = listing.currentPriceCents || 49900
      if (daysAgo > 3) price += 5000 // Was more expensive a few days ago
      if (daysAgo > 5) price += 3000 // Even more expensive before that

      historyData.push({
        listingId: listing.id,
        priceCents: price,
        wasOnSale: listing.salePriceCents != null && daysAgo < 3,
        inStock: listing.inStock ?? true,
        recordedAt: date,
      })
    }
  }

  await db.insert(priceHistory).values(historyData)
  console.log(`Added ${historyData.length} price history records`)

  console.log('✅ Seeding complete!')
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
