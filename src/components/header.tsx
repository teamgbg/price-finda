'use client'

import Link from 'next/link'
import { Search, Laptop, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/max-logo.jpg"
              alt="Max"
              className="w-10 h-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <span className="font-bold text-lg text-slate-800">Max's Price Finda</span>
              <span className="hidden sm:block text-xs text-slate-500">Find the best deals on items in Australia</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/chromebooks"
              className="flex items-center gap-2 text-slate-600 hover:text-sky-600 transition-colors px-3 py-2 rounded-lg hover:bg-sky-50"
            >
              <Laptop className="w-4 h-4" />
              Chromebooks
            </Link>
          </nav>

          {/* Search */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Chromebooks..."
                className="w-64 pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
              />
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-slate-600" />
            ) : (
              <Menu className="w-6 h-6 text-slate-600" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200">
            <nav className="flex flex-col gap-2">
              <Link
                href="/chromebooks"
                className="flex items-center gap-2 text-slate-600 hover:text-sky-600 px-3 py-2 rounded-lg hover:bg-sky-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Laptop className="w-4 h-4" />
                Chromebooks
              </Link>
            </nav>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Chromebooks..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
