import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { Users, CreditCard, TrendingUp, AlertTriangle, UserCheck, Activity } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const orgId = user.user_metadata?.organization_id

  // Paralel sorgular
  const [
    { count: totalAthletes },
    { count: activeAthletes },
    { data: payments },
    { data: recentAthletes },
    { data: overduePayments },
  ] = await Promise.all([
    supabase.from('athletes').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('athletes').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active'),
    supabase.from('payments').select('amount, status, paid_date').eq('organization_id', orgId).eq('type', 'income'),
    supabase.from('athletes').select('id, first_name, last_name, status, sport_id, created_at, sports(name)').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5),
    supabase.from('payments').select('id, athlete_name, amount, due_date').eq('organization_id', orgId).eq('status', 'overdue').limit(5),
  ])

  const monthlyIncome = payments?.filter(p => p.status === 'completed' && p.paid_date?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((sum, p) => sum + (p.amount || 0), 0) || 0
  const pendingCount = payments?.filter(p => p.status === 'pending').length || 0
  const overdueCount = payments?.filter(p => p.status === 'overdue').length || 0

  return (
    <DashboardLayout title="Panel">
      <div className="page-header">
        <div>
          <h1 className="page-title">Genel Bakış</h1>
          <p className="page-subtitle">Akademinizin güncel durumu</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <StatsCard
          label="Toplam Sporcu"
          value={totalAthletes || 0}
          icon={<Users size={22} color="var(--blue2)" />}
          iconBg="rgba(45,92,179,0.15)"
          change={`${activeAthletes || 0} aktif`}
          changeType="neutral"
        />
        <StatsCard
          label="Aylık Gelir"
          value={formatCurrency(monthlyIncome)}
          icon={<TrendingUp size={22} color="var(--green)" />}
          iconBg="rgba(34,197,94,0.15)"
          change="Bu ay"
          changeType="neutral"
        />
        <StatsCard
          label="Bekleyen Ödeme"
          value={pendingCount}
          icon={<CreditCard size={22} color="var(--yellow)" />}
          iconBg="rgba(216,163,18,0.15)"
          change="Tahsil edilmedi"
          changeType="down"
        />
        <StatsCard
          label="Gecikmiş Ödeme"
          value={overdueCount}
          icon={<AlertTriangle size={22} color="var(--red)" />}
          iconBg="rgba(239,68,68,0.15)"
          change="Acil takip"
          changeType="down"
        />
      </div>

      <div className="grid-2">
        {/* Son Kayıtlar */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 className="m-tit">Son Kayıtlar</h2>
            <a href="/athletes" style={{ fontSize: '13px', color: 'var(--blue2)', textDecoration: 'none' }}>Tümünü Gör →</a>
          </div>
          {recentAthletes?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentAthletes.map((a: { id: string; first_name: string; last_name: string; status: string; created_at: string; sports?: { name: string } | { name: string }[] | null }) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="avatar avatar-sm" style={{ background: 'var(--grad)' }}>
                    {a.first_name[0]}{a.last_name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>{a.first_name} {a.last_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{Array.isArray(a.sports) ? a.sports[0]?.name : (a.sports as { name: string } | null)?.name || 'Spor dalı belirsiz'}</div>
                  </div>
                  <span className={`badge ${a.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                    {a.status === 'active' ? 'Aktif' : 'Pasif'}
                  </span>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', whiteSpace: 'nowrap' }}>{formatDate(a.created_at)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '24px' }}>
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">Henüz sporcu yok</div>
            </div>
          )}
        </div>

        {/* Gecikmiş Ödemeler */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 className="m-tit">Gecikmiş Ödemeler</h2>
            <a href="/payments" style={{ fontSize: '13px', color: 'var(--blue2)', textDecoration: 'none' }}>Tümünü Gör →</a>
          </div>
          {overduePayments?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {overduePayments.map((p: { id: string; athlete_name?: string; amount: number; due_date?: string }) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>{p.athlete_name || 'İsim yok'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Son tarih: {formatDate(p.due_date)}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: '14px' }}>{formatCurrency(p.amount)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '24px' }}>
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-title">Gecikmiş ödeme yok</div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
