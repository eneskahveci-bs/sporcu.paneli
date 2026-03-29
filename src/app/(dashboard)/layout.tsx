// Dashboard sayfaları her zaman dinamik render edilsin (Supabase auth gerektirir)
export const dynamic = 'force-dynamic'

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
