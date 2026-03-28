'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Plus, Edit, Trash2, Loader2, Users, Clock, BookOpen, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Class, Sport, Coach, Branch } from '@/types'

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const DAYS_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

export function scheduleSummary(cls: Class): string {
  const days = cls.schedule_days
  if (days && days.length > 0) {
    const dayStr = days.map(d => DAYS[d]).join('-')
    const time = cls.schedule_time || ''
    const timeEnd = cls.schedule_time_end || ''
    return time ? `${dayStr} ${time}${timeEnd ? `–${timeEnd}` : ''}` : dayStr
  }
  return cls.schedule || ''
}

export default function ClassesPage() {
  const supabase = createClient()
  const [classes, setClasses] = useState<Class[]>([])
  const [sports, setSports] = useState<Sport[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Class | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    setLoading(true)
    const [{ data: cl }, { data: s }, { data: c }, { data: b }] = await Promise.all([
      supabase.from('classes').select('*, sports(name), coaches(first_name, last_name), branches(name)').eq('organization_id', orgId).order('name'),
      supabase.from('sports').select('*').eq('organization_id', orgId).eq('is_active', true),
      supabase.from('coaches').select('*').eq('organization_id', orgId).eq('status', 'active'),
      supabase.from('branches').select('*').eq('organization_id', orgId).eq('is_active', true),
    ])
    setClasses(cl || [])
    setSports(s || [])
    setCoaches(c || [])
    setBranches(b || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) { toast.error('Silinemedi'); return }
    toast.success('Sınıf silindi')
    setDeleteId(null)
    fetchData()
  }

  return (
    <DashboardLayout title="Sınıflar">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sınıflar</h1>
          <p className="page-subtitle">{classes.length} sınıf tanımlı</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href="/calendar" className="btn bd btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            <Calendar size={14} /> Takvim
          </a>
          <button className="btn bp" onClick={() => { setEditing(null); setShowModal(true) }}>
            <Plus size={16} /> Yeni Sınıf
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}><Loader2 size={24} style={{ margin: '0 auto', color: 'var(--text3)', animation: 'spin 1s linear infinite' }} /></div>
      ) : (
        <div className="grid-3">
          {classes.map(cl => {
            const coach = cl.coach as { first_name: string; last_name: string } | null
            const sport = cl.sport as { name: string } | null
            const schedule = scheduleSummary(cl)
            return (
              <div key={cl.id} className="card-hover">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                    <BookOpen size={20} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>{cl.name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text3)' }}>{sport?.name || 'Spor dalı yok'}</div>
                  </div>
                  <span className={`badge ${cl.is_active ? 'badge-green' : 'badge-gray'}`} style={{ marginLeft: 'auto', fontSize: '11px' }}>
                    {cl.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {coach && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text2)' }}>
                      <Users size={13} /> {coach.first_name} {coach.last_name}
                    </div>
                  )}
                  {cl.max_students && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text2)' }}>
                      <Users size={13} /> Kapasite: {cl.max_students} öğrenci
                    </div>
                  )}
                  {schedule && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text2)' }}>
                      <Clock size={13} /> {schedule}
                    </div>
                  )}
                  {cl.age_group && (
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Yaş Grubu: {cl.age_group}</div>
                  )}

                  {/* Day chips */}
                  {cl.schedule_days && cl.schedule_days.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {DAYS.map((d, i) => (
                        <span key={i} style={{
                          padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                          background: cl.schedule_days!.includes(i) ? 'var(--blue2)' : 'var(--bg4)',
                          color: cl.schedule_days!.includes(i) ? '#fff' : 'var(--text3)',
                          opacity: cl.schedule_days!.includes(i) ? 1 : 0.5,
                        }}>
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  <button className="btn bs btn-sm" style={{ flex: 1 }} onClick={() => { setEditing(cl); setShowModal(true) }}><Edit size={13} /> Düzenle</button>
                  <button className="btn bd btn-sm" onClick={() => setDeleteId(cl.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            )
          })}
          {classes.length === 0 && !loading && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state-icon">📚</div>
              <div className="empty-state-title">Sınıf bulunamadı</div>
              <div className="empty-state-text">Yeni sınıf ekleyerek başlayın</div>
            </div>
          )}
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Sınıf Sil</h2></div>
            <div className="modal-body"><p style={{ color: 'var(--text2)' }}>Bu sınıfı silmek istediğinizden emin misiniz?</p></div>
            <div className="modal-footer">
              <button className="btn bs" onClick={() => setDeleteId(null)}>İptal</button>
              <button className="btn bd" onClick={() => handleDelete(deleteId)}>Sil</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <ClassModal cls={editing} sports={sports} coaches={coaches} branches={branches}
          onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchData() }} />
      )}
    </DashboardLayout>
  )
}

