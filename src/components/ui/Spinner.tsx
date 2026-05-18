'use client'

interface SpinnerProps {
  size?: number
  color?: string
  centered?: boolean
  label?: string
}

export function Spinner({ size = 20, color = 'var(--blue2)', centered, label }: SpinnerProps) {
  const node = (
    <>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        role="status"
        aria-live="polite"
        aria-label={label || 'Yükleniyor'}
        style={{ animation: 'spinnerRotate 0.9s linear infinite', flexShrink: 0 }}
      >
        <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity="0.18" strokeWidth="3" />
        <path d="M12 2 a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
      <style>{`@keyframes spinnerRotate { to { transform: rotate(360deg) } }`}</style>
    </>
  )

  if (centered) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 48, flexDirection: 'column', gap: 8 }}>
        {node}
        {label && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</div>}
      </div>
    )
  }
  return node
}

export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 12, zIndex: 9999,
    }}>
      <Spinner size={32} />
      {label && <div style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</div>}
    </div>
  )
}
