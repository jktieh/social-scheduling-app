'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import type { ParticipantStatus } from '@/types'

interface Props {
  eventId: string
  userId: string
  currentStatus: ParticipantStatus | null
  onUpdate?: (newStatus: ParticipantStatus) => void
}

export default function RSVPButton({ eventId, userId, currentStatus, onUpdate }: Props) {
  const supabase = createClient()
  const [status, setStatus]   = useState<ParticipantStatus | null>(currentStatus)
  const [loading, setLoading] = useState(false)

  async function updateRSVP(newStatus: 'confirmed' | 'declined') {
    setLoading(true)

    const { error } = await supabase
      .from('event_participants')
      .upsert({
        event_id:     eventId,
        user_id:      userId,
        status:       newStatus,
        responded_at: new Date().toISOString(),
      }, { onConflict: 'event_id,user_id' })

    if (!error) {
      setStatus(newStatus)
      onUpdate?.(newStatus)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/40">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Updating…</span>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={() => updateRSVP('confirmed')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          status === 'confirmed'
            ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
            : 'glass text-white/60 hover:text-white hover:bg-teal-500/20 hover:border-teal-500/30'
        }`}
      >
        <CheckCircle2 size={15} />
        {status === 'confirmed' ? "You're in!" : "I'm in"}
      </button>

      <button
        onClick={() => updateRSVP('declined')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
          status === 'declined'
            ? 'bg-surface-3 text-white/40 border border-white/10'
            : 'glass text-white/40 hover:text-white/70 hover:bg-red-400/10'
        }`}
      >
        <XCircle size={15} />
        Decline
      </button>
    </div>
  )
}
