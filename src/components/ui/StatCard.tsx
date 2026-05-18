'use client'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: { value: number; positive?: boolean }
  hint?: string
  color?: string
  onClick?: () => void
  href?: string
  loading?: boolean
}

export function StatCard({ label, value, icon, trend, hint, color = 'var(--blue2)', onClick, href, loading }: StatCardProps) {
  const Wrap = href ? 'a' : (onClick ? 'button' : 'div')
  const interactive = !!(href || onClick)

  if (loading) {
    return (
      <div className="card stat-card" style={{ padding: 18, minHeight: 110 }}>
        <div style={{ height: 12, width: '40%', background: 'var(--bg3)', borderRadius: 4, marginBottom: 12 }} className="skeleton" />
        <div style={{ height: 26, width: '70%', background: 'var(--bg3)', borderRadius: 4 }} className="skeleton" />
      </div>
    )
  }

  return (
    <Wrap
      onClick={onClick as () => void}
      href={href}
      className="card stat-card"
      style={{
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        cursor: interactive ? 'pointer' : 'default',
        transition: 'all 0.18s ease',
        textDecoration: 'none',
        textAlign: 'left',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        {icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `color-mix(in srgb, ${color} 14%, transparent)`,
            color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        {trend && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            color: trend.positive ? 'var(--green)' : 'var(--red)',
            fontWeight: 600,
          }}>
            {trend.value === 0 ? <Minus size={12} /> : trend.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </span>
        )}
        {hint && <span style={{ color: 'var(--text3)' }}>{hint}</span>}
      </div>
    </Wrap>
  )
}
