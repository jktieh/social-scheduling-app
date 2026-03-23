// ─── Database Row Types ───────────────────────────────────────────────────────

export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  onboarding_complete: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InterestCategory {
  id: string
  name: string
  icon: string | null
  color: string | null
  sort_order: number
}

export interface Interest {
  id: string
  category_id: string | null
  name: string
  slug: string
  icon: string | null
  typical_venue: string | null
  typical_duration_minutes: number
  is_active: boolean
  category?: InterestCategory
}

export interface UserInterest {
  id: string
  user_id: string
  interest_id: string
  level: number
  interest?: Interest
}

export interface Availability {
  id: string
  user_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

export interface Venue {
  id: string
  name: string
  venue_type: string
  address: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  photo_url: string | null
  price_range: number | null
  rating: number | null
}

// ─── Event ────────────────────────────────────────────────────────────────────

export type EventStatus = 'open' | 'confirmed' | 'completed' | 'cancelled'

export interface Event {
  id: string
  interest_id: string | null
  venue_id: string | null
  created_by: string | null

  title: string
  description: string | null
  cover_image_url: string | null

  proposed_start: string
  proposed_end: string | null
  confirmed_start: string | null
  confirmed_end: string | null
  confirmed_venue_id: string | null

  threshold_count: number
  interested_count: number
  max_attendees: number

  status: EventStatus
  is_auto_generated: boolean
  city: string | null

  created_at: string
  updated_at: string

  // Joined
  interest?: Interest
  venue?: Venue
  confirmed_venue?: Venue
}

// ─── Event Interest (participant) ─────────────────────────────────────────────

export type ParticipantStatus = 'interested' | 'confirmed' | 'declined' | 'attended' | 'no_show'

export interface EventInterest {
  id: string
  event_id: string
  user_id: string
  status: ParticipantStatus
  is_host: boolean
  joined_at: string
  responded_at: string | null
  profile?: Profile
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export interface EventMessage {
  id: string
  event_id: string
  user_id: string | null
  content: string
  is_system: boolean
  created_at: string
  profile?: Profile
}

// ─── Setting Proposals & Votes ────────────────────────────────────────────────

export type ProposalType = 'time' | 'venue'
export type ProposalStatus = 'open' | 'accepted' | 'rejected'

export interface EventSettingProposal {
  id: string
  event_id: string
  proposed_by: string
  type: ProposalType
  new_start: string | null
  new_end: string | null
  new_venue_id: string | null
  new_venue_name: string | null
  votes_for: number
  votes_against: number
  status: ProposalStatus
  created_at: string
  resolved_at: string | null
  profile?: Profile
  new_venue?: Venue
}

export interface EventSettingVote {
  id: string
  proposal_id: string
  user_id: string
  vote: boolean
  created_at: string
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const DAY_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const

export const STATUS_LABELS: Record<EventStatus, string> = {
  open: 'Gathering Interest',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
