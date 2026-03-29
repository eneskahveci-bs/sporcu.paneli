'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Plus, Search, Download, Eye, Edit, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency, calculateAge, getInitials } from '@/lib/utils/formatters'
import { validateTC } from '@/lib/utils/tc-validation'
import { toast } from 'sonner'
import type { Athlete, Sport, Class } from '@/types'

const STATUS_LABELS: Record<string, string> = { active: 'Aktif', inactive: 'Pasif', pending: 'Beklemede' }
const STATUS_BADGE: Record<string, string> = { active: 'badge-green', inactive: 'badge-gray', pending: 'badge-yellow' }

export default function AthletesPage() {
  const supabase = createClient()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [sports, setSports] = useState<Sport[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    if (!orgId) return

    setLoading(true)
    const [{ data: a }, { data: s }, { data: c }] = await Promise.all([
      supabase.from('athletes').select('*, sports(name), classes(name), branches(name)')
        .eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('sports').select('*').eq('organization_id', orgId).eq('is_active', true),
      supabase.from('classes').select('*').eq('organization_id', orgId).eq('is_active', true),
    ])
    setAthletes(a || [])
    setSports(s || [])
    setClasses(c || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [])

  const filtered = athletes.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${a.first_name} ${a.last_name}`.toLowerCase().includes(q) || a.tc.includes(q) || a.phone?.includes(q) || ''
    const matchStatus = !statusFilter || a.status === statusFilter
    const matchSport = !sportFilter || a.sport_id === sportFilter
    return matchSearch && matchStatus && matchSport
  })

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('athletes').delete().eq('id', id)
    if (error) { toast.error('Silinemedi: ' + error.message); return }
    toast.success('Sporcu silindi')
    setDeleteId(null)
    fetchData()
  }

  const handleExport = () => {
    const csv = [
      ['Ad', 'Soyad', 'TC', 'Doğum Tarihi', 'Telefon', 'E-posta', 'Durum', 'Kayıt Tarihi'].join(','),
      ...filtered.map(a => [a.first_name, a.last_name, a.tc, a.birth_date || '', a.phone || '', a.email || '', a.status, a.created_at].join(','))
    ].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = 'sporcular.csv'; link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout title="Sporcular">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sporcular</h1>
          <p className="page-subtitle">{athletes.length} sporcu kayıtlı</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn bs btn-sm" onClick={handleExport}><Download size={14} /> CSV</button>
          <button className="btn bp" onClick={() => { setEditingAthlete(null); setShowModal(true) }}>
            <Plus size={16} /> Yeni Sporcu
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search className="search-icon" />
          <input placeholder="Ad, TC, telefon ara..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="form-select" style={{ width: 'auto', minHeight: '40px', padding: '0 12px' }}
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="inactive">Pasif</option>
          <option value="pending">Beklemede</option>
        </select>
        <select className="form-select" style={{ width: 'auto', minHeight: '40px', padding: '0 12px' }}
          value={sportFilter} onChange={e => { setSportFilter(e.target.value); setPage(1) }}>
          <option value="">Tüm Spor Dalları</option>
          {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text3)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          </div>
        ) : paginated.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">Sporcu bulunamadı</div>
            <div className="empty-state-text">Yeni sporcu ekleyin veya arama kriterlerinizi değiştirin</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Sporcu</th>
                <th>TC Kimlik</th>
                <th>Yaş</th>
                <th>Telefon</th>
                <th>Spor Dalı</th>
                <th>Aylık Ücret</th>
                <th>Durum</th>
                <th>Kayıt Tarihi</th>
                <th style={{ textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar avatar-sm">{getInitials(a.first_name, a.last_name)}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{a.first_name} {a.last_name}</div>
                        <div className="ts text-faint">{a.email || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="ts text-muted">{a.tc}</td>
                  <td className="ts">{a.birth_date ? `${calculateAge(a.birth_date)} yaş` : '-'}</td>
                  <td className="ts">{a.phone || '-'}</td>
                  <td className="ts">{(a.sport as { name: string } | null)?.name || '-'}</td>
                  <td className="ts fw-600">{a.monthly_fee ? formatCurrency(a.monthly_fee) : '-'}</td>
                  <td><span className={`badge ${STATUS_BADGE[a.status]}`}>{STATUS_LABELS[a.status]}</span></td>
                  <td className="ts text-faint">{formatDate(a.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <a href={`/athletes/${a.id}`} className="btn bs btn-xs" title="Detay"><Eye size={12} /></a>
                      <button className="btn bs btn-xs" onClick={() => { setEditingAthlete(a); setShowModal(true) }} title="Düzenle"><Edit size={12} /></button>
                      <button className="btn bd btn-xs" onClick={() => setDeleteId(a.id)} title="Sil"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <span>{filtered.length} sporcu</span>
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

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Sporcu Sil</h2></div>
            <div className="modal-body">
              <p style={{ color: 'var(--text2)' }}>Bu sporcuyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
            </div>
            <div className="modal-footer">
              <button className="btn bs" onClick={() => setDeleteId(null)}>İptal</button>
              <button className="btn bd" onClick={() => handleDelete(deleteId)}>Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <AthleteModal
          athlete={editingAthlete}
          sports={sports}
          classes={classes}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchData() }}
        />
      )}
    </DashboardLayout>
  )
}

// ---- Athlete Form Modal ----
function AthleteModal({ athlete, sports, classes, onClose, onSave }: {
  athlete: Athlete | null
  sports: Sport[]
  classes: Class[]
  onClose: () => void
  onSave: () => void
}) {
  const supabase = createClient()
  const [tab, setTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: athlete?.first_name || '',
    last_name: athlete?.last_name || '',
    tc: athlete?.tc || '',
    birth_date: athlete?.birth_date || '',
    gender: athlete?.gender || '',
    phone: athlete?.phone || '',
    email: athlete?.email || '',
    address: athlete?.address || '',
    city: athlete?.city || '',
    sport_id: athlete?.sport_id || '',
    class_id: athlete?.class_id || '',
    category: athlete?.category || '',
    license_number: athlete?.license_number || '',
    monthly_fee: athlete?.monthly_fee?.toString() || '',
    next_payment_date: athlete?.next_payment_date || '',
    parent_name: athlete?.parent_name || '',
    parent_phone: athlete?.parent_phone || '',
    parent_email: athlete?.parent_email || '',
    blood_type: athlete?.blood_type || '',
    height: athlete?.height?.toString() || '',
    weight: athlete?.weight?.toString() || '',
    health_notes: athlete?.health_notes || '',
    emergency_contact: athlete?.emergency_contact || '',
    school: athlete?.school || '',
    status: athlete?.status || 'active',
    notes: athlete?.notes || '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.first_name.trim()) errs.first_name = 'Ad gerekli'
    if (!form.last_name.trim()) errs.last_name = 'Soyad gerekli'
    if (!form.tc.trim()) errs.tc = 'TC gerekli'
    else if (!validateTC(form.tc)) errs.tc = 'Geçersiz TC Kimlik No'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id

    const payload = {
      ...form,
      monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee) : null,
      height: form.height ? parseInt(form.height) : null,
      weight: form.weight ? parseInt(form.weight) : null,
      organization_id: orgId,
      gender: form.gender || null,
      sport_id: form.sport_id || null,
      class_id: form.class_id || null,
      birth_date: form.birth_date || null,
      next_payment_date: form.next_payment_date || null,
    }

    let error
    if (athlete) {
      ({ error } = await supabase.from('athletes').update(payload).eq('id', athlete.id))
    } else {
      ({ error } = await supabase.from('athletes').insert(payload))
    }

    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success(athlete ? 'Sporcu güncellendi' : 'Sporcu eklendi')
    onSave()
  }

  const tabs = ['Kişisel', 'Akademik', 'Finansal', 'Veli', 'Sağlık']

  const renderFormField = (id: string, label: string, type = 'text', req = false, colSpan = false) => (
    <div className="form-group" style={colSpan ? { gridColumn: '1 / -1' } : {}}>
      <label className={`form-label${req ? ' required' : ''}`} htmlFor={id}>{label}</label>
      <input id={id} type={type} className={`form-input${errors[id] ? ' error' : ''}`}
        value={(form as Record<string, string>)[id]} onChange={e => set(id, e.target.value)} aria-required={req} />
      {errors[id] && <div className="form-error">{errors[id]}</div>}
    </div>
  )

  const renderSelectField = (id: string, label: string, options: { value: string; label: string }[], req = false, colSpan = false) => (
    <div className="form-group" style={colSpan ? { gridColumn: '1 / -1' } : {}}>
      <label className={`form-label${req ? ' required' : ''}`} htmlFor={id}>{label}</label>
      <select id={id} className={`form-input${errors[id] ? ' error' : ''}`} value={(form as Record<string, string>)[id]} onChange={e => set(id, e.target.value)} aria-required={req}>
        <option value="">Seçin</option>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      {errors[id] && <div className="form-error">{errors[id]}</div>}
    </div>
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{athlete ? 'Sporcu Düzenle' : 'Yeni Sporcu Ekle'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>

        <div style={{ padding: '0 24px', borderBottom: '1px solid var(--border)' }}>
          <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
            {tabs.map((t, i) => (
              <button key={t} className={`tab-btn${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}>{t}</button>
            ))}
          </div>
        </div>

        <div className="modal-body">
          {tab === 0 && (
            <div className="grid-2">
              {renderFormField("first_name", "Ad", "text", true)}
              {renderFormField("last_name", "Soyad", "text", true)}
              <div className="form-group">
                <label className="form-label required" htmlFor="tc">TC Kimlik No</label>
                <input id="tc" type="text" inputMode="numeric" maxLength={11}
                  className={`form-input${errors.tc ? ' error' : ''}`}
                  value={form.tc} onChange={e => set('tc', e.target.value.replace(/\D/g, '').slice(0, 11))}
                  aria-required="true" />
                {errors.tc && <div className="form-error">{errors.tc}</div>}
              </div>
              {renderFormField("birth_date", "Doğum Tarihi", "date")}
              <div className="form-group">
                <label className="form-label" htmlFor="gender">Cinsiyet</label>
                <select id="gender" className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Seçin</option>
                  <option value="male">Erkek</option>
                  <option value="female">Kadın</option>
                </select>
              </div>
              {renderFormField("phone", "Telefon", "tel")}
              {renderFormField("email", "E-posta", "email")}
              <div className="form-group">
                <label className="form-label" htmlFor="status">Durum</label>
                <select id="status" className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                  <option value="pending">Beklemede</option>
                </select>
              </div>
              {renderFormField("school", "Okul", "text", false, true)}
              {renderFormField("city", "Şehir")}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="address">Adres</label>
                <textarea id="address" className="form-input" style={{ minHeight: '80px' }}
                  value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
            </div>
          )}
          {tab === 1 && (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="sport_id">Spor Dalı</label>
                <select id="sport_id" className="form-select" value={form.sport_id} onChange={e => set('sport_id', e.target.value)}>
                  <option value="">Seçin</option>
                  {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="class_id">Sınıf</label>
                <select id="class_id" className="form-select" value={form.class_id} onChange={e => set('class_id', e.target.value)}>
                  <option value="">Seçin</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {renderFormField("category", "Kategori")}
              {renderFormField("license_number", "Lisans Numarası")}
            </div>
          )}
          {tab === 2 && (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="monthly_fee">Aylık Ücret (₺)</label>
                <input id="monthly_fee" type="number" min="0" className="form-input"
                  value={form.monthly_fee} onChange={e => set('monthly_fee', e.target.value)} />
              </div>
              {renderFormField("next_payment_date", "Sonraki Ödeme Tarihi", "date")}
            </div>
          )}
          {tab === 3 && (
            <div className="grid-2">
              {renderFormField("parent_name", "Veli Adı")}
              {renderFormField("parent_phone", "Veli Telefon", "tel")}
              {renderFormField("parent_email", "Veli E-posta", "email", false, true)}
            </div>
          )}
          {tab === 4 && (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="blood_type">Kan Grubu</label>
                <select id="blood_type" className="form-select" value={form.blood_type} onChange={e => set('blood_type', e.target.value)}>
                  <option value="">Seçin</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              {renderFormField("emergency_contact", "Acil Durum Kişisi")}
              <div className="form-group">
                <label className="form-label" htmlFor="height">Boy (cm)</label>
                <input id="height" type="number" className="form-input" value={form.height} onChange={e => set('height', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="weight">Kilo (kg)</label>
                <input id="weight" type="number" className="form-input" value={form.weight} onChange={e => set('weight', e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="health_notes">Sağlık Notları</label>
                <textarea id="health_notes" className="form-input" style={{ minHeight: '80px' }}
                  value={form.health_notes} onChange={e => set('health_notes', e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="notes">Notlar</label>
                <textarea id="notes" className="form-input" style={{ minHeight: '80px' }}
                  value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bp" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={15} /> : null}
            {saving ? 'Kaydediliyor...' : (athlete ? 'Güncelle' : 'Ekle')}
          </button>
        </div>
      </div>
    </div>
  )
}
