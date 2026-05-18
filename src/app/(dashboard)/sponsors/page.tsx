'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, Star, Trash2, Edit, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ui/ConfirmDialog'

const TIER_LABEL: Record<string, { label: string; color: string }> = {
  platinum: { label: 'Platin', color: '#e5e7eb' },
  gold:     { label: 'Altın',  color: '#fbbf24' },
  silver:   { label: 'Gümüş', color: '#9ca3af' },
  bronze:   { label: 'Bronz', color: '#a16207' },
}

interface Sponsor {
  id: string
  name: string
  logo_url?: string
  website?: string
  tier: string
  valid_from: string
  valid_to?: string
  is_active: boolean
  display_order: number
}

export default function SponsorsPage() {
  const supabase = createClient()
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Sponsor | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const { data } = await supabase.from('sponsors').select('*').eq('organization_id', orgId).order('display_order').order('tier')
    setSponsors((data || []) as Sponsor[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (id: string) => {
    if (!await confirmDialog({ title: 'Sponsor silinsin mi?', message: 'Bu işlem geri alınamaz.', variant: 'danger', confirmText: 'Sil' })) return
    await supabase.from('sponsors').delete().eq('id', id)
    toast.success('Silindi'); fetchData()
  }

  const toggleActive = async (s: Sponsor) => {
    await supabase.from('sponsors').update({ is_active: !s.is_active }).eq('id', s.id)
    fetchData()
  }

  return (
    <DashboardLayout title="Sponsorlar">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sponsor Yönetimi</h1>
          <p className="page-subtitle">{sponsors.length} sponsor</p>
        </div>
        <button className="btn bp" onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={16} /> Yeni Sponsor
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><Loader2 size={24} className="spin" /></div>
      ) : sponsors.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon"><Star size={40} /></div><div className="empty-state-title">Sponsor yok</div></div>
      ) : (
        <div className="grid-3">
          {sponsors.map(s => (
            <div key={s.id} className="card" style={{ padding: 16, opacity: s.is_active ? 1 : 0.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: TIER_LABEL[s.tier]?.color || '#94a3b8', color: '#000', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                    {TIER_LABEL[s.tier]?.label || s.tier}
                  </span>
                  {s.website && <a href={s.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text3)' }}><ExternalLink size={14} /></a>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn bs btn-xs" onClick={() => { setEditing(s); setShowModal(true) }}><Edit size={12} /></button>
                  <button className="btn bd btn-xs" onClick={() => handleDelete(s.id)}><Trash2 size={12} /></button>
                </div>
              </div>
              {s.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logo_url} alt={s.name} style={{ width: '100%', height: 80, objectFit: 'contain', background: '#fff', borderRadius: 6, marginBottom: 8 }} />
              ) : (
                <div style={{ height: 80, background: 'var(--bg3)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Star size={32} color="var(--text3)" />
                </div>
              )}
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{s.name}</div>
              <button className="btn bs btn-xs" style={{ width: '100%' }} onClick={() => toggleActive(s)}>
                {s.is_active ? 'Pasifleştir' : 'Aktifleştir'}
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && <SponsorModal sponsor={editing} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchData() }} />}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </DashboardLayout>
  )
}

function SponsorModal({ sponsor, onClose, onSave }: { sponsor: Sponsor | null; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({
    name: sponsor?.name || '',
    logo_url: sponsor?.logo_url || '',
    website: sponsor?.website || '',
    tier: sponsor?.tier || 'bronze',
    valid_from: sponsor?.valid_from || new Date().toISOString().slice(0, 10),
    valid_to: sponsor?.valid_to || '',
    display_order: sponsor?.display_order || 0,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('İsim gerekli'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const payload = {
      organization_id: orgId,
      name: form.name, logo_url: form.logo_url || null, website: form.website || null,
      tier: form.tier, valid_from: form.valid_from, valid_to: form.valid_to || null,
      display_order: form.display_order, is_active: true,
    }
    const { error } = sponsor
      ? await supabase.from('sponsors').update(payload).eq('id', sponsor.id)
      : await supabase.from('sponsors').insert(payload)
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success(sponsor ? 'Güncellendi' : 'Eklendi'); onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2 className="modal-title">{sponsor ? 'Sponsor Düzenle' : 'Yeni Sponsor'}</h2><button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label required">Sponsor Adı</label>
            <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Logo URL</label>
            <input className="form-input" value={form.logo_url} onChange={e => setForm(p => ({ ...p, logo_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label className="form-label">Website</label>
            <input className="form-input" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label className="form-label">Seviye</label>
            <select className="form-input" value={form.tier} onChange={e => setForm(p => ({ ...p, tier: e.target.value }))}>
              {Object.entries(TIER_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Başlangıç</label>
              <input type="date" className="form-input" value={form.valid_from} onChange={e => setForm(p => ({ ...p, valid_from: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Bitiş</label>
              <input type="date" className="form-input" value={form.valid_to} onChange={e => setForm(p => ({ ...p, valid_to: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bp" onClick={handleSave} disabled={saving}>{saving ? <Loader2 size={14} className="spin" /> : null} Kaydet</button>
        </div>
      </div>
    </div>
  )
}
