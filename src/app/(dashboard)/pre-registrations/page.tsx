'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatPhone } from '@/lib/utils/formatters'
import { UserPlus, CheckCircle, XCircle, Clock, Eye, Trash2, RefreshCw, Edit, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PreRegistration {
  id: string
  first_name: string
  last_name: string
  tc_no: string | null
  birth_date: string | null
  gender: string | null
  phone: string
  email: string | null
  city: string | null
  sport_interest: string | null
  parent_name: string | null
  parent_phone: string | null
  notes: string | null
  status: 'pending' | 'approved' | 'rejected' | 'converted'
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  converted: 'Sporcu Yapıldı',
}

const STATUS_CLASSES: Record<string, string> = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
  converted: 'badge-info',
}

// ── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ reg, onClose, onSave }: { reg: PreRegistration; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({
    first_name: reg.first_name,
    last_name: reg.last_name,
    tc_no: reg.tc_no || '',
    birth_date: reg.birth_date || '',
    gender: reg.gender || '',
    phone: reg.phone,
    email: reg.email || '',
    city: reg.city || '',
    sport_interest: reg.sport_interest || '',
    parent_name: reg.parent_name || '',
    parent_phone: reg.parent_phone || '',
    notes: reg.notes || '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('pre_registrations').update({
      first_name: form.first_name,
      last_name: form.last_name,
      tc_no: form.tc_no || null,
      birth_date: form.birth_date || null,
      gender: form.gender || null,
      phone: form.phone,
      email: form.email || null,
      city: form.city || null,
      sport_interest: form.sport_interest || null,
      parent_name: form.parent_name || null,
      parent_phone: form.parent_phone || null,
      notes: form.notes || null,
    }).eq('id', reg.id)
    setLoading(false)
    if (error) { toast.error('Kaydedilemedi: ' + error.message); return }
    toast.success('Güncellendi')
    onSave()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Ön Kayıt Düzenle</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSave} style={{ padding: '1.25rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label required">Ad</label>
              <input className="form-input" value={form.first_name} onChange={e => set('first_name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label required">Soyad</label>
              <input className="form-input" value={form.last_name} onChange={e => set('last_name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">TC Kimlik No</label>
              <input className="form-input" maxLength={11} inputMode="numeric"
                value={form.tc_no} onChange={e => set('tc_no', e.target.value.replace(/\D/g, '').slice(0, 11))} />
            </div>
            <div className="form-group">
              <label className="form-label">Doğum Tarihi</label>
              <input className="form-input" type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Cinsiyet</label>
              <select className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">Seçiniz</option>
                <option value="male">Erkek</option>
                <option value="female">Kız</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Telefon</label>
              <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">E-posta</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Şehir</label>
              <input className="form-input" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Spor Dalı</label>
              <input className="form-input" value={form.sport_interest} onChange={e => set('sport_interest', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Veli Adı</label>
              <input className="form-input" value={form.parent_name} onChange={e => set('parent_name', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Veli Telefonu</label>
            <input className="form-input" value={form.parent_phone} onChange={e => set('parent_phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Notlar</label>
            <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn bd" style={{ flex: 1 }} onClick={onClose}>İptal</button>
            <button type="submit" className="btn bp" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }} disabled={loading}>
              {loading && <Loader2 size={15} className="animate-spin" />}
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Convert Modal ────────────────────────────────────────────────────────────
function ConvertModal({ reg, onClose, onConverted }: { reg: PreRegistration; onClose: () => void; onConverted: () => void }) {
  const [form, setForm] = useState({
    first_name: reg.first_name,
    last_name: reg.last_name,
    tc: reg.tc_no || '',
    birth_date: reg.birth_date || '',
    gender: reg.gender || '',
    phone: reg.phone,
    email: reg.email || '',
    city: reg.city || '',
    notes: reg.notes || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.tc || form.tc.length !== 11) { setError('TC Kimlik No (11 hane) zorunludur'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/convert-to-athlete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pre_registration_id: reg.id, ...form }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Bir hata oluştu'); return }
      toast.success('Sporcu kaydı oluşturuldu!')
      onConverted()
      onClose()
    } catch {
      setError('Bağlantı hatası')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Sporcuya Aktar</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: '0 1.5rem 0.75rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text2)' }}>
            Bu ön kayıt, sporcular listesine aktarılacak ve giriş hesabı oluşturulacak.
          </p>
        </div>
        <form onSubmit={handleConvert} style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label required">Ad</label>
              <input className="form-input" value={form.first_name} onChange={e => set('first_name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label required">Soyad</label>
              <input className="form-input" value={form.last_name} onChange={e => set('last_name', e.target.value)} required />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label required">TC Kimlik No <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text3)' }}>(Giriş şifresi: son 6 hane)</span></label>
              <input className="form-input" maxLength={11} inputMode="numeric" placeholder="11 haneli TC Kimlik No"
                value={form.tc} onChange={e => set('tc', e.target.value.replace(/\D/g, '').slice(0, 11))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Doğum Tarihi</label>
              <input className="form-input" type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Cinsiyet</label>
              <select className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">Seçiniz</option>
                <option value="male">Erkek</option>
                <option value="female">Kız</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Telefon</label>
              <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">E-posta</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          {error && (
            <div style={{ fontSize: '0.8125rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', padding: '0.625rem 0.875rem', borderRadius: '0.375rem' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn bd" style={{ flex: 1 }} onClick={onClose}>İptal</button>
            <button type="submit" className="btn bp" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }} disabled={loading}>
              {loading && <Loader2 size={15} className="animate-spin" />}
              <UserPlus size={15} />
              Sporcuya Aktar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function PreRegistrationsPage() {
  const supabase = createClient()
  const [registrations, setRegistrations] = useState<PreRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PreRegistration | null>(null)
  const [editReg, setEditReg] = useState<PreRegistration | null>(null)
  const [convertReg, setConvertReg] = useState<PreRegistration | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('pre_registrations')
      .select('*')
      .order('created_at', { ascending: false })
    if (filterStatus !== 'all') q = q.eq('status', filterStatus)
    const { data } = await q
    setRegistrations(data || [])
    setLoading(false)
  }, [supabase, filterStatus])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('pre_registrations').update({ status }).eq('id', id)
    load()
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: status as PreRegistration['status'] } : null)
  }

  const deleteReg = async (id: string) => {
    if (!confirm('Bu ön kaydı silmek istediğinize emin misiniz?')) return
    await supabase.from('pre_registrations').delete().eq('id', id)
    load()
    if (selected?.id === id) setSelected(null)
  }

  const filtered = registrations.filter(r => {
    const fullName = `${r.first_name} ${r.last_name}`.toLowerCase()
    return fullName.includes(search.toLowerCase()) || r.phone.includes(search) || (r.email?.toLowerCase().includes(search.toLowerCase()))
  })

  const counts = {
    all: registrations.length,
    pending: registrations.filter(r => r.status === 'pending').length,
    approved: registrations.filter(r => r.status === 'approved').length,
    rejected: registrations.filter(r => r.status === 'rejected').length,
    converted: registrations.filter(r => r.status === 'converted').length,
  }

  return (
    <DashboardLayout>
      {editReg && <EditModal reg={editReg} onClose={() => setEditReg(null)} onSave={load} />}
      {convertReg && (
        <ConvertModal
          reg={convertReg}
          onClose={() => setConvertReg(null)}
          onConverted={() => { load(); setSelected(null) }}
        />
      )}

      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Ön Kayıtlar</h1>
            <p className="page-subtitle">Online ön kayıt başvurularını yönetin</p>
          </div>
          <button onClick={load} className="btn bd" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={16} /> Yenile
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Bekleyen', count: counts.pending, icon: Clock, color: '#f59e0b' },
            { label: 'Onaylanan', count: counts.approved, icon: CheckCircle, color: '#22c55e' },
            { label: 'Reddedilen', count: counts.rejected, icon: XCircle, color: '#ef4444' },
            { label: 'Sporcu Yapılan', count: counts.converted, icon: UserPlus, color: 'var(--blue2)' },
          ].map((s, i) => (
            <div key={i} className="stats-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>{s.label}</div>
                </div>
                <s.icon size={28} style={{ color: s.color, opacity: 0.7 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {/* List */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <input
                className="form-input"
                placeholder="İsim, telefon veya e-posta ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: '200px' }}
              />
              <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto' }}>
                <option value="all">Tümü ({counts.all})</option>
                <option value="pending">Bekleyen ({counts.pending})</option>
                <option value="approved">Onaylanan ({counts.approved})</option>
                <option value="rejected">Reddedilen ({counts.rejected})</option>
                <option value="converted">Sporcu Yapılan ({counts.converted})</option>
              </select>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)' }}>Yükleniyor...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
                <div>Ön kayıt bulunamadı</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ad Soyad</th>
                      <th>Telefon</th>
                      <th>Spor Dalı</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(r)}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.first_name} {r.last_name}</div>
                          {r.email && <div style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>{r.email}</div>}
                        </td>
                        <td>{formatPhone(r.phone)}</td>
                        <td>{r.sport_interest || <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                        <td><span className={`badge ${STATUS_CLASSES[r.status]}`}>{STATUS_LABELS[r.status]}</span></td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>{formatDate(r.created_at)}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => setSelected(r)} className="icon-btn" title="Detay"><Eye size={14} /></button>
                            <button onClick={() => setEditReg(r)} className="icon-btn" title="Düzenle"><Edit size={14} /></button>
                            {r.status !== 'converted' && (
                              <button onClick={() => setConvertReg(r)} className="icon-btn" title="Sporcuya Aktar" style={{ color: 'var(--blue2)' }}>
                                <UserPlus size={14} />
                              </button>
                            )}
                            <button onClick={() => deleteReg(r.id)} className="icon-btn danger" title="Sil"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div style={{ width: '340px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '0.75rem', padding: '1.5rem', height: 'fit-content', position: 'sticky', top: '80px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{selected.first_name} {selected.last_name}</h3>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '1.25rem', lineHeight: 1 }}>×</button>
              </div>

              <span className={`badge ${STATUS_CLASSES[selected.status]}`} style={{ marginBottom: '1.25rem', display: 'inline-block' }}>
                {STATUS_LABELS[selected.status]}
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'TC No', value: selected.tc_no },
                  { label: 'Doğum Tarihi', value: selected.birth_date ? formatDate(selected.birth_date) : null },
                  { label: 'Cinsiyet', value: selected.gender === 'male' ? 'Erkek' : selected.gender === 'female' ? 'Kız' : null },
                  { label: 'Telefon', value: formatPhone(selected.phone) },
                  { label: 'E-posta', value: selected.email },
                  { label: 'Şehir', value: selected.city },
                  { label: 'Spor Dalı', value: selected.sport_interest },
                  { label: 'Veli', value: selected.parent_name },
                  { label: 'Veli Tel', value: selected.parent_phone ? formatPhone(selected.parent_phone) : null },
                ].filter(f => f.value).map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text3)', flexShrink: 0 }}>{f.label}</span>
                    <span style={{ fontWeight: 500, textAlign: 'right', wordBreak: 'break-word' }}>{f.value}</span>
                  </div>
                ))}
                {selected.notes && (
                  <div style={{ fontSize: '0.875rem', padding: '0.75rem', background: 'var(--bg4)', borderRadius: '0.375rem', marginTop: '0.25rem' }}>
                    <div style={{ color: 'var(--text3)', marginBottom: '0.25rem', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Notlar</div>
                    {selected.notes}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {/* Edit button always visible */}
                <button onClick={() => setEditReg(selected)} className="btn bd" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                  <Edit size={15} /> Düzenle
                </button>

                {selected.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.625rem' }}>
                    <button onClick={() => updateStatus(selected.id, 'approved')} className="btn bs" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                      <CheckCircle size={15} /> Onayla
                    </button>
                    <button onClick={() => updateStatus(selected.id, 'rejected')} className="btn bd" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', color: '#ef4444' }}>
                      <XCircle size={15} /> Reddet
                    </button>
                  </div>
                )}

                {selected.status !== 'converted' && (
                  <button onClick={() => setConvertReg(selected)} className="btn bp" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <UserPlus size={15} /> Sporcuya Aktar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .modal-box { background: var(--bg2); border: 1px solid var(--border2); border-radius: 0.75rem; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: fadeIn 0.18s ease; }
        .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); }
        .modal-head h3 { font-size: 1rem; font-weight: 700; color: var(--text); }
        @keyframes fadeIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
      `}</style>
    </DashboardLayout>
  )
}
