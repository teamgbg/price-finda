import { ChromebooksClient } from '@/components/chromebooks-client'
import { getProducts } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function ChromebooksPage() {
  try {
    const products = await getProducts()
    return <ChromebooksClient products={products} />
  } catch (error) {
    console.error('Chromebooks page error:', error)
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white p-8">
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-xl font-bold text-red-800 mb-2">Error Loading Products</h1>
          <p className="text-red-700">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    )
  }
}
