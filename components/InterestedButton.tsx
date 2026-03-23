'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'

interface Props {
  eventId: string
  initialCount: number
  threshold: number
  maxAttendees: number
  userStatus: 'interested' | 'confirmed' | null
  eventStatus: 'open' | 'confirmed' | 'completed' | 'cancelled'
}

export default function InterestedButton({
  eventId,
  initialCount,
  threshold,
  maxAttendees,
  userStatus: initialUserStatus,
  eventStatus,
}: Props) {
  const [count, setCount] = useState(initialCount)
  const [myStatus, setMyStatus] = useState(initialUserStatus)
  const [loading, setLoading] = useState(false)

  const isInterested = myStatus === 'interested'
  const isConfirmed = myStatus === 'confirmed'
  const isMember = isInterested || isConfirmed
  const isClosed = eventStatus !== 'open' || count >= maxAttendees

  async function handleClick() {
    if (loading || isConfirmed) return
    if (isClosed && !isMember) return

    setLoading(true)

    try {
      const res = await fetch('/api/interested', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      })
      const data = await res.json()

      if (data.action === 'added') {
        setCount(data.interested_count ?? count + 1)
        setMyStatus('interested')
      } else if (data.action === 'removed') {
        setCount(c => Math.max(0, c - 1))
        setMyStatus(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const percent = Math.min((count / threshold) * 100, 100)
  const remaining = Math.max(threshold - count, 0)

  if (eventStatus === 'confirmed' || eventStatus === 'completed') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-teal-400 font-semibold">
          <CheckCircle2 size={18} />
          <span>Event Confirmed!</span>
        </div>
        <p className="text-white/40 text-sm">{count} people are going</p>
        {isConfirmed && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-medium">
            <CheckCircle2 size={14} />
            You're confirmed
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress toward threshold */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/50">
            {count} of {threshold} needed
          </span>
          <span className={remaining === 0 ? 'text-teal-400 font-semibold' : 'text-white/30'}>
            {remaining === 0 ? 'Threshold met!' : `${remaining} more to confirm`}
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percent}%`,
              background: percent >= 100
                ? 'linear-gradient(90deg, #2dd4bf, #06b6d4)'
                : 'linear-gradient(90deg, #0891b2, #06b6d4)',
            }}
          />
        </div>
        <p className="text-white/25 text-xs">{maxAttendees} max attendees</p>
      </div>

      {/* Button */}
      <button
        onClick={handleClick}
        disabled={loading || (isClosed && !isMember)}
        className={[
          'w-full flex items-center justify-center gap-2.5 py-3 px-6 rounded-xl font-semibold transition-all duration-200',
          loading ? 'opacity-60 cursor-wait' : '',
          isInterested
            ? 'bg-brand-600/20 border border-brand-500/40 text-brand-300 hover:bg-brand-600/30'
            : isClosed && !isMember
            ? 'bg-white/5 text-white/25 cursor-not-allowed'
            : 'bg-brand-600 hover:bg-brand-500 text-white hover:shadow-lg hover:shadow-brand-600/30 hover:-translate-y-0.5 active:translate-y-0',
        ].join(' ')}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isInterested ? (
          <>
            <CheckCircle2 size={16} />
            I'm interested ✓
          </>
        ) : isClosed ? (
          <>
            <Users size={16} />
            Event Full
          </>
        ) : (
          <>
            <Sparkles size={16} />
            I'm interested
          </>
        )}
      </button>

      {isInterested && (
        <p className="text-center text-white/30 text-xs">
          You'll be notified when the event is confirmed. Click again to remove.
        </p>
      )}
    </div>
  )
}
