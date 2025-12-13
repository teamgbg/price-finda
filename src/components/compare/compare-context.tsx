'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface Product {
  id: string
  name: string
  brand: string
  imageUrl: string
  [key: string]: unknown
}

interface CompareContextType {
  compareList: Product[]
  addToCompare: (product: Product) => void
  removeFromCompare: (productId: string) => void
  clearCompare: () => void
  isInCompare: (productId: string) => boolean
  maxCompare: number
}

const CompareContext = createContext<CompareContextType | undefined>(undefined)

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareList, setCompareList] = useState<Product[]>([])
  const maxCompare = 4 // Maximum products to compare at once

  const addToCompare = (product: Product) => {
    if (compareList.length >= maxCompare) {
      return // Don't add if at max
    }
    if (!isInCompare(product.id)) {
      setCompareList([...compareList, product])
    }
  }

  const removeFromCompare = (productId: string) => {
    setCompareList(compareList.filter((p) => p.id !== productId))
  }

  const clearCompare = () => {
    setCompareList([])
  }

  const isInCompare = (productId: string) => {
    return compareList.some((p) => p.id === productId)
  }

  return (
    <CompareContext.Provider
      value={{
        compareList,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        maxCompare,
      }}
    >
      {children}
    </CompareContext.Provider>
  )
}

export function useCompare() {
  const context = useContext(CompareContext)
  if (context === undefined) {
    throw new Error('useCompare must be used within a CompareProvider')
  }
  return context
}
