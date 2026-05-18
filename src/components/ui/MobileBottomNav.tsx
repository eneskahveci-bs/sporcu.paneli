'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
}

export function MobileBottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Alt navigasyon"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--bg2)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 30,
        display: 'none',
      }}
      className="mobile-bottom-nav"
    >
      <div style={{ display: 'flex', justifyContent: 'space-around', maxWidth: 720, margin: '0 auto' }}>
        {items.map(item => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '8px 4px',
                color: active ? 'var(--blue2)' : 'var(--text3)',
                textDecoration: 'none',
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                position: 'relative',
                transition: 'color 0.15s',
              }}
            >
              <div style={{ position: 'relative' }}>
                {item.icon}
                {!!item.badge && item.badge > 0 && (
                  <span
                    style={{
                      position: 'absolute', top: -4, right: -8,
                      background: 'var(--red)', color: '#fff',
                      borderRadius: 10, fontSize: 9, fontWeight: 700,
                      padding: '0 4px', minWidth: 14, height: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
              {active && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 24, height: 2, background: 'var(--blue2)', borderRadius: 2,
                }} />
              )}
            </Link>
          )
        })}
      </div>
      <style>{`
        @media (max-width: 768px) {
          .mobile-bottom-nav { display: block !important; }
          body { padding-bottom: calc(60px + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>
    </nav>
  )
}
