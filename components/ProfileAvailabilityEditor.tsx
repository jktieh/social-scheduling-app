'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Availability } from '@/types'
import { DAY_SHORT } from '@/lib/utils'
import { Edit3, Check, X } from 'lucide-react'
import { Calendar } from 'lucide-react'

interface AvailSlot { day: number; start: string; end: string }

interface Props {
  initialAvailability: Availability[]
}

export default function ProfileAvailabilityEditor({ initialAvailability }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [slots, setSlots] = useState<AvailSlot[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSlots(
      initialAvailability.map(a => ({
        day: a.day_of_week,
        start: a.start_time.slice(0, 5),
        end: a.end_time.slice(0, 5),
      }))
    )
  }, [initialAvailability])

  function toggleDay(day: number) {
    setSlots(prev => {
      if (prev.find(s => s.day === day)) return prev.filter(s => s.day !== day)
      return [...prev, { day, start: '18:00', end: '22:00' }]
    })
  }

  function updateSlot(day: number, field: 'start' | 'end', value: string) {
    setSlots(prev => prev.map(s => (s.day === day ? { ...s, [field]: value } : s)))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('availability').delete().eq('user_id', user.id)
    if (slots.length > 0) {
      const { error: insertError } = await supabase.from('availability').insert(
        slots.map(s => ({
          user_id: user.id,
          day_of_week: s.day,
          start_time: s.start,
          end_time: s.end,
        }))
      )
      if (insertError) {
        setError(insertError.message)
        setSaving(false)
        return
      }
    }
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  function handleCancel() {
    setSlots(
      initialAvailability.map(a => ({
        day: a.day_of_week,
        start: a.start_time.slice(0, 5),
        end: a.end_time.slice(0, 5),
      }))
    )
    setError('')
    setEditing(false)
  }

  function formatTime(t: string): string {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Calendar size={18} className="text-brand-400" />
          Weekly Availability
        </h2>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="btn-ghost flex items-center gap-2 text-sm px-3 py-1.5"
          >
            <Edit3 size={14} /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2 text-sm px-3 py-1.5 disabled:opacity-50"
            >
              <Check size={14} /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="btn-ghost flex items-center gap-2 text-sm px-3 py-1.5"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg border border-red-400/20">
              {error}
            </p>
          )}
          <p className="text-white/50 text-sm">Toggle days and set your typical availability.</p>
          {[0, 1, 2, 3, 4, 5, 6].map(day => {
            const slot = slots.find(s => s.day === day)
            const active = !!slot
            return (
              <div
                key={day}
                className={`glass rounded-xl p-4 transition-all ${active ? 'border-brand-500/40' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${
                      active ? 'bg-brand-600' : 'bg-surface-4'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                        active ? 'left-6' : 'left-0.5'
                      }`}
                    />
                  </button>
                  <span className={`w-10 font-semibold flex-shrink-0 ${active ? 'text-white' : 'text-white/30'}`}>
                    {DAY_SHORT[day]}
                  </span>
                  {active && (
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
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
      ) : (
        <>
          {slots.length > 0 ? (
            <div className="space-y-2">
              {slots.map(slot => (
                <div key={slot.day} className="flex items-center justify-between glass rounded-xl px-4 py-3">
                  <span className="font-medium w-10">{DAY_SHORT[slot.day]}</span>
                  <span className="text-white/50 text-sm">
                    {formatTime(slot.start)} – {formatTime(slot.end)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-sm">No availability set. Click Edit to add your free times.</p>
          )}
        </>
      )}
    </div>
  )
}
