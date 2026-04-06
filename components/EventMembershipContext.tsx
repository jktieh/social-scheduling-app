'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type Ctx = {
  isMember: boolean
  setMember: (value: boolean) => void
}

const EventMembershipContext = createContext<Ctx | null>(null)

/** Wraps the event detail layout so “I’m interested” can reveal chat without a full navigation. */
export function EventMembershipProvider({
  initialIsMember,
  children,
}: {
  initialIsMember: boolean
  children: React.ReactNode
}) {
  const [isMember, setIsMember] = useState(initialIsMember)

  useEffect(() => {
    setIsMember(initialIsMember)
  }, [initialIsMember])

  const setMember = useCallback((value: boolean) => {
    setIsMember(value)
  }, [])

  const value = useMemo(() => ({ isMember, setMember }), [isMember, setMember])

  return <EventMembershipContext.Provider value={value}>{children}</EventMembershipContext.Provider>
}

export function useEventMembership(): Ctx | null {
  return useContext(EventMembershipContext)
}
