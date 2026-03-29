// Portal sayfaları her zaman dinamik render edilsin
export const dynamic = 'force-dynamic'

export default function PortalGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
