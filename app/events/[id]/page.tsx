import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ChatBox from '@/components/ChatBox'
import InterestedButton from '@/components/InterestedButton'
import EventSettingsPanel from '@/components/EventSettingsPanel'
import { MapPin, Clock, Users, Zap, CheckCircle2 } from 'lucide-react'
import { avatarUrl, formatEventTime } from '@/lib/utils'
import type { Event, EventInterest, EventSettingProposal, ParticipantStatus, Venue } from '@/types'

interface Props { params: Promise<{ id: string }> }

export default async function EventPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch event (explicit FKs for venue/confirmed_venue to avoid ambiguity)
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      *,
      interest:interests(id, name, icon, typical_duration_minutes),
      venue:venues!events_venue_id_fkey(id, name, address, city, rating, price_range),
      confirmed_venue:venues!events_confirmed_venue_id_fkey(id, name, address, city)
    `)
    .eq('id', id)
    .single()

  if (eventError) {
    console.error('[events/[id]] Event fetch error:', eventError)
  }
  if (!event) notFound()

  // Fetch participants
  const { data: participants } = await supabase
    .from('event_interests')
    .select('*, profile:profiles(id, full_name, username, avatar_url)')
    .eq('event_id', id)
    .in('status', ['interested', 'confirmed', 'attended'])

  // My participation
  const myParticipation = participants?.find(p => p.user_id === user.id)
  const myStatus = myParticipation?.status as ParticipantStatus | null

  // Fetch current user profile (for ChatBox)
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch setting proposals (only if confirmed participant)
  let proposals: EventSettingProposal[] = []
  let userVotes: Record<string, boolean> = {}

  if (myStatus === 'confirmed') {
    const { data: proposalData } = await supabase
      .from('event_setting_proposals')
      .select('*, profile:profiles(id,full_name,username), new_venue:venues(id,name,address)')
      .eq('event_id', id)
      .order('created_at', { ascending: false })
    proposals = (proposalData as EventSettingProposal[]) ?? []

    if (proposals.length > 0) {
      const { data: votes } = await supabase
        .from('event_setting_votes')
        .select('proposal_id, vote')
        .eq('user_id', user.id)
        .in('proposal_id', proposals.map(p => p.id))
      if (votes) {
        userVotes = Object.fromEntries(votes.map(v => [v.proposal_id, v.vote]))
      }
    }
  }

  // All venues for proposals
  const { data: allVenues } = await supabase.from('venues').select('*').eq('is_active', true)

  const e = event as Event
  const isConfirmed = e.status === 'confirmed'
  const isOpen = e.status === 'open'
  const isMember = myStatus === 'interested' || myStatus === 'confirmed'
  const isConfirmedMember = myStatus === 'confirmed'
  const canEdit = e.created_by === user.id || !!participants?.find(p => p.user_id === user.id && p.is_host)

  const displayVenue = (e.confirmed_venue as any) || e.venue
  const displayStart = isConfirmed && e.confirmed_start ? e.confirmed_start : e.proposed_start
  const displayEnd = isConfirmed && e.confirmed_end ? e.confirmed_end : e.proposed_end

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Main column ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Hero card */}
          <div className="card relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.04] bg-gradient-to-br from-brand-500 to-accent-teal pointer-events-none" />
            <div className="relative">
              {/* Status banner for confirmed */}
              {isConfirmed && (
                <div className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-xl px-4 py-3 mb-5">
                  <CheckCircle2 size={16} className="text-teal-400" />
                  <span className="text-teal-400 font-semibold text-sm">This event is confirmed and happening!</span>
                </div>
              )}

              {/* Title */}
              <div className="flex items-start gap-4 mb-6">
                <span className="text-5xl flex-shrink-0">{e.interest?.icon ?? '📅'}</span>
                <div>
                  <h1 className="text-3xl font-extrabold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    {e.title}
                  </h1>
                  {e.interest && <p className="text-brand-400 text-sm mt-1">{e.interest.name}</p>}
                  {canEdit && (
                    <Link
                      href={`/events/${e.id}/edit`}
                      className="inline-flex mt-3 items-center rounded-lg px-3 py-1.5 text-xs font-semibold bg-brand-600/20 text-brand-300 border border-brand-500/40 hover:bg-brand-600/30 hover:text-brand-200 transition-all"
                    >
                      Edit event
                    </Link>
                  )}
                </div>
              </div>

              {e.description && (
                <p className="text-white/60 leading-relaxed mb-6">{e.description}</p>
              )}

              {/* Meta grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 glass rounded-xl p-4">
                  <Clock size={18} className="text-brand-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-white/40">{isConfirmed ? 'Confirmed time' : 'Proposed time'}</p>
                    <p className="text-sm font-medium">{formatEventTime(displayStart)}</p>
                    {displayEnd && (
                      <p className="text-xs text-white/40">
                        ends {new Date(displayEnd).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>

                {displayVenue && (
                  <div className="flex items-center gap-3 glass rounded-xl p-4">
                    <MapPin size={18} className="text-accent-teal flex-shrink-0" />
                    <div>
                      <p className="text-xs text-white/40">{isConfirmed ? 'Confirmed venue' : 'Proposed venue'}</p>
                      <p className="text-sm font-medium">{displayVenue.name}</p>
                      {displayVenue.address && (
                        <p className="text-xs text-white/40">{displayVenue.address}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 glass rounded-xl p-4">
                  <Users size={18} className="text-accent-indigo flex-shrink-0" />
                  <div>
                    <p className="text-xs text-white/40">
                      {isOpen ? 'Interest threshold' : 'Attendees'}
                    </p>
                    <p className="text-sm font-medium">
                      {isOpen
                        ? `${e.interested_count} / ${e.threshold_count} needed`
                        : `${e.interested_count} confirmed`}
                    </p>
                    <p className="text-xs text-white/30">{e.max_attendees} max</p>
                  </div>
                </div>

                {e.is_auto_generated && (
                  <div className="flex items-center gap-3 glass rounded-xl p-4">
                    <Zap size={18} className="text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-white/40">Type</p>
                      <p className="text-sm font-medium">Auto-generated</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat — only for members */}
          {myProfile && isMember && (
            <ChatBox eventId={e.id} currentUser={myProfile} />
          )}

          {/* Not a member yet — teaser */}
          {!isMember && (
            <div className="card text-center py-8">
              <p className="text-3xl mb-3">💬</p>
              <p className="font-semibold text-white/70 mb-1">Group Chat</p>
              <p className="text-white/40 text-sm">Express interest to unlock the group chat.</p>
            </div>
          )}

          {/* Settings panel — only for confirmed members */}
          {isConfirmedMember && myProfile && (
            <EventSettingsPanel
              eventId={e.id}
              proposals={proposals}
              venues={(allVenues as Venue[]) ?? []}
              currentUserId={user.id}
              userVotes={userVotes}
            />
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Interest / RSVP action */}
          <div className="card">
            <h3 className="font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              {isOpen ? 'Join this event' : 'Event Status'}
            </h3>
            <InterestedButton
              eventId={e.id}
              initialCount={e.interested_count}
              threshold={e.threshold_count}
              maxAttendees={e.max_attendees}
              userStatus={myStatus as 'interested' | 'confirmed' | null}
              eventStatus={e.status}
            />
          </div>

          {/* Participants list */}
          <div className="card">
            <h3 className="font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Who's {isOpen ? 'interested' : 'going'} ({participants?.length ?? 0})
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
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {p.profile?.full_name ?? p.profile?.username ?? 'User'}
                      {p.is_host && <span className="text-amber-400 text-xs ml-1">· host</span>}
                    </p>
                    <p className="text-xs text-white/30 capitalize">{p.status}</p>
                  </div>
                </div>
              ))}

              {(!participants || participants.length === 0) && (
                <p className="text-white/30 text-sm">Be the first to express interest!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