function ClassModal({ cls, sports, coaches, branches, onClose, onSave }: {
  cls: Class | null; sports: Sport[]; coaches: Coach[]; branches: Branch[]; onClose: () => void; onSave: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: cls?.name || '',
    description: cls?.description || '',
    schedule: cls?.schedule || '',
    schedule_days: cls?.schedule_days || [] as number[],
    schedule_time: cls?.schedule_time || '',
    schedule_time_end: cls?.schedule_time_end || '',
    max_students: cls?.max_students?.toString() || '',
    age_group: cls?.age_group || '',
    sport_id: cls?.sport_id || '',
    coach_id: cls?.coach_id || '',
    branch_id: cls?.branch_id || '',
    is_active: cls?.is_active ?? true,
  })
  const set = (k: string, v: string | boolean | number[]) => setForm(p => ({ ...p, [k]: v }))

  const toggleDay = (day: number) => {
    const days = form.schedule_days
    set('schedule_days', days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort())
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Sınıf adı gerekli'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const payload = {
      ...form,
      organization_id: orgId,
      max_students: form.max_students ? parseInt(form.max_students) : null,
      sport_id: form.sport_id || null,
      coach_id: form.coach_id || null,
      branch_id: form.branch_id || null,
      schedule_days: form.schedule_days,
      schedule_time: form.schedule_time || null,
      schedule_time_end: form.schedule_time_end || null,
    }
    let error
    if (cls) { ({ error } = await supabase.from('classes').update(payload).eq('id', cls.id)) }
    else { ({ error } = await supabase.from('classes').insert(payload)) }
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success(cls ? 'Sınıf güncellendi' : 'Sınıf eklendi')
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{cls ? 'Sınıf Düzenle' : 'Yeni Sınıf'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>
        <div className="modal-body">
          <div className="grid-2" style={{ gap: '14px' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label required">Sınıf Adı</label>
              <input type="text" className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Örn: U12 Futbol A" />
            </div>
            <div className="form-group">
              <label className="form-label">Spor Dalı</label>
              <select className="form-select" value={form.sport_id} onChange={e => set('sport_id', e.target.value)}>
                <option value="">Seçin</option>
                {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Antrenör</label>
              <select className="form-select" value={form.coach_id} onChange={e => set('coach_id', e.target.value)}>
                <option value="">Seçin</option>
                {coaches.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Şube</label>
              <select className="form-select" value={form.branch_id} onChange={e => set('branch_id', e.target.value)}>
                <option value="">Seçin</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Yaş Grubu</label>
              <input type="text" className="form-input" value={form.age_group} onChange={e => set('age_group', e.target.value)} placeholder="Örn: U10-U12" />
            </div>
            <div className="form-group">
              <label className="form-label">Kapasite</label>
              <input type="number" className="form-input" value={form.max_students} onChange={e => set('max_students', e.target.value)} placeholder="Maksimum öğrenci" />
            </div>

            {/* Antrenman günleri */}
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Antrenman Günleri</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {DAYS_FULL.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    style={{
                      padding: '6px 12px', borderRadius: '6px', border: '1px solid',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                      background: form.schedule_days.includes(i) ? 'var(--blue2)' : 'var(--bg4)',
                      color: form.schedule_days.includes(i) ? '#fff' : 'var(--text2)',
                      borderColor: form.schedule_days.includes(i) ? 'var(--blue2)' : 'var(--border2)',
                    }}
                  >
                    {DAYS[i]}
                  </button>
                ))}
              </div>
            </div>

            {/* Saat */}
            <div className="form-group">
              <label className="form-label">Başlangıç Saati</label>
              <input type="time" className="form-input" value={form.schedule_time} onChange={e => set('schedule_time', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Bitiş Saati</label>
              <input type="time" className="form-input" value={form.schedule_time_end} onChange={e => set('schedule_time_end', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Durum</label>
              <select className="form-select" value={form.is_active ? 'true' : 'false'} onChange={e => set('is_active', e.target.value === 'true')}>
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Açıklama</label>
              <textarea className="form-input" style={{ minHeight: '80px' }} value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bp" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={15} /> : null} {saving ? 'Kaydediliyor...' : (cls ? 'Güncelle' : 'Ekle')}
          </button>
        </div>
      </div>
    </div>
  )
}
