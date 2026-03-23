import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/interested  — toggle interest in an event
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { event_id } = await req.json()
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  // Check event exists and is open
  const { data: event } = await supabase
    .from('events')
    .select('id, status, interested_count, max_attendees, threshold_count')
    .eq('id', event_id)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (event.status === 'cancelled') return NextResponse.json({ error: 'Event is cancelled' }, { status: 400 })
  if (event.interested_count >= event.max_attendees) {
    return NextResponse.json({ error: 'Event is full' }, { status: 400 })
  }

  // Check existing interest
  const { data: existing } = await supabase
    .from('event_interests')
    .select('id, status')
    .eq('event_id', event_id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    // Toggle off — remove interest
    if (existing.status === 'interested') {
      await supabase.from('event_interests').delete().eq('id', existing.id)
      return NextResponse.json({ action: 'removed' })
    }
    // Already confirmed — can't un-join
    return NextResponse.json({ action: 'already_confirmed', status: existing.status })
  }

  // Add interest
  const { error } = await supabase.from('event_interests').insert({
    event_id,
    user_id: user.id,
    status: 'interested',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch updated event to return new count & status
  const { data: updated } = await supabase
    .from('events')
    .select('interested_count, status')
    .eq('id', event_id)
    .single()

  return NextResponse.json({
    action: 'added',
    interested_count: updated?.interested_count,
    event_status: updated?.status,
  })
}
