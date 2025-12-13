'use client'

import { Check, X, Minus } from 'lucide-react'
import { useCompare } from './compare-context'
import { formatPrice } from '@/lib/utils'

interface SpecRow {
  label: string
  key: string
  format?: (value: unknown) => string
  highlight?: 'higher' | 'lower' // Which is better
}

const SPEC_ROWS: SpecRow[] = [
  { label: 'Brand', key: 'brand' },
  { label: 'Model', key: 'model' },
  { label: 'Screen Size', key: 'screenSize' },
  { label: 'Screen Type', key: 'screenType' },
  { label: 'Resolution', key: 'resolution' },
  { label: 'Screen Brightness', key: 'screenBrightness', format: (v) => `${v} nits`, highlight: 'higher' },
  { label: 'Touchscreen', key: 'touchscreen', format: (v) => v ? 'Yes' : 'No' },
  { label: 'Processor', key: 'processor' },
  { label: 'CPU Benchmark', key: 'cpuBenchmark', highlight: 'higher' },
  { label: 'RAM', key: 'ram', format: (v) => `${v} GB`, highlight: 'higher' },
  { label: 'Storage', key: 'storage', format: (v) => `${v} GB`, highlight: 'higher' },
  { label: 'Storage Type', key: 'storageType' },
  { label: 'Battery Life', key: 'batteryLife', format: (v) => `${v} hours`, highlight: 'higher' },
  { label: 'Weight', key: 'weight', format: (v) => `${(v as number / 1000).toFixed(2)} kg`, highlight: 'lower' },
  { label: 'USB-C Ports', key: 'usbCPorts', highlight: 'higher' },
  { label: 'USB-A Ports', key: 'usbAPorts', highlight: 'higher' },
  { label: 'HDMI Port', key: 'hdmiPort', format: (v) => v ? 'Yes' : 'No' },
  { label: 'SD Card Slot', key: 'sdCardSlot', format: (v) => v ? 'Yes' : 'No' },
]

export function CompareTable() {
  const { compareList, removeFromCompare } = useCompare()

  if (compareList.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No products selected for comparison.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Add products to compare by clicking the "Compare" button on product cards.
        </p>
      </div>
    )
  }

  // Find best values for highlighting
  const getBestValue = (key: string, highlight?: 'higher' | 'lower') => {
    if (!highlight) return null
    const values = compareList.map((p) => p[key] as number).filter((v) => v != null)
    if (values.length === 0) return null
    return highlight === 'higher' ? Math.max(...values) : Math.min(...values)
  }

  const renderValue = (product: Record<string, unknown>, spec: SpecRow) => {
    const value = product[spec.key]

    if (value == null) return <Minus className="w-4 h-4 text-muted-foreground mx-auto" />

    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-5 h-5 text-green-600 mx-auto" />
      ) : (
        <X className="w-5 h-5 text-muted-foreground mx-auto" />
      )
    }

    const formatted = spec.format ? spec.format(value) : String(value)
    const bestValue = getBestValue(spec.key, spec.highlight)
    const isBest = bestValue != null && value === bestValue

    return (
      <span className={isBest ? 'font-semibold text-green-600' : ''}>
        {formatted}
        {isBest && <span className="ml-1 text-xs">✓</span>}
      </span>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-4 border-b border-border bg-muted/50 w-48">
              Specification
            </th>
            {compareList.map((product) => (
              <th key={product.id} className="p-4 border-b border-border bg-muted/50 min-w-[200px]">
                <div className="space-y-2">
                  <div className="w-full h-24 bg-muted rounded overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-sm font-medium line-clamp-2">{product.name}</div>
                  <button
                    onClick={() => removeFromCompare(product.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </th>
            ))}
          </tr>
          <tr>
            <td className="p-4 border-b border-border font-medium">
              Lowest Price
            </td>
            {compareList.map((product) => {
              const listings = product.listings as Array<{ price: number; salePrice?: number }>
              const lowestPrice = listings
                ? Math.min(...listings.map((l) => l.salePrice || l.price))
                : null
              return (
                <td key={product.id} className="p-4 border-b border-border text-center">
                  {lowestPrice ? (
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(lowestPrice)}
                    </span>
                  ) : (
                    <Minus className="w-4 h-4 text-muted-foreground mx-auto" />
                  )}
                </td>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {SPEC_ROWS.map((spec) => (
            <tr key={spec.key} className="hover:bg-muted/30">
              <td className="p-4 border-b border-border font-medium text-sm">
                {spec.label}
              </td>
              {compareList.map((product) => (
                <td key={product.id} className="p-4 border-b border-border text-center text-sm">
                  {renderValue(product, spec)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
