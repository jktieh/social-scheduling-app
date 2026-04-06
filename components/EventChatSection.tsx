'use client'

import ChatBox from '@/components/ChatBox'
import { useEventMembership } from '@/components/EventMembershipContext'
import type { Profile } from '@/types'

interface Props {
  eventId: string
  myProfile: Profile | null
  /** Server truth when the page loaded — used if context is missing. */
  serverIsMember: boolean
}

export default function EventChatSection({ eventId, myProfile, serverIsMember }: Props) {
  const ctx = useEventMembership()
  const isMember = ctx?.isMember ?? serverIsMember

  if (!isMember) {
    return (
      <div className="card text-center py-8">
        <p className="text-3xl mb-3">💬</p>
        <p className="font-semibold text-white/70 mb-1">Group Chat</p>
        <p className="text-white/40 text-sm">Express interest to unlock the group chat.</p>
      </div>
    )
  }

  if (!myProfile) return null

  return (
    <div className="animate-fade-in motion-reduce:animate-none">
      <ChatBox eventId={eventId} currentUser={myProfile} />
    </div>
  )
}
