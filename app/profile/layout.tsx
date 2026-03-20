import Navbar from '@/components/Navbar'

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar variant="light" />
      <main className="pt-16">{children}</main>
    </div>
  )
}
