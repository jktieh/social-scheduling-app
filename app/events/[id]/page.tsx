import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Image from 'next/image'
import ChatBox from '@/components/ChatBox'
import RSVPButton from '@/components/RSVPButton'
import { MapPin, Clock, Users, Calendar, Zap } from 'lucide-react'
import { formatEventTime, avatarUrl } from '@/lib/utils'
import type { Event, EventParticipant, ParticipantStatus } from '@/types'

interface Props { params: Promise<{ id: string }> }

export default async function EventPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch event with relations
  const { data: event } = await supabase
    .from('events')
    .select(`
      *,
      interest:interests(id, name, icon, typical_duration_minutes),
      venue:venues(id, name, address, city, latitude, longitude, rating, price_range)
    `)
    .eq('id', id)
    .single()

  if (!event) notFound()

  // Fetch participants with profiles
  const { data: participants } = await supabase
    .from('event_participants')
    .select('*, profile:profiles(id, full_name, username, avatar_url, city)')
    .eq('event_id', id)
    .in('status', ['invited', 'confirmed', 'attended'])

  // Check current user's participation
  const myParticipation = participants?.find(p => p.user_id === user.id)
  const myStatus = myParticipation?.status as ParticipantStatus | null

  // Fetch current user's profile (for ChatBox)
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const e = event as Event

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Main column ────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Event hero */}
          <div className="card relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-brand-500 to-accent-teal pointer-events-none" />
            <div className="relative">
              <div className="flex items-start gap-4 mb-6">
                <span className="text-5xl">{e.interest?.icon ?? '📅'}</span>
                <div>
                  <h1 className="text-3xl font-extrabold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    {e.title}
                  </h1>
                  {e.interest && <p className="text-brand-400 text-sm mt-1">{e.interest.name}</p>}
                </div>
              </div>

              {e.description && (
                <p className="text-white/60 leading-relaxed mb-6">{e.description}</p>
              )}

              {/* Meta grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 glass rounded-xl p-4">
                  <Clock size={18} className="text-brand-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-white/40">When</p>
                    <p className="text-sm font-medium">{formatEventTime(e.starts_at)}</p>
                  </div>
                </div>

                {e.venue && (
                  <div className="flex items-center gap-3 glass rounded-xl p-4">
                    <MapPin size={18} className="text-accent-teal flex-shrink-0" />
                    <div>
                      <p className="text-xs text-white/40">Where</p>
                      <p className="text-sm font-medium">{e.venue.name}</p>
                      {e.venue.city && <p className="text-xs text-white/40">{e.venue.city}</p>}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 glass rounded-xl p-4">
                  <Users size={18} className="text-accent-indigo flex-shrink-0" />
                  <div>
                    <p className="text-xs text-white/40">Attendees</p>
                    <p className="text-sm font-medium">
                      {e.current_attendees} confirmed · max {e.max_attendees}
                    </p>
                  </div>
                </div>

                {e.is_auto_generated && (
                  <div className="flex items-center gap-3 glass rounded-xl p-4">
                    <Zap size={18} className="text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-white/40">How</p>
                      <p className="text-sm font-medium">Auto-matched by Nichly</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RSVP */}
          {myParticipation && (
            <div className="card">
              <h3 className="font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>Your RSVP</h3>
              <RSVPButton
                eventId={e.id}
                userId={user.id}
                currentStatus={myStatus}
              />
            </div>
          )}

          {/* Chat */}
          {myProfile && (myStatus === 'confirmed' || myStatus === 'invited') && (
            <ChatBox eventId={e.id} currentUser={myProfile} />
          )}
        </div>

        {/* ── Sidebar ────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Participants */}
          <div className="card">
            <h3 className="font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Who's going ({participants?.length ?? 0})
            </h3>
            <div className="space-y-3">
              {participants?.map(p => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={p.profile?.avatar_url || avatarUrl(p.user_id, p.profile?.full_name)}
                      alt={p.profile?.full_name ?? ''}
                      width={36} height={36}
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {p.profile?.full_name ?? p.profile?.username ?? 'User'}
                      {p.is_host && <span className="text-amber-400 text-xs ml-1">· host</span>}
                    </p>
                    <p className="text-xs text-white/30 capitalize">{p.status}</p>
                  </div>
                </div>
              ))}

              {(!participants || participants.length === 0) && (
                <p className="text-white/30 text-sm">No participants yet.</p>
              )}
            </div>
          </div>

          {/* Venue details */}
          {e.venue && (
            <div className="card">
              <h3 className="font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>Venue</h3>
              <p className="font-semibold">{e.venue.name}</p>
              {e.venue.address && <p className="text-sm text-white/40 mt-1">{e.venue.address}</p>}
              {e.venue.city    && <p className="text-sm text-white/40">{e.venue.city}</p>}
              <div className="flex gap-3 mt-3">
                {e.venue.rating && (
                  <span className="text-sm text-amber-400">★ {e.venue.rating}</span>
                )}
                {e.venue.price_range && (
                  <span className="text-sm text-white/40">{'$'.repeat(e.venue.price_range)}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
