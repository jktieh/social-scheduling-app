'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { avatarUrl } from '@/lib/utils'
import type { EventMessage, Profile } from '@/types'
import { Send } from 'lucide-react'
import Image from 'next/image'

interface Props {
  eventId: string
  currentUser: Profile
}

export default function ChatBox({ eventId, currentUser }: Props) {
  const supabase = createClient()
  const [messages, setMessages] = useState<EventMessage[]>([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── Load messages ────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('event_messages')
      .select('*, profile:profiles(id, full_name, avatar_url, username)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMessages(data as EventMessage[]) })
  }, [eventId])

  // ── Subscribe to realtime new messages ───────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`event-chat-${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'event_messages', filter: `event_id=eq.${eventId}` },
        async (payload) => {
          // Fetch the full message with profile
          const { data } = await supabase
            .from('event_messages')
            .select('*, profile:profiles(id, full_name, avatar_url, username)')
            .eq('id', payload.new.id)
            .single()
          if (data) setMessages(prev => [...prev, data as EventMessage])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  // ── Scroll to bottom on new message ─────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ─────────────────────────────────────────────
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    setInput('')

    await supabase.from('event_messages').insert({
      event_id: eventId,
      user_id:  currentUser.id,
      content:  text,
    })

    setSending(false)
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="card flex flex-col h-[480px]">
      <h3 className="font-bold mb-4 text-white/80" style={{ fontFamily: 'var(--font-display)' }}>
        Group Chat
      </h3>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center text-white/30 text-sm py-8">
            No messages yet. Say hello! 👋
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.user_id === currentUser.id
          if (msg.is_system) {
            return (
              <div key={msg.id} className="text-center text-xs text-white/30 py-1">
                {msg.content}
              </div>
            )
          }

          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={msg.profile?.avatar_url || avatarUrl(msg.user_id!, msg.profile?.full_name)}
                  alt={msg.profile?.full_name ?? 'User'}
                  width={28} height={28}
                  className="object-cover"
                  unoptimized
                />
              </div>

              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isMe && (
                  <span className="text-xs text-white/30 mb-1 ml-1">
                    {msg.profile?.full_name ?? msg.profile?.username ?? 'User'}
                  </span>
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-brand-600 text-white rounded-br-sm'
                    : 'glass text-white/90 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                <span className="text-xs text-white/20 mt-1 mx-1">
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-2 mt-4">
        <input
          type="text"
          className="input-base flex-1 py-2.5 text-sm"
          placeholder="Type a message…"
          value={input}
          onChange={e => setInput(e.target.value)}
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="btn-primary px-4 py-2.5 rounded-xl disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
