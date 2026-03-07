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
  day_of_week: number   // 0 = Sunday … 6 = Saturday
  start_time: string    // "HH:MM"
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

export interface Event {
  id: string
  title: string
  description: string | null
  interest_id: string | null
  venue_id: string | null
  starts_at: string
  ends_at: string | null
  min_attendees: number
  max_attendees: number
  current_attendees: number
  status: EventStatus
  is_auto_generated: boolean
  cover_image_url: string | null
  created_at: string
  // Joined
  interest?: Interest
  venue?: Venue
  participants?: EventParticipant[]
}

export type EventStatus = 'pending' | 'confirmed' | 'full' | 'cancelled' | 'completed'

export type ParticipantStatus = 'invited' | 'confirmed' | 'declined' | 'attended' | 'no_show'

export interface EventParticipant {
  id: string
  event_id: string
  user_id: string
  status: ParticipantStatus
  is_host: boolean
  responded_at: string | null
  created_at: string
  profile?: Profile
}

export interface EventMessage {
  id: string
  event_id: string
  user_id: string | null
  content: string
  is_system: boolean
  created_at: string
  profile?: Profile
}

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

// ─── API / UI helpers ────────────────────────────────────────────────────────

export interface DashboardEvent extends Event {
  user_status: ParticipantStatus | null
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const DAY_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const
