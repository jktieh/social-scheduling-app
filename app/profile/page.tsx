import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { avatarUrl, DAY_SHORT, formatTime } from '@/lib/utils'
import { MapPin, Edit3, Calendar } from 'lucide-react'
import type { UserInterest, Availability } from '@/types'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: userInterests } = await supabase
    .from('user_interests')
    .select('*, interest:interests(id,name,icon,category_id)')
    .eq('user_id', user.id)

  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .eq('user_id', user.id)
    .order('day_of_week')

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
              Preferences
            </Link>
            <Link href="/profile/edit" className="btn-secondary flex items-center gap-2 text-sm px-4 py-2">
              <Edit3 size={14} /> Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Interests */}
      <div className="card mb-6">
        <h2 className="font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Interests</h2>
        {userInterests && userInterests.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {(userInterests as UserInterest[]).map(ui => (
              <div key={ui.id} className="flex items-center gap-2 glass px-4 py-2 rounded-full text-sm">
                <span>{ui.interest?.icon}</span>
                <span className="text-white/80">{ui.interest?.name}</span>
                <span className="text-brand-400 text-xs">{'●'.repeat(ui.level)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/30 text-sm">No interests set.</p>
        )}
      </div>

      {/* Availability */}
      <div className="card">
        <h2 className="font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Calendar size={18} className="text-brand-400" />
          Weekly Availability
        </h2>
        {availability && availability.length > 0 ? (
          <div className="space-y-2">
            {(availability as Availability[]).map(slot => (
              <div key={slot.id} className="flex items-center justify-between glass rounded-xl px-4 py-3">
                <span className="font-medium w-10">{DAY_SHORT[slot.day_of_week]}</span>
                <span className="text-white/50 text-sm">
                  {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/30 text-sm">No availability set.</p>
        )}
      </div>
    </div>
  )
}
