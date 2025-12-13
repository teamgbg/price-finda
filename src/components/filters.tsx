'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, SlidersHorizontal, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductWithListings } from '@/lib/queries'

interface FilterSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  columns?: 1 | 2 | 3
}

function FilterSection({ title, children, defaultOpen = true, columns = 1 }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-slate-200 pb-2 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-1.5 text-xs font-medium text-slate-700 hover:text-sky-600 transition-colors"
      >
        {title}
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>
      {isOpen && (
        <div className={cn(
          'mt-1.5',
          columns === 1 && 'space-y-1',
          columns === 2 && 'grid grid-cols-2 gap-x-2 gap-y-1',
          columns === 3 && 'grid grid-cols-3 gap-x-2 gap-y-1'
        )}>
          {children}
        </div>
      )}
    </div>
  )
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer group" onClick={onChange}>
      <div className={cn(
        'w-3.5 h-3.5 rounded border transition-all flex items-center justify-center shrink-0',
        checked
          ? 'bg-sky-500 border-sky-500'
          : 'border-slate-300 group-hover:border-sky-400'
      )}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-colors truncate">{label}</span>
    </label>
  )
}

export interface FilterState {
  brands: string[]
  retailers: string[]
  screenSizes: string[]
  ram: number[]
  storage: number[]
  priceRange: [number, number] // in dollars
  inStockOnly: boolean
  onSaleOnly: boolean
  touchscreenOnly: boolean
}

interface FiltersProps {
  products: ProductWithListings[]
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
}

