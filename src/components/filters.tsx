'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const BRANDS = ['Lenovo', 'HP', 'ASUS', 'Acer', 'Samsung', 'Dell']
const RETAILERS = ['JB Hi-Fi', 'Officeworks', 'Harvey Norman', 'The Good Guys', 'Amazon AU', 'Bing Lee']
const SCREEN_SIZES = ['11.6"', '14"', '15.6"', '17"']
const RAM_OPTIONS = [4, 8, 16]
const STORAGE_OPTIONS = [32, 64, 128, 256, 512]

interface FilterSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-border pb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 text-sm font-medium"
      >
        {title}
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isOpen && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  )
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-input"
      />
      {label}
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
  const [inStockOnly, setInStockOnly] = useState(false)
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
    inStockOnly || onSaleOnly || touchscreenOnly

  return (
    <div className="card-surface p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Filters</h2>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setInStockOnly(!inStockOnly)}
          className={cn(
            'px-3 py-1 text-xs rounded-full border transition-colors',
            inStockOnly ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:border-foreground'
          )}
        >
          In Stock
        </button>
        <button
          onClick={() => setOnSaleOnly(!onSaleOnly)}
          className={cn(
            'px-3 py-1 text-xs rounded-full border transition-colors',
            onSaleOnly ? 'bg-accent text-accent-foreground border-accent' : 'border-input hover:border-foreground'
          )}
        >
          On Sale
        </button>
        <button
          onClick={() => setTouchscreenOnly(!touchscreenOnly)}
          className={cn(
            'px-3 py-1 text-xs rounded-full border transition-colors',
            touchscreenOnly ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:border-foreground'
          )}
        >
          Touchscreen
        </button>
      </div>

      {/* Price Range */}
      <FilterSection title="Price Range">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={priceRange[0]}
              onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
              className="w-full px-2 py-1 text-sm border border-input rounded"
              placeholder="Min"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="number"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 2000])}
              className="w-full px-2 py-1 text-sm border border-input rounded"
              placeholder="Max"
            />
          </div>
          <input
            type="range"
            min={0}
            max={2000}
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
            className="w-full"
          />
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
    </div>
  )
}
