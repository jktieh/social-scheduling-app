import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EventCard from '@/components/EventCard'
import FindEventsQueue from '@/components/FindEventsQueue'
import { Sparkles, CalendarCheck, ArrowRight, Bell } from 'lucide-react'
import { discoverEventsToQueueSuggestions } from '@/lib/find-events-queue'
import { eventMatchesAvailability } from '@/lib/utils'
import type { Event, ParticipantStatus } from '@/types'

export const dynamic = 'force-dynamic'

const eventSelect = `
  *,
  interest:interests(id, name, icon, category_id),
  venue:venues!events_venue_id_fkey(id, name, address, city)
`

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_complete) redirect('/onboarding')

  // User's events (interested or confirmed)
  const { data: participations } = await supabase
    .from('event_interests')
    .select('event_id, status')
    .eq('user_id', user.id)
    .in('status', ['interested', 'confirmed'])

  const participatingIds = participations?.map(p => p.event_id) ?? []
  const statusMap = Object.fromEntries(
    participations?.map(p => [p.event_id, p.status]) ?? []
  ) as Record<string, ParticipantStatus>

  // User's interests and availability (for personalized discover)
  const [
    { data: userInterests },
    { data: availability },
  ] = await Promise.all([
    supabase.from('user_interests').select('interest_id').eq('user_id', user.id),
    supabase.from('availability').select('day_of_week, start_time, end_time').eq('user_id', user.id),
  ])
  const interestIds = userInterests?.map(ui => ui.interest_id) ?? []
  const availSlots = availability ?? []

  let myEvents: Event[] = []
  if (participatingIds.length > 0) {
    const { data, error } = await supabase
      .from('events')
      .select(eventSelect)
      .in('id', participatingIds)
      .neq('status', 'cancelled')
      .order('proposed_start', { ascending: true })
      .limit(6)
    if (!error) myEvents = (data as Event[]) ?? []
  }

  // Discover — open events matching user's interests, city, and availability
  let discoverEvents: Event[] | null = null
  const canDiscover = profile?.city?.trim() && interestIds.length > 0 && availSlots.length > 0
  if (canDiscover) {
    let discoverQuery = supabase
      .from('events')
      .select(eventSelect)
      .eq('status', 'open')
      .gte('proposed_start', new Date().toISOString())
      .ilike('city', profile!.city!.trim())
      .in('interest_id', interestIds)
      .order('interested_count', { ascending: false })
      .limit(30)
    if (participatingIds.length > 0) {
      discoverQuery = discoverQuery.not('id', 'in', `(${participatingIds.join(',')})`)
    }
    const { data: raw } = await discoverQuery
    discoverEvents = (raw ?? [])
      .filter(e => eventMatchesAvailability(e.proposed_start, availSlots))
      .slice(0, 6) as Event[]
  }

  // Unread notifications
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const confirmedCount = myEvents.filter(e => e.status === 'confirmed').length

  const discoverQueueSuggestions = canDiscover
    ? discoverEventsToQueueSuggestions(discoverEvents, 3)
    : undefined

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero greeting */}
      <div className="relative glass rounded-3xl p-8 mb-8 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-brand-600/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-6 left-20 w-32 h-32 bg-accent-teal/10 rounded-full blur-2xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-white/40 text-sm mb-1">Welcome back</p>
            <h1 className="text-3xl font-extrabold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Hey, {firstName} 👋
            </h1>
            <p className="text-white/50">
              {myEvents.length === 0
                ? "You haven't expressed interest in any events yet. Explore below!"
                : confirmedCount > 0
                ? `You have ${confirmedCount} confirmed event${confirmedCount > 1 ? 's' : ''} coming up.`
                : `You're interested in ${myEvents.length} event${myEvents.length > 1 ? 's' : ''}.`}
            </p>
          </div>

          {(unreadCount ?? 0) > 0 && (
            <Link
              href="/events?status=mine"
              className="flex items-center gap-2 px-4 py-2 bg-brand-600/20 border border-brand-600/30 rounded-xl hover:bg-brand-600/30 transition-colors"
            >
              <Bell size={14} className="text-brand-400" />
              <span className="text-brand-300 text-sm font-medium">{unreadCount} new notification{unreadCount !== 1 ? 's' : ''}</span>
            </Link>
          )}
        </div>
      </div>

      <FindEventsQueue
        className="mb-10"
        source={canDiscover ? 'discover' : 'demo'}
        suggestions={discoverQueueSuggestions}
      />

      {/* My Events */}
      {myEvents.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <CalendarCheck size={20} className="text-brand-400" />
              Your Events
            </h2>
            <Link href="/events?status=mine" className="text-sm text-white/40 hover:text-brand-300 flex items-center gap-1 transition-colors">
              See all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myEvents.map(event => (
              <EventCard key={event.id} event={event} userStatus={statusMap[event.id]} />
            ))}
          </div>
        </section>
      )}

      {/* Discover */}
      {discoverEvents && discoverEvents.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Sparkles size={20} className="text-accent-teal" />
              Discover Events
            </h2>
            <Link href="/events" className="text-sm text-white/40 hover:text-brand-300 flex items-center gap-1 transition-colors">
              Browse all <ArrowRight size={13} />
            </Link>
          </div>
          <p className="text-white/40 text-sm mb-4">
            Personalized for your interests, city, and availability. Express interest — when enough people join, the event is confirmed.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(discoverEvents as Event[]).map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {myEvents.length === 0 && (!discoverEvents || discoverEvents.length === 0) && (
        <div className="card text-center py-16">
          <span className="text-5xl mb-4 block">🎯</span>
          <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            No events yet
          </h3>
          <p className="text-white/40 mb-6">
            {canDiscover
              ? "No events match your interests, city, and availability right now. Browse all events to explore."
              : "Complete your profile with city, interests, and availability to get personalized event recommendations."}
          </p>
          <Link href="/events" className="btn-primary inline-flex items-center gap-2">
            Browse events →
          </Link>
        </div>
      )}
    </div>
  )
}
