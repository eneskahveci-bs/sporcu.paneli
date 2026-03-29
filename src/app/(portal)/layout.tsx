import type { Metadata } from "next"

// Portal sayfaları her zaman dinamik render edilsin
export const metadata: Metadata = { robots: { index: false, follow: false } }

export const dynamic = 'force-dynamic'

export default function PortalGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
