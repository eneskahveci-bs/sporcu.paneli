'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Plus, Search, Download, CheckCircle, Loader2, TrendingUp, Clock, AlertTriangle, Check, X, Bell, Printer, ChevronDown, Users, List, ShoppingBag, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchInput } from '@/components/ui/SearchInput'
import type { Payment, Athlete } from '@/types'

const STATUS_BADGE: Record<string, string> = { pending: 'badge-yellow', completed: 'badge-green', overdue: 'badge-red', cancelled: 'badge-gray' }
const STATUS_LABEL: Record<string, string> = { pending: 'Bekliyor', completed: 'Ödendi', overdue: 'Gecikmiş', cancelled: 'İptal' }
const METHOD_LABEL: Record<string, string> = { cash: 'Nakit', card: 'Kart', bank_transfer: 'Havale', paytr: 'Online' }

interface OrderItem { product_name: string; quantity: number; unit_price: number }
interface OrderRow {
  id: string
  athlete_id: string | null
  total_amount: number
  status: string
  created_at: string
  items: OrderItem[]
}

// Athlete + payments + orders birleşik satır
interface AthleteWithTx extends Pick<Athlete, 'id' | 'first_name' | 'last_name' | 'monthly_fee'> {
  branch_id?: string | null
  class_id?: string | null
  sport_id?: string | null
}

