import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreateEventForm from '@/components/CreateEventForm'
import type { Event, Interest } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: event }, { data: interests }, { data: profile }, { data: hostRow }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('interests').select('*').eq('is_active', true).order('name'),
    supabase.from('profiles').select('city').eq('id', user.id).single(),
    supabase
      .from('event_interests')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .eq('is_host', true)
      .maybeSingle(),
  ])

  if (!event) notFound()

  // Only host or creator can edit.
  const canEdit = event.created_by === user.id || !!hostRow
  if (!canEdit) redirect(`/events/${id}`)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <CreateEventForm
        interests={(interests ?? []) as Interest[]}
        city={profile?.city ?? null}
        mode="edit"
        eventId={id}
        initialValues={{
          title: (event as Event).title,
          description: (event as Event).description,
          interest_id: (event as Event).interest_id,
          proposed_start: (event as Event).proposed_start,
          threshold_count: (event as Event).threshold_count,
          max_attendees: (event as Event).max_attendees,
        }}
      />
    </div>
  )
}

