import type { Metadata } from 'next'

// Dashboard sayfaları her zaman dinamik render edilsin (Supabase auth gerektirir)
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
