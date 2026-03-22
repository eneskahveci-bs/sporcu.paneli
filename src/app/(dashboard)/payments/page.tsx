'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Plus, Search, Download, CheckCircle, Loader2, TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils/formatters'
import { toast } from 'sonner'
import type { Payment, Athlete } from '@/types'

const STATUS_BADGE: Record<string, string> = { pending: 'badge-yellow', completed: 'badge-green', overdue: 'badge-red', cancelled: 'badge-gray' }
const STATUS_LABEL: Record<string, string> = { pending: 'Bekliyor', completed: 'Ödendi', overdue: 'Gecikmiş', cancelled: 'İptal' }
const METHOD_LABEL: Record<string, string> = { cash: 'Nakit', card: 'Kart', bank_transfer: 'Havale', paytr: 'Online' }

export default function PaymentsPage() {
  const supabase = createClient()
  const [payments, setPayments] = useState<Payment[]>([])
  const [athletes, setAthletes] = useState<Pick<Athlete, 'id' | 'first_name' | 'last_name' | 'monthly_fee'>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    setLoading(true)
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from('payments').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('athletes').select('id, first_name, last_name, monthly_fee').eq('organization_id', orgId).eq('status', 'active'),
    ])
    setPayments(p || [])
    setAthletes(a || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = payments.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || (p.athlete_name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
    const matchStatus = !statusFilter || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  // Stats
  const income = payments.filter(p => p.type === 'income')
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthlyIncome = income.filter(p => p.status === 'completed' && p.paid_date?.startsWith(thisMonth)).reduce((s, p) => s + p.amount, 0)
  const pending = income.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  const overdue = income.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0)
  const totalIncome = income.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0)

  const markPaid = async (id: string) => {
    const { error } = await supabase.from('payments').update({ status: 'completed', paid_date: new Date().toISOString().slice(0, 10) }).eq('id', id)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('Ödeme tamamlandı')
    fetchData()
  }

  const handleExport = () => {
    const csv = [
      ['Sporcu', 'Miktar', 'Tür', 'Kategori', 'Durum', 'Yöntem', 'Son Tarih', 'Ödeme Tarihi'].join(','),
      ...filtered.map(p => [p.athlete_name || '', p.amount, p.type, p.category || '', p.status, p.method || '', p.due_date || '', p.paid_date || ''].join(','))
    ].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = 'odemeler.csv'; link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout title="Ödemeler">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ödemeler</h1>
          <p className="page-subtitle">{payments.length} ödeme kaydı</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn bs btn-sm" onClick={handleExport}><Download size={14} /> CSV</button>
          <button className="btn bs" onClick={() => setShowBulkModal(true)}>📋 Toplu Plan</button>
          <button className="btn bp" onClick={() => setShowModal(true)}><Plus size={16} /> Yeni Ödeme</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Aylık Gelir', value: formatCurrency(monthlyIncome), icon: <TrendingUp size={22} color="var(--green)" />, bg: 'rgba(34,197,94,0.15)' },
          { label: 'Toplam Tahsilat', value: formatCurrency(totalIncome), icon: <CheckCircle size={22} color="var(--blue2)" />, bg: 'rgba(45,92,179,0.15)' },
          { label: 'Bekleyen', value: formatCurrency(pending), icon: <Clock size={22} color="var(--yellow)" />, bg: 'rgba(216,163,18,0.15)' },
          { label: 'Gecikmiş', value: formatCurrency(overdue), icon: <AlertTriangle size={22} color="var(--red)" />, bg: 'rgba(239,68,68,0.15)' },
        ].map(s => (
          <div key={s.label} className="stats-card">
            <div className="stats-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div><div className="stats-label">{s.label}</div><div className="stats-value">{s.value}</div></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search className="search-icon" />
          <input placeholder="Sporcu adı, açıklama ara..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="form-select" style={{ width: 'auto', minHeight: '40px', padding: '0 12px' }}
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">Tüm Durumlar</option>
          <option value="pending">Bekliyor</option>
          <option value="completed">Tamamlandı</option>
          <option value="overdue">Gecikmiş</option>
          <option value="cancelled">İptal</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto', color: 'var(--text3)' }} /></div>
        ) : paginated.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">💳</div><div className="empty-state-title">Ödeme bulunamadı</div></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Sporcu</th>
                <th>Miktar</th>
                <th>Kategori</th>
                <th>Yöntem</th>
                <th>Son Tarih</th>
                <th>Ödeme Tarihi</th>
                <th>Durum</th>
                <th style={{ textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {p.athlete_name && <div className="avatar avatar-sm">{p.athlete_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</div>}
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.athlete_name || 'Genel Gider'}</div>
                        <div className="ts text-faint">{p.description || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: p.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                    {p.type === 'expense' ? '-' : ''}{formatCurrency(p.amount)}
                  </td>
                  <td className="ts text-muted">{p.category || '-'}</td>
                  <td className="ts">{p.method ? METHOD_LABEL[p.method] : '-'}</td>
                  <td className="ts text-muted">{formatDate(p.due_date)}</td>
                  <td className="ts text-muted">{p.paid_date ? formatDate(p.paid_date) : '-'}</td>
                  <td><span className={`badge ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      {(p.status === 'pending' || p.status === 'overdue') && (
                        <button className="btn bsu btn-xs" onClick={() => markPaid(p.id)} title="Ödendi olarak işaretle">
                          <CheckCircle size={12} /> Ödendi
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="pagination">
            <span>{filtered.length} kayıt</span>
            <div className="pagination-btns">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                <button key={n} className={`page-btn${page === n ? ' active' : ''}`} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {showModal && <AddPaymentModal athletes={athletes} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchData() }} />}
      {showBulkModal && <BulkPlanModal athletes={athletes} onClose={() => setShowBulkModal(false)} onSave={() => { setShowBulkModal(false); fetchData() }} />}
    </DashboardLayout>
  )
}

function AddPaymentModal({ athletes, onClose, onSave }: { athletes: Pick<Athlete, 'id' | 'first_name' | 'last_name' | 'monthly_fee'>[]; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    athlete_id: '', amount: '', type: 'income', category: 'Aidat',
    description: '', status: 'completed', method: 'cash',
    due_date: new Date().toISOString().slice(0, 10),
    paid_date: new Date().toISOString().slice(0, 10),
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Geçerli miktar girin'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const athlete = athletes.find(a => a.id === form.athlete_id)
    const { error } = await supabase.from('payments').insert({
      ...form,
      amount: parseFloat(form.amount),
      organization_id: orgId,
      athlete_id: form.athlete_id || null,
      athlete_name: athlete ? `${athlete.first_name} ${athlete.last_name}` : null,
      paid_date: form.status === 'completed' ? form.paid_date : null,
      created_by: user?.id,
    })
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('Ödeme eklendi')
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Yeni Ödeme Ekle</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="pay-athlete">Sporcu</label>
              <select id="pay-athlete" className="form-select" value={form.athlete_id} onChange={e => {
                const a = athletes.find(a => a.id === e.target.value)
                set('athlete_id', e.target.value)
                if (a?.monthly_fee) set('amount', a.monthly_fee.toString())
              }}>
                <option value="">Genel Gider (sporcu seçilmedi)</option>
                {athletes.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
              </select>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">Tür</label>
                <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                  <option value="income">Gelir</option>
                  <option value="expense">Gider</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">Miktar (₺)</label>
                <input type="number" min="0" className="form-input" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
                  {['Aidat', 'Kayıt Ücreti', 'Kamp Ücreti', 'Malzeme', 'Kira', 'Personel Maaşı', 'Diğer'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Yöntem</label>
                <select className="form-select" value={form.method} onChange={e => set('method', e.target.value)}>
                  <option value="cash">Nakit</option>
                  <option value="card">Kart</option>
                  <option value="bank_transfer">Havale</option>
                  <option value="paytr">Online</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Durum</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="completed">Ödendi</option>
                  <option value="pending">Bekliyor</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Son Tarih</label>
                <input type="date" className="form-input" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Açıklama</label>
              <input type="text" className="form-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Opsiyonel not" />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bp" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={15} /> : null} {saving ? 'Kaydediliyor...' : 'Ekle'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BulkPlanModal({ athletes, onClose, onSave }: { athletes: Pick<Athlete, 'id' | 'first_name' | 'last_name' | 'monthly_fee'>[]; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [dueDay, setDueDay] = useState(5)
  const [saving, setSaving] = useState(false)

  const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

  const handleCreate = async () => {
    const athletesWithFee = athletes.filter(a => a.monthly_fee && a.monthly_fee > 0)
    if (!athletesWithFee.length) { toast.error('Aylık ücreti olan aktif sporcu yok'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`

    const payments = athletesWithFee.map(a => ({
      organization_id: orgId,
      athlete_id: a.id,
      athlete_name: `${a.first_name} ${a.last_name}`,
      amount: a.monthly_fee,
      type: 'income',
      category: 'Aidat',
      description: `${MONTHS[month - 1]} ${year} Aidatı`,
      status: 'pending',
      due_date: dueDate,
      method: 'cash',
      source: 'plan',
      created_by: user?.id,
    }))

    const { error } = await supabase.from('payments').insert(payments)
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success(`${athletesWithFee.length} sporcu için ödeme planı oluşturuldu!`)
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Toplu Ödeme Planı</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text2)', marginBottom: '16px', fontSize: '14px' }}>
            Aylık ücreti tanımlı tüm aktif sporcular ({athletes.filter(a => a.monthly_fee).length} sporcu) için ödeme planı oluşturulacak.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Ay</label>
                <select className="form-select" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Yıl</label>
                <input type="number" className="form-input" value={year} onChange={e => setYear(parseInt(e.target.value))} min="2024" max="2030" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Son Ödeme Günü</label>
              <input type="number" className="form-input" value={dueDay} onChange={e => setDueDay(parseInt(e.target.value))} min="1" max="28" />
              <div className="ts text-faint" style={{ marginTop: '4px' }}>Her ayın kaçında ödenmeli?</div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bp" onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 size={15} /> : null} {saving ? 'Oluşturuluyor...' : 'Plan Oluştur'}
          </button>
        </div>
      </div>
    </div>
  )
}
