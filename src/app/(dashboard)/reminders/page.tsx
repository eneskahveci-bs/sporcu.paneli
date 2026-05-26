'use client'
import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Save, BellRing, Mail, MessageSquare, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'

interface Settings {
  enabled: boolean
  days_before: number[]
  days_after: number[]
  channels: string[]
  late_fee_enabled: boolean
  late_fee_pct: number
  late_fee_grace_days: number
  message_template: string
}

const DEFAULT: Settings = {
  enabled: false,
  days_before: [3, 1],
  days_after: [1, 3, 7],
  channels: ['email'],
  late_fee_enabled: false,
  late_fee_pct: 0,
  late_fee_grace_days: 0,
  message_template: 'Sayın {ad_soyad}, {tutar} tutarındaki aidatınızın son ödeme tarihi {tarih}. Bilgilerinize sunarız.',
}

const CHANNELS = [
  { key: 'email', label: 'E-posta', icon: Mail },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
  { key: 'push', label: 'Push', icon: Smartphone },
]

export default function RemindersPage() {
  const supabase = createClient()
  const [s, setS] = useState<Settings>(DEFAULT)
  const [orgId, setOrgId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const oid = user?.user_metadata?.organization_id
    setOrgId(oid || '')
    const { data } = await supabase.from('reminder_settings').select('*').eq('organization_id', oid).maybeSingle()
    if (data) setS({
      enabled: data.enabled, days_before: data.days_before || [], days_after: data.days_after || [],
      channels: data.channels || [], late_fee_enabled: data.late_fee_enabled,
      late_fee_pct: data.late_fee_pct || 0, late_fee_grace_days: data.late_fee_grace_days || 0,
      message_template: data.message_template || DEFAULT.message_template,
    })
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('reminder_settings').upsert({
      organization_id: orgId, ...s, updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id' })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Ayarlar kaydedildi')
  }

  const toggleChannel = (c: string) => setS(p => ({ ...p, channels: p.channels.includes(c) ? p.channels.filter(x => x !== c) : [...p.channels, c] }))
  const setDaysArr = (key: 'days_before' | 'days_after', val: string) => {
    const arr = val.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n) && n > 0)
    setS(p => ({ ...p, [key]: arr }))
  }

  if (loading) return <DashboardLayout title="Hatırlatmalar"><div style={{ padding: 48, textAlign: 'center' }}><Loader2 size={24} className="spin" /></div></DashboardLayout>

  return (
    <DashboardLayout title="Hatırlatmalar">
      <PageHeader title="Otomatik Hatırlatmalar" subtitle="Tahsilat hatırlatma ve gecikme faizi kuralları"
        actions={<button className="btn bp" onClick={save} disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Kaydet</button>} />

      <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Master toggle */}
        <div className="card" style={{ padding: 18 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.enabled ? 'var(--grad)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BellRing size={20} color={s.enabled ? '#fff' : 'var(--text3)'} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>Otomatik hatırlatmalar</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Vade öncesi ve sonrası veliye otomatik bildirim gönderilir</div>
            </div>
            <input type="checkbox" checked={s.enabled} onChange={e => setS(p => ({ ...p, enabled: e.target.checked }))} style={{ width: 20, height: 20 }} />
          </label>
        </div>

        <div className="card" style={{ padding: 18, opacity: s.enabled ? 1 : 0.5, pointerEvents: s.enabled ? 'auto' : 'none' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Zamanlama</h3>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Vade ÖNCESİ hatırlat (gün, virgülle)</label>
            <input className="form-input" defaultValue={s.days_before.join(', ')} onBlur={e => setDaysArr('days_before', e.target.value)} placeholder="3, 1" />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Örn: 3, 1 → vadeye 3 ve 1 gün kala</div>
          </div>
          <div className="form-group">
            <label className="form-label">Vade SONRASI hatırlat (gün, virgülle)</label>
            <input className="form-input" defaultValue={s.days_after.join(', ')} onBlur={e => setDaysArr('days_after', e.target.value)} placeholder="1, 3, 7" />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Örn: 1, 3, 7 → vadeden 1, 3, 7 gün sonra</div>
          </div>
        </div>

        <div className="card" style={{ padding: 18, opacity: s.enabled ? 1 : 0.5, pointerEvents: s.enabled ? 'auto' : 'none' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Gönderim Kanalları</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {CHANNELS.map(c => {
              const Icon = c.icon
              const active = s.channels.includes(c.key)
              return (
                <button key={c.key} onClick={() => toggleChannel(c.key)} className={`btn ${active ? 'bp' : 'bs'}`} style={{ flex: 1 }}>
                  <Icon size={15} /> {c.label}
                </button>
              )
            })}
          </div>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">Mesaj Şablonu</label>
            <textarea className="form-input" rows={3} value={s.message_template} onChange={e => setS(p => ({ ...p, message_template: e.target.value }))} />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Değişkenler: {'{ad_soyad}'}, {'{tutar}'}, {'{tarih}'}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: s.late_fee_enabled ? 14 : 0 }}>
            <input type="checkbox" checked={s.late_fee_enabled} onChange={e => setS(p => ({ ...p, late_fee_enabled: e.target.checked }))} style={{ width: 18, height: 18 }} />
            <div>
              <div style={{ fontWeight: 700 }}>Gecikme faizi uygula</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Vadesi geçen ödemelere otomatik ek ücret</div>
            </div>
          </label>
          {s.late_fee_enabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group"><label className="form-label">Aylık gecikme faizi (%)</label><input type="number" step="0.1" className="form-input" value={s.late_fee_pct} onChange={e => setS(p => ({ ...p, late_fee_pct: parseFloat(e.target.value) || 0 }))} /></div>
              <div className="form-group"><label className="form-label">Tolerans (gün)</label><input type="number" className="form-input" value={s.late_fee_grace_days} onChange={e => setS(p => ({ ...p, late_fee_grace_days: parseInt(e.target.value) || 0 }))} /></div>
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: 'var(--text3)', background: 'rgba(245,158,11,0.06)', padding: 12, borderRadius: 8 }}>
          Otomatik gönderim için bir zamanlanmış görev (Supabase cron / Edge Function) gereklidir. Bu sayfa kuralları kaydeder; gönderim altyapısı bağlandığında devreye girer.
        </div>
      </div>
    </DashboardLayout>
  )
}
