'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Interest, InterestCategory, UserInterest } from '@/types'
import { Edit3, Check, X } from 'lucide-react'

interface Props {
  initialUserInterests: UserInterest[]
  categories: InterestCategory[]
  interests: Interest[]
}

export default function ProfileInterestsEditor({
  initialUserInterests,
  categories,
  interests,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSelected(new Set(initialUserInterests.map(ui => ui.interest_id)))
  }, [initialUserInterests])

  function toggleInterest(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('user_interests').delete().eq('user_id', user.id)
    if (selected.size > 0) {
      const { error: insertError } = await supabase.from('user_interests').insert(
        [...selected].map(interest_id => ({ user_id: user.id, interest_id }))
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
    setSelected(new Set(initialUserInterests.map(ui => ui.interest_id)))
    setError('')
    setEditing(false)
  }

  const displayInterests = initialUserInterests.filter(ui => {
    if (editing) return selected.has(ui.interest_id)
    return true
  })

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>Interests</h2>
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
        <div className="space-y-4">
          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg border border-red-400/20">
              {error}
            </p>
          )}
          <p className="text-white/50 text-sm">Select your interests. Pick as many as you like.</p>
          <div className="space-y-4">
            {categories.map(cat => {
              const catInterests = interests.filter(i => i.category_id === cat.id)
              if (catInterests.length === 0) return null
              return (
                <div key={cat.id}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                    {cat.icon} {cat.name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {catInterests.map(interest => (
                      <button
                        key={interest.id}
                        type="button"
                        onClick={() => toggleInterest(interest.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selected.has(interest.id)
                            ? 'bg-brand-600 text-white'
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
        </div>
      ) : (
        <>
          {displayInterests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {displayInterests.map(ui => (
                <div key={ui.id} className="flex items-center gap-2 glass px-4 py-2 rounded-full text-sm">
                  <span>{ui.interest?.icon}</span>
                  <span className="text-white/80">{ui.interest?.name}</span>
                  <span className="text-brand-400 text-xs">{'●'.repeat(ui.level || 3)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-sm">No interests set. Click Edit to add some.</p>
          )}
        </>
      )}
    </div>
  )
}
