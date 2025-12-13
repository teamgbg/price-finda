import type { Metadata } from 'next'
import './globals.css'
import { CompareProvider } from '@/components/compare/compare-context'
import { CompareBar } from '@/components/compare/compare-bar'

export const metadata: Metadata = {
  title: "Max's Price Finda - Australian Chromebook Prices",
  description: 'Find the best Chromebook prices across Australian retailers. Compare prices, specs, and track price history.',
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon-32.png',
    apple: '/favicon-180.jpg',
  },
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
