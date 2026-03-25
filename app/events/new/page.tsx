import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreateEventForm from '@/components/CreateEventForm'
import type { Interest } from '@/types'

export default async function NewEventPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: interests }, { data: profile }] = await Promise.all([
    supabase.from('interests').select('*').eq('is_active', true).order('name'),
    supabase.from('profiles').select('city').eq('id', user.id).single(),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <CreateEventForm interests={(interests ?? []) as Interest[]} city={profile?.city ?? null} />
    </div>
  )
}

