import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nichly — Find Your People',
  description: 'Nichly automatically matches you with people who share your interests and schedules real-life meetups.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  )
}
