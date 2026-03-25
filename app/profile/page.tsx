import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { avatarUrl } from '@/lib/utils'
import { MapPin, Edit3 } from 'lucide-react'
import type { UserInterest, Availability, Interest, InterestCategory } from '@/types'
import ProfileInterestsEditor from '@/components/ProfileInterestsEditor'
import ProfileAvailabilityEditor from '@/components/ProfileAvailabilityEditor'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const [
    { data: userInterests },
    { data: availability },
    { data: categories },
    { data: interests },
  ] = await Promise.all([
    supabase
      .from('user_interests')
      .select('*, interest:interests(id,name,icon,category_id)')
      .eq('user_id', user.id),
    supabase
      .from('availability')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week'),
    supabase.from('interest_categories').select('*').order('sort_order'),
    supabase.from('interests').select('*').eq('is_active', true),
  ])

  if (!profile) redirect('/onboarding')

  const avatar = profile.avatar_url || avatarUrl(profile.id, profile.full_name)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Profile header */}
      <div className="card mb-6">
        <div className="flex items-start gap-6">
          <div className="relative">
            <Image
              src={avatar}
              alt={profile.full_name ?? 'Profile'}
              width={80} height={80}
              className="rounded-2xl object-cover"
              unoptimized
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>
              {profile.full_name ?? profile.username}
            </h1>
            <p className="text-white/40 text-sm">@{profile.username}</p>
            {profile.city && (
              <p className="flex items-center gap-1.5 text-sm text-white/50 mt-2">
                <MapPin size={13} className="text-accent-teal" />
                {profile.city}
              </p>
            )}
            {profile.bio && <p className="text-white/60 text-sm mt-2 leading-relaxed">{profile.bio}</p>}
          </div>
          <div className="flex gap-2">
            <Link href="/onboarding" className="btn-ghost flex items-center gap-2 text-sm px-4 py-2">
              Onboarding
            </Link>
            <Link href="/profile/edit" className="btn-secondary flex items-center gap-2 text-sm px-4 py-2">
              <Edit3 size={14} /> Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Interests */}
      <ProfileInterestsEditor
        initialUserInterests={(userInterests ?? []) as UserInterest[]}
        categories={(categories ?? []) as InterestCategory[]}
        interests={(interests ?? []) as Interest[]}
      />

      {/* Availability */}
      <ProfileAvailabilityEditor initialAvailability={(availability ?? []) as Availability[]} />
    </div>
  )
}
