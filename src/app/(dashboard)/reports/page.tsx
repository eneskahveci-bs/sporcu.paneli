'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Download, TrendingUp, TrendingDown, Users, Calendar, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'
import { MONTHS_TR } from '@/lib/constants'

export default function ReportsPage() {
  const supabase = createClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<{ name: string; gelir: number; gider: number }[]>([])
  const [paymentStatusData, setPaymentStatusData] = useState<{ name: string; value: number; color: string }[]>([])
  const [attendanceData, setAttendanceData] = useState<{ name: string; oran: number }[]>([])
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, collected: 0, overdue: 0, totalAthletes: 0, activeAthletes: 0, avgAttendance: 0 })

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    setLoading(true)

    const [{ data: payments }, { data: athletes }, { data: attendance }] = await Promise.all([
      supabase.from('payments').select('*').eq('organization_id', orgId).gte('created_at', `${year}-01-01`).lte('created_at', `${year}-12-31`),
      supabase.from('athletes').select('id, status').eq('organization_id', orgId),
      supabase.from('attendance').select('date, status').eq('organization_id', orgId).gte('date', `${year}-01-01`),
    ])

    // Monthly income/expense
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0')
      const monthPayments = payments?.filter(p => p.created_at?.slice(5, 7) === m) || []
      return {
        name: MONTHS_TR[i].slice(0, 3),
        gelir: monthPayments.filter(p => p.type === 'income' && p.status === 'completed').reduce((s, p) => s + p.amount, 0),
        gider: monthPayments.filter(p => p.type === 'expense' && p.status === 'completed').reduce((s, p) => s + p.amount, 0),
      }
    })
    setMonthlyData(monthly)

    // Payment status distribution
    const statuses = ['completed', 'pending', 'overdue', 'cancelled']
    const statusLabels = { completed: 'Tamamlandı', pending: 'Bekliyor', overdue: 'Gecikmiş', cancelled: 'İptal' }
    const statusColors = { completed: '#22c55e', pending: '#d8a312', overdue: '#ef4444', cancelled: '#6e819f' }
    const incomePayments = payments?.filter(p => p.type === 'income') || []
    setPaymentStatusData(statuses.map(s => ({
      name: statusLabels[s as keyof typeof statusLabels],
      value: incomePayments.filter(p => p.status === s).length,
      color: statusColors[s as keyof typeof statusColors],
    })).filter(d => d.value > 0))

    // Monthly attendance rate
    const attMonthly = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0')
      const monthAtt = attendance?.filter(a => a.date?.slice(5, 7) === m) || []
      const rate = monthAtt.length ? Math.round((monthAtt.filter(a => a.status === 'present').length / monthAtt.length) * 100) : 0
      return { name: MONTHS_TR[i].slice(0, 3), oran: rate }
    })
    setAttendanceData(attMonthly)

    // Summary
    const incomes = payments?.filter(p => p.type === 'income') || []
    const expenses = payments?.filter(p => p.type === 'expense') || []
    const allAtt = attendance || []
    const avgAtt = allAtt.length ? Math.round((allAtt.filter(a => a.status === 'present').length / allAtt.length) * 100) : 0

    setSummary({
      totalIncome: incomes.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0),
      totalExpense: expenses.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0),
      collected: incomes.filter(p => p.status === 'completed').length,
      overdue: incomes.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0),
      totalAthletes: athletes?.length || 0,
      activeAthletes: athletes?.filter(a => a.status === 'active').length || 0,
      avgAttendance: avgAtt,
    })

    setLoading(false)
  }, [supabase, year])

  useEffect(() => { fetchData() }, [fetchData])

  const exportCSV = () => {
    const rows = [
      ['Ay', 'Gelir (₺)', 'Gider (₺)', 'Net (₺)', 'Devam Oranı (%)'],
      ...monthlyData.map((m, i) => [m.name, m.gelir, m.gider, m.gelir - m.gider, attendanceData[i]?.oran || 0])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = `rapor-${year}.csv`; link.click()
  }

  const TOOLTIP_STYLE = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)' }

  return (
    <DashboardLayout title="Raporlar">
      <div className="page-header">
        <div>
          <h1 className="page-title">Raporlar</h1>
          <p className="page-subtitle">{year} yılı analizi</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select className="form-select" style={{ width: 'auto', minHeight: '40px', padding: '0 12px' }}
            value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn bs" onClick={exportCSV}><Download size={15} /> CSV İndir</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center' }}><Loader2 size={28} style={{ margin: '0 auto', color: 'var(--text3)', animation: 'spin 1s linear infinite' }} /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            {[
              { label: 'Toplam Gelir', value: formatCurrency(summary.totalIncome), icon: <TrendingUp size={22} color="var(--green)" />, bg: 'rgba(34,197,94,0.15)' },
              { label: 'Toplam Gider', value: formatCurrency(summary.totalExpense), icon: <TrendingDown size={22} color="var(--red)" />, bg: 'rgba(239,68,68,0.15)' },
              { label: 'Gecikmiş Alacak', value: formatCurrency(summary.overdue), icon: <TrendingDown size={22} color="var(--yellow)" />, bg: 'rgba(216,163,18,0.15)' },
              { label: 'Ortalama Devam', value: `%${summary.avgAttendance}`, icon: <Calendar size={22} color="var(--blue2)" />, bg: 'rgba(45,92,179,0.15)' },
            ].map(s => (
              <div key={s.label} className="stats-card">
                <div className="stats-icon" style={{ background: s.bg }}>{s.icon}</div>
                <div><div className="stats-label">{s.label}</div><div className="stats-value">{s.value}</div></div>
              </div>
            ))}
          </div>

          {/* Net profit banner */}
          <div className="card" style={{ marginBottom: '24px', background: summary.totalIncome - summary.totalExpense >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', borderColor: summary.totalIncome - summary.totalExpense >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'var(--text2)' }}>{year} Yılı Net Kar/Zarar</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: summary.totalIncome - summary.totalExpense >= 0 ? 'var(--green)' : 'var(--red)', marginTop: '4px' }}>
                  {summary.totalIncome - summary.totalExpense >= 0 ? '+' : ''}{formatCurrency(summary.totalIncome - summary.totalExpense)}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text2)' }}>
                <div>Toplam Tahsilat: <strong>{summary.collected} ödeme</strong></div>
                <div>Aktif Sporcu: <strong>{summary.activeAthletes}/{summary.totalAthletes}</strong></div>
              </div>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: '24px' }}>
            {/* Monthly Income/Expense Chart */}
            <div className="card">
              <h3 className="m-tit" style={{ marginBottom: '20px' }}>Aylık Gelir / Gider</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} barGap={4}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="gelir" name="Gelir" fill="var(--green)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="gider" name="Gider" fill="var(--red)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Attendance Chart */}
            <div className="card">
              <h3 className="m-tit" style={{ marginBottom: '20px' }}>Aylık Devam Oranı (%)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={attendanceData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `%${v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`%${v}`, 'Devam']} />
                  <Line type="monotone" dataKey="oran" stroke="var(--blue2)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--blue2)' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Status Pie */}
          {paymentStatusData.length > 0 && (
            <div className="card">
              <h3 className="m-tit" style={{ marginBottom: '20px' }}>Ödeme Durum Dağılımı</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={paymentStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ value }) => value}>
                      {paymentStatusData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {paymentStatusData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '14px', color: 'var(--text2)', flex: 1 }}>{d.name}</span>
                      <span style={{ fontWeight: 700, fontSize: '16px' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}
