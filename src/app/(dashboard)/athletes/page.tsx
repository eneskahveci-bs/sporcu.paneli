'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Plus, Search, Filter, Download, Upload, Eye, Edit, Trash2, Loader2, Key } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency, calculateAge, getInitials } from '@/lib/utils/formatters'
import { validateTC } from '@/lib/utils/tc-validation'
import { toast } from 'sonner'
import type { Athlete, Sport, Class, Branch } from '@/types'

const STATUS_LABELS: Record<string, string> = { active: 'Aktif', inactive: 'Pasif', pending: 'Beklemede' }
const STATUS_BADGE: Record<string, string> = { active: 'badge-green', inactive: 'badge-gray', pending: 'badge-yellow' }

export default function AthletesPage() {
  const supabase = createClient()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [sports, setSports] = useState<Sport[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [importing, setImporting] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const PER_PAGE = 20

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    if (!orgId) return

    setLoading(true)
    const [{ data: a }, { data: s }, { data: c }, { data: br }] = await Promise.all([
      supabase.from('athletes').select('*, sports(name), classes(name), branches(name)')
        .eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('sports').select('*').eq('organization_id', orgId).eq('is_active', true),
      supabase.from('classes').select('*').eq('organization_id', orgId).eq('is_active', true),
      supabase.from('branches').select('*').eq('organization_id', orgId).eq('is_active', true),
    ])
    setAthletes(a || [])
    setSports(s || [])
    setClasses(c || [])
    setBranches(br || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = athletes.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${a.first_name} ${a.last_name}`.toLowerCase().includes(q) || a.tc.includes(q) || a.phone?.includes(q) || ''
    const matchStatus = !statusFilter || a.status === statusFilter
    const matchSport = !sportFilter || a.sport_id === sportFilter
    const matchBranch = !branchFilter || a.branch_id === branchFilter
    return matchSearch && matchStatus && matchSport && matchBranch
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

  const provisionAthlete = async (athleteId: string, tc: string) => {
    const res = await fetch('/api/provision-athlete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athlete_id: athleteId, tc }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error('Giriş oluşturulamadı: ' + (data.error || '')); return }
    toast.success(`Giriş oluşturuldu — Kullanıcı: ${tc}@sporcu.tc / Şifre: ${tc.slice(-6)}`)
    fetchData()
  }

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(a => ({
      'Ad': a.first_name,
      'Soyad': a.last_name,
      'TC Kimlik': a.tc,
      'Doğum Tarihi': a.birth_date || '',
      'Cinsiyet': a.gender === 'male' ? 'Erkek' : a.gender === 'female' ? 'Kadın' : '',
      'Telefon': a.phone || '',
      'E-posta': a.email || '',
      'Okul': a.school || '',
      'Şehir': a.city || '',
      'Spor Dalı': (a.sport as { name: string } | null)?.name || '',
      'Sınıf': (a.class as { name: string } | null)?.name || '',
      'Aylık Ücret': a.monthly_fee || '',
      'Durum': STATUS_LABELS[a.status] || a.status,
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sporcular')
    XLSX.writeFile(wb, 'sporcular.xlsx')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

        const { data: { user } } = await supabase.auth.getUser()
        const orgId = user?.user_metadata?.organization_id

        const toInsert = rows
          .filter(r => r['Ad'] && r['Soyad'])
          .map(r => {
            const rawGender = String(r['Cinsiyet'] || '')
            const rawStatus = String(r['Durum'] || '')
            const sportName = String(r['Spor Dalı'] || '')
            const className = String(r['Sınıf'] || '')
            const birthVal = r['Doğum Tarihi']
            const birthDate = birthVal instanceof Date
              ? birthVal.toISOString().slice(0, 10)
              : birthVal ? String(birthVal).slice(0, 10) : null
            return {
              organization_id: orgId,
              first_name: String(r['Ad']).trim(),
              last_name: String(r['Soyad']).trim(),
              tc: r['TC Kimlik'] ? String(r['TC Kimlik']).trim() : '',
              birth_date: birthDate,
              gender: rawGender === 'Erkek' ? 'male' : rawGender === 'Kadın' ? 'female' : null,
              phone: r['Telefon'] ? String(r['Telefon']).trim() : null,
              email: r['E-posta'] ? String(r['E-posta']).trim() : null,
              school: r['Okul'] ? String(r['Okul']).trim() : null,
              city: r['Şehir'] ? String(r['Şehir']).trim() : null,
              monthly_fee: r['Aylık Ücret'] ? parseFloat(String(r['Aylık Ücret'])) : null,
              sport_id: sports.find(s => s.name.toLowerCase() === sportName.toLowerCase())?.id || null,
              class_id: classes.find(c => c.name.toLowerCase() === className.toLowerCase())?.id || null,
              status: rawStatus === 'Pasif' ? 'inactive' : rawStatus === 'Beklemede' ? 'pending' : 'active',
            }
          })

        if (!toInsert.length) { toast.error('İçe aktarılacak geçerli kayıt bulunamadı'); setImporting(false); return }

        const { error } = await supabase.from('athletes').insert(toInsert)
        if (error) { toast.error('Hata: ' + error.message); setImporting(false); return }
        toast.success(`${toInsert.length} sporcu içe aktarıldı`)
        fetchData()
      } catch {
        toast.error('Dosya okunamadı. Excel formatını kontrol edin.')
      }
      setImporting(false)
      if (importRef.current) importRef.current.value = ''
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <DashboardLayout title="Sporcular">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sporcular</h1>
          <p className="page-subtitle">{athletes.length} sporcu kayıtlı</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn bs btn-sm" onClick={handleExport} title="Excel olarak dışa aktar"><Download size={14} /> Excel</button>
          <button className="btn bs btn-sm" onClick={() => importRef.current?.click()} disabled={importing} title="Excel'den içe aktar">
            {importing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
            {importing ? 'İçe Aktarılıyor...' : 'Excel İçe Aktar'}
          </button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleImport} />
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
        {branches.length > 0 && (
          <select className="form-select" style={{ width: 'auto', minHeight: '40px', padding: '0 12px' }}
            value={branchFilter} onChange={e => { setBranchFilter(e.target.value); setPage(1) }}>
            <option value="">Tüm Şubeler</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
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
                        <span className={`badge ${a.auth_user_id ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '10px', marginTop: '2px' }}>
                          {a.auth_user_id ? 'Giriş Var' : 'Giriş Yok'}
                        </span>
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
                      {!a.auth_user_id && (
                        <button className="btn bp btn-xs" onClick={() => provisionAthlete(a.id, a.tc)} title="Giriş Oluştur"><Key size={12} /></button>
                      )}
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
          branches={branches}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchData() }}
        />
      )}
    </DashboardLayout>
  )
}

