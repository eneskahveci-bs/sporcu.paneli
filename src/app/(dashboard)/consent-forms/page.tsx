'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, FileSignature, Clock, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils/formatters'

interface ConsentForm {
  id: string
  athlete_id: string
  title: string
  description?: string
  signature_data?: string
  signed_at?: string
  signer_name?: string
  status: string
  expires_at?: string
  created_at: string
  athlete?: { first_name: string; last_name: string }
}

interface AthleteOption { id: string; first_name: string; last_name: string }

const STATUS_LABEL: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Bekliyor', color: '#f59e0b', icon: Clock },
  signed: { label: 'İmzalandı', color: '#22c55e', icon: CheckCircle },
  rejected: { label: 'Reddedildi', color: '#ef4444', icon: XCircle },
  expired: { label: 'Süresi Doldu', color: '#94a3b8', icon: XCircle },
}

export default function ConsentFormsPage() {
  const supabase = createClient()
  const [forms, setForms] = useState<ConsentForm[]>([])
  const [athletes, setAthletes] = useState<AthleteOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [viewSignature, setViewSignature] = useState<ConsentForm | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const [{ data: f }, { data: a }] = await Promise.all([
      supabase.from('consent_forms').select('*, athlete:athletes(first_name, last_name)').eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('athletes').select('id, first_name, last_name').eq('organization_id', orgId).eq('status', 'active').order('first_name'),
    ])
    setForms((f || []) as ConsentForm[])
    setAthletes(a || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <DashboardLayout title="Dijital Onay Formları">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dijital Onay Formları</h1>
          <p className="page-subtitle">Turnuva, kamp ve etkinlik için veli onayı</p>
        </div>
        <button className="btn bp" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Yeni Form
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><Loader2 size={24} className="spin" /></div>
      ) : forms.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon"><FileSignature size={40} /></div><div className="empty-state-title">Henüz form yok</div></div>
      ) : (
        <div className="card">
          <table className="table">
            <thead><tr><th>Sporcu</th><th>Form Başlığı</th><th>Durum</th><th>İmzalayan</th><th>Tarih</th><th></th></tr></thead>
            <tbody>
              {forms.map(f => {
                const st = STATUS_LABEL[f.status] || STATUS_LABEL.pending
                const Icon = st.icon
                return (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{f.athlete?.first_name} {f.athlete?.last_name}</td>
                    <td>{f.title}</td>
                    <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: st.color }}><Icon size={14} /> {st.label}</span></td>
                    <td>{f.signer_name || '-'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{f.signed_at ? formatDateTime(f.signed_at) : formatDateTime(f.created_at)}</td>
                    <td>
                      {f.signature_data && (
                        <button className="btn bs btn-xs" onClick={() => setViewSignature(f)}>İmzayı Gör</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <NewFormModal athletes={athletes} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchData() }} />}

      {viewSignature && (
        <div className="modal-overlay" onClick={() => setViewSignature(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">{viewSignature.title}</h2><button onClick={() => setViewSignature(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button></div>
            <div className="modal-body">
              <div style={{ fontSize: 13, marginBottom: 12 }}>
                <strong>Sporcu:</strong> {viewSignature.athlete?.first_name} {viewSignature.athlete?.last_name}<br />
                <strong>İmzalayan:</strong> {viewSignature.signer_name}<br />
                <strong>Tarih:</strong> {viewSignature.signed_at ? formatDateTime(viewSignature.signed_at) : '-'}
              </div>
              {viewSignature.signature_data && (
                <img src={viewSignature.signature_data} alt="İmza" style={{ width: '100%', background: '#fff', borderRadius: 8, border: '1px solid var(--border)' }} />
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </DashboardLayout>
  )
}

function NewFormModal({ athletes, onClose, onSave }: { athletes: AthleteOption[]; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({ athlete_id: '', title: '', description: '', expires_at: '' })
  const [saving, setSaving] = useState(false)
  const [bulk, setBulk] = useState(false)

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Form başlığı gerekli'); return }
    if (!bulk && !form.athlete_id) { toast.error('Sporcu seçin'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id

    const records = bulk
      ? athletes.map(a => ({
          organization_id: orgId, athlete_id: a.id,
          title: form.title, description: form.description || null,
          expires_at: form.expires_at || null, requested_by: user!.id, status: 'pending',
        }))
      : [{
          organization_id: orgId, athlete_id: form.athlete_id,
          title: form.title, description: form.description || null,
          expires_at: form.expires_at || null, requested_by: user!.id, status: 'pending',
        }]

    const { error } = await supabase.from('consent_forms').insert(records)
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success(`${records.length} form oluşturuldu`); onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2 className="modal-title">Yeni Onay Formu</h2><button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={bulk} onChange={e => setBulk(e.target.checked)} />
            Tüm aktif sporculara aynı formu gönder
          </label>
          {!bulk && (
            <div className="form-group">
              <label className="form-label required">Sporcu</label>
              <select className="form-input" value={form.athlete_id} onChange={e => setForm(p => ({ ...p, athlete_id: e.target.value }))}>
                <option value="">Seçin...</option>
                {athletes.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label required">Başlık</label>
            <input className="form-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Örn: Antalya Kampı Katılım Onayı" />
          </div>
          <div className="form-group">
            <label className="form-label">Açıklama</label>
            <textarea className="form-input" rows={4} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Formda gösterilecek açıklama metni" />
          </div>
          <div className="form-group">
            <label className="form-label">Son Tarih</label>
            <input type="date" className="form-input" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
          </div>
          <div style={{ background: 'rgba(245,158,11,0.1)', padding: 10, borderRadius: 8, fontSize: 11, color: 'var(--text2)' }}>
            <strong>KVKK Uyarısı:</strong> Bu dijital imza KEP / mobil imza değildir. Yalnızca görsel onay niteliğindedir. Veliyi bilgilendirin.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bp" onClick={handleSave} disabled={saving}>{saving ? <Loader2 size={14} className="spin" /> : null} Oluştur</button>
        </div>
      </div>
    </div>
  )
}
