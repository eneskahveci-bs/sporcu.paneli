'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, Trash2, Target } from 'lucide-react'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils/formatters'

interface Budget { id: string; year: number; month: number | null; type: string; category: string; planned_amount: number }

export default function BudgetPage() {
  const supabase = createClient()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [actuals, setActuals] = useState<{ income: number; expense: number }>({ income: 0, expense: 0 })
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [showModal, setShowModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const yStart = `${year}-01-01`, yEnd = `${year}-12-31`
    const [{ data: b }, { data: pInc }, { data: exp }, { data: pExp }] = await Promise.all([
      supabase.from('budgets').select('*').eq('organization_id', orgId).eq('year', year).order('type').order('category'),
      supabase.from('payments').select('amount').eq('organization_id', orgId).eq('type', 'income').eq('status', 'completed').gte('paid_date', yStart).lte('paid_date', yEnd),
      supabase.from('expenses').select('amount').eq('organization_id', orgId).gte('expense_date', yStart).lte('expense_date', yEnd),
      supabase.from('payments').select('amount').eq('organization_id', orgId).eq('type', 'expense').gte('created_at', yStart),
    ])
    setBudgets((b || []) as Budget[])
    const income = (pInc || []).reduce((s, x) => s + x.amount, 0)
    const expense = (exp || []).reduce((s, x) => s + x.amount, 0) + (pExp || []).reduce((s, x) => s + x.amount, 0)
    setActuals({ income, expense })
    setLoading(false)
  }, [supabase, year])

  useEffect(() => { fetchData() }, [fetchData])

  const remove = async (id: string) => {
    if (!await confirmDialog({ title: 'Bütçe kalemi silinsin mi?', variant: 'danger', confirmText: 'Sil' })) return
    await supabase.from('budgets').delete().eq('id', id)
    toast.success('Silindi'); fetchData()
  }

  const { plannedIncome, plannedExpense } = useMemo(() => {
    let pi = 0, pe = 0
    budgets.forEach(b => { if (b.type === 'income') pi += b.planned_amount; else pe += b.planned_amount })
    return { plannedIncome: pi, plannedExpense: pe }
  }, [budgets])

  const pct = (actual: number, planned: number) => planned > 0 ? Math.round((actual / planned) * 100) : 0

  return (
    <DashboardLayout title="Bütçe">
      <PageHeader title="Bütçe Takibi" subtitle="Planlanan vs gerçekleşen"
        actions={<button className="btn bp" onClick={() => setShowModal(true)}><Plus size={16} /> Bütçe Kalemi</button>} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <button className="btn bs btn-sm" onClick={() => setYear(y => y - 1)}>‹ {year - 1}</button>
        <strong style={{ fontSize: 16 }}>{year}</strong>
        <button className="btn bs btn-sm" onClick={() => setYear(y => y + 1)}>{year + 1} ›</button>
      </div>

      {loading ? <TableSkeleton rows={5} cols={4} /> : (
        <>
          <div className="grid-2" style={{ marginBottom: 20 }}>
            <BudgetProgressCard label="Gelir" planned={plannedIncome} actual={actuals.income} pct={pct(actuals.income, plannedIncome)} positive />
            <BudgetProgressCard label="Gider" planned={plannedExpense} actual={actuals.expense} pct={pct(actuals.expense, plannedExpense)} positive={false} />
          </div>

          {budgets.length === 0 ? (
            <EmptyState icon={<Target size={28} />} title="Bütçe kalemi yok" description={`${year} yılı için gelir/gider hedefleri ekleyin.`} action={<button className="btn bp" onClick={() => setShowModal(true)}><Plus size={15} /> Bütçe Kalemi</button>} />
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table className="table">
                <thead><tr><th>Tip</th><th>Kategori</th><th>Dönem</th><th style={{ textAlign: 'right' }}>Planlanan</th><th></th></tr></thead>
                <tbody>
                  {budgets.map(b => (
                    <tr key={b.id}>
                      <td><span className={`badge badge-sm ${b.type === 'income' ? 'badge-green' : 'badge-red'}`}>{b.type === 'income' ? 'Gelir' : 'Gider'}</span></td>
                      <td style={{ fontWeight: 600 }}>{b.category}</td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>{b.month ? `${b.month}. Ay` : 'Yıllık'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(b.planned_amount)}</td>
                      <td style={{ textAlign: 'right' }}><button className="btn bd btn-xs" onClick={() => remove(b.id)}><Trash2 size={11} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showModal && <BudgetModal year={year} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchData() }} />}
    </DashboardLayout>
  )
}

function BudgetProgressCard({ label, planned, actual, pct, positive }: { label: string; planned: number; actual: number; pct: number; positive: boolean }) {
  const over = pct > 100
  const barColor = positive ? (pct >= 100 ? 'var(--green)' : 'var(--blue2)') : (over ? 'var(--red)' : 'var(--green)')
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <strong>{label}</strong>
        <span style={{ fontSize: 13, color: over && !positive ? 'var(--red)' : 'var(--text3)' }}>%{pct}{over ? ' (aşıldı)' : ''}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
        <span style={{ color: 'var(--text3)' }}>Gerçekleşen: <strong style={{ color: 'var(--text)' }}>{formatCurrency(actual)}</strong></span>
        <span style={{ color: 'var(--text3)' }}>Hedef: {formatCurrency(planned)}</span>
      </div>
      <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

function BudgetModal({ year, onClose, onSave }: { year: number; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type: 'income', category: '', month: '', planned_amount: '' })

  const save = async () => {
    if (!form.category.trim() || !form.planned_amount) { toast.error('Kategori ve tutar gerekli'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const { error } = await supabase.from('budgets').insert({
      organization_id: orgId, year, type: form.type, category: form.category,
      month: form.month ? parseInt(form.month) : null, planned_amount: parseFloat(form.planned_amount),
    })
    setSaving(false)
    if (error) { toast.error(error.message.includes('duplicate') ? 'Bu kategori+dönem zaten var' : error.message); return }
    toast.success('Eklendi'); onSave()
  }

  const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

  return (
    <Modal open onClose={onClose} title={`${year} Bütçe Kalemi`} size="sm"
      footer={<><button className="btn bs" onClick={onClose}>İptal</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? <Loader2 size={14} className="spin" /> : null} Ekle</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="form-group"><label className="form-label">Tip</label>
          <select className="form-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            <option value="income">Gelir</option><option value="expense">Gider</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label required">Kategori</label><input className="form-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Örn: Aidat, Kira, Maaş" /></div>
        <div className="form-group"><label className="form-label">Dönem</label>
          <select className="form-select" value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))}>
            <option value="">Tüm yıl</option>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label required">Planlanan Tutar (₺)</label><input type="number" step="0.01" className="form-input" value={form.planned_amount} onChange={e => setForm(p => ({ ...p, planned_amount: e.target.value }))} /></div>
      </div>
    </Modal>
  )
}
