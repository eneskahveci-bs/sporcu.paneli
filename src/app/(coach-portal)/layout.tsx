import type { Metadata } from "next"

// Coach portal sayfaları her zaman dinamik render edilsin
export const metadata: Metadata = { robots: { index: false, follow: false } }

export const dynamic = 'force-dynamic'

export default function CoachPortalGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
