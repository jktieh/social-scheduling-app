import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EventCard from '@/components/EventCard'
import type { Event, InterestCategory, ParticipantStatus } from '@/types'

interface Props {
  searchParams: Promise<{ category?: string; status?: string }>
}

export default async function EventsPage({ searchParams }: Props) {
  const { category, status } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch categories for filter tabs
  const { data: categories } = await supabase
    .from('interest_categories')
    .select('*')
    .order('sort_order')

  // Fetch user's participations for status badges
  const { data: participations } = await supabase
    .from('event_interests')
    .select('event_id, status')
    .eq('user_id', user.id)

  const statusMap = Object.fromEntries(
    participations?.map(p => [p.event_id, p.status]) ?? []
  ) as Record<string, ParticipantStatus>

  // Build event query
  let query = supabase
    .from('events')
    .select(`
      *,
      interest:interests(id, name, icon, category_id),
      venue:venues(id, name, address, city)
    `)
    .neq('status', 'cancelled')
    .gte('proposed_start', new Date().toISOString())
    .order('proposed_start', { ascending: true })

  // Filter by status
  if (status === 'open') query = query.eq('status', 'open')
  else if (status === 'confirmed') query = query.eq('status', 'confirmed')
  else if (status === 'mine') {
    const ids = Object.keys(statusMap)
    if (ids.length > 0) query = query.in('id', ids)
    else query = query.eq('id', 'none') // return empty
  }

  const { data: events } = await query

  // Filter by category client-side (interest join makes it tricky in one query)
  const filtered = category && category !== 'all'
    ? events?.filter(e => {
        const cat = (categories as InterestCategory[])?.find(c => c.id === category)
        return e.interest?.category_id === category
      }) ?? []
    : events ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Discover Events
        </h1>
        <p className="text-white/40">
          Express interest — when enough people join, the event is confirmed automatically.
        </p>
      </div>

      {/* How it works callout */}
      <div className="glass rounded-2xl p-4 mb-6 flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center text-xl">✨</div>
        <div>
          <p className="font-semibold text-sm text-white/80 mb-1">How Nichly works</p>
          <p className="text-white/40 text-sm leading-relaxed">
            Click <strong className="text-white/70">"I'm interested"</strong> on any event.
            Once enough people express interest, the event is automatically confirmed and you'll be matched into a group chat
            where you can coordinate details.
          </p>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        <CategoryTab href="/events" label="All" icon="🌐" active={!category || category === 'all'} />
        {(categories as InterestCategory[])?.map(cat => (
          <CategoryTab
            key={cat.id}
            href={`/events?category=${cat.id}`}
            label={cat.name}
            icon={cat.icon ?? ''}
            active={category === cat.id}
          />
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-6">
        <StatusTab href="/events" label="All Events" active={!status} />
        <StatusTab href="/events?status=open" label="Open" active={status === 'open'} />
        <StatusTab href="/events?status=confirmed" label="Confirmed" active={status === 'confirmed'} />
        <StatusTab href="/events?status=mine" label="My Events" active={status === 'mine'} />
      </div>

      {/* Events grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {(filtered as Event[]).map(event => (
            <EventCard
              key={event.id}
              event={event}
              userStatus={(statusMap[event.id] as ParticipantStatus) ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="card text-center py-16">
          <span className="text-5xl mb-4 block">🎲</span>
          <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            No events found
          </h3>
          <p className="text-white/40">
            {status === 'mine'
              ? "You haven't expressed interest in any events yet."
              : 'Try a different filter or check back soon!'}
          </p>
        </div>
      )}
    </div>
  )
}

function CategoryTab({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <a
      href={href}
      className={[
        'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
        active
          ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
          : 'glass text-white/50 hover:text-white hover:bg-white/10',
      ].join(' ')}
    >
      {icon && <span>{icon}</span>}
      {label}
    </a>
  )
}

function StatusTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a
      href={href}
      className={[
        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
        active
          ? 'bg-white/10 text-white border border-white/15'
          : 'text-white/40 hover:text-white/70',
      ].join(' ')}
    >
      {label}
    </a>
  )
}
