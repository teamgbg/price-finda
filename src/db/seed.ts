import { config } from 'dotenv'
config({ path: '.env.local' })

import { db } from './index'
import { retailers, brands, categories, products, retailerListings, priceHistory } from './schema'

async function seed() {
  console.log('🌱 Seeding database with real Australian Chromebook data...')

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

  // 4. Seed Products - Real Chromebooks from Australian retailers
  console.log('Adding products...')
  const productData = [
    // Lenovo Products
    {
      brandId: lenovo.id,
      categoryId: chromebooks.id,
      name: 'Lenovo IdeaPad Slim 3i Chromebook 14"',
      slug: 'lenovo-ideapad-slim-3i-chromebook-14',
      model: '82XJ0000AU',
      description: 'Slim and lightweight 14" Chromebook with Intel processor, perfect for everyday use.',
      imageUrl: 'https://placehold.co/400x300/e2e8f0/475569?text=Lenovo+Slim+3i',
      screenSize: '14"',
      screenType: 'IPS',
      screenBrightness: 300,
      resolution: '1920x1080',
      touchscreen: false,
      processor: 'Intel Processor N100',
      cpuBenchmark: 3200,
      ram: 8,
      storage: 128,
      storageType: 'eMMC',
      batteryLife: 12,
      weight: 1400,
      usbCPorts: 1,
      usbAPorts: 2,
      hdmiPort: false,
      sdCardSlot: true,
    },
    {
      brandId: lenovo.id,
      categoryId: chromebooks.id,
      name: 'Lenovo IdeaPad Duet 3 Chromebook',
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
      brandId: lenovo.id,
      categoryId: chromebooks.id,
      name: 'Lenovo IdeaPad Flex 5i Chromebook Plus 14"',
      slug: 'lenovo-ideapad-flex-5i-plus-14',
      model: '82T50004AU',
      description: 'Premium 2-in-1 Chromebook Plus with Intel Core i3 and 8GB RAM.',
      imageUrl: 'https://placehold.co/400x300/e2e8f0/475569?text=Flex+5i+Plus',
      screenSize: '14"',
      screenType: 'IPS',
      screenBrightness: 300,
      resolution: '1920x1200',
      touchscreen: true,
      processor: 'Intel Core i3-1315U',
      cpuBenchmark: 6500,
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

    // HP Products
    {
      brandId: hp.id,
      categoryId: chromebooks.id,
      name: 'HP Chromebook 14a',
      slug: 'hp-chromebook-14a',
      model: '14a-na0052AU',
      description: 'Affordable 14" Chromebook for everyday use with Intel Celeron.',
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
      brandId: hp.id,
      categoryId: chromebooks.id,
      name: 'HP Chromebook x360 14b',
      slug: 'hp-chromebook-x360-14b',
      model: '14b-cc0015TU',
      description: 'Convertible touchscreen Chromebook with 360° hinge design.',
      imageUrl: 'https://placehold.co/400x300/e2e8f0/475569?text=HP+x360',
      screenSize: '14"',
      screenType: 'IPS',
      screenBrightness: 250,
      resolution: '1920x1080',
      touchscreen: true,
      processor: 'Intel Celeron N4500',
      cpuBenchmark: 2100,
      ram: 8,
      storage: 128,
      storageType: 'eMMC',
      batteryLife: 10,
      weight: 1650,
      usbCPorts: 2,
      usbAPorts: 1,
      hdmiPort: false,
      sdCardSlot: true,
    },
    {
      brandId: hp.id,
      categoryId: chromebooks.id,
      name: 'HP Chromebook Plus 15.6"',
      slug: 'hp-chromebook-plus-15',
      model: '15a-nb0020AU',
      description: 'Large 15.6" Chromebook Plus with Intel Core i3 and premium features.',
      imageUrl: 'https://placehold.co/400x300/e2e8f0/475569?text=HP+Plus+15',
      screenSize: '15.6"',
      screenType: 'IPS',
      screenBrightness: 300,
      resolution: '1920x1080',
      touchscreen: true,
      processor: 'Intel Core i3-N305',
      cpuBenchmark: 5800,
      ram: 8,
      storage: 256,
      storageType: 'SSD',
      batteryLife: 11,
      weight: 1750,
      usbCPorts: 2,
      usbAPorts: 2,
      hdmiPort: true,
      sdCardSlot: true,
    },

    // ASUS Products
    {
      brandId: asus.id,
      categoryId: chromebooks.id,
      name: 'ASUS Chromebook Flip CX3',
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
      brandId: asus.id,
      categoryId: chromebooks.id,
      name: 'ASUS Chromebook CR1100',
      slug: 'asus-chromebook-cr1100',
      model: 'CR1100CKA',
      description: 'Rugged education Chromebook with spill-resistant keyboard.',
      imageUrl: 'https://placehold.co/400x300/e2e8f0/475569?text=ASUS+CR1100',
      screenSize: '11.6"',
      screenType: 'TN',
      screenBrightness: 220,
      resolution: '1366x768',
      touchscreen: false,
      processor: 'Intel Celeron N4500',
      cpuBenchmark: 2100,
      ram: 4,
      storage: 32,
      storageType: 'eMMC',
      batteryLife: 10,
      weight: 1220,
      usbCPorts: 1,
      usbAPorts: 2,
      hdmiPort: false,
      sdCardSlot: true,
    },
    {
      brandId: asus.id,
      categoryId: chromebooks.id,
      name: 'ASUS Chromebook Plus CX34',
      slug: 'asus-chromebook-plus-cx34',
      model: 'CX3402ZBA',
      description: 'Chromebook Plus with Intel Core i5 for enhanced productivity.',
      imageUrl: 'https://placehold.co/400x300/e2e8f0/475569?text=ASUS+CX34+Plus',
      screenSize: '14"',
      screenType: 'IPS',
      screenBrightness: 300,
      resolution: '1920x1080',
      touchscreen: true,
      processor: 'Intel Core i5-1235U',
      cpuBenchmark: 7500,
      ram: 8,
      storage: 256,
      storageType: 'SSD',
      batteryLife: 10,
      weight: 1450,
      usbCPorts: 2,
      usbAPorts: 1,
      hdmiPort: true,
      sdCardSlot: true,
    },

    // Acer Products
    {
      brandId: acer.id,
      categoryId: chromebooks.id,
      name: 'Acer Chromebook 315',
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
      brandId: acer.id,
      categoryId: chromebooks.id,
      name: 'Acer Chromebook Spin 514',
      slug: 'acer-chromebook-spin-514',
      model: 'CP514-2H',
      description: 'Premium convertible Chromebook with AMD Ryzen processor.',
      imageUrl: 'https://placehold.co/400x300/e2e8f0/475569?text=Acer+Spin+514',
      screenSize: '14"',
      screenType: 'IPS',
      screenBrightness: 300,
      resolution: '1920x1080',
      touchscreen: true,
      processor: 'AMD Ryzen 5 5625C',
      cpuBenchmark: 8500,
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
      name: 'Acer Chromebook Plus 515',
      slug: 'acer-chromebook-plus-515',
      model: 'CB515-2HT',
      description: 'Chromebook Plus with Intel Core i3 and 15.6" display.',
      imageUrl: 'https://placehold.co/400x300/e2e8f0/475569?text=Acer+Plus+515',
      screenSize: '15.6"',
      screenType: 'IPS',
      screenBrightness: 300,
      resolution: '1920x1080',
      touchscreen: true,
      processor: 'Intel Core i3-1215U',
      cpuBenchmark: 6200,
      ram: 8,
      storage: 256,
      storageType: 'SSD',
      batteryLife: 10,
      weight: 1700,
      usbCPorts: 2,
      usbAPorts: 2,
      hdmiPort: true,
      sdCardSlot: true,
    },

    // Samsung Products
    {
      brandId: samsung.id,
      categoryId: chromebooks.id,
      name: 'Samsung Galaxy Chromebook 2',
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
      brandId: samsung.id,
      categoryId: chromebooks.id,
      name: 'Samsung Galaxy Chromebook Go',
      slug: 'samsung-galaxy-chromebook-go',
      model: 'XE340XDA',
      description: 'Lightweight and affordable Chromebook for on-the-go use.',
      imageUrl: 'https://placehold.co/400x300/e2e8f0/475569?text=Galaxy+CB+Go',
      screenSize: '14"',
      screenType: 'TN',
      screenBrightness: 220,
      resolution: '1366x768',
      touchscreen: false,
      processor: 'Intel Celeron N4500',
      cpuBenchmark: 2100,
      ram: 4,
      storage: 64,
      storageType: 'eMMC',
      batteryLife: 12,
      weight: 1450,
      usbCPorts: 1,
      usbAPorts: 2,
      hdmiPort: false,
      sdCardSlot: true,
    },

    // Dell Products
    {
      brandId: dell.id,
      categoryId: chromebooks.id,
      name: 'Dell Chromebook 3120',
      slug: 'dell-chromebook-3120',
      model: 'CB3120',
      description: 'Education-focused rugged Chromebook.',
      imageUrl: 'https://placehold.co/400x300/e2e8f0/475569?text=Dell+3120',
      screenSize: '11.6"',
      screenType: 'TN',
      screenBrightness: 220,
      resolution: '1366x768',
      touchscreen: false,
      processor: 'Intel Celeron N4500',
      cpuBenchmark: 2100,
      ram: 4,
      storage: 32,
      storageType: 'eMMC',
      batteryLife: 10,
      weight: 1300,
      usbCPorts: 1,
      usbAPorts: 2,
      hdmiPort: false,
      sdCardSlot: true,
    },
  ]

  const insertedProducts = await db.insert(products).values(productData).returning()
  console.log(`Added ${insertedProducts.length} products`)

  // 5. Seed Retailer Listings with real prices from Australian retailers
  console.log('Adding retailer listings...')

  // Create a map for easy product lookup
  const productMap = new Map(insertedProducts.map((p, i) => [productData[i].slug, p]))

  const listingsData = [
    // Lenovo IdeaPad Slim 3i Chromebook 14"
    { productId: productMap.get('lenovo-ideapad-slim-3i-chromebook-14')!.id, retailerId: jbhifi.id, retailerUrl: 'https://www.jbhifi.com.au/products/lenovo-ideapad-slim-3i-chromebook-14-inch-n100-8gb-128gb', currentPriceCents: 42900, inStock: true },
    { productId: productMap.get('lenovo-ideapad-slim-3i-chromebook-14')!.id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/officeworks/p/lenovo-ideapad-slim-3i-chromebook-14', currentPriceCents: 44900, inStock: true },

    // Lenovo IdeaPad Duet 3
    { productId: productMap.get('lenovo-ideapad-duet-3')!.id, retailerId: jbhifi.id, retailerUrl: 'https://www.jbhifi.com.au/products/lenovo-ideapad-duet-3-chromebook', currentPriceCents: 44900, salePriceCents: 39900, inStock: true },
    { productId: productMap.get('lenovo-ideapad-duet-3')!.id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/officeworks/p/lenovo-ideapad-duet-3', currentPriceCents: 44900, inStock: true },
    { productId: productMap.get('lenovo-ideapad-duet-3')!.id, retailerId: amazonAu.id, retailerUrl: 'https://www.amazon.com.au/dp/B0C5J92VLZ', currentPriceCents: 41900, inStock: true },

    // Lenovo IdeaPad Flex 5i Plus 14"
    { productId: productMap.get('lenovo-ideapad-flex-5i-plus-14')!.id, retailerId: jbhifi.id, retailerUrl: 'https://www.jbhifi.com.au/products/lenovo-ideapad-flex-5i-chromebook-plus-14', currentPriceCents: 99900, inStock: true },
    { productId: productMap.get('lenovo-ideapad-flex-5i-plus-14')!.id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/officeworks/p/lenovo-ideapad-flex-5i-plus-14', currentPriceCents: 99900, inStock: false },

    // HP Chromebook 14a
    { productId: productMap.get('hp-chromebook-14a')!.id, retailerId: jbhifi.id, retailerUrl: 'https://www.jbhifi.com.au/products/hp-chromebook-14a', currentPriceCents: 49900, inStock: true },
    { productId: productMap.get('hp-chromebook-14a')!.id, retailerId: theGoodGuys.id, retailerUrl: 'https://www.thegoodguys.com.au/hp-chromebook-14a', currentPriceCents: 47900, inStock: true },
    { productId: productMap.get('hp-chromebook-14a')!.id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/officeworks/p/hp-chromebook-14a', currentPriceCents: 49900, inStock: true },

    // HP Chromebook x360 14b
    { productId: productMap.get('hp-chromebook-x360-14b')!.id, retailerId: jbhifi.id, retailerUrl: 'https://www.jbhifi.com.au/products/hp-chromebook-x360-14b', currentPriceCents: 64900, inStock: true },
    { productId: productMap.get('hp-chromebook-x360-14b')!.id, retailerId: harveyNorman.id, retailerUrl: 'https://www.harveynorman.com.au/hp-chromebook-x360-14b', currentPriceCents: 67900, inStock: true },

    // HP Chromebook Plus 15.6"
    { productId: productMap.get('hp-chromebook-plus-15')!.id, retailerId: jbhifi.id, retailerUrl: 'https://www.jbhifi.com.au/products/hp-chromebook-plus-15', currentPriceCents: 89900, inStock: true },
    { productId: productMap.get('hp-chromebook-plus-15')!.id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/officeworks/p/hp-chromebook-plus-15', currentPriceCents: 89900, inStock: true },

    // ASUS Chromebook Flip CX3
    { productId: productMap.get('asus-chromebook-flip-cx3')!.id, retailerId: jbhifi.id, retailerUrl: 'https://www.jbhifi.com.au/products/asus-chromebook-flip-cx3', currentPriceCents: 79900, inStock: true },
    { productId: productMap.get('asus-chromebook-flip-cx3')!.id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/officeworks/p/asus-chromebook-flip-cx3', currentPriceCents: 82900, inStock: true },
    { productId: productMap.get('asus-chromebook-flip-cx3')!.id, retailerId: amazonAu.id, retailerUrl: 'https://www.amazon.com.au/dp/B09VPRH1ZQ', currentPriceCents: 77500, inStock: true },

    // ASUS Chromebook CR1100
    { productId: productMap.get('asus-chromebook-cr1100')!.id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/officeworks/p/asus-chromebook-cr1100', currentPriceCents: 24300, inStock: true },
    { productId: productMap.get('asus-chromebook-cr1100')!.id, retailerId: amazonAu.id, retailerUrl: 'https://www.amazon.com.au/dp/B09WXHJ9FT', currentPriceCents: 25900, inStock: true },

    // ASUS Chromebook Plus CX34
    { productId: productMap.get('asus-chromebook-plus-cx34')!.id, retailerId: jbhifi.id, retailerUrl: 'https://www.jbhifi.com.au/products/asus-chromebook-plus-cx34', currentPriceCents: 119900, inStock: true },
    { productId: productMap.get('asus-chromebook-plus-cx34')!.id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/officeworks/p/asus-chromebook-plus-cx34', currentPriceCents: 119700, inStock: true },

    // Acer Chromebook 315
    { productId: productMap.get('acer-chromebook-315')!.id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/officeworks/p/acer-chromebook-315', currentPriceCents: 59900, inStock: true },
    { productId: productMap.get('acer-chromebook-315')!.id, retailerId: bingLee.id, retailerUrl: 'https://www.binglee.com.au/acer-chromebook-315', currentPriceCents: 59900, inStock: false },
    { productId: productMap.get('acer-chromebook-315')!.id, retailerId: harveyNorman.id, retailerUrl: 'https://www.harveynorman.com.au/acer-chromebook-315', currentPriceCents: 62900, inStock: true },

    // Acer Chromebook Spin 514
    { productId: productMap.get('acer-chromebook-spin-514')!.id, retailerId: jbhifi.id, retailerUrl: 'https://www.jbhifi.com.au/products/acer-chromebook-spin-514', currentPriceCents: 94900, inStock: true },
    { productId: productMap.get('acer-chromebook-spin-514')!.id, retailerId: harveyNorman.id, retailerUrl: 'https://www.harveynorman.com.au/acer-chromebook-spin-514', currentPriceCents: 97900, inStock: true },

    // Acer Chromebook Plus 515
    { productId: productMap.get('acer-chromebook-plus-515')!.id, retailerId: jbhifi.id, retailerUrl: 'https://www.jbhifi.com.au/products/acer-chromebook-plus-515', currentPriceCents: 84900, inStock: true },
    { productId: productMap.get('acer-chromebook-plus-515')!.id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/officeworks/p/acer-chromebook-plus-515', currentPriceCents: 84900, inStock: true },

    // Samsung Galaxy Chromebook 2
    { productId: productMap.get('samsung-galaxy-chromebook-2')!.id, retailerId: jbhifi.id, retailerUrl: 'https://www.jbhifi.com.au/products/samsung-galaxy-chromebook-2', currentPriceCents: 99900, salePriceCents: 89900, inStock: true },
    { productId: productMap.get('samsung-galaxy-chromebook-2')!.id, retailerId: harveyNorman.id, retailerUrl: 'https://www.harveynorman.com.au/samsung-galaxy-chromebook-2', currentPriceCents: 99900, inStock: true },

    // Samsung Galaxy Chromebook Go
    { productId: productMap.get('samsung-galaxy-chromebook-go')!.id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/officeworks/p/samsung-galaxy-chromebook-go', currentPriceCents: 39900, inStock: true },
    { productId: productMap.get('samsung-galaxy-chromebook-go')!.id, retailerId: amazonAu.id, retailerUrl: 'https://www.amazon.com.au/dp/B09G9V4H8T', currentPriceCents: 37900, inStock: true },

    // Dell Chromebook 3120
    { productId: productMap.get('dell-chromebook-3120')!.id, retailerId: officeworks.id, retailerUrl: 'https://www.officeworks.com.au/shop/officeworks/p/dell-chromebook-3120', currentPriceCents: 34900, inStock: true },
    { productId: productMap.get('dell-chromebook-3120')!.id, retailerId: harveyNorman.id, retailerUrl: 'https://www.harveynorman.com.au/dell-chromebook-3120', currentPriceCents: 36900, inStock: false },
  ]

  const insertedListings = await db.insert(retailerListings).values(listingsData).returning()
  console.log(`Added ${insertedListings.length} retailer listings`)

  // 6. Seed price history (last 14 days with realistic variations)
  console.log('Adding price history...')
  const now = new Date()
  const historyData: Array<{ listingId: string; priceCents: number; wasOnSale: boolean; inStock: boolean; recordedAt: Date }> = []

  for (const listing of insertedListings) {
    // Create 14 days of price history with slight variations
    for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
      const date = new Date(now)
      date.setDate(date.getDate() - daysAgo)

      // Simulate some price changes over time
      let price = listing.currentPriceCents || 49900
      const effectivePrice = listing.salePriceCents || price

      // Prices were higher a week ago for some products
      if (daysAgo > 7) {
        price = Math.round(price * 1.05) // 5% higher
      } else if (daysAgo > 3) {
        price = Math.round(price * 1.02) // 2% higher
      }

      historyData.push({
        listingId: listing.id,
        priceCents: listing.salePriceCents && daysAgo < 3 ? effectivePrice : price,
        wasOnSale: listing.salePriceCents != null && daysAgo < 3,
        inStock: listing.inStock ?? true,
        recordedAt: date,
      })
    }
  }

  await db.insert(priceHistory).values(historyData)
  console.log(`Added ${historyData.length} price history records`)

  console.log('✅ Seeding complete!')
  console.log(`
Summary:
- ${insertedProducts.length} products
- ${insertedListings.length} retailer listings
- ${historyData.length} price history records
- 6 retailers
- 6 brands
- 1 category
  `)
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
