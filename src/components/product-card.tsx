'use client'

import { ExternalLink, TrendingDown, TrendingUp, Minus, Monitor, Cpu, HardDrive, MemoryStick } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'

interface Listing {
  retailer: string
  price: number
  salePrice?: number
  inStock: boolean
  url: string
}

interface Product {
  id: string
  name: string
  brand: string
  model: string
  imageUrl: string
  screenSize: string
  ram: number
  storage: number
  processor: string
  touchscreen: boolean
  listings: Listing[]
  priceChange: number
}

interface ProductCardProps {
  product: Product
  viewMode: 'grid' | 'list'
}

const RETAILER_COLORS: Record<string, string> = {
  'JB Hi-Fi': 'bg-yellow-100 text-yellow-800',
  'Officeworks': 'bg-green-100 text-green-800',
  'Harvey Norman': 'bg-blue-100 text-blue-800',
  'The Good Guys': 'bg-orange-100 text-orange-800',
  'Amazon AU': 'bg-amber-100 text-amber-800',
  'Bing Lee': 'bg-red-100 text-red-800',
}

export function ProductCard({ product, viewMode }: ProductCardProps) {
  const lowestPrice = Math.min(...product.listings.map((l) => l.salePrice || l.price))
  const lowestListing = product.listings.find((l) => (l.salePrice || l.price) === lowestPrice)!
  const isOnSale = product.listings.some((l) => l.salePrice)

  const PriceChangeIndicator = () => {
    if (product.priceChange === 0) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Minus className="w-3 h-3" />
          No change
        </span>
      )
    }
    if (product.priceChange < 0) {
      return (
        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
          <TrendingDown className="w-3 h-3" />
          {formatPrice(Math.abs(product.priceChange))} drop
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 text-xs text-destructive font-medium">
        <TrendingUp className="w-3 h-3" />
        {formatPrice(product.priceChange)} increase
      </span>
    )
  }

  if (viewMode === 'list') {
    return (
      <div className="card-surface p-4 flex gap-4">
        {/* Image */}
        <div className="w-32 h-24 shrink-0 bg-muted rounded-md overflow-hidden">
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs text-muted-foreground">{product.brand}</span>
              <h3 className="font-medium truncate">{product.name}</h3>
              <p className="text-xs text-muted-foreground">{product.model}</p>
            </div>
            <div className="text-right shrink-0">
              {isOnSale && (
                <div className="text-xs line-through text-muted-foreground">
                  {formatPrice(product.listings.find((l) => l.salePrice)?.price || 0)}
                </div>
              )}
              <div className="text-xl font-bold text-primary">{formatPrice(lowestPrice)}</div>
              <PriceChangeIndicator />
            </div>
          </div>

          {/* Specs */}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
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
              <span className="px-1.5 py-0.5 bg-muted rounded text-xs">Touch</span>
            )}
          </div>

          {/* Retailers */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {product.listings.map((listing) => (
              <a
                key={listing.retailer}
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'retailer-badge',
                  RETAILER_COLORS[listing.retailer] || 'bg-gray-100 text-gray-800',
                  !listing.inStock && 'opacity-50'
                )}
              >
                {listing.retailer}: {formatPrice(listing.salePrice || listing.price)}
                {!listing.inStock && ' (OOS)'}
              </a>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div className="card-surface overflow-hidden group">
      {/* Image */}
      <div className="relative h-40 bg-muted overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isOnSale && (
          <div className="absolute top-2 left-2 bg-accent text-accent-foreground px-2 py-0.5 rounded text-xs font-medium">
            SALE
          </div>
        )}
        {product.touchscreen && (
          <div className="absolute top-2 right-2 bg-background/90 px-2 py-0.5 rounded text-xs">
            Touchscreen
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Brand & Name */}
        <div>
          <span className="text-xs text-muted-foreground">{product.brand}</span>
          <h3 className="font-medium line-clamp-2 leading-snug">{product.name}</h3>
        </div>

        {/* Specs */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
              <div className="text-xs line-through text-muted-foreground">
                {formatPrice(product.listings.find((l) => l.salePrice)?.price || 0)}
              </div>
            )}
            <div className="text-xl font-bold text-primary">{formatPrice(lowestPrice)}</div>
          </div>
          <PriceChangeIndicator />
        </div>

        {/* Cheapest retailer */}
        <a
          href={lowestListing.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors',
            RETAILER_COLORS[lowestListing.retailer] || 'bg-gray-100 text-gray-800',
            'hover:opacity-80'
          )}
        >
          Buy at {lowestListing.retailer}
          <ExternalLink className="w-3 h-3" />
        </a>

        {/* Other retailers */}
        {product.listings.length > 1 && (
          <div className="text-xs text-muted-foreground text-center">
            Also at {product.listings.filter((l) => l !== lowestListing).map((l) => l.retailer).join(', ')}
          </div>
        )}
      </div>
    </div>
  )
}
