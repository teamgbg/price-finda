'use client'

import Link from 'next/link'
import { ExternalLink, TrendingDown, TrendingUp, Minus, Monitor, HardDrive, MemoryStick } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import type { ProductWithListings } from '@/lib/queries'

interface ProductCardProps {
  product: ProductWithListings
  viewMode: 'grid' | 'list'
}

const RETAILER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'JB Hi-Fi': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
  'Officeworks': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' },
  'Harvey Norman': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
  'The Good Guys': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' },
  'Amazon AU': { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' },
  'Bing Lee': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
}

export function ProductCard({ product, viewMode }: ProductCardProps) {
  const lowestPrice = product.listings.length > 0
    ? Math.min(...product.listings.map((l) => l.salePrice || l.price))
    : 0
  const lowestListing = product.listings.find((l) => (l.salePrice || l.price) === lowestPrice)
  const isOnSale = product.listings.some((l) => l.salePrice)

  const PriceChangeIndicator = () => {
    if (product.priceChange === 0) {
      return (
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <Minus className="w-3 h-3" />
          No change
        </span>
      )
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

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
        {/* Image */}
        <Link href={`/product/${product.slug}`} className="w-32 h-24 shrink-0 rounded-lg overflow-hidden bg-slate-100">
          <img src={product.imageUrl || ''} alt={product.name} className="w-full h-full object-cover" />
        </Link>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs text-sky-600 font-medium">{product.brand}</span>
              <Link href={`/product/${product.slug}`}>
                <h3 className="font-medium text-slate-800 truncate hover:text-sky-600 transition-colors">{product.name}</h3>
              </Link>
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
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Monitor className="w-3 h-3" />
              {product.screenSize}
            </span>
            <span className="flex items-center gap-1">
              <MemoryStick className="w-3 h-3" />
              {product.ram}GB
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              {product.storage}GB
            </span>
            {product.touchscreen && (
              <span className="px-2 py-0.5 bg-sky-100 rounded text-sky-700 text-xs">Touch</span>
            )}
          </div>

          {/* Retailers */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {product.listings.map((listing) => {
              const colors = RETAILER_COLORS[listing.retailer] || { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' }
              return (
                <a
                  key={listing.retailer}
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all hover:scale-105',
                    colors.bg,
                    colors.border,
                    colors.text,
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

  // Grid view
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      {/* Image */}
      <Link href={`/product/${product.slug}`} className="relative block h-44 bg-slate-100 overflow-hidden">
        <img
          src={product.imageUrl || ''}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {isOnSale && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-rose-500 text-white text-xs font-bold">
            SALE
          </div>
        )}
        {product.touchscreen && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-white/90 text-slate-700 text-xs shadow-sm">
            Touchscreen
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Brand & Name */}
        <div>
          <span className="text-xs text-sky-600 font-medium">{product.brand}</span>
          <Link href={`/product/${product.slug}`}>
            <h3 className="font-semibold text-slate-800 line-clamp-2 leading-snug hover:text-sky-600 transition-colors">
              {product.name}
            </h3>
          </Link>
        </div>

        {/* Specs */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Monitor className="w-3 h-3" />
            {product.screenSize}
          </span>
          <span className="flex items-center gap-1">
            <MemoryStick className="w-3 h-3" />
            {product.ram}GB
          </span>
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3" />
            {product.storage}GB
          </span>
        </div>

        {/* Price */}
        <div className="flex items-end justify-between">
          <div>
            {isOnSale && (
              <div className="text-xs line-through text-slate-400">
                {formatPrice(product.listings.find((l) => l.salePrice)?.price || 0)}
              </div>
            )}
            <div className="text-2xl font-bold text-sky-600">{formatPrice(lowestPrice)}</div>
          </div>
          <PriceChangeIndicator />
        </div>

        {/* Cheapest retailer button */}
        {lowestListing && (
          <a
            href={lowestListing.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]',
              RETAILER_COLORS[lowestListing.retailer]?.bg || 'bg-sky-50',
              RETAILER_COLORS[lowestListing.retailer]?.border || 'border-sky-200',
              RETAILER_COLORS[lowestListing.retailer]?.text || 'text-sky-700',
              'border'
            )}
          >
            Buy at {lowestListing.retailer}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        {/* Other retailers */}
        {product.listings.length > 1 && (
          <div className="text-xs text-slate-500 text-center">
            Also at {product.listings.filter((l) => l !== lowestListing).map((l) => l.retailer).join(', ')}
          </div>
        )}
      </div>
    </div>
  )
}
