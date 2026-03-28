'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Plus, Edit, Trash2, Loader2, MapPin, Phone, Mail, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Branch } from '@/types'

type BranchWithCount = Branch & { athlete_count?: number; manager_name?: string; email?: string; city?: string }

export default function BranchesPage() {
  const supabase = createClient()
  const [branches, setBranches] = useState<BranchWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<BranchWithCount | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    setLoading(true)
    const [{ data: br }, { data: athletes }] = await Promise.all([
      supabase.from('branches').select('*').eq('organization_id', orgId).order('name'),
      supabase.from('athletes').select('branch_id').eq('organization_id', orgId).eq('status', 'active'),
    ])
    const countMap: Record<string, number> = {}
    ;(athletes || []).forEach(a => { if (a.branch_id) countMap[a.branch_id] = (countMap[a.branch_id] || 0) + 1 })
    setBranches((br || []).map(b => ({ ...b, athlete_count: countMap[b.id] || 0 })))
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('branches').delete().eq('id', id)
    if (error) { toast.error('Silinemedi: ' + error.message); return }
    toast.success('Şube silindi')
    setDeleteId(null)
    fetchData()
  }

  const toggleActive = async (b: BranchWithCount) => {
    await supabase.from('branches').update({ is_active: !b.is_active }).eq('id', b.id)
    fetchData()
  }

  return (
    <DashboardLayout title="Şubeler">
      <div className="page-header">
        <div>
          <h1 className="page-title">Şubeler</h1>
          <p className="page-subtitle">{branches.length} şube tanımlı</p>
        </div>
        <button className="btn bp" onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={16} /> Yeni Şube
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <Loader2 size={24} style={{ margin: '0 auto', color: 'var(--text3)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : branches.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">🏢</div>
          <div className="empty-state-title">Henüz şube eklenmemiş</div>
          <div className="empty-state-text">Yeni şube ekleyerek başlayın</div>
        </div>
      ) : (
        <div className="grid-3">
          {branches.map(b => (
            <div key={b.id} className="card-hover" style={{ opacity: b.is_active ? 1 : 0.65 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: b.is_active ? 'var(--grad)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  🏢
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '16px' }}>{b.name}</div>
                  <span className={`badge ${b.is_active ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '11px', marginTop: '4px' }}>
                    {b.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                {b.address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '13px', color: 'var(--text2)' }}>
                    <MapPin size={13} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>{b.address}{b.city ? `, ${b.city}` : ''}</span>
                  </div>
                )}
                {b.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--text2)' }}>
                    <Phone size={13} /> {b.phone}
                  </div>
                )}
                {(b as BranchWithCount).email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--text2)' }}>
                    <Mail size={13} /> {(b as BranchWithCount).email}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--text3)' }}>
                  <Users size={13} /> {b.athlete_count} aktif sporcu
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <button className="btn bs btn-sm" style={{ flex: 1 }} onClick={() => toggleActive(b)}>
                  {b.is_active ? 'Pasife Al' : 'Aktife Al'}
                </button>
                <button className="btn bs btn-sm" onClick={() => { setEditing(b); setShowModal(true) }}><Edit size={13} /></button>
                <button className="btn bd btn-sm" onClick={() => setDeleteId(b.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Şube Sil</h2></div>
            <div className="modal-body">
              <p style={{ color: 'var(--text2)' }}>Bu şubeyi silmek istediğinizden emin misiniz? Şubeye kayıtlı sporcuların şubesi boşaltılacak.</p>
            </div>
            <div className="modal-footer">
              <button className="btn bs" onClick={() => setDeleteId(null)}>İptal</button>
              <button className="btn bd" onClick={() => handleDelete(deleteId)}>Sil</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <BranchModal
          branch={editing}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchData() }}
        />
      )}
    </DashboardLayout>
  )
}

function BranchModal({ branch, onClose, onSave }: { branch: BranchWithCount | null; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: branch?.name || '',
    address: branch?.address || '',
    city: (branch as BranchWithCount | null)?.city || '',
    phone: branch?.phone || '',
    email: (branch as BranchWithCount | null)?.email || '',
    manager_name: (branch as BranchWithCount | null)?.manager_name || '',
    is_active: branch?.is_active ?? true,
  })
  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Şube adı gerekli'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    let error
    if (branch) {
      ({ error } = await supabase.from('branches').update({ ...form, organization_id: orgId }).eq('id', branch.id))
    } else {
      ({ error } = await supabase.from('branches').insert({ ...form, organization_id: orgId }))
    }
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success(branch ? 'Şube güncellendi' : 'Şube eklendi')
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{branch ? 'Şube Düzenle' : 'Yeni Şube'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>
        <div className="modal-body">
          <div className="grid-2" style={{ gap: '14px' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label required">Şube Adı</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Örn: Merkez Şube" />
            </div>
            <div className="form-group">
              <label className="form-label">Telefon</label>
              <input className="form-input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">E-posta</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Şube Müdürü</label>
              <input className="form-input" value={form.manager_name} onChange={e => set('manager_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Şehir</label>
              <input className="form-input" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Adres</label>
              <textarea className="form-input" style={{ minHeight: '72px' }} value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Durum</label>
              <select className="form-select" value={form.is_active ? 'active' : 'inactive'} onChange={e => set('is_active', e.target.value === 'active')}>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bp" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {saving ? 'Kaydediliyor...' : (branch ? 'Güncelle' : 'Ekle')}
          </button>
        </div>
      </div>
    </div>
  )
}
