import Link from 'next/link'
import { Header } from '@/components/header'
import { Laptop, ArrowRight, TrendingDown, Store, Bell } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Max's Price Finda
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Find the best deals on items in Australia. Compare prices across major retailers.
          </p>

          <Link
            href="/chromebooks"
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-sky-200"
          >
            <Laptop className="w-5 h-5" />
            Browse Chromebooks
            <ArrowRight className="w-5 h-5" />
          </Link>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <TrendingDown className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">Price Tracking</h3>
              <p className="text-slate-600 text-sm">
                We track prices daily so you never miss a deal. See price history for every product.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center mb-4">
                <Store className="w-6 h-6 text-sky-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">All Major Retailers</h3>
              <p className="text-slate-600 text-sm">
                Compare prices from JB Hi-Fi, Officeworks, Harvey Norman, The Good Guys, and more.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">More Coming Soon</h3>
              <p className="text-slate-600 text-sm">
                We&apos;re adding more product categories soon. Laptops, tablets, and more!
              </p>
            </div>
          </div>
        </section>

        {/* Retailers */}
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-xl font-semibold text-slate-800 text-center mb-6">Retailers We Track</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {['JB Hi-Fi', 'Officeworks', 'Harvey Norman', 'The Good Guys', 'Amazon AU', 'Bing Lee'].map((retailer) => (
              <span key={retailer} className="px-4 py-2 bg-white rounded-lg text-slate-600 text-sm border border-slate-100 shadow-sm">
                {retailer}
              </span>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-slate-500 text-sm">
        <p>© 2024 Max's Price Finda. Helping Australian families find the best deals.</p>
      </footer>
    </div>
  )
}
