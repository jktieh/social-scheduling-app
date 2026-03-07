import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runMatchingAlgorithm, type UserWithContext } from '@/lib/matching'
import type { Interest, Profile, Venue } from '@/types'

/**
 * POST /api/match
 *
 * Fetches all eligible users, runs the matching algorithm,
 * and creates events + participants in the database.
 *
 * Typically called by a cron job (Vercel cron / external scheduler).
 * Protected by CRON_SECRET to prevent abuse.
 */
export async function POST(req: NextRequest) {
  // Simple bearer-token auth for cron calls (optional in dev)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createServiceClient()

  try {
    // ── 1. Fetch eligible users ─────────────────────────────────
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('onboarding_complete', true)
      .eq('is_active', true)

    if (profileError) throw profileError
    const typedProfiles = (profiles ?? []) as Profile[]
    if (typedProfiles.length === 0) {
      return NextResponse.json({ message: 'No eligible users', created: 0 })
    }

    // ── 2. Fetch user interests ─────────────────────────────────
    const userIds = typedProfiles.map(p => p.id)

    const { data: allInterests } = await supabase
      .from('user_interests')
      .select('*')
      .in('user_id', userIds)

    const { data: allAvailability } = await supabase
      .from('availability')
      .select('*')
      .in('user_id', userIds)

    // ── 3. Build UserWithContext objects ────────────────────────
    const users: UserWithContext[] = typedProfiles.map(profile => ({
      profile,
      interests: allInterests?.filter(i => i.user_id === profile.id) ?? [],
      availability: allAvailability?.filter(a => a.user_id === profile.id) ?? [],
    }))

    // ── 4. Fetch interests master list ──────────────────────────
    const { data: interestRows } = await supabase.from('interests').select('*')
    const interestMap = new Map<string, Interest>(
      interestRows?.map(i => [i.id, i]) ?? []
    )

    // ── 5. Fetch venues ─────────────────────────────────────────
    const { data: venues } = await supabase
      .from('venues')
      .select('*')
      .eq('is_active', true)

    // ── 6. Run algorithm ────────────────────────────────────────
    const proposals = runMatchingAlgorithm(users, interestMap, (venues as Venue[]) ?? [])

    if (proposals.length === 0) {
      return NextResponse.json({ message: 'No matches found', created: 0 })
    }

    // ── 7. Persist events ───────────────────────────────────────
    let created = 0

    for (const proposal of proposals) {
      // Create event
      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert({
          title:             proposal.title,
          interest_id:       proposal.interest.id,
          venue_id:          proposal.venue?.id ?? null,
          location_name:     proposal.venue?.name ?? null,
          starts_at:         proposal.starts_at,
          ends_at:           proposal.ends_at,
          min_attendees:     proposal.group.length,
          max_attendees:     proposal.group.length + 2, // A little room
          is_auto_generated: true,
          status:            'pending',
        })
        .select()
        .single()

      if (eventError || !newEvent) continue

      // Add participants
      await supabase.from('event_participants').insert(
        proposal.group.map((u, idx) => ({
          event_id: newEvent.id,
          user_id:  u.profile.id,
          status:   'invited',
          is_host:  idx === 0, // First user is host
        }))
      )

      // Send system message
      await supabase.from('event_messages').insert({
        event_id:  newEvent.id,
        user_id:   null,
        content:   `🎉 ${proposal.title} has been created! Confirm your spot to lock it in.`,
        is_system: true,
      })

      // Create notifications for participants
      await supabase.from('notifications').insert(
        proposal.group.map(u => ({
          user_id: u.profile.id,
          type:    'event_created',
          title:   "You've been matched!",
          body:    `Nichly found a ${proposal.interest.name} event for you: ${proposal.title}`,
          data:    { event_id: newEvent.id },
        }))
      )

      created++
    }

    return NextResponse.json({ message: 'Matching complete', created })

  } catch (err) {
    console.error('[/api/match]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
