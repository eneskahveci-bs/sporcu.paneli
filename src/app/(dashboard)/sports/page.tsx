'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Sport } from '@/types'

const SPORT_ICONS = ['⚽', '🏀', '🏐', '🏊', '🎾', '🥊', '🤸', '🏃', '🏋️', '⛹️', '🏇', '🥋', '🎯', '🏄', '🤼', '🏅']

export default function SportsPage() {
  const supabase = createClient()
  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Sport | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    setLoading(true)
    const { data } = await supabase.from('sports').select('*').eq('organization_id', orgId).order('name')
    setSports(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('sports').delete().eq('id', id)
    if (error) { toast.error('Silinemedi'); return }
    toast.success('Spor dalı silindi')
    setDeleteId(null)
    fetchData()
  }

  const toggleActive = async (sport: Sport) => {
    await supabase.from('sports').update({ is_active: !sport.is_active }).eq('id', sport.id)
    fetchData()
  }

  return (
    <DashboardLayout title="Spor Dalları">
      <div className="page-header">
        <div>
          <h1 className="page-title">Spor Dalları</h1>
          <p className="page-subtitle">{sports.length} spor dalı tanımlı</p>
        </div>
        <button className="btn bp" onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={16} /> Yeni Spor Dalı
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}><Loader2 size={24} style={{ margin: '0 auto', color: 'var(--text3)', animation: 'spin 1s linear infinite' }} /></div>
      ) : (
        <div className="grid-4">
          {sports.map(s => (
            <div key={s.id} className={`card ${!s.is_active ? 'opacity-50' : ''}`} style={{ opacity: s.is_active ? 1 : 0.6 }}>
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>{s.icon || '🏅'}</div>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>{s.name}</div>
                {s.description && <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>{s.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                <button className="btn bs btn-xs" style={{ flex: 1 }} onClick={() => toggleActive(s)}>
                  {s.is_active ? 'Pasife Al' : 'Aktife Al'}
                </button>
                <button className="btn bs btn-xs" onClick={() => { setEditing(s); setShowModal(true) }}><Edit size={12} /></button>
                <button className="btn bd btn-xs" onClick={() => setDeleteId(s.id)}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
          {sports.length === 0 && !loading && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state-icon">🏅</div>
              <div className="empty-state-title">Spor dalı bulunamadı</div>
              <div className="empty-state-text">Spor dalı ekleyerek başlayın</div>
            </div>
          )}
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Spor Dalı Sil</h2></div>
            <div className="modal-body"><p style={{ color: 'var(--text2)' }}>Bu spor dalını silmek istediğinizden emin misiniz?</p></div>
            <div className="modal-footer">
              <button className="btn bs" onClick={() => setDeleteId(null)}>İptal</button>
              <button className="btn bd" onClick={() => handleDelete(deleteId)}>Sil</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <SportModal sport={editing} icons={SPORT_ICONS}
          onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchData() }} />
      )}
    </DashboardLayout>
  )
}

function SportModal({ sport, icons, onClose, onSave }: { sport: Sport | null; icons: string[]; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: sport?.name || '', description: sport?.description || '', icon: sport?.icon || '🏅', is_active: sport?.is_active ?? true })
  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Spor dalı adı gerekli'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    let error
    if (sport) { ({ error } = await supabase.from('sports').update({ ...form, organization_id: orgId }).eq('id', sport.id)) }
    else { ({ error } = await supabase.from('sports').insert({ ...form, organization_id: orgId })) }
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success(sport ? 'Güncellendi' : 'Spor dalı eklendi')
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{sport ? 'Spor Dalı Düzenle' : 'Yeni Spor Dalı'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label required">Spor Dalı Adı</label>
              <input type="text" className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Örn: Futbol, Yüzme..." />
            </div>
            <div className="form-group">
              <label className="form-label">İkon Seç</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {icons.map(icon => (
                  <button key={icon} type="button" onClick={() => set('icon', icon)}
                    style={{ width: '40px', height: '40px', fontSize: '20px', borderRadius: '8px', border: `2px solid ${form.icon === icon ? 'var(--blue2)' : 'var(--border)'}`, background: form.icon === icon ? 'rgba(45,92,179,0.15)' : 'var(--bg3)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Açıklama</label>
              <textarea className="form-input" style={{ minHeight: '72px' }} value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bp" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={15} /> : null} {saving ? 'Kaydediliyor...' : (sport ? 'Güncelle' : 'Ekle')}
          </button>
        </div>
      </div>
    </div>
  )
}
