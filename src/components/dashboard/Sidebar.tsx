'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CreditCard, ClipboardCheck,
  UserCheck, BookOpen, Dumbbell, BarChart3, Settings,
  MessageSquare, UserPlus, Smartphone, LogOut, Sun, Moon
} from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import { getInitials } from '@/lib/utils/formatters'

const NAV_SECTIONS = [
  {
    title: 'Genel',
    items: [
      { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
      { href: '/athletes', label: 'Sporcular', icon: Users },
      { href: '/payments', label: 'Ödemeler', icon: CreditCard },
    ],
  },
  {
    title: 'Yönetim',
    items: [
      { href: '/attendance', label: 'Yoklama', icon: ClipboardCheck },
      { href: '/coaches', label: 'Antrenörler', icon: UserCheck },
      { href: '/classes', label: 'Sınıflar', icon: BookOpen },
      { href: '/sports', label: 'Spor Dalları', icon: Dumbbell },
      { href: '/pre-registrations', label: 'Ön Kayıtlar', icon: UserPlus },
    ],
  },
  {
    title: 'Diğer',
    items: [
      { href: '/reports', label: 'Raporlar', icon: BarChart3 },
      { href: '/messages', label: 'Mesajlar', icon: MessageSquare },
      { href: '/sms', label: 'SMS', icon: Smartphone },
      { href: '/settings', label: 'Ayarlar', icon: Settings },
    ],
  },
]

export function Sidebar({ isOpen }: { isOpen?: boolean }) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Kullanıcı'
  const lastName = user?.user_metadata?.last_name || ''
  const role = user?.user_metadata?.role || 'admin'

  const roleLabel: Record<string, string> = {
    admin: 'Yönetici',
    coach: 'Antrenör',
    athlete: 'Sporcu',
    parent: 'Veli',
  }

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🏅</div>
        <div>
          <div className="sidebar-logo-text">Sporcu Paneli</div>
          <div className="sidebar-logo-sub">Yönetim Sistemi</div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Ana navigasyon">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="sidebar-section">
            <div className="sidebar-section-title">{section.title}</div>
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link${isActive ? ' active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="sidebar-icon" size={18} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {getInitials(firstName, lastName || firstName.slice(1))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {firstName} {lastName}
            </div>
            <div className="sidebar-user-role">{roleLabel[role] || role}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={toggleTheme}
            className="btn bs btn-sm"
            style={{ flex: 1 }}
            aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Açık' : 'Koyu'}
          </button>
          <button
            onClick={signOut}
            className="btn bd btn-sm"
            aria-label="Çıkış yap"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
