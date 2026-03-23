import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/event-settings — create a time or venue change proposal
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { event_id, type, new_start, new_end, new_venue_id, new_venue_name } = body

  if (!event_id || !type) {
    return NextResponse.json({ error: 'event_id and type required' }, { status: 400 })
  }

  // Must be a confirmed participant
  const { data: participation } = await supabase
    .from('event_interests')
    .select('id')
    .eq('event_id', event_id)
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .single()

  if (!participation) {
    return NextResponse.json({ error: 'Only confirmed participants can propose changes' }, { status: 403 })
  }

  // Check for existing open proposal of same type
  const { data: existingOpen } = await supabase
    .from('event_setting_proposals')
    .select('id')
    .eq('event_id', event_id)
    .eq('type', type)
    .eq('status', 'open')
    .single()

  if (existingOpen) {
    return NextResponse.json({ error: 'There is already an open proposal for this. Vote on it first!' }, { status: 400 })
  }

  const { data: proposal, error } = await supabase
    .from('event_setting_proposals')
    .insert({
      event_id,
      proposed_by: user.id,
      type,
      new_start: new_start || null,
      new_end: new_end || null,
      new_venue_id: new_venue_id || null,
      new_venue_name: new_venue_name || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // System message
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .single()

  const name = profile?.full_name || profile?.username || 'Someone'
  const msg = type === 'time'
    ? `📅 ${name} proposed a time change. Vote in the settings panel!`
    : `📍 ${name} proposed a venue change. Vote in the settings panel!`

  await supabase.from('event_messages').insert({
    event_id,
    user_id: null,
    content: msg,
    is_system: true,
  })

  return NextResponse.json({ proposal })
}

// POST /api/event-settings/vote — cast a vote
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { proposal_id, vote } = await req.json()
  if (!proposal_id || typeof vote !== 'boolean') {
    return NextResponse.json({ error: 'proposal_id and vote (boolean) required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('event_setting_votes')
    .upsert({ proposal_id, user_id: user.id, vote }, { onConflict: 'proposal_id,user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