export function Filters({ products, filters, onFiltersChange }: FiltersProps) {
  // Calculate max price from products (prices are in cents)
  const allPrices = products.flatMap(p => p.listings.map(l => l.salePrice || l.price))
  const maxPriceCents = allPrices.length > 0 ? Math.max(...allPrices) : 100000
  const maxPriceDollars = Math.ceil(maxPriceCents / 10000) * 100 // Round to nearest $100

  // Derive filter options from actual product data
  const filterOptions = useMemo(() => {
    const brands = [...new Set(products.map(p => p.brand))].sort()
    const retailers = [...new Set(products.flatMap(p => p.listings.map(l => l.retailer)))].sort()
    const ramValues = [...new Set(products.map(p => p.ram))].filter((v): v is number => v != null).sort((a, b) => a - b)
    const storageValues = [...new Set(products.map(p => p.storage))].filter((v): v is number => v != null).sort((a, b) => a - b)
    const screenSizes = [...new Set(products.map(p => p.screenSize))].filter((v): v is string => v != null).sort()

    return { brands, retailers, ramValues, storageValues, screenSizes, maxPriceDollars }
  }, [products, maxPriceDollars])

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleArrayFilter = <T,>(key: keyof FilterState, arr: T[], item: T) => {
    if ((arr as T[]).includes(item)) {
      updateFilter(key, arr.filter((i) => i !== item) as FilterState[typeof key])
    } else {
      updateFilter(key, [...arr, item] as FilterState[typeof key])
    }
  }

  const clearAll = () => {
    onFiltersChange({
      brands: [],
      retailers: [],
      screenSizes: [],
      ram: [],
      storage: [],
      priceRange: [0, filterOptions.maxPriceDollars],
      inStockOnly: true,
      onSaleOnly: false,
      touchscreenOnly: false,
    })
  }

  const hasFilters = filters.brands.length > 0 || filters.retailers.length > 0 ||
    filters.screenSizes.length > 0 || filters.ram.length > 0 || filters.storage.length > 0 ||
    filters.onSaleOnly || filters.touchscreenOnly

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 sticky top-20 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-sky-500" />
          <h2 className="font-semibold text-sm text-slate-800">Filters</h2>
        </div>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-sky-600 transition-colors"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset
          </button>
        )}
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => updateFilter('inStockOnly', !filters.inStockOnly)}
          className={cn(
            'px-2 py-1 text-[10px] rounded-md border transition-all',
            filters.inStockOnly
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'border-slate-200 text-slate-500 hover:border-slate-300'
          )}
        >
          In Stock
        </button>
        <button
          onClick={() => updateFilter('onSaleOnly', !filters.onSaleOnly)}
          className={cn(
            'px-2 py-1 text-[10px] rounded-md border transition-all',
            filters.onSaleOnly
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'border-slate-200 text-slate-500 hover:border-slate-300'
          )}
        >
          On Sale
        </button>
        <button
          onClick={() => updateFilter('touchscreenOnly', !filters.touchscreenOnly)}
          className={cn(
            'px-2 py-1 text-[10px] rounded-md border transition-all',
            filters.touchscreenOnly
              ? 'bg-sky-50 border-sky-200 text-sky-700'
              : 'border-slate-200 text-slate-500 hover:border-slate-300'
          )}
        >
          Touch
        </button>
      </div>

      {/* Price Range */}
      <FilterSection title="Price">
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <input
              type="number"
              value={filters.priceRange[0]}
              onChange={(e) => updateFilter('priceRange', [parseInt(e.target.value) || 0, filters.priceRange[1]])}
              className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-sky-400"
              placeholder="Min"
            />
            <input
              type="number"
              value={filters.priceRange[1]}
              onChange={(e) => updateFilter('priceRange', [filters.priceRange[0], parseInt(e.target.value) || filterOptions.maxPriceDollars])}
              className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-sky-400"
              placeholder="Max"
            />
          </div>
          <input
            type="range"
            min={0}
            max={filterOptions.maxPriceDollars}
            value={filters.priceRange[1]}
            onChange={(e) => updateFilter('priceRange', [filters.priceRange[0], parseInt(e.target.value)])}
            className="w-full accent-sky-500 h-1"
          />
        </div>
      </FilterSection>

      {/* Brand */}
      {filterOptions.brands.length > 0 && (
        <FilterSection title="Brand" columns={filterOptions.brands.length > 4 ? 2 : 1}>
          {filterOptions.brands.map((brand) => (
            <Checkbox
              key={brand}
              label={brand}
              checked={filters.brands.includes(brand)}
              onChange={() => toggleArrayFilter('brands', filters.brands, brand)}
            />
          ))}
        </FilterSection>
      )}

      {/* Retailer */}
      {filterOptions.retailers.length > 0 && (
        <FilterSection title="Retailer" columns={filterOptions.retailers.length > 4 ? 2 : 1}>
          {filterOptions.retailers.map((retailer) => (
            <Checkbox
              key={retailer}
              label={retailer}
              checked={filters.retailers.includes(retailer)}
              onChange={() => toggleArrayFilter('retailers', filters.retailers, retailer)}
            />
          ))}
        </FilterSection>
      )}

      {/* Screen Size */}
      {filterOptions.screenSizes.length > 0 && (
        <FilterSection title="Screen" columns={filterOptions.screenSizes.length > 3 ? 2 : filterOptions.screenSizes.length}>
          {filterOptions.screenSizes.map((size) => (
            <Checkbox
              key={size}
              label={size}
              checked={filters.screenSizes.includes(size)}
              onChange={() => toggleArrayFilter('screenSizes', filters.screenSizes, size)}
            />
          ))}
        </FilterSection>
      )}

      {/* RAM */}
      {filterOptions.ramValues.length > 0 && (
        <FilterSection title="RAM" columns={filterOptions.ramValues.length > 3 ? 2 : filterOptions.ramValues.length}>
          {filterOptions.ramValues.map((ram) => (
            <Checkbox
              key={ram}
              label={`${ram}GB`}
              checked={filters.ram.includes(ram)}
              onChange={() => toggleArrayFilter('ram', filters.ram, ram)}
            />
          ))}
        </FilterSection>
      )}

      {/* Storage */}
      {filterOptions.storageValues.length > 0 && (
        <FilterSection title="Storage" columns={filterOptions.storageValues.length > 3 ? 2 : filterOptions.storageValues.length}>
          {filterOptions.storageValues.map((storage) => (
            <Checkbox
              key={storage}
              label={`${storage}GB`}
              checked={filters.storage.includes(storage)}
              onChange={() => toggleArrayFilter('storage', filters.storage, storage)}
            />
          ))}
        </FilterSection>
      )}
    </div>
  )
}
