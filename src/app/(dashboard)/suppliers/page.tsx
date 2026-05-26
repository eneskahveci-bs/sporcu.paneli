'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, Trash2, Edit, Truck, Phone, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { CardGridSkeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import { formatCurrency } from '@/lib/utils/formatters'

interface Supplier {
  id: string; name: string; tax_no?: string; tax_office?: string
  phone?: string; email?: string; address?: string; notes?: string; is_active: boolean
}

export default function SuppliersPage() {
  const supabase = createClient()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [spentMap, setSpentMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const [{ data: s }, { data: e }] = await Promise.all([
      supabase.from('suppliers').select('*').eq('organization_id', orgId).order('name'),
      supabase.from('expenses').select('supplier_id, amount').eq('organization_id', orgId).not('supplier_id', 'is', null),
    ])
    setSuppliers((s || []) as Supplier[])
    const m: Record<string, number> = {}
    ;((e || []) as { supplier_id: string; amount: number }[]).forEach(x => { m[x.supplier_id] = (m[x.supplier_id] || 0) + x.amount })
    setSpentMap(m)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const remove = async (id: string) => {
    if (!await confirmDialog({ title: 'Tedarikçi silinsin mi?', variant: 'danger', confirmText: 'Sil' })) return
    await supabase.from('suppliers').delete().eq('id', id)
    toast.success('Silindi'); fetchData()
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return suppliers.filter(s => !q || s.name.toLowerCase().includes(q) || (s.tax_no || '').includes(q))
  }, [suppliers, search])

  return (
    <DashboardLayout title="Tedarikçiler">
      <PageHeader title="Tedarikçiler / Cari" subtitle={`${suppliers.length} cari hesap`}
        actions={<button className="btn bp" onClick={() => { setEditing(null); setShowModal(true) }}><Plus size={16} /> Yeni Tedarikçi</button>} />

      <div style={{ marginBottom: 16 }}><SearchInput value={search} onChange={setSearch} placeholder="İsim veya vergi no ara..." /></div>

      {loading ? <CardGridSkeleton count={6} height={60} /> : filtered.length === 0 ? (
        <EmptyState icon={<Truck size={28} />} title="Tedarikçi yok" description="Mal/hizmet aldığınız firmaları cari hesap olarak ekleyin." />
      ) : (
        <div className="grid-3">
          {filtered.map(s => (
            <div key={s.id} className="card" style={{ padding: 16, opacity: s.is_active ? 1 : 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Avatar name={s.name} size={40} shape="rounded" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                  {s.tax_no && <div style={{ fontSize: 11, color: 'var(--text3)' }}>VKN: {s.tax_no}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                {s.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={12} /> {s.phone}</span>}
                {s.email && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Mail size={12} /> {s.email}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Toplam alış</div>
                  <div style={{ fontWeight: 700, color: 'var(--red)' }}>{formatCurrency(spentMap[s.id] || 0)}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn bs btn-xs" onClick={() => { setEditing(s); setShowModal(true) }}><Edit size={11} /></button>
                  <button className="btn bd btn-xs" onClick={() => remove(s.id)}><Trash2 size={11} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <SupplierModal supplier={editing} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchData() }} />}
    </DashboardLayout>
  )
}

function SupplierModal({ supplier, onClose, onSave }: { supplier: Supplier | null; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: supplier?.name || '', tax_no: supplier?.tax_no || '', tax_office: supplier?.tax_office || '',
    phone: supplier?.phone || '', email: supplier?.email || '', address: supplier?.address || '', notes: supplier?.notes || '',
  })

  const save = async () => {
    if (!form.name.trim()) { toast.error('İsim gerekli'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const payload = { organization_id: orgId, ...form, is_active: true }
    let error
    if (supplier) ({ error } = await supabase.from('suppliers').update(payload).eq('id', supplier.id))
    else ({ error } = await supabase.from('suppliers').insert(payload))
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(supplier ? 'Güncellendi' : 'Eklendi'); onSave()
  }

  return (
    <Modal open onClose={onClose} title={supplier ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi'} size="md"
      footer={<><button className="btn bs" onClick={onClose}>İptal</button><button className="btn bp" onClick={save} disabled={saving}>{saving ? <Loader2 size={14} className="spin" /> : null} Kaydet</button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="form-group"><label className="form-label required">Firma / Kişi Adı</label><input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="form-label">Vergi No</label><input className="form-input" value={form.tax_no} onChange={e => setForm(p => ({ ...p, tax_no: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Vergi Dairesi</label><input className="form-input" value={form.tax_office} onChange={e => setForm(p => ({ ...p, tax_office: e.target.value }))} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="form-label">Telefon</label><input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">E-posta</label><input className="form-input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
        </div>
        <div className="form-group"><label className="form-label">Adres</label><textarea className="form-input" rows={2} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Notlar</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
      </div>
    </Modal>
  )
}
