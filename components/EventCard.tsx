import Link from 'next/link'
import { MapPin, Clock, Users, Sparkles, CheckCircle2, Hourglass } from 'lucide-react'
import type { Event, ParticipantStatus } from '@/types'

interface Props {
  event: Event
  userStatus?: ParticipantStatus | null
}

export default function EventCard({ event: e, userStatus }: Props) {
  const percent = Math.min((e.interested_count / e.threshold_count) * 100, 100)
  const remaining = Math.max(e.threshold_count - e.interested_count, 0)
  const isConfirmed = e.status === 'confirmed'
  const isOpen = e.status === 'open'

  const displayTime = isConfirmed && e.confirmed_start ? e.confirmed_start : e.proposed_start

  const statusConfig = {
    open: { label: 'Gathering Interest', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    confirmed: { label: 'Confirmed! 🎉', cls: 'text-teal-400 bg-teal-400/10 border-teal-400/20' },
    completed: { label: 'Completed', cls: 'text-white/30 bg-white/5 border-white/10' },
    cancelled: { label: 'Cancelled', cls: 'text-red-400 bg-red-400/10 border-red-400/20' },
  }[e.status]

  const rsvpBadge = userStatus && {
    interested: { label: 'Interested', icon: <Hourglass size={11} />, cls: 'text-amber-400 bg-amber-400/10' },
    confirmed:  { label: 'Going!',     icon: <CheckCircle2 size={11} />, cls: 'text-teal-400 bg-teal-400/10' },
    declined:   { label: 'Declined',   icon: null, cls: 'text-white/30 bg-white/5' },
    attended:   { label: 'Attended',   icon: <CheckCircle2 size={11} />, cls: 'text-white/40 bg-white/5' },
    no_show:    { label: 'No show',    icon: null, cls: 'text-white/25 bg-white/5' },
  }[userStatus]

  return (
    <Link href={`/events/${e.id}`}>
      <article className="card hover:bg-white/[0.07] transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 cursor-pointer group h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-4xl flex-shrink-0">{e.interest?.icon ?? '📅'}</span>
            <div className="min-w-0">
              <h3 className="font-bold text-white group-hover:text-brand-300 transition-colors leading-snug line-clamp-2" style={{ fontFamily: 'var(--font-display)' }}>
                {e.title}
              </h3>
              {e.interest && (
                <span className="text-xs text-white/40">{e.interest.name}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium whitespace-nowrap ${statusConfig.cls}`}>
              {statusConfig.label}
            </span>
            {rsvpBadge && (
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${rsvpBadge.cls}`}>
                {rsvpBadge.icon}
                {rsvpBadge.label}
              </span>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Clock size={13} className="flex-shrink-0 text-brand-400" />
            <span>{new Date(displayTime).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit'
            })}</span>
          </div>

          {e.venue && (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <MapPin size={13} className="flex-shrink-0 text-accent-teal" />
              <span className="truncate">{e.venue.name}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-white/50">
            <Users size={13} className="flex-shrink-0 text-accent-indigo" />
            <span>
              {isOpen
                ? `${e.interested_count} interested · ${remaining > 0 ? `${remaining} more to confirm` : 'threshold met!'}`
                : `${e.interested_count} going`}
            </span>
          </div>
        </div>

        {/* Progress bar (only for open events) */}
        {isOpen && (
          <div className="mt-4 space-y-1">
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
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
            <div className="flex justify-between text-xs text-white/20">
              <span>{e.interested_count}/{e.threshold_count} needed</span>
              <span>{e.max_attendees} max</span>
            </div>
          </div>
        )}

        {isConfirmed && (
          <div className="mt-3 flex items-center gap-1.5 text-teal-400 text-xs font-medium">
            <Sparkles size={12} />
            This event is happening!
          </div>
        )}
      </article>
    </Link>
  )
}
