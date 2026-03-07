import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EventCard from '@/components/EventCard'
import type { Event } from '@/types'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: participations } = await supabase
    .from('event_participants')
    .select('event_id, status')
    .eq('user_id', user.id)

  const statusMap = Object.fromEntries(
    participations?.map(p => [p.event_id, p.status]) ?? []
  )

  const { data: events } = await supabase
    .from('events')
    .select('*, interest:interests(id,name,icon), venue:venues(id,name,city)')
    .in('status', ['pending', 'confirmed', 'full'])
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          All Events
        </h1>
        <p className="text-white/40">Browse and join upcoming events in your area.</p>
      </div>

      {events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {(events as Event[]).map(event => (
            <EventCard
              key={event.id}
              event={event}
              userStatus={(statusMap[event.id] as any) ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="card text-center py-16">
          <span className="text-5xl mb-4 block">🎲</span>
          <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>No events yet</h3>
          <p className="text-white/40">Events are created automatically when enough people match. Check back soon!</p>
        </div>
      )}
    </div>
  )
}
