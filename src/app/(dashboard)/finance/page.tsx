'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, Download } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatsSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'

interface PaymentRow { amount: number; type: string; status: string; category?: string; paid_date?: string; due_date?: string; created_at: string; athlete_name?: string }
interface ExpenseRow { amount: number; expense_date: string; category?: { name: string } }
interface AgingRow { athlete_name: string; amount: number; due_date: string; days_overdue: number; bucket: string }

const MONTHS = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']

export default function FinancePage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'pl' | 'cashflow' | 'aging' | 'forecast'>('pl')
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [aging, setAging] = useState<AgingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const [{ data: p }, { data: e }, { data: ag }] = await Promise.all([
      supabase.from('payments').select('amount, type, status, category, paid_date, due_date, created_at, athlete_name').eq('organization_id', orgId),
      supabase.from('expenses').select('amount, expense_date, category:expense_categories(name)').eq('organization_id', orgId),
      supabase.from('receivables_aging').select('athlete_name, amount, due_date, days_overdue, bucket').eq('organization_id', orgId),
    ])
    setPayments((p || []) as PaymentRow[])
    setExpenses((e || []) as unknown as ExpenseRow[])
    setAging((ag || []) as AgingRow[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // ── P&L hesapları ──
  const pl = useMemo(() => {
    const incomeByMonth = Array(12).fill(0)
    const expenseByMonth = Array(12).fill(0)
    payments.filter(p => p.type === 'income' && p.status === 'completed').forEach(p => {
      const d = new Date(p.paid_date || p.created_at)
      if (d.getFullYear() === year) incomeByMonth[d.getMonth()] += p.amount
    })
    // Eski sistem giderleri (payments type=expense) + yeni expenses
    payments.filter(p => p.type === 'expense').forEach(p => {
      const d = new Date(p.paid_date || p.created_at)
      if (d.getFullYear() === year) expenseByMonth[d.getMonth()] += p.amount
    })
    expenses.forEach(e => {
      const d = new Date(e.expense_date)
      if (d.getFullYear() === year) expenseByMonth[d.getMonth()] += e.amount
    })
    const totalIncome = incomeByMonth.reduce((a, b) => a + b, 0)
    const totalExpense = expenseByMonth.reduce((a, b) => a + b, 0)
    return { incomeByMonth, expenseByMonth, totalIncome, totalExpense, net: totalIncome - totalExpense }
  }, [payments, expenses, year])

  // ── Alacak yaşlandırma ──
  const agingBuckets = useMemo(() => {
    const b: Record<string, { total: number; count: number }> = {
      current: { total: 0, count: 0 }, d1_30: { total: 0, count: 0 },
      d31_60: { total: 0, count: 0 }, d61_90: { total: 0, count: 0 }, d90_plus: { total: 0, count: 0 },
    }
    aging.forEach(a => { b[a.bucket].total += a.amount; b[a.bucket].count++ })
    return b
  }, [aging])
  const totalReceivable = aging.reduce((s, a) => s + a.amount, 0)

  // ── Tahsilat tahmini (gelecek 6 ay bekleyen) ──
  const forecast = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const buckets: { label: string; amount: number }[] = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      buckets.push({ label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, amount: 0 })
    }
    payments.filter(p => p.type === 'income' && (p.status === 'pending' || p.status === 'overdue') && p.due_date).forEach(p => {
      const d = new Date(p.due_date!)
      const monthsAhead = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth())
      if (monthsAhead >= 0 && monthsAhead < 6) buckets[monthsAhead].amount += p.amount
    })
    return buckets
  }, [payments])

  const exportPL = () => {
    const rows = [['Ay', 'Gelir', 'Gider', 'Net']]
    pl.incomeByMonth.forEach((inc, i) => rows.push([MONTHS[i], String(inc), String(pl.expenseByMonth[i]), String(inc - pl.expenseByMonth[i])]))
    rows.push(['TOPLAM', String(pl.totalIncome), String(pl.totalExpense), String(pl.net)])
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `gelir-tablosu-${year}.csv`; a.click()
  }

  const maxBar = Math.max(...pl.incomeByMonth, ...pl.expenseByMonth, 1)

  return (
    <DashboardLayout title="Finansal Raporlar">
      <PageHeader title="Finansal Raporlar" subtitle="Gelir tablosu, nakit akış, alacak yaşlandırma ve tahsilat tahmini"
        actions={tab === 'pl' ? <button className="btn bs" onClick={exportPL}><Download size={15} /> CSV</button> : undefined} />

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg3)', padding: 4, borderRadius: 10, width: 'fit-content', flexWrap: 'wrap' }}>
        {([['pl', 'Gelir Tablosu'], ['cashflow', 'Nakit Akış'], ['aging', 'Alacak Yaşlandırma'], ['forecast', 'Tahsilat Tahmini']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '8px 14px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer',
            background: tab === k ? 'var(--bg2)' : 'transparent', color: tab === k ? 'var(--text)' : 'var(--text3)',
            boxShadow: tab === k ? 'var(--elev-1)' : 'none', transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {loading ? <StatsSkeleton count={3} /> : (
        <>
          {/* ── GELİR TABLOSU (P&L) ── */}
          {tab === 'pl' && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                <button className="btn bs btn-sm" onClick={() => setYear(y => y - 1)}>‹ {year - 1}</button>
                <strong style={{ fontSize: 16 }}>{year}</strong>
                <button className="btn bs btn-sm" onClick={() => setYear(y => y + 1)} disabled={year >= new Date().getFullYear()}>{year + 1} ›</button>
              </div>
              <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="card" style={{ padding: 18 }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Toplam Gelir</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={20} /> {formatCurrency(pl.totalIncome)}</div>
                </div>
                <div className="card" style={{ padding: 18 }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Toplam Gider</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}><TrendingDown size={20} /> {formatCurrency(pl.totalExpense)}</div>
                </div>
                <div className="card" style={{ padding: 18 }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Net Kâr / Zarar</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: pl.net >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(pl.net)}</div>
                </div>
                <div className="card" style={{ padding: 18 }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Kâr Marjı</div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{pl.totalIncome > 0 ? `%${Math.round((pl.net / pl.totalIncome) * 100)}` : '—'}</div>
                </div>
              </div>
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Aylık Gelir / Gider</h3>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 200, paddingBottom: 24, position: 'relative' }}>
                  {pl.incomeByMonth.map((inc, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%', width: '100%', justifyContent: 'center' }}>
                        <div title={`Gelir: ${formatCurrency(inc)}`} style={{ width: '42%', background: 'var(--green)', height: `${(inc / maxBar) * 100}%`, borderRadius: '3px 3px 0 0', minHeight: inc > 0 ? 2 : 0 }} />
                        <div title={`Gider: ${formatCurrency(pl.expenseByMonth[i])}`} style={{ width: '42%', background: 'var(--red)', height: `${(pl.expenseByMonth[i] / maxBar) * 100}%`, borderRadius: '3px 3px 0 0', minHeight: pl.expenseByMonth[i] > 0 ? 2 : 0 }} />
                      </div>
                      <span style={{ position: 'absolute', bottom: -22, fontSize: 10, color: 'var(--text3)' }}>{MONTHS[i]}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, background: 'var(--green)', borderRadius: 3 }} /> Gelir</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, background: 'var(--red)', borderRadius: 3 }} /> Gider</span>
                </div>
              </div>
            </>
          )}

          {/* ── NAKİT AKIŞ ── */}
          {tab === 'cashflow' && (
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table className="table">
                <thead><tr><th>Ay</th><th style={{ textAlign: 'right' }}>Giriş</th><th style={{ textAlign: 'right' }}>Çıkış</th><th style={{ textAlign: 'right' }}>Net</th><th style={{ textAlign: 'right' }}>Kümülatif</th></tr></thead>
                <tbody>
                  {(() => {
                    let cumulative = 0
                    return pl.incomeByMonth.map((inc, i) => {
                      const net = inc - pl.expenseByMonth[i]
                      cumulative += net
                      const cum = cumulative
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{MONTHS[i]} {year}</td>
                          <td style={{ textAlign: 'right', color: 'var(--green)' }}>{formatCurrency(inc)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--red)' }}>{formatCurrency(pl.expenseByMonth[i])}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(net)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: cum >= 0 ? 'var(--text)' : 'var(--red)' }}>{formatCurrency(cum)}</td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {/* ── ALACAK YAŞLANDIRMA ── */}
          {tab === 'aging' && (
            <>
              <div className="stats-grid" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(5, 1fr)' }}>
                {([['current', 'Vadesi Gelmemiş', 'var(--text2)'], ['d1_30', '1-30 Gün', '#f59e0b'], ['d31_60', '31-60 Gün', '#f97316'], ['d61_90', '61-90 Gün', '#ef4444'], ['d90_plus', '90+ Gün', '#b91c1c']] as const).map(([k, label, color]) => (
                  <div key={k} className="card" style={{ padding: 14 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color }}>{formatCurrency(agingBuckets[k].total)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{agingBuckets[k].count} ödeme</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 12, fontSize: 14 }}>Toplam alacak: <strong style={{ color: 'var(--red)' }}>{formatCurrency(totalReceivable)}</strong></div>
              {aging.length === 0 ? (
                <EmptyState icon={<Wallet size={28} />} title="Açık alacak yok" description="Tüm aidatlar tahsil edilmiş görünüyor." />
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'auto' }}>
                  <table className="table">
                    <thead><tr><th>Sporcu</th><th>Vade</th><th style={{ textAlign: 'right' }}>Tutar</th><th style={{ textAlign: 'right' }}>Gecikme</th></tr></thead>
                    <tbody>
                      {[...aging].sort((a, b) => b.days_overdue - a.days_overdue).map((a, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{a.athlete_name}</td>
                          <td style={{ fontSize: 12, color: 'var(--text3)' }}>{formatDate(a.due_date)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>{formatCurrency(a.amount)}</td>
                          <td style={{ textAlign: 'right', color: a.days_overdue > 0 ? 'var(--red)' : 'var(--text3)' }}>{a.days_overdue > 0 ? `${a.days_overdue} gün` : 'Vadede'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── TAHSİLAT TAHMİNİ ── */}
          {tab === 'forecast' && (
            <>
              <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text2)' }}>Önümüzdeki 6 ay için planlanan (bekleyen + gecikmiş) tahsilatlar.</div>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 200, paddingBottom: 28, position: 'relative' }}>
                  {forecast.map((f, i) => {
                    const max = Math.max(...forecast.map(x => x.amount), 1)
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{f.amount > 0 ? formatCurrency(f.amount) : ''}</span>
                        <div style={{ width: '60%', background: 'var(--grad)', height: `${(f.amount / max) * 100}%`, borderRadius: '4px 4px 0 0', minHeight: f.amount > 0 ? 3 : 0 }} />
                        <span style={{ position: 'absolute', bottom: -24, fontSize: 10, color: 'var(--text3)', textAlign: 'center' }}>{f.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div style={{ marginTop: 16, fontSize: 14 }}>6 aylık beklenen tahsilat: <strong style={{ color: 'var(--blue2)' }}>{formatCurrency(forecast.reduce((s, f) => s + f.amount, 0))}</strong></div>
            </>
          )}
        </>
      )}
    </DashboardLayout>
  )
}