export default function PaymentsPage() {
  const supabase = createClient()
  const [payments, setPayments] = useState<Payment[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<Payment[]>([])
  const [athletes, setAthletes] = useState<AthleteWithTx[]>([])
  const [org, setOrg] = useState<{ name: string; address?: string; phone?: string; logo?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [approving, setApproving] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [view, setView] = useState<'list' | 'by-athlete'>('list')
  const PER_PAGE = 20

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    setLoading(true)
    const [{ data: p }, { data: a }, { data: orgData }, { data: ords }] = await Promise.all([
      supabase.from('payments').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('athletes').select('id, first_name, last_name, monthly_fee, branch_id, class_id, sport_id').eq('organization_id', orgId).eq('status', 'active').order('first_name'),
      supabase.from('organizations').select('name, address, phone, logo').eq('id', orgId).single(),
      supabase.from('orders').select('id, athlete_id, total_amount, status, created_at, items:order_items(product_name, quantity, unit_price)').eq('organization_id', orgId).order('created_at', { ascending: false }),
    ])
    setPayments(p || [])
    setOrders((ords || []) as OrderRow[])
    setPendingApprovals((p || []).filter((pay: Payment) => pay.notification_status === 'pending_approval'))
    setAthletes((a || []) as AthleteWithTx[])
    setOrg(orgData)
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

  const approveNotification = async (p: Payment) => {
    setApproving(p.id)
    const { error } = await supabase.from('payments').update({
      status: 'completed',
      notification_status: 'approved',
      paid_date: p.due_date || new Date().toISOString().slice(0, 10),
    }).eq('id', p.id)
    if (error) { toast.error('Hata: ' + error.message); setApproving(null); return }
    if (p.source === 'parent_notification' && p.athlete_id && p.due_date) {
      await supabase.from('payments').update({ status: 'completed' })
        .eq('athlete_id', p.athlete_id).eq('due_date', p.due_date).eq('source', 'plan').neq('id', p.id)
    }
    toast.success(`${p.athlete_name} ödemesi onaylandı`)
    setApproving(null)
    fetchData()
  }

  const rejectNotification = async (p: Payment) => {
    if (!await confirmDialog({ title: 'Bildirim reddedilsin mi?', message: `${p.athlete_name} tarafından yapılan ${formatCurrency(p.amount)} tutarındaki ödeme bildirimi reddedilecek.`, variant: 'danger', confirmText: 'Reddet' })) return
    setApproving(p.id)
    const { error } = await supabase.from('payments').delete().eq('id', p.id)
    if (error) { toast.error('Hata: ' + error.message); setApproving(null); return }
    toast.success('Bildirim reddedildi')
    setApproving(null)
    fetchData()
  }

  const markPaid = async (id: string) => {
    const { error } = await supabase.from('payments').update({ status: 'completed', paid_date: new Date().toISOString().slice(0, 10) }).eq('id', id)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('Ödeme tamamlandı')
    fetchData()
  }

  const printReceipt = (p: Payment) => {
    const receiptNo = 'MKZ-' + new Date().getFullYear() + '-' + p.id.slice(-6).toUpperCase()
    const paidDate = p.paid_date || p.due_date || new Date().toISOString().slice(0, 10)
    const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><title>Makbuz ${receiptNo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;max-width:420px;margin:30px auto;padding:24px;color:#111}
  .hdr{text-align:center;padding-bottom:16px;border-bottom:2px solid #111;margin-bottom:16px}
  .logo{max-height:64px;margin-bottom:8px}
  .org{font-size:18px;font-weight:700}
  .org-sub{font-size:12px;color:#555;margin-top:3px}
  .rtitle{text-align:center;font-size:13px;font-weight:700;letter-spacing:3px;color:#555;margin:14px 0}
  .row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eee;font-size:13px}
  .row span:first-child{color:#555}
  .row span:last-child{font-weight:600}
  .amt{display:flex;justify-content:space-between;padding:12px 0;font-size:18px;font-weight:700;margin-top:6px;border-top:2px solid #111}
  .foot{margin-top:18px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px}
  @media print{body{margin:0}}
</style></head><body>
<div class="hdr">
  ${org?.logo ? `<img src="${org.logo}" class="logo" />` : ''}
  <div class="org">${org?.name || 'Spor Akademisi'}</div>
  ${org?.address ? `<div class="org-sub">${org.address}</div>` : ''}
  ${org?.phone ? `<div class="org-sub">Tel: ${org.phone}</div>` : ''}
</div>
<div class="rtitle">ELEKTRONİK MAKBUZ</div>
<div class="row"><span>Makbuz No</span><span>${receiptNo}</span></div>
<div class="row"><span>Sporcu</span><span>${p.athlete_name || 'Genel'}</span></div>
<div class="row"><span>Kategori</span><span>${p.category || p.description || 'Aidat'}</span></div>
${p.description ? `<div class="row"><span>Açıklama</span><span>${p.description}</span></div>` : ''}
<div class="row"><span>Ödeme Yöntemi</span><span>${METHOD_LABEL[p.method || ''] || '-'}</span></div>
<div class="row"><span>Ödeme Tarihi</span><span>${new Date(paidDate).toLocaleDateString('tr-TR')}</span></div>
<div class="amt"><span>TOPLAM TUTAR</span><span>${p.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span></div>
<div class="foot">Bu belge elektronik ortamda oluşturulmuştur.<br>${new Date().toLocaleString('tr-TR')}</div>
</body></html>`
    const win = window.open('', '_blank', 'width=520,height=750')
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 400) }
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

      {/* Pending Approval Notifications */}
      {pendingApprovals.length > 0 && (
        <div style={{ padding: '14px 16px', background: 'rgba(216,163,18,0.08)', borderRadius: '12px', border: '1px solid rgba(216,163,18,0.3)', borderLeft: '4px solid var(--yellow)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Bell size={16} style={{ color: 'var(--yellow)' }} />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Onay Bekleyen Veli Bildirimleri</span>
            <span style={{ background: 'var(--yellow)', color: '#000', borderRadius: '10px', padding: '1px 8px', fontSize: '11px', fontWeight: 800 }}>{pendingApprovals.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingApprovals.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--bg2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.athlete_name} — {formatCurrency(p.amount)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{formatDate(p.due_date)} • {p.description || p.category || 'Aidat'}{p.method ? ` • ${p.method === 'cash' ? 'Nakit' : p.method === 'card' ? 'Kart' : p.method === 'bank_transfer' ? 'Havale' : p.method}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn bsu btn-xs" onClick={() => approveNotification(p)} disabled={approving === p.id} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {approving === p.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={12} />} Onayla
                  </button>
                  <button className="btn bd btn-xs" onClick={() => rejectNotification(p)} disabled={approving === p.id} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <X size={12} /> Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 12, background: 'var(--bg3)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        <button
          onClick={() => setView('list')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', fontSize: 13, fontWeight: 600,
            background: view === 'list' ? 'var(--bg2)' : 'transparent',
            color: view === 'list' ? 'var(--text)' : 'var(--text3)',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            boxShadow: view === 'list' ? 'var(--elev-1)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          <List size={14} /> Tüm İşlemler
        </button>
        <button
          onClick={() => setView('by-athlete')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', fontSize: 13, fontWeight: 600,
            background: view === 'by-athlete' ? 'var(--bg2)' : 'transparent',
            color: view === 'by-athlete' ? 'var(--text)' : 'var(--text3)',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            boxShadow: view === 'by-athlete' ? 'var(--elev-1)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          <Users size={14} /> Sporcu Bazlı
        </button>
      </div>

      {view === 'by-athlete' ? (
        <AthleteAccordionView
          athletes={athletes}
          payments={payments}
          orders={orders}
          search={search}
          onSearchChange={setSearch}
          onRefresh={fetchData}
        />
      ) : (
      <>
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
                      {p.status === 'overdue' && (
                        <button className="btn bs btn-xs" onClick={async () => {
                          const res = await fetch('/api/send-overdue-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ payment_id: p.id }),
                          })
                          if (res.ok) toast.success('Hatırlatma e-postası gönderildi')
                          else { const d = await res.json(); toast.error(d.error || 'Gönderilemedi') }
                        }} title="Hatırlatma e-postası gönder">
                          <Bell size={12} /> Hatırlat
                        </button>
                      )}
                      {p.status === 'completed' && (
                        <button className="btn bs btn-xs" onClick={() => printReceipt(p)} title="Makbuz yazdır">
                          <Printer size={12} /> Makbuz
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
      </>
      )}

      {showModal && <AddPaymentModal athletes={athletes} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchData() }} />}
      {showBulkModal && <BulkPlanModal athletes={athletes} onClose={() => setShowBulkModal(false)} onSave={() => { setShowBulkModal(false); fetchData() }} />}
    </DashboardLayout>
  )
}

// ════════════════════════════════════════════════════
// SPORCU AKORDİYON GÖRÜNÜMÜ
// ════════════════════════════════════════════════════
function AthleteAccordionView({
  athletes, payments, orders, search, onSearchChange, onRefresh,
}: {
  athletes: AthleteWithTx[]
  payments: Payment[]
  orders: OrderRow[]
  search: string
  onSearchChange: (s: string) => void
  onRefresh: () => void
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const toggle = (id: string) => {
    setOpenIds(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Sporcuya göre payment+order gruplaması
  const grouped = useMemo(() => {
    const map = new Map<string, { payments: Payment[]; orders: OrderRow[]; debt: number; pending: number; completed: number; storeSpent: number }>()
    athletes.forEach(a => {
      map.set(a.id, { payments: [], orders: [], debt: 0, pending: 0, completed: 0, storeSpent: 0 })
    })
    payments.forEach(p => {
      if (!p.athlete_id) return
      const g = map.get(p.athlete_id)
      if (!g) return
      g.payments.push(p)
      if (p.type === 'income') {
        if (p.status === 'completed') g.completed += p.amount
        else if (p.status === 'pending' || p.status === 'overdue') {
          g.debt += p.amount; g.pending++
        }
      }
    })
    orders.forEach(o => {
      if (!o.athlete_id) return
      const g = map.get(o.athlete_id)
      if (!g) return
      g.orders.push(o)
      g.storeSpent += o.total_amount
    })
    return map
  }, [athletes, payments, orders])

  const filtered = useMemo(() => {
    if (!search.trim()) return athletes
    const q = search.toLowerCase()
    return athletes.filter(a => `${a.first_name} ${a.last_name}`.toLowerCase().includes(q))
  }, [athletes, search])

  const markPaid = async (id: string) => {
    const { error } = await supabase.from('payments').update({ status: 'completed', paid_date: new Date().toISOString().slice(0, 10) }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Ödendi olarak işaretlendi')
    onRefresh()
  }

  const expandAll = () => setOpenIds(new Set(filtered.map(a => a.id)))
  const collapseAll = () => setOpenIds(new Set())

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={onSearchChange} placeholder="Sporcu adıyla ara..." />
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <button className="btn bs btn-sm" onClick={expandAll}>Hepsini Aç</button>
          <button className="btn bs btn-sm" onClick={collapseAll}>Hepsini Kapat</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users size={28} />} title="Sporcu bulunamadı" description="Aramayla eşleşen aktif sporcu yok." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(a => {
            const data = grouped.get(a.id)
            const isOpen = openIds.has(a.id)
            const totalTx = (data?.payments.length || 0) + (data?.orders.length || 0)
            return (
              <div key={a.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <button
                  onClick={() => toggle(a.id)}
                  aria-expanded={isOpen}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left', color: 'var(--text)',
                  }}
                >
                  <Avatar name={`${a.first_name} ${a.last_name}`} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{a.first_name} {a.last_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {totalTx} işlem · Aylık {a.monthly_fee ? formatCurrency(a.monthly_fee) : '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    {(data?.debt || 0) > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Borç</div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--red)' }}>{formatCurrency(data!.debt)}</div>
                      </div>
                    )}
                    {(data?.completed || 0) > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Ödenen</div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--green)' }}>{formatCurrency(data!.completed)}</div>
                      </div>
                    )}
                    {(data?.storeSpent || 0) > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Mağaza</div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--blue2)' }}>{formatCurrency(data!.storeSpent)}</div>
                      </div>
                    )}
                    <ChevronDown
                      size={18}
                      color="var(--text3)"
                      style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg3)' }}>
                    {totalTx === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                        Henüz işlem yok
                      </div>
                    ) : (
                      <AthleteTimeline payments={data!.payments} orders={data!.orders} onMarkPaid={markPaid} />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AthleteTimeline({ payments, orders, onMarkPaid }: { payments: Payment[]; orders: OrderRow[]; onMarkPaid: (id: string) => void }) {
  // İkisini birleştirip tarihe göre sırala
  type Row = { kind: 'payment'; data: Payment; ts: number } | { kind: 'order'; data: OrderRow; ts: number }
  const rows: Row[] = [
    ...payments.map(p => ({ kind: 'payment' as const, data: p, ts: new Date(p.created_at).getTime() })),
    ...orders.map(o => ({ kind: 'order' as const, data: o, ts: new Date(o.created_at).getTime() })),
  ].sort((a, b) => b.ts - a.ts)

  return (
    <div style={{ padding: '8px 12px' }}>
      <table className="table" style={{ background: 'transparent' }}>
        <thead>
          <tr>
            <th style={{ fontSize: 11 }}>Tip</th>
            <th style={{ fontSize: 11 }}>Açıklama</th>
            <th style={{ fontSize: 11 }}>Tarih</th>
            <th style={{ fontSize: 11, textAlign: 'right' }}>Tutar</th>
            <th style={{ fontSize: 11 }}>Durum</th>
            <th style={{ fontSize: 11, textAlign: 'right' }}>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            if (r.kind === 'payment') {
              const p = r.data
              return (
                <tr key={`p-${p.id}`}>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                      <CreditCard size={12} color="var(--blue2)" /> {p.category || 'Aidat'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{p.description || '-'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text3)' }}>{formatDate(p.due_date || p.created_at)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: p.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                    {p.type === 'expense' ? '-' : ''}{formatCurrency(p.amount)}
                  </td>
                  <td><span className={`badge badge-sm ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    {(p.status === 'pending' || p.status === 'overdue') && (
                      <button className="btn bsu btn-xs" onClick={() => onMarkPaid(p.id)}>
                        <CheckCircle size={11} /> Ödendi
                      </button>
                    )}
                  </td>
                </tr>
              )
            }
            const o = r.data
            const orderLabel = o.items?.map(i => `${i.quantity}× ${i.product_name}`).join(', ') || 'Sipariş'
            return (
              <tr key={`o-${o.id}`}>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                    <ShoppingBag size={12} color="#8b5cf6" /> Mağaza
                  </span>
                </td>
                <td style={{ fontSize: 12 }}>{orderLabel}</td>
                <td style={{ fontSize: 12, color: 'var(--text3)' }}>{formatDate(o.created_at)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue2)' }}>{formatCurrency(o.total_amount)}</td>
                <td><span className={`badge badge-sm ${STATUS_BADGE[o.status] || 'badge-gray'}`}>{ORDER_STATUS_LABEL[o.status] || o.status}</span></td>
                <td></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Bekliyor', paid: 'Ödendi', preparing: 'Hazırlanıyor',
  shipped: 'Kargoda', delivered: 'Teslim', cancelled: 'İptal',
}

function AddPaymentModal({ athletes, onClose, onSave }: { athletes: AthleteWithTx[]; onClose: () => void; onSave: () => void }) {
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

function BulkPlanModal({ athletes, onClose, onSave }: { athletes: AthleteWithTx[]; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [dueDay, setDueDay] = useState(5)
  const [months, setMonths] = useState(1)
  const [saving, setSaving] = useState(false)

  // Sporcu seçimi
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(athletes.filter(a => a.monthly_fee && a.monthly_fee > 0).map(a => a.id)))
  const [search, setSearch] = useState('')
  const [overrideFee, setOverrideFee] = useState('') // boş = sporcunun monthly_fee'si

  const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

  const filtered = useMemo(() => {
    if (!search.trim()) return athletes
    const q = search.toLowerCase()
    return athletes.filter(a => `${a.first_name} ${a.last_name}`.toLowerCase().includes(q))
  }, [athletes, search])

  const toggleOne = (id: string) => {
    setSelectedIds(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const selectAllFiltered = () => setSelectedIds(s => {
    const next = new Set(s)
    filtered.forEach(a => next.add(a.id))
    return next
  })

  const clearAll = () => setSelectedIds(new Set())
  const selectOnlyWithFee = () => setSelectedIds(new Set(athletes.filter(a => a.monthly_fee && a.monthly_fee > 0).map(a => a.id)))

  const selected = athletes.filter(a => selectedIds.has(a.id))
  const totalAmount = selected.reduce((s, a) => s + (overrideFee ? parseFloat(overrideFee) : (a.monthly_fee || 0)), 0)

  const handleCreate = async () => {
    if (!selected.length) { toast.error('En az bir sporcu seçin'); return }
    if (!overrideFee && selected.some(a => !a.monthly_fee || a.monthly_fee <= 0)) {
      toast.error('Seçili sporculardan bazılarının aylık ücreti tanımsız. Sabit tutar girin veya o sporcuları çıkarın.')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id

    const payments: Record<string, unknown>[] = []
    for (let i = 0; i < months; i++) {
      const m = ((month - 1 + i) % 12) + 1
      const y = year + Math.floor((month - 1 + i) / 12)
      const dueDate = `${y}-${String(m).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`
      selected.forEach(a => {
        const amount = overrideFee ? parseFloat(overrideFee) : a.monthly_fee
        if (!amount) return
        payments.push({
          organization_id: orgId,
          athlete_id: a.id,
          athlete_name: `${a.first_name} ${a.last_name}`,
          amount,
          type: 'income',
          category: 'Aidat',
          description: `${MONTHS[m - 1]} ${y} Aidatı`,
          status: 'pending',
          due_date: dueDate,
          method: 'cash',
          source: 'plan',
          created_by: user?.id,
        })
      })
    }

    const { error } = await supabase.from('payments').insert(payments)
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success(`${selected.length} sporcu × ${months} ay = ${payments.length} ödeme planı oluşturuldu`)
    onSave()
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every(a => selectedIds.has(a.id))

  return (
    <div className="modal-overlay" onClick={saving ? undefined : onClose}>
      <div className="modal" style={{ maxWidth: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Toplu Ödeme Planı</h2>
          <button onClick={onClose} aria-label="Kapat" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
          {/* Plan ayarları */}
          <div style={{ background: 'var(--bg3)', padding: 14, borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Plan Ayarları
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Başlangıç Ay</label>
                <select className="form-select" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Yıl</label>
                <input type="number" className="form-input" value={year} onChange={e => setYear(parseInt(e.target.value))} min={2024} max={2030} />
              </div>
              <div className="form-group">
                <label className="form-label">Kaç Ay</label>
                <select className="form-select" value={months} onChange={e => setMonths(parseInt(e.target.value))}>
                  {[1, 2, 3, 6, 12].map(n => <option key={n} value={n}>{n} ay</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ödeme Günü</label>
                <input type="number" className="form-input" value={dueDay} onChange={e => setDueDay(parseInt(e.target.value))} min={1} max={28} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 10 }}>
              <label className="form-label">Sabit Tutar (boş = sporcu aylık ücreti)</label>
              <input type="number" step="0.01" className="form-input" value={overrideFee} onChange={e => setOverrideFee(e.target.value)} placeholder="Boş bırak → her sporcu kendi aylık ücretiyle" />
            </div>
          </div>

          {/* Sporcu seçimi */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sporcu Seçimi ({selectedIds.size}/{athletes.length})
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn bs btn-xs" onClick={selectAllFiltered}>Görüneni Seç</button>
                <button type="button" className="btn bs btn-xs" onClick={selectOnlyWithFee}>Ücretli Olanları</button>
                <button type="button" className="btn bs btn-xs" onClick={clearAll}>Temizle</button>
              </div>
            </div>

            <SearchInput value={search} onChange={setSearch} placeholder="Sporcu adı ara..." />

            <div style={{
              marginTop: 10,
              maxHeight: 260, overflowY: 'auto',
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg)',
            }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', position: 'sticky', top: 0 }}>
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={() => allFilteredSelected ? filtered.forEach(a => toggleOne(a.id)) : selectAllFiltered()}
                  aria-label="Tümünü seç"
                />
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {allFilteredSelected ? 'Tümünü Kaldır' : `Görüneni Seç (${filtered.length})`}
                </span>
              </div>
              {filtered.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Sporcu bulunamadı</div>
              ) : (
                filtered.map(a => {
                  const checked = selectedIds.has(a.id)
                  const hasFee = !!(a.monthly_fee && a.monthly_fee > 0)
                  return (
                    <label
                      key={a.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderBottom: '1px solid var(--border)',
                        cursor: 'pointer', fontSize: 13,
                        background: checked ? 'color-mix(in srgb, var(--blue2) 6%, transparent)' : 'transparent',
                      }}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleOne(a.id)} />
                      <Avatar name={`${a.first_name} ${a.last_name}`} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{a.first_name} {a.last_name}</div>
                        <div style={{ fontSize: 11, color: hasFee ? 'var(--text3)' : 'var(--red)' }}>
                          {hasFee ? formatCurrency(a.monthly_fee!) + ' / ay' : 'Aylık ücret tanımsız'}
                        </div>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          {/* Özet */}
          <div style={{ padding: 12, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text2)' }}>Seçili sporcu:</span>
              <strong>{selected.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: 'var(--text2)' }}>Plan dönemi:</span>
              <strong>{months} ay</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: 'var(--text2)' }}>Toplam kayıt:</span>
              <strong>{selected.length * months} adet</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(34,197,94,0.2)' }}>
              <span style={{ color: 'var(--text2)' }}>Aylık brüt gelir:</span>
              <strong style={{ color: 'var(--green)' }}>{formatCurrency(totalAmount)}</strong>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn bs" onClick={onClose} disabled={saving}>İptal</button>
          <button className="btn bp" onClick={handleCreate} disabled={saving || selected.length === 0}>
            {saving ? <Loader2 size={15} className="spin" /> : null} {saving ? 'Oluşturuluyor...' : `${selected.length} Sporcu × ${months} Ay Plan Oluştur`}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </div>
  )
}
