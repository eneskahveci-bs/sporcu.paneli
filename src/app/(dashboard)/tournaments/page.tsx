'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, Trophy, Trash2, Eye, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/formatters'
import Link from 'next/link'

interface Tournament {
  id: string
  name: string
  slug: string
  format: string
  starts_at?: string
  ends_at?: string
  is_public: boolean
}

const FORMAT_LABEL: Record<string, string> = {
  league: 'Lig',
  knockout: 'Eleme',
  group_stage: 'Grup',
}

function slugify(s: string) {
  return s.toLowerCase()
    .replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
}

export default function TournamentsPage() {
  const supabase = createClient()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const { data } = await supabase.from('tournaments').select('*').eq('organization_id', orgId).order('starts_at', { ascending: false, nullsFirst: false })
    setTournaments((data || []) as Tournament[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (id: string) => {
    if (!confirm('Turnuva silinsin mi? (Takımlar ve maçlar dahil)')) return
    await supabase.from('tournaments').delete().eq('id', id)
    toast.success('Silindi'); fetchData()
  }

  return (
    <DashboardLayout title="Turnuvalar">
      <div className="page-header">
        <div>
          <h1 className="page-title">Turnuvalar & Lig</h1>
          <p className="page-subtitle">{tournaments.length} turnuva</p>
        </div>
        <button className="btn bp" onClick={() => setShowModal(true)}><Plus size={16} /> Yeni Turnuva</button>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><Loader2 size={24} className="spin" /></div>
      ) : tournaments.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon"><Trophy size={40} /></div><div className="empty-state-title">Henüz turnuva yok</div></div>
      ) : (
        <div className="grid-3">
          {tournaments.map(t => (
            <div key={t.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Trophy size={22} color="var(--blue2)" />
                <div style={{ display: 'flex', gap: 4 }}>
                  {t.is_public && (
                    <Link href={`/lig/${t.slug}`} target="_blank" className="btn bs btn-xs"><ExternalLink size={12} /></Link>
                  )}
                  <Link href={`/tournaments/${t.id}`} className="btn bs btn-xs"><Eye size={12} /></Link>
                  <button className="btn bd btn-xs" onClick={() => handleDelete(t.id)}><Trash2 size={12} /></button>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{FORMAT_LABEL[t.format]} {t.starts_at && `· ${formatDate(t.starts_at)}`}</div>
            </div>
          ))}
        </div>
      )}

      {showModal && <TournamentModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchData() }} />}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </DashboardLayout>
  )
}

function TournamentModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({ name: '', format: 'league', starts_at: '', ends_at: '', is_public: true })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Turnuva adı gerekli'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const slug = slugify(form.name) + '-' + Date.now().toString(36).slice(-4)
    const { error } = await supabase.from('tournaments').insert({
      organization_id: orgId,
      name: form.name, slug, format: form.format,
      starts_at: form.starts_at || null, ends_at: form.ends_at || null,
      is_public: form.is_public,
    })
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('Turnuva oluşturuldu'); onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2 className="modal-title">Yeni Turnuva</h2><button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label required">Turnuva Adı</label>
            <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Format</label>
            <select className="form-input" value={form.format} onChange={e => setForm(p => ({ ...p, format: e.target.value }))}>
              {Object.entries(FORMAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group"><label className="form-label">Başlangıç</label><input type="date" className="form-input" value={form.starts_at} onChange={e => setForm(p => ({ ...p, starts_at: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Bitiş</label><input type="date" className="form-input" value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_public} onChange={e => setForm(p => ({ ...p, is_public: e.target.checked }))} />
            Halka açık (auth gerekmez)
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bp" onClick={handleSave} disabled={saving}>{saving ? <Loader2 size={14} className="spin" /> : null} Oluştur</button>
        </div>
      </div>
    </div>
  )
}
