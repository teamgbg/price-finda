import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

export function formatPriceChange(oldCents: number, newCents: number): { text: string; type: 'up' | 'down' | 'same' } {
  const diff = newCents - oldCents
  if (diff === 0) return { text: 'No change', type: 'same' }

  const formatted = formatPrice(Math.abs(diff))
  if (diff > 0) return { text: `+${formatted}`, type: 'up' }
  return { text: `-${formatted}`, type: 'down' }
}
