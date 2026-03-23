'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Interest, InterestCategory } from '@/types'
import { CANADIAN_CITIES, DAY_SHORT } from '@/lib/utils'

type Step = 'interests' | 'availability' | 'location'

interface AvailSlot { day: number; start: string; end: string }

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]               = useState<Step>('interests')
  const [categories, setCategories]   = useState<InterestCategory[]>([])
  const [interests, setInterests]     = useState<Interest[]>([])
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [slots, setSlots]             = useState<AvailSlot[]>([])
  const [city, setCity]               = useState('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [loadingInterests, setLoadingInterests] = useState(true)
  const [interestsError, setInterestsError]    = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoadingInterests(true)
      setInterestsError(null)
      const { data: { user } } = await supabase.auth.getUser()
      const [catRes, intRes, userIntRes, availRes, profileRes] = await Promise.all([
        supabase.from('interest_categories').select('*').order('sort_order'),
        supabase.from('interests').select('*').eq('is_active', true),
        user ? supabase.from('user_interests').select('interest_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
        user ? supabase.from('availability').select('day_of_week, start_time, end_time').eq('user_id', user.id) : Promise.resolve({ data: [] }),
        user ? supabase.from('profiles').select('city').eq('id', user.id).single() : Promise.resolve({ data: null }),
      ])
      if (catRes.error) setInterestsError(catRes.error.message)
      else if (catRes.data) setCategories(catRes.data)
      if (intRes.error) setInterestsError(prev => prev || intRes.error?.message || null)
      else if (intRes.data) setInterests(intRes.data as Interest[])
      if (userIntRes.data?.length) setSelected(new Set(userIntRes.data.map((r: { interest_id: string }) => r.interest_id)))
      if (availRes.data?.length) setSlots(availRes.data.map((a: { day_of_week: number; start_time: string; end_time: string }) => ({ day: a.day_of_week, start: a.start_time.slice(0, 5), end: a.end_time.slice(0, 5) })))
      if (profileRes.data?.city) setCity(profileRes.data.city)
      setLoadingInterests(false)
    }
    load()
  }, [])

  // ── Interest toggle ──────────────────────────────────────────
  function toggleInterest(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Availability ─────────────────────────────────────────────
  function toggleDay(day: number) {
    setSlots(prev => {
      if (prev.find(s => s.day === day)) return prev.filter(s => s.day !== day)
      return [...prev, { day, start: '18:00', end: '22:00' }]
    })
  }

  function updateSlot(day: number, field: 'start' | 'end', value: string) {
    setSlots(prev => prev.map(s => s.day === day ? { ...s, [field]: value } : s))
  }

  // ── Save & finish ─────────────────────────────────────────────
  async function handleFinish() {
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Save interests (replace: delete removed, upsert selected)
    await supabase.from('user_interests').delete().eq('user_id', user.id)
    if (selected.size > 0) {
      await supabase.from('user_interests').insert(
        [...selected].map(id => ({ user_id: user.id, interest_id: id }))
      )
    }

    // Save availability (replace: delete old, insert new)
    await supabase.from('availability').delete().eq('user_id', user.id)
    if (slots.length > 0) {
      await supabase.from('availability').insert(
        slots.map(s => ({
          user_id: user.id,
          day_of_week: s.day,
          start_time: s.start,
          end_time: s.end,
        }))
      )
    }

    // Save profile city & mark onboarding complete
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ city: city.trim() || null, onboarding_complete: true })
      .eq('id', user.id)

    if (profileError) {
      setError(profileError.message)
      setSaving(false)
      return
    }

    router.push('/dashboard')
  }

  const steps: Step[] = ['interests', 'availability', 'location']
  const stepIdx = steps.indexOf(step)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < stepIdx ? 'bg-brand-600 text-white' :
                i === stepIdx ? 'bg-brand-500 text-white glow-brand' :
                'bg-surface-3 text-white/30'
              }`}>
                {i < stepIdx ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-16 transition-all ${i < stepIdx ? 'bg-brand-500' : 'bg-surface-3'}`} />
              )}
            </div>
          ))}
          <span className="ml-2 text-white/40 text-sm capitalize">{step}</span>
        </div>

        {/* ── Step 1: Interests ──────────────────────────────────── */}
        {step === 'interests' && (
          <div className="animate-fade-in">
            <h1 className="text-4xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              What are you into?
            </h1>
            <p className="text-white/40 mb-8">Pick as many as you like. We'll use these to find your perfect matches.</p>

            {loadingInterests && (
              <p className="text-white/50 py-8">Loading interests…</p>
            )}
            {interestsError && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-4">
                {interestsError}
              </p>
            )}
            {!loadingInterests && categories.length === 0 && !interestsError && (
              <p className="text-white/50 py-8">
                No interests found. Run the seed in Supabase SQL Editor: <code className="text-xs bg-white/10 px-1 rounded">supabase/seed_interests.sql</code>
              </p>
            )}

            <div className="space-y-6">
              {categories.map(cat => {
                const catInterests = interests.filter(i => i.category_id === cat.id)
                if (catInterests.length === 0) return null
                return (
                  <div key={cat.id}>
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
                      {cat.icon} {cat.name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {catInterests.map(interest => (
                        <button
                          key={interest.id}
                          onClick={() => toggleInterest(interest.id)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ${
                            selected.has(interest.id)
                              ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                              : 'glass text-white/60 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {interest.icon} {interest.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={() => setStep('availability')}
                disabled={selected.size === 0 && categories.length > 0}
                className="btn-primary disabled:opacity-40"
              >
                Next: Set availability →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Availability ───────────────────────────────── */}
        {step === 'availability' && (
          <div className="animate-fade-in">
            <h1 className="text-4xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              When are you free?
            </h1>
            <p className="text-white/40 mb-8">Select your typical weekly availability.</p>

            <div className="space-y-3">
              {DAY_SHORT.map((name, day) => {
                const slot = slots.find(s => s.day === day)
                const active = !!slot
                return (
                  <div key={day} className={`glass rounded-xl p-4 transition-all ${active ? 'border-brand-500/40' : ''}`}>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleDay(day)}
                        className={`w-12 h-6 rounded-full transition-all relative ${
                          active ? 'bg-brand-600' : 'bg-surface-4'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                          active ? 'left-6' : 'left-0.5'
                        }`} />
                      </button>
                      <span className={`w-10 font-semibold ${active ? 'text-white' : 'text-white/30'}`}>{name}</span>

                      {active && (
                        <div className="flex items-center gap-2 ml-auto">
                          <input
                            type="time"
                            value={slot!.start}
                            onChange={e => updateSlot(day, 'start', e.target.value)}
                            className="bg-surface-3 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                          />
                          <span className="text-white/40 text-sm">to</span>
                          <input
                            type="time"
                            value={slot!.end}
                            onChange={e => updateSlot(day, 'end', e.target.value)}
                            className="bg-surface-3 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-between mt-8">
              <button onClick={() => setStep('interests')} className="btn-ghost">← Back</button>
              <button onClick={() => setStep('location')} className="btn-primary">
                Next: Location →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Location ──────────────────────────────────── */}
        {step === 'location' && (
          <div className="animate-fade-in">
            <h1 className="text-4xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Where are you based?
            </h1>
            <p className="text-white/40 mb-8">We'll match you with people in your city.</p>

            <div className="card">
              <label className="block text-sm text-white/60 mb-2">Your city</label>
              <select
                className="input-base text-xl w-full"
                value={city}
                onChange={e => setCity(e.target.value)}
              >
                <option value="">Select a city</option>
                {CANADIAN_CITIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p className="text-white/30 text-xs mt-2">We only match within the same city for now.</p>
            </div>

            {error && (
              <p className="text-red-400 text-sm mt-4 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <div className="flex justify-between mt-8">
              <button onClick={() => setStep('availability')} className="btn-ghost">← Back</button>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? 'Setting up…' : "Let's go! 🎉"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}


