'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, Sparkles, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { relativeTime } from '@/lib/utils'

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: { event_id?: string } | null
  is_read: boolean
  created_at: string
}

interface Props {
  variant?: 'dark' | 'light'
}

export default function NotificationBell({ variant = 'dark' }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const isLight = variant === 'light'

  async function fetchNotifications() {
    setLoading(true)
    const res = await fetch('/api/notifications')
    if (res.ok) {
      const { notifications: data } = await res.json()
      setNotifications(data ?? [])
      setUnreadCount((data ?? []).filter((n: Notification) => !n.is_read).length)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifications()

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      channelRef.current = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => fetchNotifications()
        )
        .subscribe()
    })

    return () => {
      if (channelRef.current) createClient().removeChannel(channelRef.current)
    }
  }, [])

  async function markRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    )
    setUnreadCount(c => Math.max(0, c - 1))
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open)
          if (!open) fetchNotifications()
        }}
        className={[
          'relative p-2 rounded-xl transition-all',
          isLight
            ? 'text-white/70 hover:text-white hover:bg-white/5'
            : 'text-white/60 hover:text-white hover:bg-white/5',
        ].join(' ')}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent-teal animate-pulse" />
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className={[
              'absolute right-0 top-full mt-2 w-96 max-h-[420px] overflow-hidden z-50 rounded-2xl shadow-xl border',
              isLight
                ? 'bg-[#0a0a0f] border-white/10'
                : 'glass border-white/10',
            ].join(' ')}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-brand-400 hover:text-brand-300"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-white/40 text-sm">Loading…</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-white/40 text-sm">
                  No notifications yet. We&apos;ll notify you when your events are confirmed!
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {notifications.map(n => {
                    const href = n.data?.event_id ? `/events/${n.data.event_id}` : '/events'
                    return (
                      <li key={n.id}>
                        <Link
                          href={href}
                          onClick={() => {
                            if (!n.is_read) markRead(n.id)
                            setOpen(false)
                          }}
                          className={[
                            'flex items-start gap-3 px-4 py-3 block transition-colors',
                            !n.is_read ? 'bg-brand-600/10 hover:bg-brand-600/15' : 'hover:bg-white/5',
                          ].join(' ')}
                        >
                          <span className="flex-shrink-0 mt-0.5 text-amber-400">
                            <Sparkles size={16} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white/90">{n.title}</p>
                            {n.body && (
                              <p className="text-sm text-white/60 mt-0.5 leading-snug">{n.body}</p>
                            )}
                            <p className="text-xs text-white/40 mt-1">{relativeTime(n.created_at)}</p>
                          </div>
                          {n.data?.event_id && (
                            <ChevronRight size={16} className="flex-shrink-0 text-white/30" />
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            {notifications.length > 0 && (
              <Link
                href="/events"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-center text-sm text-brand-400 hover:text-brand-300 border-t border-white/5"
              >
                View all events
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}
