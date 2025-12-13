'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format } from 'date-fns'
import { formatPrice } from '@/lib/utils'

interface PriceDataPoint {
  date: string
  [retailer: string]: number | string // Price in cents per retailer
}

interface PriceHistoryChartProps {
  data: PriceDataPoint[]
  retailers: string[]
}

const RETAILER_COLORS: Record<string, string> = {
  'JB Hi-Fi': '#fbbf24',
  'Officeworks': '#22c55e',
  'Harvey Norman': '#3b82f6',
  'The Good Guys': '#f97316',
  'Amazon AU': '#f59e0b',
  'Bing Lee': '#ef4444',
}

const DEFAULT_COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export function PriceHistoryChart({ data, retailers }: PriceHistoryChartProps) {
  // Calculate price range for Y axis
  const { minPrice, maxPrice } = useMemo(() => {
    let min = Infinity
    let max = 0
    data.forEach((point) => {
      retailers.forEach((retailer) => {
        const price = point[retailer] as number
        if (price && price > 0) {
          min = Math.min(min, price)
          max = Math.max(max, price)
        }
      })
    })
    // Add 10% padding
    return {
      minPrice: Math.floor((min * 0.9) / 10000) * 10000,
      maxPrice: Math.ceil((max * 1.1) / 10000) * 10000,
    }
  }, [data, retailers])

  const formatYAxis = (value: number) => {
    return `$${(value / 100).toFixed(0)}`
  }

  const formatTooltipValue = (value: number) => {
    return formatPrice(value)
  }

  const formatXAxis = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d')
    } catch {
      return dateStr
    }
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No price history available yet
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tickFormatter={formatYAxis}
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            formatter={formatTooltipValue}
            labelFormatter={(label) => format(new Date(label), 'PPP')}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
            }}
          />
          <Legend />
          {retailers.map((retailer, index) => (
            <Line
              key={retailer}
              type="monotone"
              dataKey={retailer}
              name={retailer}
              stroke={RETAILER_COLORS[retailer] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Example usage with mock data
export function PriceHistoryChartDemo() {
  const mockData: PriceDataPoint[] = [
    { date: '2024-11-01', 'JB Hi-Fi': 49900, 'Officeworks': 51900, 'Amazon AU': 47500 },
    { date: '2024-11-08', 'JB Hi-Fi': 49900, 'Officeworks': 49900, 'Amazon AU': 47500 },
    { date: '2024-11-15', 'JB Hi-Fi': 44900, 'Officeworks': 49900, 'Amazon AU': 45900 },
    { date: '2024-11-22', 'JB Hi-Fi': 44900, 'Officeworks': 44900, 'Amazon AU': 42900 },
    { date: '2024-11-29', 'JB Hi-Fi': 39900, 'Officeworks': 44900, 'Amazon AU': 42900 },
    { date: '2024-12-06', 'JB Hi-Fi': 39900, 'Officeworks': 42900, 'Amazon AU': 39900 },
  ]

  return (
    <PriceHistoryChart
      data={mockData}
      retailers={['JB Hi-Fi', 'Officeworks', 'Amazon AU']}
    />
  )
}
