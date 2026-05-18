'use client'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
}

export function EmptyState({ icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div
      className="empty-state"
      style={{
        padding: compact ? '24px 16px' : '60px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div
        style={{
          width: compact ? 56 : 72,
          height: compact ? 56 : 72,
          borderRadius: '50%',
          background: 'var(--bg3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text3)',
          marginBottom: 4,
        }}
        aria-hidden="true"
      >
        {icon || <Inbox size={compact ? 26 : 32} />}
      </div>
      <div style={{ fontSize: compact ? 14 : 16, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      {description && (
        <div style={{ fontSize: 13, color: 'var(--text3)', maxWidth: 320, lineHeight: 1.55 }}>{description}</div>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}
