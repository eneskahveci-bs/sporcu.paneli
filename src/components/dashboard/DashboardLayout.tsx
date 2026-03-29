import { ThemeProvider } from '@/providers/ThemeProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { SessionTimeout } from '@/components/ui/SessionTimeout'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { FaviconUpdater } from '@/components/ui/FaviconUpdater'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="dashboard-layout">
          <Sidebar />
          <div className="main-content">
            <Header title={title} />
            <main className="page-content animate-fade-in">
              {children}
            </main>
          </div>
          <SessionTimeout />
          <OfflineBanner />
          <FaviconUpdater />
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}
