import Link from 'next/link'
import { MapPin, Clock, Users, CheckCircle2, XCircle, Hourglass } from 'lucide-react'
import { formatEventTime } from '@/lib/utils'
import type { Event, ParticipantStatus } from '@/types'

interface Props {
  event: Event
  userStatus?: ParticipantStatus | null
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'text-amber-400 bg-amber-400/10 border-amber-400/20',
  confirmed: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
  full:      'text-purple-400 bg-purple-400/10 border-purple-400/20',
  cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
  completed: 'text-white/30 bg-white/5 border-white/10',
}

const RSVP_BADGE: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  confirmed: { label: 'Confirmed',  icon: <CheckCircle2 size={12} />, className: 'text-teal-400 bg-teal-400/10' },
  invited:   { label: 'Invited',    icon: <Hourglass size={12} />,    className: 'text-amber-400 bg-amber-400/10' },
  declined:  { label: 'Declined',   icon: <XCircle size={12} />,      className: 'text-white/30 bg-white/5' },
}

export default function EventCard({ event, userStatus }: Props) {
  const rsvp = userStatus ? RSVP_BADGE[userStatus] : null

  return (
    <Link href={`/events/${event.id}`}>
      <article className="card hover:bg-white/[0.06] transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 cursor-pointer group">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{event.interest?.icon ?? '📅'}</span>
            <div>
              <h3 className="font-bold text-white group-hover:text-brand-300 transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
                {event.title}
              </h3>
              {event.interest && (
                <span className="text-xs text-white/40">{event.interest.name}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* Event status */}
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${STATUS_COLORS[event.status] ?? ''}`}>
              {event.status}
            </span>
            {/* RSVP badge */}
            {rsvp && (
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${rsvp.className}`}>
                {rsvp.icon} {rsvp.label}
              </span>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Clock size={14} className="flex-shrink-0 text-brand-400" />
            <span>{formatEventTime(event.starts_at)}</span>
          </div>

          {event.venue && (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <MapPin size={14} className="flex-shrink-0 text-accent-teal" />
              <span className="truncate">{event.venue.name}</span>
              {event.venue.city && <span className="text-white/25">· {event.venue.city}</span>}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-white/50">
            <Users size={14} className="flex-shrink-0 text-accent-indigo" />
            <span>{event.current_attendees} / {event.max_attendees} attending</span>
            {event.current_attendees < event.min_attendees && (
              <span className="text-amber-400/70 text-xs">({event.min_attendees - event.current_attendees} more needed)</span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1 bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-accent-teal rounded-full transition-all"
            style={{ width: `${Math.min((event.current_attendees / event.max_attendees) * 100, 100)}%` }}
          />
        </div>
      </article>
    </Link>
  )
}
