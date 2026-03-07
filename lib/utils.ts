import { type ClassValue, clsx } from 'clsx'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ')
}

/** Format ISO date string → "Fri, Dec 13 · 7:00 PM" */
export function formatEventTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** Returns relative time: "in 2 days", "Yesterday", etc. */
export function relativeTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  const abs  = Math.abs(diff)
  const past = diff < 0

  if (abs < 60_000) return 'just now'
  if (abs < 3_600_000) {
    const m = Math.round(abs / 60_000)
    return past ? `${m}m ago` : `in ${m}m`
  }
  if (abs < 86_400_000) {
    const h = Math.round(abs / 3_600_000)
    return past ? `${h}h ago` : `in ${h}h`
  }
  const d = Math.round(abs / 86_400_000)
  return past ? `${d}d ago` : `in ${d}d`
}

/** Generate a deterministic avatar URL from user ID */
export function avatarUrl(id: string, name?: string | null): string {
  const seed = name ? encodeURIComponent(name) : id
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${seed}&backgroundColor=6366f1,a855f7,c44af4&backgroundType=gradientLinear`
}

/** Capitalize first letter */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Canadian cities (alphabetical) */
export const CANADIAN_CITIES = [
  'Calgary', 'Edmonton', 'Halifax', 'Hamilton', 'Kitchener', 'London', 'Mississauga',
  'Montreal', 'Ottawa', 'Quebec City', 'Saskatoon', 'Toronto', 'Vancouver', 'Victoria', 'Winnipeg',
].sort()

/** Day name from index */
export const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
export const DAY_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

/** Format "HH:MM" → "7:00 PM" */
export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2,'0')} ${ampm}`
}
