'use client'

interface SkeletonProps {
  width?: number | string
  height?: number | string
  rounded?: number | string
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 16, rounded = 6, className, style }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className || ''}`}
      style={{ width, height, borderRadius: rounded, ...style }}
      aria-hidden="true"
    />
  )
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height={12} width="60%" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ padding: 14, borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, alignItems: 'center' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={14} width={c === 0 ? '90%' : '70%'} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 6, height = 180 }: { count?: number; height?: number }) {
  return (
    <div className="grid-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 16 }}>
          <Skeleton height={height} rounded={8} style={{ marginBottom: 12 }} />
          <Skeleton height={14} width="80%" style={{ marginBottom: 6 }} />
          <Skeleton height={12} width="60%" />
        </div>
      ))}
    </div>
  )
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 18 }}>
          <Skeleton height={12} width="40%" style={{ marginBottom: 12 }} />
          <Skeleton height={26} width="70%" style={{ marginBottom: 6 }} />
          <Skeleton height={10} width="50%" />
        </div>
      ))}
    </div>
  )
}
