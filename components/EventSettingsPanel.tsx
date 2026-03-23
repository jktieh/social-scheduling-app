'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, MapPin, ThumbsUp, ThumbsDown, Plus, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import type { EventSettingProposal, Venue } from '@/types'

interface Props {
  eventId: string
  proposals: EventSettingProposal[]
  venues: Venue[]
  currentUserId: string
  userVotes: Record<string, boolean> // proposal_id → vote
}

export default function EventSettingsPanel({
  eventId,
  proposals: initialProposals,
  venues,
  currentUserId,
  userVotes: initialUserVotes,
}: Props) {
  const supabase = createClient()
  const [proposals, setProposals] = useState(initialProposals)
  const [userVotes, setUserVotes] = useState(initialUserVotes)
  const [expanded, setExpanded] = useState(false)
  const [showForm, setShowForm] = useState<'time' | 'venue' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Time form state
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')

  // Venue form state
  const [selectedVenueId, setSelectedVenueId] = useState('')
  const [customVenueName, setCustomVenueName] = useState('')

  async function submitProposal() {
    setLoading(true)
    setError('')
    try {
      const body: Record<string, string> = { event_id: eventId, type: showForm! }
      if (showForm === 'time') {
        if (!newStart) { setError('Start time required'); setLoading(false); return }
        body.new_start = new Date(newStart).toISOString()
        if (newEnd) body.new_end = new Date(newEnd).toISOString()
      } else {
        if (!selectedVenueId && !customVenueName) {
          setError('Select a venue or enter a name'); setLoading(false); return
        }
        if (selectedVenueId) body.new_venue_id = selectedVenueId
        if (customVenueName) body.new_venue_name = customVenueName
      }

      const res = await fetch('/api/event-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }

      // Refresh proposals
      const { data: updated } = await supabase
        .from('event_setting_proposals')
        .select('*, profile:profiles(id,full_name,username), new_venue:venues(id,name,address)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
      if (updated) setProposals(updated as EventSettingProposal[])

      setShowForm(null)
      setNewStart(''); setNewEnd(''); setSelectedVenueId(''); setCustomVenueName('')
    } finally {
      setLoading(false)
    }
  }

  async function castVote(proposalId: string, vote: boolean) {
    if (userVotes[proposalId] !== undefined) return // Already voted

    const res = await fetch('/api/event-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposal_id: proposalId, vote }),
    })
    if (res.ok) {
      setUserVotes(v => ({ ...v, [proposalId]: vote }))
      setProposals(ps => ps.map(p =>
        p.id === proposalId
          ? { ...p, votes_for: vote ? p.votes_for + 1 : p.votes_for, votes_against: !vote ? p.votes_against + 1 : p.votes_against }
          : p
      ))
    }
  }

  const openProposals = proposals.filter(p => p.status === 'open')
  const resolvedProposals = proposals.filter(p => p.status !== 'open')

  return (
    <div className="card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Clock size={16} className="text-brand-400" />
          Settings & Proposals
          {openProposals.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-amber-400/20 text-amber-400 rounded-full border border-amber-400/20">
              {openProposals.length} open
            </span>
          )}
        </h3>
        {expanded ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
      </button>

      {expanded && (
        <div className="mt-5 space-y-4">
          {/* Action buttons */}
          {!showForm && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm('time')}
                className="flex items-center gap-2 px-3 py-2 text-sm glass rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                <Clock size={13} />
                Propose time change
              </button>
              <button
                onClick={() => setShowForm('venue')}
                className="flex items-center gap-2 px-3 py-2 text-sm glass rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                <MapPin size={13} />
                Propose venue change
              </button>
            </div>
          )}

          {/* Time change form */}
          {showForm === 'time' && (
            <div className="glass-strong rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-white/80">Propose a new time</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Start *</label>
                  <input
                    type="datetime-local"
                    value={newStart}
                    onChange={e => setNewStart(e.target.value)}
                    className="input-base text-sm py-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">End</label>
                  <input
                    type="datetime-local"
                    value={newEnd}
                    onChange={e => setNewEnd(e.target.value)}
                    className="input-base text-sm py-2"
                  />
                </div>
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-2">
                <button onClick={submitProposal} disabled={loading} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : 'Submit'}
                </button>
                <button onClick={() => { setShowForm(null); setError('') }} className="btn-ghost text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Venue change form */}
          {showForm === 'venue' && (
            <div className="glass-strong rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-white/80">Propose a new venue</p>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Choose existing venue</label>
                <select
                  value={selectedVenueId}
                  onChange={e => { setSelectedVenueId(e.target.value); setCustomVenueName('') }}
                  className="input-base text-sm py-2"
                >
                  <option value="">— Select venue —</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.city})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Or suggest a custom venue</label>
                <input
                  type="text"
                  placeholder="e.g. The Local Pub, 123 Main St"
                  value={customVenueName}
                  onChange={e => { setCustomVenueName(e.target.value); setSelectedVenueId('') }}
                  className="input-base text-sm py-2"
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-2">
                <button onClick={submitProposal} disabled={loading} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : 'Submit'}
                </button>
                <button onClick={() => { setShowForm(null); setError('') }} className="btn-ghost text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Open proposals */}
          {openProposals.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-white/30 uppercase tracking-widest font-semibold">Open votes</p>
              {openProposals.map(p => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  myVote={userVotes[p.id]}
                  onVote={(vote) => castVote(p.id, vote)}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}

          {/* Resolved proposals */}
          {resolvedProposals.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-white/30 uppercase tracking-widest font-semibold">Resolved</p>
              {resolvedProposals.map(p => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  myVote={userVotes[p.id]}
                  onVote={() => {}}
                  currentUserId={currentUserId}
                  resolved
                />
              ))}
            </div>
          )}

          {proposals.length === 0 && !showForm && (
            <p className="text-white/25 text-sm text-center py-2">
              No proposals yet. Suggest a time or venue change above.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ProposalCard({
  proposal: p,
  myVote,
  onVote,
  currentUserId,
  resolved = false,
}: {
  proposal: EventSettingProposal
  myVote: boolean | undefined
  onVote: (vote: boolean) => void
  currentUserId: string
  resolved?: boolean
}) {
  const total = p.votes_for + p.votes_against
  const forPct = total > 0 ? Math.round((p.votes_for / total) * 100) : 0
  const hasVoted = myVote !== undefined

  return (
    <div className={`glass rounded-xl p-4 space-y-3 ${
      p.status === 'accepted' ? 'border-teal-500/20' :
      p.status === 'rejected' ? 'border-red-500/10 opacity-60' : ''
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              p.type === 'time' ? 'bg-brand-600/20 text-brand-300' : 'bg-accent-teal/10 text-teal-300'
            }`}>
              {p.type === 'time' ? '🕐 Time' : '📍 Venue'}
            </span>
            {p.status !== 'open' && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                p.status === 'accepted' ? 'bg-teal-500/10 text-teal-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {p.status === 'accepted' ? '✓ Accepted' : '✗ Rejected'}
              </span>
            )}
          </div>
          {p.type === 'time' && p.new_start && (
            <p className="text-sm text-white/80">
              {new Date(p.new_start).toLocaleString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit'
              })}
              {p.new_end && (
                <span className="text-white/40">
                  {' → '}{new Date(p.new_end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              )}
            </p>
          )}
          {p.type === 'venue' && (
            <p className="text-sm text-white/80">
              {p.new_venue?.name || p.new_venue_name}
            </p>
          )}
          <p className="text-xs text-white/30 mt-1">
            by {p.profile?.full_name || p.profile?.username || 'Unknown'}
          </p>
        </div>
      </div>

      {/* Vote bar */}
      <div className="space-y-1.5">
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-teal-500 rounded-l-full transition-all"
            style={{ width: `${forPct}%` }}
          />
          <div
            className="h-full bg-red-500/40 rounded-r-full transition-all"
            style={{ width: `${100 - forPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/30">
          <span>{p.votes_for} for</span>
          <span>{p.votes_against} against</span>
        </div>
      </div>

      {/* Vote buttons */}
      {!resolved && p.status === 'open' && (
        <div className="flex gap-2">
          <button
            onClick={() => !hasVoted && onVote(true)}
            disabled={hasVoted}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              myVote === true
                ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                : hasVoted
                ? 'text-white/20 cursor-not-allowed'
                : 'glass text-white/50 hover:text-teal-400 hover:bg-teal-500/10'
            }`}
          >
            <ThumbsUp size={12} /> For
          </button>
          <button
            onClick={() => !hasVoted && onVote(false)}
            disabled={hasVoted}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              myVote === false
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : hasVoted
                ? 'text-white/20 cursor-not-allowed'
                : 'glass text-white/50 hover:text-red-400 hover:bg-red-500/10'
            }`}
          >
            <ThumbsDown size={12} /> Against
          </button>
          {hasVoted && <span className="text-xs text-white/25 self-center ml-1">Vote cast</span>}
        </div>
      )}
    </div>
  )
}
