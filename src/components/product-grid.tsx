'use client'

import { Grid } from 'lucide-react'
import { ProductCard } from './product-card'
import { cn } from '@/lib/utils'
import type { ProductWithListings } from '@/lib/queries'

export type SortOption = 'price-asc' | 'price-desc' | 'name' | 'brand' | 'price-drop' | 'performance'
export type ViewMode = 'grid' | 'list'

interface ProductGridProps {
  products: ProductWithListings[]
  sortBy?: SortOption
  viewMode?: ViewMode
}

export function ProductGrid({ products, sortBy = 'price-asc', viewMode = 'grid' }: ProductGridProps) {
  const sortedProducts = [...products].sort((a, b) => {
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
      case 'performance':
        // Higher benchmark = better, so sort descending. Products without benchmark go to end.
        const aBench = a.cpuBenchmark ?? 0
        const bBench = b.cpuBenchmark ?? 0
        return bBench - aBench
      default:
        return 0
    }
  })

  return (
    <div className="space-y-6">
      {/* Empty state */}
      {sortedProducts.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-4">
            <Grid className="w-8 h-8 text-sky-500" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">No products found</h3>
          <p className="text-slate-600">Try adjusting your filters or check back later.</p>
        </div>
      )}

      {/* Products */}
      <div
        className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
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
