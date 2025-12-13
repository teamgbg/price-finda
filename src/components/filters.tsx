'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, SlidersHorizontal, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

const BRANDS = ['Lenovo', 'HP', 'ASUS', 'Acer', 'Samsung', 'Dell']
const RETAILERS = ['JB Hi-Fi', 'Officeworks', 'Harvey Norman', 'The Good Guys', 'Amazon AU', 'Bing Lee']
const SCREEN_SIZES = ['10-11"', '13-14"', '15"+']
const RAM_OPTIONS = [4, 8, 16]
const STORAGE_OPTIONS = [32, 64, 128, 256]

interface FilterSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-slate-200 pb-4 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 text-sm font-medium text-slate-700 hover:text-sky-600 transition-colors"
      >
        {title}
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {isOpen && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  )
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <div className={cn(
        'w-4 h-4 rounded border transition-all flex items-center justify-center',
        checked
          ? 'bg-sky-500 border-sky-500'
          : 'border-slate-300 group-hover:border-sky-400'
      )}>
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">{label}</span>
    </label>
  )
}

export function Filters() {
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedRetailers, setSelectedRetailers] = useState<string[]>([])
  const [selectedScreenSizes, setSelectedScreenSizes] = useState<string[]>([])
  const [selectedRam, setSelectedRam] = useState<number[]>([])
  const [selectedStorage, setSelectedStorage] = useState<number[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000])
  const [inStockOnly, setInStockOnly] = useState(true)
  const [onSaleOnly, setOnSaleOnly] = useState(false)
  const [touchscreenOnly, setTouchscreenOnly] = useState(false)

  const toggleFilter = <T,>(arr: T[], item: T, setter: (arr: T[]) => void) => {
    if (arr.includes(item)) {
      setter(arr.filter((i) => i !== item))
    } else {
      setter([...arr, item])
    }
  }

  const clearAll = () => {
    setSelectedBrands([])
    setSelectedRetailers([])
    setSelectedScreenSizes([])
    setSelectedRam([])
    setSelectedStorage([])
    setPriceRange([0, 2000])
    setInStockOnly(false)
    setOnSaleOnly(false)
    setTouchscreenOnly(false)
  }

  const hasFilters = selectedBrands.length > 0 || selectedRetailers.length > 0 ||
    selectedScreenSizes.length > 0 || selectedRam.length > 0 || selectedStorage.length > 0 ||
    onSaleOnly || touchscreenOnly

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 sticky top-24 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-sky-500" />
          <h2 className="font-semibold text-slate-800">Filters</h2>
        </div>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-sky-600 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setInStockOnly(!inStockOnly)}
          className={cn(
            'px-3 py-1.5 text-xs rounded-lg border transition-all',
            inStockOnly
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'border-slate-200 text-slate-500 hover:border-slate-300'
          )}
        >
          In Stock
        </button>
        <button
          onClick={() => setOnSaleOnly(!onSaleOnly)}
          className={cn(
            'px-3 py-1.5 text-xs rounded-lg border transition-all',
            onSaleOnly
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'border-slate-200 text-slate-500 hover:border-slate-300'
          )}
        >
          On Sale
        </button>
        <button
          onClick={() => setTouchscreenOnly(!touchscreenOnly)}
          className={cn(
            'px-3 py-1.5 text-xs rounded-lg border transition-all',
            touchscreenOnly
              ? 'bg-sky-50 border-sky-200 text-sky-700'
              : 'border-slate-200 text-slate-500 hover:border-slate-300'
          )}
        >
          Touch
        </button>
      </div>

      {/* Price Range */}
      <FilterSection title="Price Range">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="number"
              value={priceRange[0]}
              onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400"
              placeholder="Min"
            />
            <input
              type="number"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 2000])}
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400"
              placeholder="Max"
            />
          </div>
          <input
            type="range"
            min={0}
            max={2000}
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
            className="w-full accent-sky-500"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}+</span>
          </div>
        </div>
      </FilterSection>

      {/* Brand */}
      <FilterSection title="Brand">
        {BRANDS.map((brand) => (
          <Checkbox
            key={brand}
            label={brand}
            checked={selectedBrands.includes(brand)}
            onChange={() => toggleFilter(selectedBrands, brand, setSelectedBrands)}
          />
        ))}
      </FilterSection>

      {/* Retailer */}
      <FilterSection title="Retailer">
        {RETAILERS.map((retailer) => (
          <Checkbox
            key={retailer}
            label={retailer}
            checked={selectedRetailers.includes(retailer)}
            onChange={() => toggleFilter(selectedRetailers, retailer, setSelectedRetailers)}
          />
        ))}
      </FilterSection>

      {/* Screen Size */}
      <FilterSection title="Screen Size">
        {SCREEN_SIZES.map((size) => (
          <Checkbox
            key={size}
            label={size}
            checked={selectedScreenSizes.includes(size)}
            onChange={() => toggleFilter(selectedScreenSizes, size, setSelectedScreenSizes)}
          />
        ))}
      </FilterSection>

      {/* RAM */}
      <FilterSection title="RAM">
        {RAM_OPTIONS.map((ram) => (
          <Checkbox
            key={ram}
            label={`${ram} GB`}
            checked={selectedRam.includes(ram)}
            onChange={() => toggleFilter(selectedRam, ram, setSelectedRam)}
          />
        ))}
      </FilterSection>

      {/* Storage */}
      <FilterSection title="Storage">
        {STORAGE_OPTIONS.map((storage) => (
          <Checkbox
            key={storage}
            label={`${storage} GB`}
            checked={selectedStorage.includes(storage)}
            onChange={() => toggleFilter(selectedStorage, storage, setSelectedStorage)}
          />
        ))}
      </FilterSection>

      <button className="w-full py-2.5 text-sm bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors">
        Apply Filters
      </button>
    </div>
  )
}
