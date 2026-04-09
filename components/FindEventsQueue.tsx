'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  MOCK_QUEUE_SUGGESTIONS,
  QUEUE_PHRASES,
  TARGET_GROUP_SIZE,
  runMatchmakingSimulation,
  type QueueEventSuggestion,
} from '@/lib/find-events-queue'
import { Loader2, Search, X, Sparkles } from 'lucide-react'

type Phase = 'idle' | 'queueing' | 'matched'

export interface FindEventsQueueProps {
  className?: string
  /**
   * `discover` — `suggestions` are personalized (interests + city + availability); never uses demo data.
   * `demo` (default) — uses built-in demo cards when `suggestions` is omitted or empty.
   */
  source?: 'demo' | 'discover'
  /**
   * When `source` is `discover`, pass rows from the same list as “Discover Events” (may be empty).
   * When `source` is `demo`, omit to use demo suggestions.
   */
  suggestions?: QueueEventSuggestion[]
}

/**
 * Matchmaking CTA with a video-game queue feel (simulated until a backend exists).
 */
export default function FindEventsQueue({
  className = '',
  source = 'demo',
  suggestions,
}: FindEventsQueueProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [playersFound, setPlayersFound] = useState(1)
  const [progress, setProgress] = useState(0)
  const [revealedRows, setRevealedRows] = useState<QueueEventSuggestion[]>([])
  const simulationRef = useRef<{ cancel: () => void } | null>(null)

  const reset = useCallback(() => {
    simulationRef.current?.cancel()
    simulationRef.current = null
    setPhase('idle')
    setPhraseIndex(0)
    setPlayersFound(1)
    setProgress(0)
    setRevealedRows([])
  }, [])

  useEffect(() => () => simulationRef.current?.cancel(), [])

  const startMatchmaking = useCallback(() => {
    if (phase !== 'idle') return
    const rows =
      source === 'discover'
        ? (suggestions ?? [])
        : suggestions?.length
          ? suggestions
          : MOCK_QUEUE_SUGGESTIONS
    setPhase('queueing')
    setPhraseIndex(0)
    setPlayersFound(1)
    setProgress(0.08)
    setRevealedRows([])

    simulationRef.current?.cancel()
    simulationRef.current = runMatchmakingSimulation({
      onPhraseIndex: setPhraseIndex,
      onPlayersFound: setPlayersFound,
      onProgress: setProgress,
      onComplete: () => {
        setPhase('matched')
        setRevealedRows(rows)
        simulationRef.current = null
      },
    })
  }, [phase, source, suggestions])

  const cancel = useCallback(() => {
    if (phase !== 'queueing') return
    simulationRef.current?.cancel()
    simulationRef.current = null
    reset()
  }, [phase, reset])

  const phrase = QUEUE_PHRASES[phraseIndex] ?? QUEUE_PHRASES[0]
  const circumference = 2 * Math.PI * 22
  const dashOffset = circumference * (1 - progress)

  return (
    <div
      className={[
        'card relative overflow-hidden border border-white/10',
        'hover:bg-white/[0.06] transition-colors duration-200',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="absolute -top-16 -right-10 w-40 h-40 bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={startMatchmaking}
              disabled={phase !== 'idle'}
              className={[
                'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3.5 text-sm font-semibold transition-all duration-200',
                'bg-brand-600 text-white shadow-lg shadow-brand-600/20',
                'hover:bg-brand-500 hover:shadow-brand-600/30 hover:-translate-y-0.5',
                'active:translate-y-0 active:scale-[0.98]',
                'disabled:pointer-events-none disabled:opacity-60 disabled:shadow-none disabled:translate-y-0',
                phase === 'queueing' && 'ring-2 ring-brand-400/80 ring-offset-2 ring-offset-[#0a0a0f] animate-pulse',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {phase === 'queueing' ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden />
                  <span>In queue…</span>
                </>
              ) : phase === 'matched' ? (
                <>
                  <Sparkles size={18} aria-hidden />
                  <span>Match found</span>
                </>
              ) : (
                <>
                  <Search size={18} className="transition-transform duration-200 group-hover:scale-110" aria-hidden />
                  <span>Find Events</span>
                </>
              )}
              {phase === 'queueing' && (
                <span
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-sweep"
                  aria-hidden
                />
              )}
            </button>

            {phase === 'queueing' && (
              <button
                type="button"
                onClick={cancel}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <X size={16} aria-hidden />
                Cancel
              </button>
            )}
          </div>

          <div
            className={[
              'overflow-hidden rounded-xl border transition-all duration-300',
              phase === 'idle' ? 'border-transparent bg-transparent' : 'border-white/10 bg-white/[0.04]',
            ].join(' ')}
          >
            <div className={['space-y-4 p-4', phase === 'idle' && 'hidden'].filter(Boolean).join(' ')}>
              {phase === 'queueing' && (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <p key={phrase} className="text-sm font-medium text-white animate-fade-in">
                      {phrase}
                    </p>
                    <div className="flex gap-1" aria-hidden>
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative h-14 w-14 flex-shrink-0">
                      <svg className="-rotate-90 transform text-brand-400" width="56" height="56" viewBox="0 0 56 56" aria-hidden>
                        <circle cx="28" cy="28" r="22" fill="none" className="stroke-white/10" strokeWidth="5" />
                        <circle
                          cx="28"
                          cy="28"
                          r="22"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="5"
                          strokeLinecap="round"
                          className="transition-[stroke-dashoffset] duration-500 ease-out"
                          style={{
                            strokeDasharray: circumference,
                            strokeDashoffset: dashOffset,
                          }}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90">
                        {Math.round(progress * 100)}%
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex justify-between text-xs font-medium text-white/50">
                        <span>Group fill</span>
                        <span className="tabular-nums text-brand-300">
                          {playersFound}/{TARGET_GROUP_SIZE} people found
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-[width] duration-500 ease-out"
                          style={{ width: `${Math.min(100, progress * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-white/40">Looking for locals who share your interests…</p>
                    </div>
                  </div>
                </>
              )}

              {phase === 'matched' && (
                <div className="space-y-2 animate-fade-in">
                  <p className="flex items-center gap-2 text-base font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                    <span className="inline-flex animate-bounce">🎉</span>
                    Match found — your picks
                  </p>
                  <p className="text-sm text-white/45">
                    {source === 'discover'
                      ? revealedRows.length > 0
                        ? 'Pulled from Discover below: your interests, city, and availability — open a card for details.'
                        : 'Nothing in Discover matched right now. Finish interests & availability in onboarding, or browse all events.'
                      : revealedRows.length > 0
                        ? 'Tap a card to open the event.'
                        : 'Demo suggestions — add city, interests, and availability on your profile to unlock personalized picks.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {phase === 'matched' && revealedRows.length > 0 && (
        <ul className="relative mt-6 space-y-3">
          {revealedRows.map((ev, i) => (
            <li
              key={`${ev.id}-${i}`}
              className="animate-slide-up"
              style={{ animationDelay: `${80 + i * 100}ms` }}
            >
              <Link
                href={ev.href}
                className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-200 hover:border-brand-500/30 hover:bg-white/[0.07] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
              >
                <span className="text-3xl transition-transform duration-200 group-hover:scale-110">{ev.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white group-hover:text-brand-300 transition-colors leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                    {ev.title}
                  </p>
                  <p className="text-sm text-white/45">{ev.subtitle}</p>
                </div>
                <span className="flex-shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70 group-hover:border-brand-500/25 group-hover:text-brand-200">
                  {ev.timeLabel}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {phase === 'matched' && (
        <div className="relative mt-4 flex flex-wrap gap-2">
          <Link href="/events" className="btn-primary text-sm py-2.5 px-5">
            Browse all events
          </Link>
          <button
            type="button"
            onClick={reset}
            className="btn-secondary text-sm py-2.5 px-4 rounded-xl border border-white/10"
          >
            Find again
          </button>
        </div>
      )}
    </div>
  )
}
