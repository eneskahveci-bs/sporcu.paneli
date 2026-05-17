'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Trophy, Flame, Award } from 'lucide-react'

interface Streak {
  athlete_id: string
  first_name: string
  last_name: string
  current_streak: number
  max_streak: number
  total_present: number
  attendance_pct: number
}

export default function LeaderboardPage() {
  const supabase = createClient()
  const [streaks, setStreaks] = useState<Streak[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'current' | 'max' | 'pct'>('current')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const { data } = await supabase.from('athlete_streaks').select('*').eq('organization_id', orgId)
    setStreaks((data || []) as Streak[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const sorted = [...streaks].sort((a, b) => {
    if (sortBy === 'current') return b.current_streak - a.current_streak
    if (sortBy === 'max') return b.max_streak - a.max_streak
    return b.attendance_pct - a.attendance_pct
  }).slice(0, 50)

  return (
    <DashboardLayout title="Liderlik Tablosu">
      <div className="page-header">
        <div><h1 className="page-title">Devamlılık Sıralaması</h1><p className="page-subtitle">En çok antrenmana gelen sporcular</p></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([['current', '🔥 Aktif Streak'], ['max', '🏆 En Uzun Streak'], ['pct', '📊 Katılım %']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setSortBy(key)} className={`btn ${sortBy === key ? 'bp' : 'bs'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><Loader2 size={24} className="spin" /></div>
      ) : sorted.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon"><Trophy size={40} /></div><div className="empty-state-title">Henüz veri yok</div></div>
      ) : (
        <div className="card">
          <table className="table">
            <thead><tr><th>#</th><th>Sporcu</th><th>🔥 Aktif</th><th>🏆 Maks</th><th>Toplam</th><th>%</th></tr></thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.athlete_id} style={{ background: i === 0 ? 'rgba(245,158,11,0.07)' : undefined }}>
                  <td style={{ fontWeight: 700, color: i < 3 ? 'var(--blue2)' : undefined }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</td>
                  <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: s.current_streak > 0 ? '#f59e0b' : 'var(--text3)' }}><Flame size={14} /> {s.current_streak}</span></td>
                  <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Award size={14} /> {s.max_streak}</span></td>
                  <td>{s.total_present}</td>
                  <td style={{ fontWeight: 700, color: s.attendance_pct >= 80 ? 'var(--green, #22c55e)' : s.attendance_pct >= 50 ? '#f59e0b' : 'var(--red, #ef4444)' }}>%{s.attendance_pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </DashboardLayout>
  )
}
