'use client'

interface AvatarProps {
  name?: string
  src?: string | null
  size?: number
  shape?: 'circle' | 'rounded'
  bg?: string
  className?: string
}

function initials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// İsimden tutarlı renk üret (hash bazlı)
function colorFromName(name?: string): string {
  if (!name) return 'var(--grad)'
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${(hue + 30) % 360}, 65%, 55%))`
}

export function Avatar({ name, src, size = 36, shape = 'circle', bg, className }: AvatarProps) {
  const radius = shape === 'circle' ? '50%' : Math.max(6, size / 6)
  const fontSize = Math.max(11, size * 0.38)

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name || ''}
        className={className}
        loading="lazy"
        style={{
          width: size, height: size, borderRadius: radius,
          objectFit: 'cover', flexShrink: 0,
          background: 'var(--bg3)',
        }}
      />
    )
  }

  return (
    <div
      className={className}
      role="img"
      aria-label={name || 'Kullanıcı'}
      style={{
        width: size, height: size, borderRadius: radius,
        background: bg || colorFromName(name),
        color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize, fontWeight: 700, flexShrink: 0,
        letterSpacing: '0.02em',
        textShadow: '0 1px 2px rgba(0,0,0,0.15)',
      }}
    >
      {initials(name)}
    </div>
  )
}
