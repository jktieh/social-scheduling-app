# Nichly 🎲

**Nichly** is a social scheduling platform that automatically matches users by interest, location, and availability — then creates real-life meetup events.

---

## Tech Stack

| Layer      | Technology                         |
|------------|------------------------------------|
| Frontend   | Next.js 14 (App Router) + TypeScript |
| Styling    | Tailwind CSS                       |
| Backend    | Supabase (Postgres + Auth + Realtime) |
| Deployment | Vercel                             |

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/yourname/nichly.git
cd nichly
npm install
```

### 2. Create a Supabase Project

Go to [supabase.com](https://supabase.com) → New project.

### 3. Run the Database Schema

Open **Supabase → SQL Editor** and paste the contents of:
```
supabase/schema.sql
```

This creates all tables, triggers, RLS policies, and seeds interest + venue data.

### 4. Configure Environment

Copy the env template:
```bash
cp .env.local.example .env.local
```

Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> Find these in: Supabase → Settings → API

### 5. Enable Realtime

In Supabase → Database → Replication, enable realtime for:
- `event_messages`
- `notifications`
- `event_participants`

### 6. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
nichly/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/                # Auth pages
│   ├── signup/
│   ├── onboarding/           # Interest + availability setup
│   ├── dashboard/            # Main dashboard
│   ├── events/               # Event list + detail
│   ├── profile/              # Profile view + edit
│   └── api/
│       ├── match/            # POST: run matching algorithm
│       ├── events/           # GET: user's events
│       └── profile/          # GET/PATCH: profile
├── components/
│   ├── Navbar.tsx
│   ├── EventCard.tsx
│   ├── ChatBox.tsx           # Realtime Supabase chat
│   └── RSVPButton.tsx
├── lib/
│   ├── matching.ts           # Core matching algorithm
│   ├── utils.ts              # Formatting helpers
│   └── supabase/
│       ├── client.ts         # Browser client
│       └── server.ts         # Server + service-role client
├── types/
│   └── index.ts              # All TypeScript types
└── supabase/
    └── schema.sql            # Full DB schema (run this first!)
```

---

## Matching Algorithm

The algorithm lives in `lib/matching.ts` and runs via `POST /api/match`.

**Steps:**
1. Group users by shared interest
2. Filter by same city
3. Find overlapping weekly availability
4. Chunk into groups of 4
5. Pick a matching venue
6. Create event + invite participants + send notifications

**Trigger matching:**
- Manually: `POST /api/match` (with `Authorization: Bearer $CRON_SECRET`)
- Automated: Add a Vercel Cron Job in `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/match",
    "schedule": "0 9 * * 1"
  }]
}
```

---

## Deployment (Vercel)

```bash
vercel --prod
```

Add all environment variables in Vercel → Settings → Environment Variables.

---

## License

MIT
