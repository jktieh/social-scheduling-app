import type { Profile, UserInterest, Availability, Interest, Venue } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserWithContext {
  profile: Profile
  interests: UserInterest[]
  availability: Availability[]
}

export interface MatchGroup {
  users: UserWithContext[]
  sharedInterest: Interest
  overlappingSlots: AvailabilitySlot[]
}

export interface AvailabilitySlot {
  day_of_week: number
  start_time: string
  end_time: string
}

export interface EventProposal {
  title: string
  interest: Interest
  venue: Venue | null
  starts_at: string    // ISO string
  ends_at: string
  group: UserWithContext[]
}

// ─── Core grouping ────────────────────────────────────────────────────────────

/**
 * Splits an array of users into fixed-size groups.
 * Groups smaller than groupSize are discarded (not enough to run an event).
 */
export function findGroups<T>(users: T[], groupSize = 4): T[][] {
  const groups: T[][] = []
  for (let i = 0; i < users.length; i += groupSize) {
    const group = users.slice(i, i + groupSize)
    if (group.length === groupSize) groups.push(group)
  }
  return groups
}

// ─── Interest matching ────────────────────────────────────────────────────────

/**
 * Groups users by their shared interests.
 * Returns a map of interest_id → users who have that interest.
 */
export function groupByInterest(
  users: UserWithContext[]
): Map<string, UserWithContext[]> {
  const map = new Map<string, UserWithContext[]>()

  for (const user of users) {
    for (const ui of user.interests) {
      if (!map.has(ui.interest_id)) map.set(ui.interest_id, [])
      map.get(ui.interest_id)!.push(user)
    }
  }

  return map
}

// ─── Availability overlap ─────────────────────────────────────────────────────

/**
 * Finds availability slots that are shared by ALL users in a group.
 */
export function findOverlappingAvailability(
  users: UserWithContext[]
): AvailabilitySlot[] {
  if (users.length === 0) return []

  // Gather slots keyed by day
  const daySlots = new Map<number, Availability[][]>()
  for (const user of users) {
    for (const slot of user.availability) {
      if (!daySlots.has(slot.day_of_week)) daySlots.set(slot.day_of_week, [])
      daySlots.get(slot.day_of_week)!.push([slot])
    }
  }

  const shared: AvailabilitySlot[] = []

  for (const [day, slotsPerUser] of daySlots.entries()) {
    // We need at least one slot per user on this day
    // For simplicity: check if every user has availability on this day
    const usersOnDay = users.map(u =>
      u.availability.filter(a => a.day_of_week === day)
    )
    if (usersOnDay.some(slots => slots.length === 0)) continue

    // Find the intersection of time windows
    const overlapStart = usersOnDay.reduce((latest, slots) => {
      const earliest = slots.reduce((e, s) => s.start_time < e ? s.start_time : e, '23:59')
      return earliest > latest ? earliest : latest
    }, '00:00')

    const overlapEnd = usersOnDay.reduce((earliest, slots) => {
      const latest = slots.reduce((e, s) => s.end_time > e ? s.end_time : e, '00:00')
      return latest < earliest ? latest : earliest
    }, '23:59')

    if (overlapStart < overlapEnd) {
      shared.push({ day_of_week: day, start_time: overlapStart, end_time: overlapEnd })
    }
  }

  return shared
}

// ─── Event time calculation ───────────────────────────────────────────────────

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

/**
 * Converts an AvailabilitySlot into a concrete ISO date for the upcoming week.
 */
export function slotToISODate(slot: AvailabilitySlot, durationMinutes = 120): {
  starts_at: string
  ends_at: string
} {
  const now = new Date()
  const today = now.getDay()
  let daysUntil = (slot.day_of_week - today + 7) % 7
  if (daysUntil === 0) daysUntil = 7 // Always schedule at least one day ahead

  const eventDate = new Date(now)
  eventDate.setDate(now.getDate() + daysUntil)

  const [startH, startM] = slot.start_time.split(':').map(Number)
  eventDate.setHours(startH, startM, 0, 0)

  const endDate = new Date(eventDate.getTime() + durationMinutes * 60 * 1000)

  return { starts_at: eventDate.toISOString(), ends_at: endDate.toISOString() }
}

// ─── Title generation ─────────────────────────────────────────────────────────

export function generateEventTitle(interest: Interest, venue: Venue | null): string {
  const daySlot = new Date()
  const day = DAY_NAMES[daySlot.getDay()]
  const templates = [
    `${interest.name} Meetup`,
    `${interest.name} Night`,
    `${day} ${interest.name}`,
    venue ? `${interest.name} @ ${venue.name}` : `${interest.name} Hangout`,
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}

// ─── Main algorithm ───────────────────────────────────────────────────────────

/**
 * Full matching pipeline:
 * 1. Group users by shared interest
 * 2. Filter to same city
 * 3. Find overlapping availability
 * 4. Chunk into groups of `groupSize`
 * 5. Return EventProposals
 */
export function runMatchingAlgorithm(
  users: UserWithContext[],
  interests: Map<string, Interest>,
  venues: Venue[],
  groupSize = 4
): EventProposal[] {
  const proposals: EventProposal[] = []
  const assignedUsers = new Set<string>()

  const interestGroups = groupByInterest(users)

  for (const [interestId, candidates] of interestGroups.entries()) {
    const interest = interests.get(interestId)
    if (!interest) continue

    // Filter out already-assigned users
    const available = candidates.filter(u => !assignedUsers.has(u.profile.id))

    // Group by city
    const cityMap = new Map<string, UserWithContext[]>()
    for (const u of available) {
      const city = u.profile.city?.toLowerCase() ?? 'unknown'
      if (!cityMap.has(city)) cityMap.set(city, [])
      cityMap.get(city)!.push(u)
    }

    for (const cityUsers of cityMap.values()) {
      const groups = findGroups(cityUsers, groupSize)

      for (const group of groups) {
        const overlappingSlots = findOverlappingAvailability(group)
        if (overlappingSlots.length === 0) continue

        // Pick the first available slot
        const slot = overlappingSlots[0]
        const { starts_at, ends_at } = slotToISODate(slot, interest.typical_duration_minutes)

        // Find a matching venue in the city
        const city = group[0].profile.city?.toLowerCase() ?? ''
        const matchingVenues = venues.filter(
          v => v.venue_type === interest.typical_venue &&
               v.city?.toLowerCase() === city
        )
        const venue = matchingVenues[0] ?? null

        proposals.push({
          title: generateEventTitle(interest, venue),
          interest,
          venue,
          starts_at,
          ends_at,
          group,
        })

        // Mark users as assigned so they don't get double-booked
        group.forEach(u => assignedUsers.add(u.profile.id))
      }
    }
  }

  return proposals
}
