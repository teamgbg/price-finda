'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Laptop, Menu, X, ArrowUpDown, Grid, List } from 'lucide-react'
import { ProductGrid, type SortOption, type ViewMode } from './product-grid'
import { Filters } from './filters'
import { cn } from '@/lib/utils'
import type { ProductWithListings } from '@/lib/queries'

interface ChromebooksClientProps {
  products: ProductWithListings[]
}

export function ChromebooksClient({ products }: ChromebooksClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('price-asc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter products by search query
  const filteredProducts = products.filter((product) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      product.name.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query) ||
      product.model?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      {/* Header with sorting controls */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <img
                src="/max-logo.jpg"
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
            <div className="hidden md:flex items-center gap-3">
              {/* Sort */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400"
                >
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="price-drop">Biggest Price Drops</option>
                  <option value="name">Name</option>
                  <option value="brand">Brand</option>
                </select>
              </div>

              {/* View Mode */}
              <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 transition-all',
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
                    'p-2 transition-all',
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-40 pl-10 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
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
              <div className="mt-4 flex items-center gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="flex-1 text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="price-drop">Biggest Price Drops</option>
                  <option value="name">Name</option>
                  <option value="brand">Brand</option>
                </select>
                <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'p-2 transition-all',
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
                      'p-2 transition-all',
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
          <aside className="w-full lg:w-64 shrink-0">
            <Filters />
          </aside>
          <div className="flex-1">
            <ProductGrid products={filteredProducts} sortBy={sortBy} viewMode={viewMode} />
          </div>
        </div>
      </main>
    </div>
  )
}
