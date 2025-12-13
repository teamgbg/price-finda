'use client'

import { X, ArrowRight, Trash2 } from 'lucide-react'
import { useCompare } from './compare-context'
import { cn } from '@/lib/utils'

export function CompareBar() {
  const { compareList, removeFromCompare, clearCompare } = useCompare()

  if (compareList.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Product thumbnails */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">
              Compare ({compareList.length}/4):
            </span>
            <div className="flex items-center gap-2">
              {compareList.map((product) => (
                <div
                  key={product.id}
                  className="relative group"
                >
                  <div className="w-16 h-12 bg-muted rounded overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => removeFromCompare(product.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {product.brand} {product.name.slice(0, 20)}...
                  </div>
                </div>
              ))}
              {/* Empty slots */}
              {Array.from({ length: 4 - compareList.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="w-16 h-12 border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center"
                >
                  <span className="text-xs text-muted-foreground">+</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={clearCompare}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
            <a
              href="/compare"
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                compareList.length >= 2
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
              onClick={(e) => {
                if (compareList.length < 2) {
                  e.preventDefault()
                }
              }}
            >
              Compare Now
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