// ---- Athlete Form Modal ----
function AthleteModal({ athlete, sports, classes, branches, onClose, onSave }: {
  athlete: Athlete | null
  sports: Sport[]
  classes: Class[]
  branches: Branch[]
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
    branch_id: athlete?.branch_id || '',
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
      branch_id: form.branch_id || null,
      birth_date: form.birth_date || null,
      next_payment_date: form.next_payment_date || null,
    }

    let error
    if (athlete) {
      ({ error } = await supabase.from('athletes').update(payload).eq('id', athlete.id))
    } else {
      const { data: newAthlete, error: insertError } = await supabase.from('athletes').insert(payload).select('id').single()
      error = insertError
      if (!insertError && newAthlete && form.tc.length === 11) {
        await fetch('/api/provision-athlete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ athlete_id: newAthlete.id, tc: form.tc }),
        })
      }
    }

    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success(athlete ? 'Sporcu güncellendi' : 'Sporcu eklendi ve giriş hesabı oluşturuldu')
    onSave()
  }

  const tabs = ['Kişisel', 'Akademik', 'Finansal', 'Veli', 'Sağlık']
  const F = ({ id, label, type = 'text', req, colSpan }: { id: string; label: string; type?: string; req?: boolean; colSpan?: boolean }) => (
    <div className="form-group" style={colSpan ? { gridColumn: '1 / -1' } : {}}>
      <label className={`form-label${req ? ' required' : ''}`} htmlFor={id}>{label}</label>
      <input id={id} type={type} className={`form-input${errors[id] ? ' error' : ''}`}
        value={(form as Record<string, string>)[id]} onChange={e => set(id, e.target.value)} aria-required={req} />
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
              <F id="first_name" label="Ad" req />
              <F id="last_name" label="Soyad" req />
              <div className="form-group">
                <label className="form-label required" htmlFor="tc">TC Kimlik No</label>
                <input id="tc" type="text" inputMode="numeric" maxLength={11}
                  className={`form-input${errors.tc ? ' error' : ''}`}
                  value={form.tc} onChange={e => set('tc', e.target.value.replace(/\D/g, '').slice(0, 11))}
                  aria-required="true" />
                {errors.tc && <div className="form-error">{errors.tc}</div>}
              </div>
              <F id="birth_date" label="Doğum Tarihi" type="date" />
              <div className="form-group">
                <label className="form-label" htmlFor="gender">Cinsiyet</label>
                <select id="gender" className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Seçin</option>
                  <option value="male">Erkek</option>
                  <option value="female">Kadın</option>
                </select>
              </div>
              <F id="phone" label="Telefon" type="tel" />
              <F id="email" label="E-posta" type="email" />
              <div className="form-group">
                <label className="form-label" htmlFor="status">Durum</label>
                <select id="status" className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                  <option value="pending">Beklemede</option>
                </select>
              </div>
              <F id="school" label="Okul" colSpan />
              <F id="city" label="Şehir" />
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
              <div className="form-group">
                <label className="form-label" htmlFor="branch_id">Şube</label>
                <select id="branch_id" className="form-select" value={form.branch_id} onChange={e => set('branch_id', e.target.value)}>
                  <option value="">Seçin</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <F id="category" label="Kategori" />
              <F id="license_number" label="Lisans Numarası" />
            </div>
          )}
          {tab === 2 && (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="monthly_fee">Aylık Ücret (₺)</label>
                <input id="monthly_fee" type="number" min="0" className="form-input"
                  value={form.monthly_fee} onChange={e => set('monthly_fee', e.target.value)} />
              </div>
              <F id="next_payment_date" label="Sonraki Ödeme Tarihi" type="date" />
            </div>
          )}
          {tab === 3 && (
            <div className="grid-2">
              <F id="parent_name" label="Veli Adı" />
              <F id="parent_phone" label="Veli Telefon" type="tel" />
              <F id="parent_email" label="Veli E-posta" type="email" colSpan />
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
              <F id="emergency_contact" label="Acil Durum Kişisi" />
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
