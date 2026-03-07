import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EventCard from '@/components/EventCard'
import { Sparkles, CalendarCheck, ArrowRight } from 'lucide-react'
import type { Event, ParticipantStatus } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile && !profile.onboarding_complete) redirect('/onboarding')

  // Fetch events the user is participating in
  const { data: participations } = await supabase
    .from('event_participants')
    .select('event_id, status')
    .eq('user_id', user.id)
    .in('status', ['invited', 'confirmed'])

  const participatingIds = participations?.map(p => p.event_id) ?? []
  const statusMap = Object.fromEntries(
    participations?.map(p => [p.event_id, p.status]) ?? []
  ) as Record<string, ParticipantStatus>

  // Fetch those events
  let myEvents: Event[] = []
  if (participatingIds.length > 0) {
    const { data } = await supabase
      .from('events')
      .select('*, interest:interests(id,name,icon), venue:venues(id,name,city)')
      .in('id', participatingIds)
      .neq('status', 'cancelled')
      .order('starts_at', { ascending: true })
      .limit(6)
    myEvents = (data as Event[]) ?? []
  }

  // Fetch upcoming public events (discover)
  const { data: publicEvents } = await supabase
    .from('events')
    .select('*, interest:interests(id,name,icon), venue:venues(id,name,city)')
    .in('status', ['pending', 'confirmed'])
    .gte('starts_at', new Date().toISOString())
    .not('id', 'in', `(${participatingIds.join(',') || 'null'})`)
    .order('starts_at', { ascending: true })
    .limit(4)

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero greeting */}
      <div className="relative glass rounded-3xl p-8 mb-8 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-brand-600/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-6 left-20 w-32 h-32 bg-accent-teal/10 rounded-full blur-2xl" />
        <div className="relative">
          <p className="text-white/40 text-sm mb-1">Welcome back</p>
          <h1 className="text-3xl font-extrabold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Hey, {firstName} 👋
          </h1>
          <p className="text-white/50">
            {myEvents.length > 0
              ? `You have ${myEvents.length} upcoming event${myEvents.length > 1 ? 's' : ''}.`
              : "You don't have any events yet. Hang tight — we're finding your matches!"}
          </p>
          {myEvents.length === 0 && (
            <form action="/api/match" method="POST" className="mt-4 inline-block">
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Sparkles size={16} />
                Run matching now
              </button>
            </form>
          )}
        </div>
      </div>

      {/* My Events */}
      {myEvents.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <CalendarCheck size={20} className="text-brand-400" />
              Your Events
            </h2>
            <Link href="/events" className="text-sm text-white/40 hover:text-brand-300 flex items-center gap-1 transition-colors">
              See all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {myEvents.map(event => (
              <EventCard key={event.id} event={event} userStatus={statusMap[event.id]} />
            ))}
          </div>
        </section>
      )}

      {/* Discover */}
      {publicEvents && publicEvents.length > 0 && (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
            {(publicEvents as Event[]).map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
