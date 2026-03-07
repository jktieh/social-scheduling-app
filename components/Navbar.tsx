'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Home, Calendar, User, LogOut, Menu, X, Sparkles } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Home',   icon: Home },
  { href: '/events',    label: 'Events', icon: Calendar },
  { href: '/profile',   label: 'Profile',icon: User },
]

export default function Navbar() {
  const path     = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <Sparkles size={18} className="text-brand-400" />
          <span className="text-xl font-extrabold gradient-text" style={{ fontFamily: 'var(--font-display)' }}>
            nichly
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                path.startsWith(href)
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-600/30'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Sign out */}
        <div className="hidden md:flex items-center gap-2">
          <button onClick={handleSignOut} className="btn-ghost flex items-center gap-2 text-sm">
            <LogOut size={15} />
            Sign out
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden btn-ghost p-2"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden glass border-t border-white/5 px-4 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                path.startsWith(href)
                  ? 'bg-brand-600/20 text-brand-300'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} /> {label}
            </Link>
          ))}
          <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/40 hover:text-white w-full">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </header>
  )
}
