import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar variant="light" />

      <main className="min-h-screen pt-16">
        {/* Hero */}
        <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src="/videos/hero_nichly.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
          />

          {/* Overlay: slightly lighter at the top so black navbar text is readable */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-black/55 to-black/65" aria-hidden="true" />

          <div className="relative z-10 text-center max-w-4xl mx-auto px-6 pb-14">
            <div className="inline-flex items-center gap-2 border border-white/15 bg-white/5 px-4 py-2 rounded-full mb-8">
              <span className="text-lg">✦</span>
              <span className="text-white/70 text-sm font-medium tracking-widest uppercase">Introducing Nichly</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-extrabold mb-6 leading-none text-white">
              Meet people
              <br />
              who get you.
            </h1>

            <p className="text-xl text-white/70 mb-10 max-w-xl mx-auto leading-relaxed">
              Nichly matches you with like-minded locals and automatically schedules real-life meetups around your interests.
              No scrolling. No awkward cold messages.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="px-8 py-4 rounded-xl text-lg font-semibold text-white transition-all bg-black/30 hover:bg-black/40 border border-white/10"
              >
                Get matched free →
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 rounded-xl text-lg font-medium text-white border border-white/15 bg-white/5 hover:bg-white/10 transition-all"
              >
                Sign in
              </Link>
            </div>

            <div className="flex flex-wrap gap-3 justify-center mt-14">
              {['Board Games', 'Climbing', 'Book Club', 'Coding', 'Coffee', 'Hiking'].map(tag => (
                <span
                  key={tag}
                  className="px-4 py-2 rounded-full text-sm text-white/75 border border-white/15 bg-white/5"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
