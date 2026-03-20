'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Home, Calendar, User, LogOut, Menu, X } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Home',   icon: Home },
  { href: '/events',    label: 'Events', icon: Calendar },
  { href: '/profile',   label: 'Profile',icon: User },
]

function LogoMark({ className }: { className?: string }) {
  // Minimal black/white logo mark (simple "N" monogram)
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.5 14.5V3.5l11 11V3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Navbar({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const path     = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const isLight = variant === 'light'

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header
      className={[
        'fixed top-0 inset-x-0 z-50',
        // Dark (default app style) vs light (transparent + black text).
        // Use a subtle light backdrop so black text remains readable on dark pages.
        isLight ? 'bg-white/0 backdrop-blur-md border-b border-white/10' : 'glass border-b border-white/5',
      ].join(' ')}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <LogoMark className={isLight ? 'text-white' : 'text-brand-400'} />
          <span
            className={[
              'text-xl font-extrabold',
              isLight ? 'text-white' : 'gradient-text',
            ].join(' ')}
          >
            nichly
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                path.startsWith(href)
                  ? isLight
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'bg-brand-600/20 text-brand-300 border border-brand-600/30'
                  : isLight
                    ? 'text-white/70 hover:text-white hover:bg-white/5'
                    : 'text-white/50 hover:text-white hover:bg-white/5',
              ].join(' ')}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Sign out */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={handleSignOut}
            className={[
              'flex items-center gap-2 text-sm',
              isLight
                ? 'text-white/70 hover:text-white'
                : 'btn-ghost',
            ].join(' ')}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setOpen(!open)}
          className={isLight ? 'md:hidden p-2 text-white/70 hover:text-white' : 'md:hidden btn-ghost p-2'}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className={[
            'md:hidden px-4 py-4 space-y-1 border-t',
            isLight ? 'border-white/10 backdrop-blur-md bg-white/5' : 'glass border-white/5',
          ].join(' ')}
        >
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={[
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all',
                path.startsWith(href)
                  ? isLight
                    ? 'bg-white/10 text-white'
                    : 'bg-brand-600/20 text-brand-300'
                  : isLight
                    ? 'text-white/60 hover:text-white hover:bg-white/5'
                    : 'text-white/60 hover:text-white hover:bg-white/5',
              ].join(' ')}
            >
              <Icon size={16} /> {label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className={[
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm w-full',
              isLight ? 'text-white/70 hover:text-white' : 'text-white/40 hover:text-white',
            ].join(' ')}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </header>
  )
}
