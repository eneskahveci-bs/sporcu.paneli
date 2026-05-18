'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { SessionTimeout } from '@/components/ui/SessionTimeout'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { FaviconUpdater } from '@/components/ui/FaviconUpdater'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { ConfirmProvider, ConfirmGlobalBridge } from '@/components/ui/ConfirmDialog'
import { SkipLink } from '@/components/ui/SkipLink'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sidebarOpen && window.innerWidth <= 768) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = original }
    }
  }, [sidebarOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <ThemeProvider>
      <AuthProvider>
        <ConfirmProvider>
          <ConfirmGlobalBridge />
          <SkipLink />
          <div className="dashboard-layout">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            {sidebarOpen && (
              <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
            )}
            <div className="main-content">
              <Header title={title} onMenuClick={() => setSidebarOpen(o => !o)} sidebarOpen={sidebarOpen} />
              <main id="main-content" className="page-content animate-fade-in">
                {children}
              </main>
            </div>
            <SessionTimeout />
            <OfflineBanner />
            <FaviconUpdater />
            <CommandPalette />
          </div>
        </ConfirmProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
