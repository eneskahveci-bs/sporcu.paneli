'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, Activity, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDate } from '@/lib/utils/formatters'

const TEST_TYPES: Record<string, { label: string; unit: string }> = {
  shuttle_run:    { label: 'Mekik Koşusu',     unit: 'tekrar' },
  sprint_30m:     { label: '30m Sürat',         unit: 'sn' },
  vertical_jump:  { label: 'Dikey Sıçrama',     unit: 'cm' },
  cooper_test:    { label: 'Cooper Testi',      unit: 'm' },
  bmi:            { label: 'BMI',                unit: 'kg/m²' },
  body_fat_pct:   { label: 'Vücut Yağ Oranı',   unit: '%' },
  flexibility:    { label: 'Esneklik',          unit: 'cm' },
  plank:          { label: 'Plank Süresi',      unit: 'sn' },
  custom:         { label: 'Diğer',              unit: '' },
}

interface FitnessTest {
  id: string
  athlete_id: string
  test_type: string
  value: number
  unit: string
  notes?: string
  recorded_at: string
  athlete?: { first_name: string; last_name: string }
}

interface AthleteOption { id: string; first_name: string; last_name: string }

export default function FitnessPage() {
  const supabase = createClient()
  const [tests, setTests] = useState<FitnessTest[]>([])
  const [athletes, setAthletes] = useState<AthleteOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterAthlete, setFilterAthlete] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const [{ data: t }, { data: a }] = await Promise.all([
      supabase.from('fitness_tests')
        .select('*, athlete:athletes(first_name, last_name)')
        .eq('organization_id', orgId)
        .order('recorded_at', { ascending: false })
        .limit(200),
      supabase.from('athletes').select('id, first_name, last_name').eq('organization_id', orgId).eq('status', 'active').order('first_name'),
    ])
    setTests((t || []) as FitnessTest[])
    setAthletes(a || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (id: string) => {
    if (!await confirmDialog({ title: 'Test kaydı silinsin mi?', variant: 'danger', confirmText: 'Sil' })) return
    const { error } = await supabase.from('fitness_tests').delete().eq('id', id)
    if (error) { toast.error('Silinemedi'); return }
    toast.success('Silindi')
    fetchData()
  }

  const filtered = filterAthlete ? tests.filter(t => t.athlete_id === filterAthlete) : tests

  return (
    <DashboardLayout title="Fitness Testleri">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fitness / Performans Testleri</h1>
          <p className="page-subtitle">{tests.length} test kaydı</p>
        </div>
        <button className="btn bp" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Yeni Test
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <select className="form-input" value={filterAthlete} onChange={e => setFilterAthlete(e.target.value)} style={{ maxWidth: 300 }}>
          <option value="">Tüm sporcular</option>
          {athletes.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><Loader2 size={24} className="spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Activity size={40} color="var(--text3)" /></div>
          <div className="empty-state-title">Henüz test yok</div>
          <div className="empty-state-text">İlk fitness testini girerek başlayın</div>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Sporcu</th>
                <th>Test</th>
                <th>Değer</th>
                <th>Not</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td style={{ fontSize: 12, color: 'var(--text3)' }}>{formatDate(t.recorded_at)}</td>
                  <td style={{ fontWeight: 600 }}>{t.athlete?.first_name} {t.athlete?.last_name}</td>
                  <td>{TEST_TYPES[t.test_type]?.label || t.test_type}</td>
                  <td><strong>{t.value}</strong> <span style={{ color: 'var(--text3)' }}>{t.unit}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{t.notes || '-'}</td>
                  <td>
                    <button className="btn bd btn-xs" onClick={() => handleDelete(t.id)}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <FitnessTestModal
          athletes={athletes}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchData() }}
        />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </DashboardLayout>
  )
}

function FitnessTestModal({ athletes, onClose, onSave }: { athletes: AthleteOption[]; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ athlete_id: '', test_type: 'shuttle_run', value: '', unit: TEST_TYPES.shuttle_run.unit, notes: '' })

  const setType = (t: string) => setForm(p => ({ ...p, test_type: t, unit: TEST_TYPES[t]?.unit || '' }))

  const handleSave = async () => {
    if (!form.athlete_id || !form.value) { toast.error('Sporcu ve değer gerekli'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const { error } = await supabase.from('fitness_tests').insert({
      organization_id: orgId,
      athlete_id: form.athlete_id,
      test_type: form.test_type,
      value: parseFloat(form.value),
      unit: form.unit,
      notes: form.notes || null,
      recorded_by: user!.id,
    })
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('Test kaydedildi')
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Yeni Fitness Testi</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label required">Sporcu</label>
            <select className="form-input" value={form.athlete_id} onChange={e => setForm(p => ({ ...p, athlete_id: e.target.value }))}>
              <option value="">Seçin...</option>
              {athletes.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Test Tipi</label>
            <select className="form-input" value={form.test_type} onChange={e => setType(e.target.value)}>
              {Object.entries(TEST_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label required">Değer</label>
              <input type="number" step="0.01" className="form-input" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Birim</label>
              <input type="text" className="form-input" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Not</label>
            <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bp" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="spin" /> : null} Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}
