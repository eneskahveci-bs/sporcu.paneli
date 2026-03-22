interface StatsCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  iconBg?: string
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
}

export function StatsCard({ label, value, icon, iconBg = 'rgba(11,34,92,0.3)', change, changeType }: StatsCardProps) {
  const changeColor = changeType === 'up' ? 'var(--green)' : changeType === 'down' ? 'var(--red)' : 'var(--text3)'

  return (
    <div className="stats-card">
      <div className="stats-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <div>
        <div className="stats-label">{label}</div>
        <div className="stats-value">{value}</div>
        {change && (
          <div className="stats-change" style={{ color: changeColor }}>
            {change}
          </div>
        )}
      </div>
    </div>
  )
}
