'use client'

import { Search } from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const [search, setSearch] = useState('')

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">M</span>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Max's Price Finda</h1>
              <p className="text-xs text-muted-foreground">Australian Chromebook Prices</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search Chromebooks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="font-semibold text-foreground">150+</div>
              <div className="text-muted-foreground text-xs">Chromebooks</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-foreground">6</div>
              <div className="text-muted-foreground text-xs">Retailers</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">24</div>
              <div className="text-muted-foreground text-xs">Price Drops</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
