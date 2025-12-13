import { Header } from '@/components/header'
import { PriceHistoryChartDemo } from '@/components/price-history-chart'
import { ExternalLink, TrendingDown, Monitor, MemoryStick, HardDrive, Battery, Cpu, Scale } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

// Mock product data - will be replaced with database query
const MOCK_PRODUCT = {
  id: '1',
  name: 'Lenovo IdeaPad Duet 3 Chromebook',
  brand: 'Lenovo',
  model: '82T6000PAU',
  description: 'Compact and versatile 2-in-1 Chromebook with detachable keyboard. Perfect for students and on-the-go productivity.',
  imageUrl: 'https://placehold.co/600x400/e2e8f0/475569?text=Chromebook',
  screenSize: '10.95"',
  screenType: 'IPS',
  screenBrightness: 400,
  resolution: '2000x1200',
  touchscreen: true,
  processor: 'Qualcomm Snapdragon 7c Gen 2',
  cpuBenchmark: 2850,
  ram: 4,
  storage: 128,
  storageType: 'eMMC',
  batteryLife: 12,
  weight: 920,
  usbCPorts: 2,
  usbAPorts: 0,
  hdmiPort: false,
  sdCardSlot: false,
  listings: [
    { retailer: 'JB Hi-Fi', retailerSlug: 'jb-hifi', price: 44900, salePrice: 39900, inStock: true, url: '#' },
    { retailer: 'Officeworks', retailerSlug: 'officeworks', price: 44900, inStock: true, url: '#' },
    { retailer: 'Amazon AU', retailerSlug: 'amazon-au', price: 41900, inStock: true, url: '#' },
    { retailer: 'Harvey Norman', retailerSlug: 'harvey-norman', price: 47900, inStock: false, url: '#' },
  ],
}

const RETAILER_COLORS: Record<string, string> = {
  'JB Hi-Fi': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Officeworks': 'bg-green-100 text-green-800 border-green-300',
  'Harvey Norman': 'bg-blue-100 text-blue-800 border-blue-300',
  'The Good Guys': 'bg-orange-100 text-orange-800 border-orange-300',
  'Amazon AU': 'bg-amber-100 text-amber-800 border-amber-300',
  'Bing Lee': 'bg-red-100 text-red-800 border-red-300',
}

export default function ProductPage() {
  const product = MOCK_PRODUCT
  const lowestPrice = Math.min(
    ...product.listings.map((l) => l.salePrice || l.price)
  )
  const lowestListing = product.listings.find(
    (l) => (l.salePrice || l.price) === lowestPrice
  )!

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product header */}
            <div className="card-surface p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-64 h-48 bg-muted rounded-lg overflow-hidden shrink-0">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-muted-foreground">{product.brand}</span>
                  <h1 className="text-2xl font-bold">{product.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">{product.model}</p>

                  <div className="flex items-end gap-2 mt-4">
                    <span className="text-3xl font-bold text-primary">
                      {formatPrice(lowestPrice)}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">
                      at {lowestListing.retailer}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-green-600">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-sm font-medium">$50 cheaper than yesterday</span>
                  </div>

                  <p className="text-sm text-muted-foreground mt-4">
                    {product.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Price History */}
            <div className="card-surface p-6">
              <h2 className="text-lg font-semibold mb-4">Price History</h2>
              <PriceHistoryChartDemo />
            </div>

            {/* Specifications */}
            <div className="card-surface p-6">
              <h2 className="text-lg font-semibold mb-4">Specifications</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <SpecItem icon={Monitor} label="Screen" value={`${product.screenSize} ${product.screenType}`} />
                <SpecItem icon={Monitor} label="Resolution" value={product.resolution} />
                <SpecItem icon={Monitor} label="Brightness" value={`${product.screenBrightness} nits`} />
                <SpecItem icon={Cpu} label="Processor" value={product.processor} />
                <SpecItem icon={Cpu} label="CPU Score" value={product.cpuBenchmark.toString()} />
                <SpecItem icon={MemoryStick} label="RAM" value={`${product.ram} GB`} />
                <SpecItem icon={HardDrive} label="Storage" value={`${product.storage} GB ${product.storageType}`} />
                <SpecItem icon={Battery} label="Battery" value={`${product.batteryLife} hours`} />
                <SpecItem icon={Scale} label="Weight" value={`${(product.weight / 1000).toFixed(2)} kg`} />
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <h3 className="text-sm font-medium mb-2">Connectivity</h3>
                <div className="flex flex-wrap gap-2">
                  <SpecBadge label={`${product.usbCPorts}x USB-C`} active={product.usbCPorts > 0} />
                  <SpecBadge label={`${product.usbAPorts}x USB-A`} active={product.usbAPorts > 0} />
                  <SpecBadge label="HDMI" active={product.hdmiPort} />
                  <SpecBadge label="SD Card" active={product.sdCardSlot} />
                  <SpecBadge label="Touchscreen" active={product.touchscreen} />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Retailers */}
          <div className="space-y-4">
            <div className="card-surface p-4">
              <h2 className="font-semibold mb-4">Buy From</h2>
              <div className="space-y-3">
                {product.listings
                  .sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price))
                  .map((listing) => (
                    <a
                      key={listing.retailer}
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block p-3 rounded-lg border transition-all hover:shadow-md ${
                        listing.inStock
                          ? RETAILER_COLORS[listing.retailer] || 'bg-gray-100 border-gray-300'
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{listing.retailer}</span>
                        <ExternalLink className="w-4 h-4" />
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        {listing.salePrice && (
                          <span className="text-sm line-through opacity-60">
                            {formatPrice(listing.price)}
                          </span>
                        )}
                        <span className="text-lg font-bold">
                          {formatPrice(listing.salePrice || listing.price)}
                        </span>
                      </div>
                      {!listing.inStock && (
                        <span className="text-xs">Out of stock</span>
                      )}
                      {listing.salePrice && listing.inStock && (
                        <span className="text-xs font-medium">ON SALE</span>
                      )}
                    </a>
                  ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              Prices updated daily. Some links may earn us a commission.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function SpecItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  )
}

function SpecBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`px-2 py-1 rounded text-xs ${
        active
          ? 'bg-primary/10 text-primary'
          : 'bg-muted text-muted-foreground line-through'
      }`}
    >
      {label}
    </span>
  )
}
