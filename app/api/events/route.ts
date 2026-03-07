import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: participations } = await supabase
    .from('event_participants')
    .select('event_id, status')
    .eq('user_id', user.id)
    .in('status', ['invited', 'confirmed'])

  const ids = participations?.map(p => p.event_id) ?? []

  if (ids.length === 0) return NextResponse.json({ events: [] })

  const { data: events, error } = await supabase
    .from('events')
    .select('*, interest:interests(id,name,icon), venue:venues(id,name,city)')
    .in('id', ids)
    .order('starts_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events })
}
