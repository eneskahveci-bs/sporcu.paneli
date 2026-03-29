'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Calendar, ChevronDown, UserPlus, Users, UserCheck,
  Dumbbell, BookOpen, ClipboardCheck, CreditCard, BarChart3,
  Package, Bell, Settings, LogOut, Sun, Moon, Building2, MessageSquare,
} from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import { getInitials } from '@/lib/utils/formatters'

const AKADEMI_ITEMS = [
  { href: '/pre-registrations', label: 'Ön Kayıt', icon: UserPlus },
  { href: '/athletes', label: 'Sporcular', icon: Users },
  { href: '/coaches', label: 'Antrenörler', icon: UserCheck },
  { href: '/sports', label: 'Branşlar', icon: Dumbbell },
  { href: '/classes', label: 'Sınıflar', icon: BookOpen },
  { href: '/attendance', label: 'Devam', icon: ClipboardCheck },
  { href: '/branches', label: 'Şubeler', icon: Building2 },
]

const MUHASEBE_ITEMS = [
  { href: '/payments', label: 'Ödemeler', icon: CreditCard },
  { href: '/reports', label: 'Finans / Rapor', icon: BarChart3 },
  { href: '/inventory', label: 'Envanter', icon: Package },
  { href: '/messages', label: 'Mesajlar', icon: MessageSquare },
  { href: '/sms', label: 'Bildirimler', icon: Bell },
  { href: '/settings', label: 'Ayarlar', icon: Settings },
]

export function Sidebar({ isOpen }: { isOpen?: boolean }) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const isAkademiActive = AKADEMI_ITEMS.some(i => pathname.startsWith(i.href))
  const isMuhasebeActive = MUHASEBE_ITEMS.some(i => pathname.startsWith(i.href))

  const [akademiOpen, setAkademiOpen] = useState(true)
  const [muhasebeOpen, setMuhasebeOpen] = useState(true)

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Kullanıcı'
  const role = user?.user_metadata?.role || 'admin'
  const roleLabel: Record<string, string> = { admin: 'Yönetici', coach: 'Antrenör', athlete: 'Sporcu', parent: 'Veli' }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🏅</div>
        <div>
          <div className="sidebar-logo-text">Sporcu Paneli</div>
          <div className="sidebar-logo-sub">Yönetim Paneli</div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Ana navigasyon">
        {/* Ana Sayfa */}
        <div className="sb-standalone">
          <Link href="/dashboard" className={`sb-item${isActive('/dashboard') ? ' sb-item-active' : ''}`}>
            <Home size={17} />
            <span>Ana Sayfa</span>
          </Link>
          <Link href="/calendar" className={`sb-item${isActive('/calendar') ? ' sb-item-active' : ''}`}>
            <Calendar size={17} />
            <span>Takvim</span>
          </Link>
        </div>

        {/* Akademi Grubu */}
        <div className="sb-group">
          <button
            className={`sb-group-header${isAkademiActive ? ' sb-group-header-active' : ''}`}
            onClick={() => setAkademiOpen(o => !o)}
          >
            <span>Akademi</span>
            <ChevronDown size={16} className={`sb-chevron${akademiOpen ? ' open' : ''}`} />
          </button>
          {akademiOpen && (
            <div className="sb-group-items">
              {AKADEMI_ITEMS.map(item => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={item.href} className={`sb-item${active ? ' sb-item-active' : ''}`}>
                    <span className="sb-icon-circle"><Icon size={15} /></span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Muhasebe Grubu */}
        <div className="sb-group">
          <button
            className={`sb-group-header${isMuhasebeActive ? ' sb-group-header-active' : ''}`}
            onClick={() => setMuhasebeOpen(o => !o)}
          >
            <span>Muhasebe</span>
            <ChevronDown size={16} className={`sb-chevron${muhasebeOpen ? ' open' : ''}`} />
          </button>
          {muhasebeOpen && (
            <div className="sb-group-items">
              {MUHASEBE_ITEMS.map(item => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={item.href} className={`sb-item${active ? ' sb-item-active' : ''}`}>
                    <span className="sb-icon-circle"><Icon size={15} /></span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <Link href="/profile" className="sb-user" style={{ textDecoration: 'none' }} title="Profilim">
          <div className="sb-avatar">{getInitials(fullName)}</div>
          <div className="sb-user-info">
            <div className="sb-user-name">{fullName}</div>
            <div className="sb-user-role">{roleLabel[role] || role}</div>
          </div>
        </Link>
        <div className="sb-footer-actions">
          <button onClick={toggleTheme} className="sb-icon-btn" title={theme === 'dark' ? 'Açık tema' : 'Koyu tema'}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={signOut} className="sb-icon-btn" title="Çıkış yap">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <style>{`
        /* Standalone items */
        .sb-standalone { padding: 8px 12px 4px; }

        /* Group */
        .sb-group { padding: 4px 12px; }
        .sb-group-header {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 9px 14px; border-radius: var(--radius-sm);
          background: var(--grad); color: #fff;
          font-size: 13px; font-weight: 700; border: none; cursor: pointer;
          margin-bottom: 2px; transition: opacity 0.15s;
        }
        .sb-group-header:hover { opacity: 0.9; }
        .sb-group-items { padding: 2px 0 4px; }

        /* Chevron */
        .sb-chevron { transition: transform 0.2s; flex-shrink: 0; }
        .sb-chevron.open { transform: rotate(180deg); }

        /* Nav item */
        .sb-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: var(--radius-sm);
          color: var(--text2); font-size: 13.5px; font-weight: 500;
          text-decoration: none; transition: all 0.15s; cursor: pointer;
        }
        .sb-item:hover { background: var(--bg3); color: var(--text); }
        .sb-item-active {
          background: var(--grad) !important; color: #fff !important;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(45,92,179,0.3);
        }
        .sb-item-active .sb-icon-circle { border-color: rgba(255,255,255,0.4); color: #fff; }

        /* Icon circle */
        .sb-icon-circle {
          width: 26px; height: 26px; border-radius: 50%;
          border: 1.5px solid var(--border2);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; color: var(--text3);
          transition: all 0.15s;
        }
        .sb-item:hover .sb-icon-circle { border-color: var(--blue2); color: var(--blue2); }

        /* User footer */
        .sidebar-footer { padding: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
        .sb-user {
          display: flex; align-items: center; gap: 10px; padding: 6px 8px;
          border-radius: var(--radius-sm); transition: background 0.15s;
        }
        .sb-user:hover { background: var(--bg3); }
        .sb-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--grad); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; flex-shrink: 0;
        }
        .sb-user-info { flex: 1; min-width: 0; }
        .sb-user-name { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sb-user-role { font-size: 11px; color: var(--text3); }
        .sb-footer-actions { display: flex; gap: 6px; }
        .sb-icon-btn {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 7px; border-radius: var(--radius-sm);
          background: var(--bg3); border: 1px solid var(--border);
          color: var(--text2); cursor: pointer; transition: all 0.15s;
        }
        .sb-icon-btn:hover { background: var(--bg4); color: var(--text); }
      `}</style>
    </aside>
  )
}
