'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Laptop, Menu, X, Grid, List } from 'lucide-react'
import { ProductGrid, type SortOption, type ViewMode } from './product-grid'
import { Filters, type FilterState } from './filters'
import { cn } from '@/lib/utils'
import type { ProductWithListings } from '@/lib/queries'

interface ChromebooksClientProps {
  products: ProductWithListings[]
}

// Calculate initial max price from products (in dollars)
function getMaxPriceDollars(products: ProductWithListings[]): number {
  const allPrices = products.flatMap(p => p.listings.map(l => l.salePrice || l.price))
  const maxPriceCents = allPrices.length > 0 ? Math.max(...allPrices) : 100000
  return Math.ceil(maxPriceCents / 10000) * 100
}

export function ChromebooksClient({ products }: ChromebooksClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('price-asc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter state - initialized with sensible defaults
  const [filters, setFilters] = useState<FilterState>(() => ({
    brands: [],
    retailers: [],
    screenSizes: [],
    resolutions: [],
    ram: [],
    storage: [],
    priceRange: [0, getMaxPriceDollars(products)],
    inStockOnly: true,
    onSaleOnly: false,
    touchscreen: 'all',
  }))

  // Apply all filters to products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          product.name.toLowerCase().includes(query) ||
          product.brand.toLowerCase().includes(query) ||
          product.model?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Brand filter
      if (filters.brands.length > 0 && !filters.brands.includes(product.brand)) {
        return false
      }

      // Screen size filter
      if (filters.screenSizes.length > 0 && product.screenSize && !filters.screenSizes.includes(product.screenSize)) {
        return false
      }

      // RAM filter
      if (filters.ram.length > 0 && product.ram && !filters.ram.includes(product.ram)) {
        return false
      }

      // Storage filter
      if (filters.storage.length > 0 && product.storage && !filters.storage.includes(product.storage)) {
        return false
      }

      // Resolution filter
      if (filters.resolutions.length > 0 && product.resolution) {
        if (!filters.resolutions.includes(product.resolution)) {
          return false
        }
      }

      // Touchscreen filter
      if (filters.touchscreen === 'touch' && !product.touchscreen) {
        return false
      }
      if (filters.touchscreen === 'non-touch' && product.touchscreen) {
        return false
      }

      // Get relevant listings for this product
      let relevantListings = product.listings

      // Retailer filter
      if (filters.retailers.length > 0) {
        relevantListings = relevantListings.filter(l => filters.retailers.includes(l.retailer))
        if (relevantListings.length === 0) return false
      }

      // In stock filter
      if (filters.inStockOnly) {
        relevantListings = relevantListings.filter(l => l.inStock)
        if (relevantListings.length === 0) return false
      }

      // On sale filter
      if (filters.onSaleOnly) {
        relevantListings = relevantListings.filter(l => l.salePrice != null)
        if (relevantListings.length === 0) return false
      }

      // Price range filter (convert dollars to cents for comparison)
      const minPriceCents = filters.priceRange[0] * 100
      const maxPriceCents = filters.priceRange[1] * 100
      const lowestPrice = Math.min(...relevantListings.map(l => l.salePrice || l.price))
      if (lowestPrice < minPriceCents || lowestPrice > maxPriceCents) {
        return false
      }

      return true
    })
  }, [products, searchQuery, filters])

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      {/* Header with sorting controls */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <img
                src="/max-logo-square.jpg"
                alt="Max"
                className="w-10 h-10 rounded-xl object-cover shadow-md"
              />
              <div>
                <span className="font-bold text-lg text-slate-800">Max's Price Finda</span>
                <span className="hidden sm:block text-xs text-slate-500">Find the best deals on items in Australia</span>
              </div>
            </Link>

            {/* Desktop Navigation - Left aligned tabs */}
            <nav className="hidden md:flex items-center gap-2">
              <Link
                href="/chromebooks"
                className="flex items-center gap-2 text-sky-600 bg-sky-50 px-3 py-2 rounded-lg font-medium"
              >
                <Laptop className="w-4 h-4" />
                Chromebooks
              </Link>
            </nav>

            {/* Right side controls - Sort, View, Search */}
            <div className="hidden md:flex items-center gap-2">
              {/* Sort toggles */}
              <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden text-xs">
                <button
                  onClick={() => setSortBy('price-asc')}
                  className={cn(
                    'px-2 py-1.5 transition-all',
                    sortBy === 'price-asc'
                      ? 'bg-sky-500 text-white'
                      : 'text-slate-500 hover:bg-slate-200'
                  )}
                >
                  Price ↑
                </button>
                <button
                  onClick={() => setSortBy('price-desc')}
                  className={cn(
                    'px-2 py-1.5 transition-all',
                    sortBy === 'price-desc'
                      ? 'bg-sky-500 text-white'
                      : 'text-slate-500 hover:bg-slate-200'
                  )}
                >
                  Price ↓
                </button>
                <button
                  onClick={() => setSortBy('name')}
                  className={cn(
                    'px-2 py-1.5 transition-all',
                    sortBy === 'name'
                      ? 'bg-sky-500 text-white'
                      : 'text-slate-500 hover:bg-slate-200'
                  )}
                >
                  A-Z
                </button>
                <button
                  onClick={() => setSortBy('performance')}
                  className={cn(
                    'px-2 py-1.5 transition-all',
                    sortBy === 'performance'
                      ? 'bg-sky-500 text-white'
                      : 'text-slate-500 hover:bg-slate-200'
                  )}
                >
                  Power
                </button>
              </div>

              {/* View Mode */}
              <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-1.5 transition-all',
                    viewMode === 'grid'
                      ? 'bg-sky-500 text-white'
                      : 'text-slate-500 hover:bg-slate-200'
                  )}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-1.5 transition-all',
                    viewMode === 'list'
                      ? 'bg-sky-500 text-white'
                      : 'text-slate-500 hover:bg-slate-200'
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-36 pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
                />
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-slate-600" />
              ) : (
                <Menu className="w-6 h-6 text-slate-600" />
              )}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200">
              <nav className="flex flex-col gap-2">
                <Link
                  href="/chromebooks"
                  className="flex items-center gap-2 text-sky-600 bg-sky-50 px-3 py-2 rounded-lg font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Laptop className="w-4 h-4" />
                  Chromebooks
                </Link>
              </nav>

              {/* Mobile sort/view controls */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden text-xs flex-1">
                  <button
                    onClick={() => setSortBy('price-asc')}
                    className={cn(
                      'flex-1 px-2 py-1.5 transition-all',
                      sortBy === 'price-asc'
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-500'
                    )}
                  >
                    Price ↑
                  </button>
                  <button
                    onClick={() => setSortBy('price-desc')}
                    className={cn(
                      'flex-1 px-2 py-1.5 transition-all',
                      sortBy === 'price-desc'
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-500'
                    )}
                  >
                    Price ↓
                  </button>
                  <button
                    onClick={() => setSortBy('name')}
                    className={cn(
                      'flex-1 px-2 py-1.5 transition-all',
                      sortBy === 'name'
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-500'
                    )}
                  >
                    A-Z
                  </button>
                  <button
                    onClick={() => setSortBy('performance')}
                    className={cn(
                      'flex-1 px-2 py-1.5 transition-all',
                      sortBy === 'performance'
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-500'
                    )}
                  >
                    Power
                  </button>
                </div>
                <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'p-1.5 transition-all',
                      viewMode === 'grid'
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-500'
                    )}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'p-1.5 transition-all',
                      viewMode === 'list'
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-500'
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Chromebooks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-56 shrink-0">
            <Filters products={products} filters={filters} onFiltersChange={setFilters} />
          </aside>
          <div className="flex-1">
            <ProductGrid products={filteredProducts} sortBy={sortBy} viewMode={viewMode} />
          </div>
        </div>
      </main>
    </div>
  )
}
