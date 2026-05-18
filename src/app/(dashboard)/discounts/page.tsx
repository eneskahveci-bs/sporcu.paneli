'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, Percent, Trash2, Users, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDate } from '@/lib/utils/formatters'

const TYPE_LABEL: Record<string, string> = {
  sibling: 'Kardeş İndirimi',
  merit: 'Başarı Bursu',
  need: 'Mali Yardım',
  custom: 'Özel',
}

interface Rule {
  id: string
  name: string
  type: string
  value_pct: number | null
  value_fixed: number | null
  is_active: boolean
  description: string | null
}

interface Assignment {
  id: string
  athlete_id: string
  rule_id: string
  valid_from: string
  valid_to: string | null
  rule?: Rule
  athlete?: { first_name: string; last_name: string }
}

interface AthleteOption { id: string; first_name: string; last_name: string }

export default function DiscountsPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'rules' | 'assignments'>('rules')
  const [rules, setRules] = useState<Rule[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [athletes, setAthletes] = useState<AthleteOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const [{ data: r }, { data: a }, { data: ath }] = await Promise.all([
      supabase.from('discount_rules').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('athlete_discounts').select('*, rule:discount_rules(*), athlete:athletes(first_name, last_name)').eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('athletes').select('id, first_name, last_name').eq('organization_id', orgId).eq('status', 'active').order('first_name'),
    ])
    setRules((r || []) as Rule[])
    setAssignments((a || []) as Assignment[])
    setAthletes(ath || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const deleteRule = async (id: string) => {
    if (!await confirmDialog({ title: 'Kural silinsin mi?', message: 'Bu kurala bağlı tüm sporcu indirim atamaları da silinir.', variant: 'danger', confirmText: 'Kuralı Sil' })) return
    await supabase.from('discount_rules').delete().eq('id', id)
    toast.success('Silindi'); fetchData()
  }

  const deleteAssignment = async (id: string) => {
    if (!await confirmDialog({ title: 'İndirim atamasını kaldır?', variant: 'warning', confirmText: 'Kaldır' })) return
    await supabase.from('athlete_discounts').delete().eq('id', id)
    toast.success('Kaldırıldı'); fetchData()
  }

  return (
    <DashboardLayout title="İndirim & Burs">
      <div className="page-header">
        <div>
          <h1 className="page-title">İndirim & Burs Sistemi</h1>
          <p className="page-subtitle">Kardeş indirimi, başarı bursu ve mali yardım yönetimi</p>
        </div>
        <button className="btn bp" onClick={() => tab === 'rules' ? setShowRuleModal(true) : setShowAssignModal(true)}>
          <Plus size={16} /> {tab === 'rules' ? 'Yeni Kural' : 'Sporcu Ata'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {([['rules', 'Kurallar'], ['assignments', 'Atamalar']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className="btn bs"
            style={{ borderRadius: 0, background: 'transparent', borderBottom: tab === key ? '2px solid var(--blue2)' : '2px solid transparent' }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><Loader2 size={24} className="spin" /></div>
      ) : tab === 'rules' ? (
        rules.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon"><Tag size={40} /></div><div className="empty-state-title">Henüz kural yok</div></div>
        ) : (
          <div className="grid-3">
            {rules.map(r => (
              <div key={r.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Percent size={16} color="var(--blue2)" />
                    <strong>{r.name}</strong>
                  </div>
                  <button className="btn bd btn-xs" onClick={() => deleteRule(r.id)}><Trash2 size={12} /></button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>{TYPE_LABEL[r.type]}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue2)' }}>
                  {r.value_pct ? `%${r.value_pct} indirim` : `${r.value_fixed} ₺ sabit indirim`}
                </div>
                {r.description && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)' }}>{r.description}</div>}
              </div>
            ))}
          </div>
        )
      ) : (
        assignments.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon"><Users size={40} /></div><div className="empty-state-title">Henüz atama yok</div></div>
        ) : (
          <div className="card">
            <table className="table">
              <thead><tr><th>Sporcu</th><th>Kural</th><th>İndirim</th><th>Başlangıç</th><th>Bitiş</th><th></th></tr></thead>
              <tbody>
                {assignments.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.athlete?.first_name} {a.athlete?.last_name}</td>
                    <td>{a.rule?.name}</td>
                    <td>{a.rule?.value_pct ? `%${a.rule.value_pct}` : `${a.rule?.value_fixed}₺`}</td>
                    <td style={{ fontSize: 12 }}>{formatDate(a.valid_from)}</td>
                    <td style={{ fontSize: 12 }}>{a.valid_to ? formatDate(a.valid_to) : 'Süresiz'}</td>
                    <td><button className="btn bd btn-xs" onClick={() => deleteAssignment(a.id)}><Trash2 size={12} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showRuleModal && <RuleModal onClose={() => setShowRuleModal(false)} onSave={() => { setShowRuleModal(false); fetchData() }} />}
      {showAssignModal && <AssignModal rules={rules} athletes={athletes} onClose={() => setShowAssignModal(false)} onSave={() => { setShowAssignModal(false); fetchData() }} />}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </DashboardLayout>
  )
}

function RuleModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({ name: '', type: 'sibling', value_pct: '15', value_fixed: '', description: '' })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Kural adı gerekli'); return }
    if (!form.value_pct && !form.value_fixed) { toast.error('% veya sabit değer girin'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const { error } = await supabase.from('discount_rules').insert({
      organization_id: orgId,
      name: form.name, type: form.type,
      value_pct: form.value_pct ? parseFloat(form.value_pct) : null,
      value_fixed: form.value_fixed ? parseFloat(form.value_fixed) : null,
      description: form.description || null,
    })
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('Kural eklendi'); onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2 className="modal-title">Yeni İndirim Kuralı</h2><button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label required">Kural Adı</label>
            <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Örn: 2. Kardeş İndirimi" />
          </div>
          <div className="form-group">
            <label className="form-label">Tip</label>
            <select className="form-input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Yüzde (%)</label>
              <input type="number" className="form-input" value={form.value_pct} onChange={e => setForm(p => ({ ...p, value_pct: e.target.value, value_fixed: '' }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Sabit (₺)</label>
              <input type="number" className="form-input" value={form.value_fixed} onChange={e => setForm(p => ({ ...p, value_fixed: e.target.value, value_pct: '' }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Açıklama</label>
            <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
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

function AssignModal({ rules, athletes, onClose, onSave }: { rules: Rule[]; athletes: AthleteOption[]; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({ athlete_id: '', rule_id: '', valid_from: new Date().toISOString().slice(0, 10), valid_to: '' })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.athlete_id || !form.rule_id) { toast.error('Sporcu ve kural gerekli'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const { error } = await supabase.from('athlete_discounts').insert({
      organization_id: orgId,
      athlete_id: form.athlete_id, rule_id: form.rule_id,
      valid_from: form.valid_from, valid_to: form.valid_to || null,
      applied_by: user!.id,
    })
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('Atandı'); onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2 className="modal-title">Sporcuya İndirim Ata</h2><button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label required">Sporcu</label>
            <select className="form-input" value={form.athlete_id} onChange={e => setForm(p => ({ ...p, athlete_id: e.target.value }))}>
              <option value="">Seçin...</option>
              {athletes.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Kural</label>
            <select className="form-input" value={form.rule_id} onChange={e => setForm(p => ({ ...p, rule_id: e.target.value }))}>
              <option value="">Seçin...</option>
              {rules.map(r => <option key={r.id} value={r.id}>{r.name} ({r.value_pct ? `%${r.value_pct}` : `${r.value_fixed}₺`})</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Başlangıç</label>
              <input type="date" className="form-input" value={form.valid_from} onChange={e => setForm(p => ({ ...p, valid_from: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Bitiş (boş = süresiz)</label>
              <input type="date" className="form-input" value={form.valid_to} onChange={e => setForm(p => ({ ...p, valid_to: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose}>İptal</button>
          <button className="btn bp" onClick={handleSave} disabled={saving}>{saving ? <Loader2 size={14} className="spin" /> : null} Ata</button>
        </div>
      </div>
    </div>
  )
}
