import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#0a0a0f]">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'rgba(196,74,244,0.15)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl"
          style={{ background: 'rgba(45,212,191,0.08)' }} />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-4 py-2 rounded-full mb-8">
          <span className="text-lg">✦</span>
          <span className="text-white/60 text-sm font-medium tracking-widest uppercase">Introducing Nichly</span>
        </div>

        {/* Headline */}
        <h1 className="text-6xl md:text-8xl font-extrabold mb-6 leading-none text-white">
          <span style={{
            background: 'linear-gradient(135deg, #c44af4 0%, #818cf8 50%, #2dd4bf 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Meet people
          </span>
          <br />
          who get you.
        </h1>

        <p className="text-xl text-white/50 mb-10 max-w-xl mx-auto leading-relaxed">
          Nichly matches you with like-minded locals and automatically schedules
          real-life meetups around your interests — no scrolling, no awkward cold messages.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-4 rounded-xl text-lg font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #a827d9, #c44af4)' }}
          >
            Get matched free →
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 rounded-xl text-lg font-medium text-white border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
          >
            Sign in
          </Link>
        </div>

        {/* Interest pills */}
        <div className="flex flex-wrap gap-3 justify-center mt-16">
          {['🎲 Board Games', '🧗 Climbing', '📚 Book Club', '💻 Coding', '☕ Coffee', '🥾 Hiking'].map(tag => (
            <span
              key={tag}
              className="px-4 py-2 rounded-full text-sm text-white/60 border border-white/10 bg-white/5"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </main>
  )
}
