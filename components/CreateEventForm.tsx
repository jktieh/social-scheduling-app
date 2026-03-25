'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Interest } from '@/types'

interface Props {
  interests: Interest[]
  city: string | null
  mode?: 'create' | 'edit'
  eventId?: string
  initialValues?: {
    title: string
    description: string | null
    interest_id: string | null
    proposed_start: string
    threshold_count: number
    max_attendees: number
  }
}

export default function CreateEventForm({
  interests,
  city,
  mode = 'create',
  eventId,
  initialValues,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const initialStart = initialValues ? new Date(initialValues.proposed_start) : null
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [interestId, setInterestId] = useState(initialValues?.interest_id ?? '')
  const [date, setDate] = useState(
    initialStart ? `${initialStart.getFullYear()}-${String(initialStart.getMonth() + 1).padStart(2, '0')}-${String(initialStart.getDate()).padStart(2, '0')}` : ''
  )
  const [time, setTime] = useState(
    initialStart ? `${String(initialStart.getHours()).padStart(2, '0')}:${String(initialStart.getMinutes()).padStart(2, '0')}` : ''
  )
  const [thresholdCount, setThresholdCount] = useState(initialValues?.threshold_count ?? 4)
  const [maxAttendees, setMaxAttendees] = useState(initialValues?.max_attendees ?? 12)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    if (!city?.trim()) {
      setError('Please set your city in profile before creating events.')
      setSaving(false)
      return
    }

    const start = new Date(`${date}T${time}`)
    if (Number.isNaN(start.getTime())) {
      setError('Please provide a valid date and time.')
      setSaving(false)
      return
    }
    if (start.getTime() <= Date.now()) {
      setError('Event start time must be in the future.')
      setSaving(false)
      return
    }

    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      interest_id: interestId,
      proposed_start: start.toISOString(),
      proposed_end: end.toISOString(),
      threshold_count: thresholdCount,
      max_attendees: maxAttendees,
      city: city.trim(),
    }

    if (mode === 'edit' && eventId) {
      const { error: updateError } = await supabase
        .from('events')
        .update(payload)
        .eq('id', eventId)
        .eq('created_by', user.id)
      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }
      router.push(`/events/${eventId}`)
      router.refresh()
      return
    }

    const { data: created, error: createError } = await supabase
      .from('events')
      .insert({
        ...payload,
        created_by: user.id,
        status: 'open',
      })
      .select('id')
      .single()

    if (createError || !created) {
      setError(createError?.message ?? 'Failed to create event.')
      setSaving(false)
      return
    }

    // Add creator as first interested participant.
    await supabase.from('event_interests').insert({
      event_id: created.id,
      user_id: user.id,
      status: 'interested',
      is_host: true,
    })

    router.push(`/events/${created.id}`)
    router.refresh()
  }

  return (
    <div className="card max-w-2xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        {mode === 'edit' ? 'Edit Event' : 'Create an Event'}
      </h1>
      <p className="text-white/40 mb-6">
        {mode === 'edit'
          ? `Update event details for ${city ?? 'your city'}.`
          : `This event will be discoverable in ${city ?? 'your city'}.`}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-white/60 mb-1.5">Title</label>
          <input
            type="text"
            className="input-base"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Friday Board Game Night"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1.5">Interest</label>
          <select
            className="input-base w-full"
            value={interestId}
            onChange={e => setInterestId(e.target.value)}
            required
          >
            <option value="">Select an interest</option>
            {interests.map(i => (
              <option key={i.id} value={i.id}>
                {i.icon ? `${i.icon} ` : ''}{i.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1.5">Description (optional)</label>
          <textarea
            className="input-base min-h-[96px]"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What should people expect?"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Date</label>
            <input
              type="date"
              className="input-base"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Start time</label>
            <input
              type="time"
              className="input-base"
              value={time}
              onChange={e => setTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">People needed to confirm</label>
            <input
              type="number"
              className="input-base"
              min={2}
              max={20}
              value={thresholdCount}
              onChange={e => setThresholdCount(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Max attendees</label>
            <input
              type="number"
              className="input-base"
              min={2}
              max={50}
              value={maxAttendees}
              onChange={e => setMaxAttendees(Number(e.target.value))}
              required
            />
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? (mode === 'edit' ? 'Saving…' : 'Creating…') : (mode === 'edit' ? 'Save changes →' : 'Create event →')}
          </button>
          <button type="button" onClick={() => router.push(mode === 'edit' && eventId ? `/events/${eventId}` : '/events')} className="btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

