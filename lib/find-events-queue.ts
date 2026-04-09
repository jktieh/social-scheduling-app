/**
 * Copy + timing for the matchmaking queue UI.
 * Replace `runMatchmakingSimulation` with a real API client later without changing the component much.
 */

import type { Event } from '@/types'
import { formatEventTime } from '@/lib/utils'

export const QUEUE_PHRASES = [
  'Searching for people...',
  'Matching interests...',
  'Checking availability...',
  'Building your group...',
  'Almost there...',
] as const

export const TARGET_GROUP_SIZE = 4

/** One row in the post-match list — always includes a Next.js `href` (real event or fallback). */
export type QueueEventSuggestion = {
  id: string
  href: string
  title: string
  subtitle: string
  timeLabel: string
  icon: string
}

export const MOCK_QUEUE_SUGGESTIONS: QueueEventSuggestion[] = [
  { id: 'mock-1', href: '/events', title: 'Friday Board Game Night', subtitle: 'Downtown · 4 spots', timeLabel: 'Fri 7:00 PM', icon: '🎲' },
  { id: 'mock-2', href: '/events', title: 'Weekend Climbing Session', subtitle: 'Climbing gym · 6 spots', timeLabel: 'Sat 2:00 PM', icon: '🧗' },
  { id: 'mock-3', href: '/events', title: 'Coffee & Code', subtitle: 'Neighbourhood café', timeLabel: 'Sun 10:00 AM', icon: '☕' },
]

/** Map DB events → queue rows (links to `/events/[id]`). */
export function eventsToQueueSuggestions(events: Event[], max = 3): QueueEventSuggestion[] {
  return events.slice(0, max).map(e => {
    const subtitleParts = [e.venue?.name, e.city].filter(Boolean)
    const subtitle =
      subtitleParts.length > 0 ? subtitleParts.join(' · ') : (e.interest?.name ?? 'Event')
    return {
      id: e.id,
      href: `/events/${e.id}`,
      title: e.title,
      subtitle,
      timeLabel: formatEventTime(e.proposed_start),
      icon: e.interest?.icon ?? '📅',
    }
  })
}

/** Top discover matches only (same filters as dashboard “Discover Events”) — links to `/events/[id]`. */
export function discoverEventsToQueueSuggestions(
  discover: Event[] | null | undefined,
  max = 3
): QueueEventSuggestion[] {
  return eventsToQueueSuggestions(discover ?? [], max)
}

/** Discover first, then events you’re already in — unique, capped. */
export function mergeSuggestionsForQueue(discover: Event[] | null | undefined, mine: Event[], max = 3): QueueEventSuggestion[] {
  const merged: Event[] = []
  const seen = new Set<string>()
  for (const e of discover ?? []) {
    if (merged.length >= max) break
    if (!seen.has(e.id)) {
      seen.add(e.id)
      merged.push(e)
    }
  }
  for (const e of mine) {
    if (merged.length >= max) break
    if (!seen.has(e.id)) {
      seen.add(e.id)
      merged.push(e)
    }
  }
  return eventsToQueueSuggestions(merged, max)
}

export type MatchmakingCallbacks = {
  onPhraseIndex: (index: number) => void
  onPlayersFound: (count: number) => void
  onProgress: (fraction: number) => void
  onComplete: () => void
}

const randomBetween = (minMs: number, maxMs: number) =>
  minMs + Math.floor(Math.random() * (maxMs - minMs + 1))

/**
 * Cancellable fake matchmaking. Total wall time ~2–5s plus small tail.
 */
export function runMatchmakingSimulation(callbacks: MatchmakingCallbacks): { cancel: () => void } {
  if (typeof window === 'undefined') {
    return { cancel: () => {} }
  }

  let cancelled = false
  const timeouts: number[] = []
  let phraseIntervalId = 0

  const run = (fn: () => void) => {
    if (!cancelled) fn()
  }

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => run(fn), ms)
    timeouts.push(id)
    return id
  }

  let phraseIndex = 0
  phraseIntervalId = window.setInterval(() => {
    run(() => {
      phraseIndex = (phraseIndex + 1) % QUEUE_PHRASES.length
      callbacks.onPhraseIndex(phraseIndex)
    })
  }, randomBetween(900, 1300))

  const steps: { players: number; progress: number; delay: number }[] = [
    { players: 2, progress: 0.28, delay: randomBetween(350, 750) },
    { players: 3, progress: 0.58, delay: randomBetween(450, 900) },
    { players: TARGET_GROUP_SIZE, progress: 0.9, delay: randomBetween(450, 950) },
  ]

  let tAccum = 0
  for (const step of steps) {
    tAccum += step.delay
    later(() => {
      callbacks.onPlayersFound(step.players)
      callbacks.onProgress(step.progress)
    }, tAccum)
  }

  const finishDelay = tAccum + randomBetween(200, 550)
  later(() => {
    window.clearInterval(phraseIntervalId)
    callbacks.onPlayersFound(TARGET_GROUP_SIZE)
    callbacks.onProgress(1)
    callbacks.onComplete()
  }, finishDelay)

  return {
    cancel: () => {
      cancelled = true
      window.clearInterval(phraseIntervalId)
      timeouts.forEach(id => window.clearTimeout(id))
    },
  }
}
