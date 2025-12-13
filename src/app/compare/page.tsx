import { Header } from '@/components/header'
import { CompareTable } from '@/components/compare/compare-table'

export default function ComparePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Compare Chromebooks</h1>
            <p className="text-muted-foreground">
              Side-by-side comparison of specs and prices
            </p>
          </div>

          <div className="card-surface p-6">
            <CompareTable />
          </div>
        </div>
      </main>
    </div>
  )
}
