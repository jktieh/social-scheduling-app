'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CANADIAN_CITIES } from '@/lib/utils'

export default function ProfileEditPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [bio, setBio]           = useState('')
  const [city, setCity]         = useState('')
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setFullName(data.full_name ?? '')
        setBio(data.bio ?? '')
        setCity(data.city ?? '')
      }
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, bio, city })
      .eq('id', user.id)

    setSaving(false)
    if (error) { setError(error.message) }
    else { setSuccess(true); setTimeout(() => router.push('/profile'), 1000) }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold mb-6" style={{ fontFamily: 'var(--font-display)' }}>
        Edit Profile
      </h1>

      <form onSubmit={handleSave} className="card space-y-5">
        <div>
          <label className="block text-sm text-white/60 mb-1.5">Full name</label>
          <input className="input-base" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1.5">Bio</label>
          <textarea
            className="input-base resize-none"
            rows={3}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell people a bit about yourself…"
          />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1.5">City</label>
          <select className="input-base w-full" value={city} onChange={e => setCity(e.target.value)}>
            <option value="">Select a city</option>
            {CANADIAN_CITIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {error   && <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg border border-red-400/20">{error}</p>}
        {success && <p className="text-teal-400 text-sm">Saved! Redirecting…</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
