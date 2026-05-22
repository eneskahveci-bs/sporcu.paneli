'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, Trash2, Edit, Receipt, Tag, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'

interface Category { id: string; name: string; color: string; is_active: boolean }
interface Supplier { id: string; name: string }
interface Account { id: string; name: string; type: string }
interface Expense {
  id: string
  description: string
  amount: number
  vat_rate: number
  vat_amount: number
  status: string
  expense_date: string
  document_no?: string
  category_id?: string
  supplier_id?: string
  account_id?: string
  category?: { name: string; color: string }
  supplier?: { name: string }
  account?: { name: string }
}

export default function ExpensesPage() {
  const supabase = createClient()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const [{ data: e }, { data: c }, { data: s }, { data: a }] = await Promise.all([
      supabase.from('expenses').select('*, category:expense_categories(name,color), supplier:suppliers(name), account:cash_accounts(name)').eq('organization_id', orgId).order('expense_date', { ascending: false }),
      supabase.from('expense_categories').select('*').eq('organization_id', orgId).order('name'),
      supabase.from('suppliers').select('id, name').eq('organization_id', orgId).eq('is_active', true).order('name'),
      supabase.from('cash_accounts').select('id, name, type').eq('organization_id', orgId).eq('is_active', true).order('name'),
    ])
    setExpenses((e || []) as Expense[])
    setCategories((c || []) as Category[])
    setSuppliers((s || []) as Supplier[])
    setAccounts((a || []) as Account[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (id: string) => {
    if (!await confirmDialog({ title: 'Gider silinsin mi?', variant: 'danger', confirmText: 'Sil' })) return
    await supabase.from('expenses').delete().eq('id', id)
    toast.success('Silindi'); fetchData()
  }

  const filtered = useMemo(() => expenses.filter(e => {
    const q = search.toLowerCase()
    const ms = !q || e.description.toLowerCase().includes(q) || (e.supplier?.name || '').toLowerCase().includes(q)
    const mc = !catFilter || e.category_id === catFilter
    return ms && mc
  }), [expenses, search, catFilter])

  const total = filtered.reduce((s, e) => s + e.amount, 0)
  const totalVat = filtered.reduce((s, e) => s + (e.vat_amount || 0), 0)

  return (
    <DashboardLayout title="Giderler">
      <PageHeader
        title="Giderler"
        subtitle={`${filtered.length} kayıt · Toplam ${formatCurrency(total)} (KDV ${formatCurrency(totalVat)})`}
        actions={
          <>
            <button className="btn bs" onClick={() => setShowCatModal(true)}><Settings2 size={15} /> Kategoriler</button>
            <button className="btn bp" onClick={() => { setEditing(null); setShowModal(true) }}><Plus size={16} /> Yeni Gider</button>
          </>
        }
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Açıklama, tedarikçi ara..." />
        <select className="form-select" style={{ width: 'auto', minHeight: 38, padding: '0 12px' }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">Tüm Kategoriler</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? <TableSkeleton rows={6} cols={6} /> : filtered.length === 0 ? (
        <EmptyState icon={<Receipt size={28} />} title="Gider kaydı yok" description="İlk giderinizi ekleyerek başlayın." action={<button className="btn bp" onClick={() => setShowModal(true)}><Plus size={15} /> Yeni Gider</button>} />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="table">
            <thead><tr><th>Tarih</th><th>Açıklama</th><th>Kategori</th><th>Tedarikçi</th><th>Kasa</th><th style={{ textAlign: 'right' }}>Tutar</th><th></th></tr></thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td style={{ fontSize: 12, color: 'var(--text3)' }}>{formatDate(e.expense_date)}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{e.description}</div>
                    {e.document_no && <div style={{ fontSize: 11, color: 'var(--text3)' }}>Belge: {e.document_no}</div>}
                  </td>
                  <td>
                    {e.category ? (
                      <span className="badge badge-sm" style={{ background: `color-mix(in srgb, ${e.category.color} 16%, transparent)`, color: e.category.color }}>{e.category.name}</span>
                    ) : '-'}
                  </td>
                  <td style={{ fontSize: 13 }}>{e.supplier?.name || '-'}</td>
                  <td style={{ fontSize: 13 }}>{e.account?.name || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>
                    -{formatCurrency(e.amount)}
                    {e.vat_amount > 0 && <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>KDV {formatCurrency(e.vat_amount)}</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn bs btn-xs" onClick={() => { setEditing(e); setShowModal(true) }}><Edit size={11} /></button>
                      <button className="btn bd btn-xs" onClick={() => handleDelete(e.id)}><Trash2 size={11} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ExpenseModal expense={editing} categories={categories} suppliers={suppliers} accounts={accounts}
          onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchData() }} />
      )}
      {showCatModal && (
        <CategoryModal categories={categories} onClose={() => setShowCatModal(false)} onChange={fetchData} />
      )}
    </DashboardLayout>
  )
}

function ExpenseModal({ expense, categories, suppliers, accounts, onClose, onSave }: {
  expense: Expense | null; categories: Category[]; suppliers: Supplier[]; accounts: Account[]; onClose: () => void; onSave: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    description: expense?.description || '',
    amount: expense?.amount?.toString() || '',
    vat_rate: expense?.vat_rate?.toString() || '0',
    category_id: expense?.category_id || '',
    supplier_id: expense?.supplier_id || '',
    account_id: expense?.account_id || '',
    expense_date: expense?.expense_date || new Date().toISOString().slice(0, 10),
    document_no: expense?.document_no || '',
    status: expense?.status || 'paid',
  })

  const amount = parseFloat(form.amount) || 0
  const vatRate = parseFloat(form.vat_rate) || 0
  // KDV dahil tutardan KDV'yi ayır
  const vatAmount = amount - (amount / (1 + vatRate / 100))

  const save = async () => {
    if (!form.description.trim() || !form.amount) { toast.error('Açıklama ve tutar gerekli'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const payload = {
      organization_id: orgId,
      description: form.description,
      amount,
      vat_rate: vatRate,
      vat_amount: Math.round(vatAmount * 100) / 100,
      category_id: form.category_id || null,
      supplier_id: form.supplier_id || null,
      account_id: form.account_id || null,
      expense_date: form.expense_date,
      document_no: form.document_no || null,
      status: form.status,
      created_by: user!.id,
    }
    let error
    if (expense) ({ error } = await supabase.from('expenses').update(payload).eq('id', expense.id))
    else ({ error } = await supabase.from('expenses').insert(payload))

    // Kasa hareketi oluştur (kasa seçiliyse ve ödendi ise)
    if (!error && !expense && form.account_id && form.status === 'paid') {
      await supabase.from('account_transactions').insert({
        organization_id: orgId, account_id: form.account_id, direction: 'out',
        amount, description: form.description, category: 'Gider',
        occurred_at: form.expense_date, created_by: user!.id,
      })
    }
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success(expense ? 'Güncellendi' : 'Gider eklendi'); onSave()
  }

  return (
    <Modal open onClose={onClose} title={expense ? 'Gideri Düzenle' : 'Yeni Gider'} size="md"
      footer={<><button className="btn bs" onClick={onClose}>İptal</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? <Loader2 size={14} className="spin" /> : null} Kaydet</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="form-group"><label className="form-label required">Açıklama</label><input className="form-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Örn: Salon kirası" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="form-label required">Tutar (KDV dahil ₺)</label><input type="number" step="0.01" className="form-input" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">KDV %</label>
            <select className="form-select" value={form.vat_rate} onChange={e => setForm(p => ({ ...p, vat_rate: e.target.value }))}>
              {['0', '1', '10', '20'].map(r => <option key={r} value={r}>%{r}</option>)}
            </select>
          </div>
        </div>
        {vatRate > 0 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>KDV tutarı: {formatCurrency(Math.round(vatAmount * 100) / 100)} · Matrah: {formatCurrency(Math.round((amount - vatAmount) * 100) / 100)}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="form-label">Kategori</label>
            <select className="form-select" value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}>
              <option value="">Seçin...</option>
              {categories.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Tedarikçi</label>
            <select className="form-select" value={form.supplier_id} onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value }))}>
              <option value="">Seçin...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="form-label">Kasa / Banka</label>
            <select className="form-select" value={form.account_id} onChange={e => setForm(p => ({ ...p, account_id: e.target.value }))}>
              <option value="">Seçin...</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Tarih</label><input type="date" className="form-input" value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="form-label">Belge No</label><input className="form-input" value={form.document_no} onChange={e => setForm(p => ({ ...p, document_no: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Durum</label>
            <select className="form-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <option value="paid">Ödendi</option>
              <option value="pending">Bekliyor</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function CategoryModal({ categories, onClose, onChange }: { categories: Category[]; onClose: () => void; onChange: () => void }) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#64748b')
  const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#0ea5e9']

  const add = async () => {
    if (!name.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const { error } = await supabase.from('expense_categories').insert({ organization_id: orgId, name, color })
    if (error) { toast.error(error.message); return }
    setName(''); toast.success('Kategori eklendi'); onChange()
  }
  const remove = async (id: string) => {
    if (!await confirmDialog({ title: 'Kategori silinsin mi?', variant: 'danger', confirmText: 'Sil' })) return
    await supabase.from('expense_categories').delete().eq('id', id); onChange()
  }

  return (
    <Modal open onClose={onClose} title="Gider Kategorileri" size="sm">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Kategori adı (Kira, Maaş...)" style={{ flex: 1 }} />
        <button className="btn bp" onClick={add}><Plus size={14} /></button>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)} aria-label={c} style={{ width: 26, height: 26, borderRadius: 6, background: c, border: color === c ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflow: 'auto' }}>
        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: 16 }}>Henüz kategori yok</div>
        ) : categories.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: c.color }} />
            <Tag size={13} color="var(--text3)" />
            <span style={{ flex: 1, fontSize: 13 }}>{c.name}</span>
            <button className="btn bd btn-xs" onClick={() => remove(c.id)}><Trash2 size={11} /></button>
          </div>
        ))}
      </div>
    </Modal>
  )
}
