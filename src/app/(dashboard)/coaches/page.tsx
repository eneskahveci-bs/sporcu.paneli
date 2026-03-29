'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Plus, Search, Edit, Trash2, Loader2, Phone, Mail, Key } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, getInitials } from '@/lib/utils/formatters'
import { validateTC } from '@/lib/utils/tc-validation'
import { toast } from 'sonner'
import type { Coach, Sport, Branch } from '@/types'

export default function CoachesPage() {
  const supabase = createClient()
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [sports, setSports] = useState<Sport[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Coach | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    setLoading(true)
    const [{ data: c }, { data: s }, { data: b }] = await Promise.all([
      supabase.from('coaches').select('*, sports(name), branches(name)').eq('organization_id', orgId).order('first_name'),
      supabase.from('sports').select('*').eq('organization_id', orgId).eq('is_active', true),
      supabase.from('branches').select('*').eq('organization_id', orgId).eq('is_active', true),
    ])
    setCoaches(c || [])
    setSports(s || [])
    setBranches(b || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetch() }, [fetch])

  const filtered = coaches.filter(c => {
    const q = search.toLowerCase()
    return !q || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) || c.tc?.includes(q) || c.phone?.includes(q) || ''
  })

  const provisionCoach = async (coachId: string, tc: string) => {
    const res = await window.fetch('/api/provision-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coach_id: coachId, tc }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error('Giriş oluşturulamadı: ' + (data.error || '')); return }
    toast.success(`Giriş oluşturuldu — Kullanıcı adı: ${tc} / İlk şifre: ${tc} (ilk girişte değiştirilecek)`)
    fetch()
  }

  const resetCoachPassword = async (coachId: string, name: string) => {
    if (!confirm(`${name} şifresi TC numarasına sıfırlanacak. Emin misiniz?`)) return
    const res = await window.fetch('/api/reset-user-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'coach', id: coachId }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Şifre sıfırlanamadı'); return }
    toast.success(data.message || 'Şifre başarıyla sıfırlandı')
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('coaches').delete().eq('id', id)
    if (error) { toast.error('Silinemedi'); return }
    toast.success('Antrenör silindi')
    setDeleteId(null)
    fetch()
  }

  return (
    <DashboardLayout title="Antrenörler">
      <div className="page-header">
        <div>
          <h1 className="page-title">Antrenörler</h1>
          <p className="page-subtitle">{coaches.length} antrenör kayıtlı</p>
        </div>
        <button className="btn bp" onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={16} /> Yeni Antrenör
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search className="search-icon" />
          <input placeholder="Ad, TC, telefon ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}><Loader2 size={24} style={{ margin: '0 auto', color: 'var(--text3)', animation: 'spin 1s linear infinite' }} /></div>
      ) : (
        <div className="grid-3">
          {filtered.map(c => (
            <div key={c.id} className="card-hover">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div className="avatar avatar-lg" style={{ background: c.status === 'active' ? 'var(--grad)' : 'var(--bg3)' }}>
                  {getInitials(c.first_name, c.last_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)' }}>{c.first_name} {c.last_name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '8px' }}>{(c.sport as { name: string } | null)?.name || 'Spor dalı belirsiz'}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '11px' }}>
                      {c.status === 'active' ? 'Aktif' : 'Pasif'}
                    </span>
                    <span className={`badge ${c.auth_user_id ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: '11px' }}>
                      {c.auth_user_id ? 'Giriş Var' : 'Giriş Yok'}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {c.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text2)' }}>
                  <Phone size={12} /> {c.phone}
                </div>}
                {c.email && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text2)' }}>
                  <Mail size={12} /> {c.email}
                </div>}
                {c.specialization && <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Uzmanlık: {c.specialization}</div>}
                {c.start_date && <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Başlangıç: {formatDate(c.start_date)}</div>}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                <button className="btn bs btn-sm" style={{ flex: 1 }} onClick={() => { setEditing(c); setShowModal(true) }}><Edit size={13} /> Düzenle</button>
                {!c.auth_user_id && c.tc && (
                  <button className="btn bp btn-sm" onClick={() => provisionCoach(c.id, c.tc!)} title="Giriş Oluştur"><Key size={13} /></button>
                )}
                {c.auth_user_id && (
                  <button className="btn bs btn-sm" onClick={() => resetCoachPassword(c.id, `${c.first_name} ${c.last_name}`)} title="Şifre Sıfırla"><Key size={13} /></button>
                )}
                <button className="btn bd btn-sm" onClick={() => setDeleteId(c.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state-icon">👤</div>
              <div className="empty-state-title">Antrenör bulunamadı</div>
              <div className="empty-state-text">Yeni antrenör ekleyerek başlayın</div>
            </div>
          )}
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Antrenör Sil</h2></div>
            <div className="modal-body"><p style={{ color: 'var(--text2)' }}>Bu antrenörü silmek istediğinizden emin misiniz?</p></div>
            <div className="modal-footer">
              <button className="btn bs" onClick={() => setDeleteId(null)}>İptal</button>
              <button className="btn bd" onClick={() => handleDelete(deleteId)}>Sil</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <CoachModal coach={editing} sports={sports} branches={branches}
          onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetch() }} />
      )}
    </DashboardLayout>
  )
}

function CoachModal({ coach, sports, branches, onClose, onSave }: {
  coach: Coach | null; sports: Sport[]; branches: Branch[]; onClose: () => void; onSave: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: coach?.first_name || '', last_name: coach?.last_name || '',
    tc: coach?.tc || '', phone: coach?.phone || '', email: coach?.email || '',
    address: coach?.address || '', specialization: coach?.specialization || '',
    license_number: coach?.license_number || '', salary: coach?.salary?.toString() || '',
    start_date: coach?.start_date || '', sport_id: coach?.sport_id || '',
    branch_id: coach?.branch_id || '', status: coach?.status || 'active',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.first_name.trim()) errs.first_name = 'Ad gerekli'
    if (!form.last_name.trim()) errs.last_name = 'Soyad gerekli'
    if (form.tc && !validateTC(form.tc)) errs.tc = 'Geçersiz TC Kimlik No'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const payload = { ...form, organization_id: orgId, salary: form.salary ? parseFloat(form.salary) : null, sport_id: form.sport_id || null, branch_id: form.branch_id || null, start_date: form.start_date || null }
    let error
    if (coach) {
      ({ error } = await supabase.from('coaches').update(payload).eq('id', coach.id))
    } else {
      const { data: newCoach, error: insertError } = await supabase.from('coaches').insert(payload).select('id').single()
      error = insertError
      if (!insertError && newCoach && form.tc.length === 11) {
        await window.fetch('/api/provision-coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coach_id: newCoach.id, tc: form.tc }),
        })
      }
    }
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success(coach ? 'Antrenör güncellendi' : 'Antrenör eklendi ve giriş hesabı oluşturuldu')
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{coach ? 'Antrenör Düzenle' : 'Yeni Antrenör'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>
        <div className="modal-body">
          <div className="grid-2" style={{ gap: '14px' }}>
            {[
              { id: 'first_name', label: 'Ad', req: true }, { id: 'last_name', label: 'Soyad', req: true },
              { id: 'phone', label: 'Telefon', type: 'tel' }, { id: 'email', label: 'E-posta', type: 'email' },
              { id: 'specialization', label: 'Uzmanlık' }, { id: 'license_number', label: 'Lisans No' },
              { id: 'start_date', label: 'Başlangıç Tarihi', type: 'date' }, { id: 'salary', label: 'Maaş (₺)', type: 'number' },
            ].map(f => (
              <div key={f.id} className="form-group">
                <label className={`form-label${f.req ? ' required' : ''}`}>{f.label}</label>
                <input type={f.type || 'text'} className={`form-input${errors[f.id] ? ' error' : ''}`}
                  value={(form as Record<string, string>)[f.id]} onChange={e => set(f.id, e.target.value)} />
                {errors[f.id] && <div className="form-error">{errors[f.id]}</div>}
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">TC Kimlik No</label>
              <input type="text" inputMode="numeric" maxLength={11} className={`form-input${errors.tc ? ' error' : ''}`}
                value={form.tc} onChange={e => set('tc', e.target.value.replace(/\D/g, '').slice(0, 11))} />
              {errors.tc && <div className="form-error">{errors.tc}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Durum</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Spor Dalı</label>
              <select className="form-select" value={form.sport_id} onChange={e => set('sport_id', e.target.value)}>
                <option value="">Seçin</option>
                {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Şube</label>
              <select className="form-select" value={form.branch_id} onChange={e => set('branch_id', e.target.value)}>
                <option value="">Seçin</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Adres</label>
              <textarea className="form-input" style={{ minHeight: '72px' }} value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bp" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={15} /> : null} {saving ? 'Kaydediliyor...' : (coach ? 'Güncelle' : 'Ekle')}
          </button>
        </div>
      </div>
    </div>
  )
}
