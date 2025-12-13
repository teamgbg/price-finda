'use client'

import { useState } from 'react'
import { ArrowUpDown, Grid, List, TrendingDown, TrendingUp } from 'lucide-react'
import { ProductCard } from './product-card'
import { cn } from '@/lib/utils'

// Mock data for now - will be replaced with real data from API
const MOCK_PRODUCTS = [
  {
    id: '1',
    name: 'Lenovo IdeaPad Duet 3 Chromebook',
    brand: 'Lenovo',
    model: '82T6000PAU',
    imageUrl: 'https://placehold.co/300x200/e2e8f0/475569?text=Chromebook',
    screenSize: '10.95"',
    ram: 4,
    storage: 128,
    processor: 'Qualcomm Snapdragon 7c Gen 2',
    touchscreen: true,
    listings: [
      { retailer: 'JB Hi-Fi', price: 44900, salePrice: 39900, inStock: true, url: '#' },
      { retailer: 'Officeworks', price: 44900, inStock: true, url: '#' },
      { retailer: 'Harvey Norman', price: 47900, inStock: false, url: '#' },
    ],
    priceChange: -5000,
  },
  {
    id: '2',
    name: 'HP Chromebook 14a',
    brand: 'HP',
    model: '14a-na0052AU',
    imageUrl: 'https://placehold.co/300x200/e2e8f0/475569?text=Chromebook',
    screenSize: '14"',
    ram: 8,
    storage: 64,
    processor: 'Intel Celeron N4500',
    touchscreen: false,
    listings: [
      { retailer: 'JB Hi-Fi', price: 49900, inStock: true, url: '#' },
      { retailer: 'The Good Guys', price: 47900, inStock: true, url: '#' },
    ],
    priceChange: 0,
  },
  {
    id: '3',
    name: 'ASUS Chromebook Flip CX3',
    brand: 'ASUS',
    model: 'CX3400FMA',
    imageUrl: 'https://placehold.co/300x200/e2e8f0/475569?text=Chromebook',
    screenSize: '14"',
    ram: 8,
    storage: 256,
    processor: 'Intel Core i3-1115G4',
    touchscreen: true,
    listings: [
      { retailer: 'JB Hi-Fi', price: 79900, inStock: true, url: '#' },
      { retailer: 'Officeworks', price: 82900, inStock: true, url: '#' },
      { retailer: 'Amazon AU', price: 77500, inStock: true, url: '#' },
    ],
    priceChange: -2400,
  },
  {
    id: '4',
    name: 'Acer Chromebook 315',
    brand: 'Acer',
    model: 'CB315-4HT',
    imageUrl: 'https://placehold.co/300x200/e2e8f0/475569?text=Chromebook',
    screenSize: '15.6"',
    ram: 4,
    storage: 64,
    processor: 'Intel Celeron N4500',
    touchscreen: true,
    listings: [
      { retailer: 'Officeworks', price: 59900, inStock: true, url: '#' },
      { retailer: 'Bing Lee', price: 59900, inStock: false, url: '#' },
    ],
    priceChange: 1000,
  },
  {
    id: '5',
    name: 'Samsung Galaxy Chromebook 2',
    brand: 'Samsung',
    model: 'XE530QDA',
    imageUrl: 'https://placehold.co/300x200/e2e8f0/475569?text=Chromebook',
    screenSize: '13.3"',
    ram: 8,
    storage: 128,
    processor: 'Intel Core i3-10110U',
    touchscreen: true,
    listings: [
      { retailer: 'JB Hi-Fi', price: 99900, salePrice: 89900, inStock: true, url: '#' },
      { retailer: 'Harvey Norman', price: 99900, inStock: true, url: '#' },
    ],
    priceChange: -10000,
  },
  {
    id: '6',
    name: 'Lenovo Chromebook Flex 5i',
    brand: 'Lenovo',
    model: '82M70009AU',
    imageUrl: 'https://placehold.co/300x200/e2e8f0/475569?text=Chromebook',
    screenSize: '13.3"',
    ram: 8,
    storage: 256,
    processor: 'Intel Core i5-1135G7',
    touchscreen: true,
    listings: [
      { retailer: 'JB Hi-Fi', price: 119900, inStock: true, url: '#' },
      { retailer: 'Officeworks', price: 124900, inStock: true, url: '#' },
    ],
    priceChange: 0,
  },
]

type SortOption = 'price-asc' | 'price-desc' | 'name' | 'brand' | 'price-drop'

export function ProductGrid() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<SortOption>('price-asc')

  const sortedProducts = [...MOCK_PRODUCTS].sort((a, b) => {
    const aMinPrice = Math.min(...a.listings.map((l) => l.salePrice || l.price))
    const bMinPrice = Math.min(...b.listings.map((l) => l.salePrice || l.price))

    switch (sortBy) {
      case 'price-asc':
        return aMinPrice - bMinPrice
      case 'price-desc':
        return bMinPrice - aMinPrice
      case 'name':
        return a.name.localeCompare(b.name)
      case 'brand':
        return a.brand.localeCompare(b.brand)
      case 'price-drop':
        return a.priceChange - b.priceChange
      default:
        return 0
    }
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{sortedProducts.length}</span> Chromebooks
        </div>

        <div className="flex items-center gap-4">
          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-sm border border-input rounded-md px-2 py-1 bg-background"
            >
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="price-drop">Biggest Price Drops</option>
              <option value="name">Name</option>
              <option value="brand">Brand</option>
            </select>
          </div>

          {/* View Mode */}
          <div className="flex items-center border border-input rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'grid' ? 'bg-muted' : 'hover:bg-muted/50'
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'list' ? 'bg-muted' : 'hover:bg-muted/50'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Price Drops Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
        <TrendingDown className="w-5 h-5 text-green-600" />
        <span className="text-sm text-green-800">
          <strong>24 price drops</strong> detected in the last 24 hours!
        </span>
      </div>

      {/* Products */}
      <div
        className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
            : 'space-y-4'
        )}
      >
        {sortedProducts.map((product) => (
          <ProductCard key={product.id} product={product} viewMode={viewMode} />
        ))}
      </div>
    </div>
  )
}
