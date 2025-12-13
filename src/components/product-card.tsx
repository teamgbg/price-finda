'use client'

import { TrendingDown, TrendingUp, Monitor, HardDrive, MemoryStick, Cpu, Battery, Weight, Usb, Keyboard, Wifi, Gauge, Sun } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import type { ProductWithListings } from '@/lib/queries'

interface ProductCardProps {
  product: ProductWithListings
  viewMode: 'grid' | 'list'
}

// Uniform styling for retailer buttons - green highlight for cheapest
const BUTTON_STYLES = {
  default: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' },
  cheapest: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800' },
}

export function ProductCard({ product, viewMode }: ProductCardProps) {
  const lowestPrice = product.listings.length > 0
    ? Math.min(...product.listings.map((l) => l.salePrice || l.price))
    : 0
  const lowestListing = product.listings.find((l) => (l.salePrice || l.price) === lowestPrice)
  const isOnSale = product.listings.some((l) => l.salePrice)

  const PriceChangeIndicator = () => {
    // Don't show anything if no price change
    if (product.priceChange === 0) {
      return null
    }
    if (product.priceChange < 0) {
      return (
        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
          <TrendingDown className="w-3 h-3" />
          {formatPrice(Math.abs(product.priceChange))} drop
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
        <TrendingUp className="w-3 h-3" />
        {formatPrice(product.priceChange)} increase
      </span>
    )
  }

  // Helper to check if resolution is valid (not garbage like ":" or empty)
  const isValidResolution = (res: string | null | undefined) => {
    if (!res) return false
    const trimmed = res.trim()
    return trimmed.length > 3 && /\d+\s*x\s*\d+/i.test(trimmed)
  }

  // Helper to check if wifi is valid (not truncated garbage)
  const isValidWifi = (wifi: string | null | undefined) => {
    if (!wifi) return false
    const trimmed = wifi.trim()
    // Must be reasonable length and not end mid-word
    return trimmed.length >= 4 && trimmed.length <= 20 && !trimmed.endsWith('and') && !trimmed.endsWith(')')
  }

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
        {/* Image */}
        <div className="w-32 h-24 shrink-0 rounded-lg overflow-hidden bg-slate-100">
          <img src={product.imageUrl || ''} alt={product.name} className="w-full h-full object-contain" />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs text-sky-600 font-medium">{product.brand}</span>
              <h3 className="font-medium text-slate-800 truncate">{product.name}</h3>
              <p className="text-xs text-slate-500">{product.model}</p>
            </div>
            <div className="text-right shrink-0">
              {isOnSale && (
                <div className="text-xs line-through text-slate-400">
                  {formatPrice(product.listings.find((l) => l.salePrice)?.price || 0)}
                </div>
              )}
              <div className="text-xl font-bold text-sky-600">{formatPrice(lowestPrice)}</div>
              <PriceChangeIndicator />
            </div>
          </div>

          {/* Specs */}
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Monitor className="w-3 h-3" />
              {product.screenSize}{product.touchscreen && ' Touch'}{product.screenType && ` ${product.screenType}`}{isValidResolution(product.resolution) && ` ${product.resolution}`}
            </span>
            <span className="flex items-center gap-1">
              <MemoryStick className="w-3 h-3" />
              {product.ram}GB
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              {product.storage}GB {product.storageType}
            </span>
            {product.processor && (
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                {product.processor}
              </span>
            )}
            {(product.cpuBenchmark ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-violet-600 font-medium">
                <Gauge className="w-3 h-3" />
                {product.cpuBenchmark?.toLocaleString()}
              </span>
            )}
            {(product.weight ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Weight className="w-3 h-3" />
                {((product.weight ?? 0) / 1000).toFixed(2)}kg
              </span>
            )}
            {(product.batteryLife ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Battery className="w-3 h-3" />
                {product.batteryLife}Wh
              </span>
            )}
            {(product.screenBrightness ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Sun className="w-3 h-3" />
                {product.screenBrightness} nits
              </span>
            )}
            {((product.usbCPorts ?? 0) > 0 || (product.usbAPorts ?? 0) > 0) && (
              <span className="flex items-center gap-1">
                <Usb className="w-3 h-3" />
                {(product.usbCPorts ?? 0) > 0 ? `${product.usbCPorts}×USB-C` : ''}{(product.usbCPorts ?? 0) > 0 && (product.usbAPorts ?? 0) > 0 ? ', ' : ''}{(product.usbAPorts ?? 0) > 0 ? `${product.usbAPorts}×USB-A` : ''}
              </span>
            )}
            {product.backlitKeyboard && (
              <span className="flex items-center gap-1">
                <Keyboard className="w-3 h-3" />
                Backlit
              </span>
            )}
            {isValidWifi(product.wifi) && (
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                {product.wifi}
              </span>
            )}
          </div>

          {/* Retailers */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {product.listings
              .slice()
              .sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price))
              .map((listing, index) => {
                const isCheapest = index === 0
                const colors = isCheapest ? BUTTON_STYLES.cheapest : BUTTON_STYLES.default
                return (
                  <a
                    key={`${listing.retailer}-${index}`}
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all hover:scale-105',
                      colors.bg,
                      colors.border,
                      colors.text,
                      isCheapest && 'ring-1 ring-emerald-400',
                      !listing.inStock && 'opacity-50'
                    )}
                  >
                    {listing.retailer}: {formatPrice(listing.salePrice || listing.price)}
                    {!listing.inStock && ' (OOS)'}
                  </a>
                )
              })}
          </div>
        </div>
      </div>
    )
  }

  // Grid view - horizontal layout: title top, image left, specs right
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      {/* Title at top */}
      <div className="p-4 pb-2 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-xs text-sky-600 font-medium">{product.brand}</span>
            <h3 className="font-semibold text-slate-800 line-clamp-2 leading-snug">
              {product.name}
            </h3>
          </div>
          {isOnSale && (
            <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-xs font-bold shrink-0">SALE</span>
          )}
        </div>
      </div>

      {/* Image left, Specs right */}
      <div className="flex">
        {/* Image */}
        <div className="w-36 h-32 shrink-0 bg-slate-50 overflow-hidden">
          <img
            src={product.imageUrl || ''}
            alt={product.name}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Specs */}
        <div className="flex-1 p-3 text-xs text-slate-600 space-y-1">
          <div className="flex items-center gap-1">
            <Monitor className="w-3 h-3 text-slate-400" />
            <span>{product.screenSize}{product.touchscreen && ' Touch'}{product.screenType && ` ${product.screenType}`}{isValidResolution(product.resolution) && ` ${product.resolution}`}</span>
          </div>
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-slate-400" />
            <span className="truncate">{product.processor || 'Unknown'}</span>
            {(product.cpuBenchmark ?? 0) > 0 && (
              <span className="flex items-center gap-1 ml-2 text-violet-600 font-medium">
                <Gauge className="w-3 h-3" />
                {product.cpuBenchmark?.toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <MemoryStick className="w-3 h-3 text-slate-400" />
              {product.ram}GB
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-slate-400" />
              {product.storage}GB {product.storageType}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {(product.weight ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Weight className="w-3 h-3 text-slate-400" />
                {((product.weight ?? 0) / 1000).toFixed(2)}kg
              </span>
            )}
            {(product.batteryLife ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Battery className="w-3 h-3 text-slate-400" />
                {product.batteryLife}Wh
              </span>
            )}
            {(product.screenBrightness ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-500" />
                {product.screenBrightness} nits
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {((product.usbCPorts ?? 0) > 0 || (product.usbAPorts ?? 0) > 0) && (
              <span className="flex items-center gap-1">
                <Usb className="w-3 h-3 text-slate-400" />
                {(product.usbCPorts ?? 0) > 0 ? `${product.usbCPorts}×C` : ''}{(product.usbCPorts ?? 0) > 0 && (product.usbAPorts ?? 0) > 0 ? ' ' : ''}{(product.usbAPorts ?? 0) > 0 ? `${product.usbAPorts}×A` : ''}
              </span>
            )}
            {product.backlitKeyboard && (
              <span className="flex items-center gap-1">
                <Keyboard className="w-3 h-3 text-slate-400" />
                Backlit
              </span>
            )}
            {isValidWifi(product.wifi) && (
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3 text-slate-400" />
                {product.wifi}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Price and Retailers at bottom */}
      <div className="p-4 pt-2 border-t border-slate-100">
        <div className="mb-2">
          {isOnSale && (
            <div className="text-xs line-through text-slate-400">
              {formatPrice(product.listings.find((l) => l.salePrice)?.price || 0)}
            </div>
          )}
          <div className="text-2xl font-bold text-sky-600">{formatPrice(lowestPrice)}</div>
          <PriceChangeIndicator />
        </div>
        {/* All retailer buttons */}
        <div className="flex flex-wrap gap-1.5">
          {product.listings
            .slice()
            .sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price))
            .map((listing, index) => {
              const isCheapest = index === 0
              const colors = isCheapest ? BUTTON_STYLES.cheapest : BUTTON_STYLES.default
              return (
                <a
                  key={`${listing.retailer}-${index}`}
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all hover:scale-[1.02]',
                    colors.bg,
                    colors.border,
                    colors.text,
                    isCheapest && 'ring-1 ring-emerald-400',
                    !listing.inStock && 'opacity-50'
                  )}
                >
                  <span>{listing.retailer}</span>
                  <span className="font-bold">{formatPrice(listing.salePrice || listing.price)}</span>
                  {!listing.inStock && <span className="text-[10px]">(OOS)</span>}
                </a>
              )
            })}
        </div>
      </div>
    </div>
  )
}
