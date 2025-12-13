import type { Metadata } from 'next'
import './globals.css'
import { CompareProvider } from '@/components/compare/compare-context'
import { CompareBar } from '@/components/compare/compare-bar'

export const metadata: Metadata = {
  title: "Max's Price Finda - Australian Chromebook Prices",
  description: 'Find the best Chromebook prices across Australian retailers. Compare prices, specs, and track price history.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-background">
        <CompareProvider>
          {children}
          <CompareBar />
        </CompareProvider>
      </body>
    </html>
  )
}
