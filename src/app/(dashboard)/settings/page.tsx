'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Save, Loader2, Building2, Bell, Shield, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function SettingsPage() {
  const supabase = createClient()
  const [tab, setTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState({ name: '', phone: '', email: '', address: '', city: '', logo: '' })
  const [sms, setSms] = useState({ netgsm_api_key: '', netgsm_sender_id: '' })
  const [paytr, setPaytr] = useState({ merchant_id: '', merchant_key: '', merchant_salt: '' })
  const [whatsapp, setWhatsapp] = useState({ token: '', phone_id: '' })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const orgId = user?.user_metadata?.organization_id
      const [{ data: orgData }, { data: settings }] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', orgId).single(),
        supabase.from('settings').select('*').eq('organization_id', orgId),
      ])
      if (orgData) setOrg({ name: orgData.name || '', phone: orgData.phone || '', email: orgData.email || '', address: orgData.address || '', city: orgData.city || '', logo: orgData.logo || '' })
      if (settings) {
        const get = (key: string) => settings.find(s => s.key === key)?.value || ''
        setSms({ netgsm_api_key: get('netgsm_api_key'), netgsm_sender_id: get('netgsm_sender_id') })
        setPaytr({ merchant_id: get('paytr_merchant_id'), merchant_key: get('paytr_merchant_key'), merchant_salt: get('paytr_merchant_salt') })
        setWhatsapp({ token: get('whatsapp_token'), phone_id: get('whatsapp_phone_id') })
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const saveOrg = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const { error } = await supabase.from('organizations').update(org).eq('id', orgId)
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('Organizasyon bilgileri kaydedildi')
  }

  const saveSettings = async (entries: Record<string, string>) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const orgId = user?.user_metadata?.organization_id
    const rows = Object.entries(entries).map(([key, value]) => ({ organization_id: orgId, key, value }))
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'organization_id,key' })
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('Ayarlar kaydedildi')
  }

  const TABS = [
    { label: 'Organizasyon', icon: <Building2 size={15} /> },
    { label: 'SMS (NetGSM)', icon: <Bell size={15} /> },
    { label: 'WhatsApp', icon: <Bell size={15} /> },
    { label: 'PayTR Ödeme', icon: <CreditCard size={15} /> },
  ]

  const F = ({ label, id, value, onChange, type = 'text', placeholder }: { label: string; id: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input id={id} type={type} className="form-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )

  return (
    <DashboardLayout title="Ayarlar">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ayarlar</h1>
          <p className="page-subtitle">Akademi ve entegrasyon ayarları</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Sidebar tabs */}
        <div style={{ width: '200px', flexShrink: 0 }}>
          <div className="card" style={{ padding: '8px' }}>
            {TABS.map((t, i) => (
              <button key={t.label} onClick={() => setTab(i)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', textAlign: 'left', background: tab === i ? 'var(--grad)' : 'none', color: tab === i ? '#fff' : 'var(--text2)', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: tab === i ? 600 : 500, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', transition: 'all 0.2s' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}><Loader2 size={24} style={{ margin: '0 auto', color: 'var(--text3)', animation: 'spin 1s linear infinite' }} /></div>
          ) : (
            <div className="card">
              {tab === 0 && (
                <>
                  <h3 className="m-tit" style={{ marginBottom: '20px' }}>Organizasyon Bilgileri</h3>
                  <div className="grid-2" style={{ gap: '14px', marginBottom: '20px' }}>
                    <F label="Akademi Adı" id="org-name" value={org.name} onChange={v => setOrg(p => ({ ...p, name: v }))} />
                    <F label="Telefon" id="org-phone" value={org.phone} onChange={v => setOrg(p => ({ ...p, phone: v }))} type="tel" />
                    <F label="E-posta" id="org-email" value={org.email} onChange={v => setOrg(p => ({ ...p, email: v }))} type="email" />
                    <F label="Şehir" id="org-city" value={org.city} onChange={v => setOrg(p => ({ ...p, city: v }))} />
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                      <label className="form-label">Adres</label>
                      <textarea className="form-input" style={{ minHeight: '80px' }} value={org.address} onChange={e => setOrg(p => ({ ...p, address: e.target.value }))} />
                    </div>
                  </div>
                  <button className="btn bp" onClick={saveOrg} disabled={saving}>
                    {saving ? <Loader2 size={15} /> : <Save size={15} />} {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </>
              )}

              {tab === 1 && (
                <>
                  <h3 className="m-tit" style={{ marginBottom: '8px' }}>NetGSM SMS Entegrasyonu</h3>
                  <p style={{ color: 'var(--text3)', fontSize: '13px', marginBottom: '20px' }}>Ödeme hatırlatmaları ve bildirimler için kullanılır.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                    <F label="API Key" id="sms-key" value={sms.netgsm_api_key} onChange={v => setSms(p => ({ ...p, netgsm_api_key: v }))} type="password" placeholder="NetGSM API anahtarı" />
                    <F label="Gönderici Başlığı" id="sms-sender" value={sms.netgsm_sender_id} onChange={v => setSms(p => ({ ...p, netgsm_sender_id: v }))} placeholder="Örn: AKADEMI" />
                  </div>
                  <button className="btn bp" onClick={() => saveSettings({ netgsm_api_key: sms.netgsm_api_key, netgsm_sender_id: sms.netgsm_sender_id })} disabled={saving}>
                    {saving ? <Loader2 size={15} /> : <Save size={15} />} Kaydet
                  </button>
                </>
              )}

              {tab === 2 && (
                <>
                  <h3 className="m-tit" style={{ marginBottom: '8px' }}>WhatsApp Business Entegrasyonu</h3>
                  <p style={{ color: 'var(--text3)', fontSize: '13px', marginBottom: '20px' }}>Meta Graph API ile toplu mesaj göndermek için kullanılır.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                    <F label="API Token" id="wa-token" value={whatsapp.token} onChange={v => setWhatsapp(p => ({ ...p, token: v }))} type="password" placeholder="Meta Graph API token" />
                    <F label="Phone Number ID" id="wa-phone" value={whatsapp.phone_id} onChange={v => setWhatsapp(p => ({ ...p, phone_id: v }))} placeholder="WhatsApp Phone Number ID" />
                  </div>
                  <button className="btn bp" onClick={() => saveSettings({ whatsapp_token: whatsapp.token, whatsapp_phone_id: whatsapp.phone_id })} disabled={saving}>
                    {saving ? <Loader2 size={15} /> : <Save size={15} />} Kaydet
                  </button>
                </>
              )}

              {tab === 3 && (
                <>
                  <h3 className="m-tit" style={{ marginBottom: '8px' }}>PayTR Ödeme Entegrasyonu</h3>
                  <p style={{ color: 'var(--text3)', fontSize: '13px', marginBottom: '20px' }}>Sporcu/veli online ödeme için kullanılır. PayTR merchant bilgilerinizi girin.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                    <F label="Merchant ID" id="paytr-id" value={paytr.merchant_id} onChange={v => setPaytr(p => ({ ...p, merchant_id: v }))} placeholder="PayTR Merchant ID" />
                    <F label="Merchant Key" id="paytr-key" value={paytr.merchant_key} onChange={v => setPaytr(p => ({ ...p, merchant_key: v }))} type="password" placeholder="PayTR Merchant Key" />
                    <F label="Merchant Salt" id="paytr-salt" value={paytr.merchant_salt} onChange={v => setPaytr(p => ({ ...p, merchant_salt: v }))} type="password" placeholder="PayTR Merchant Salt" />
                  </div>
                  <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <Shield size={16} style={{ color: 'var(--red)', flexShrink: 0, marginTop: '1px' }} />
                    <div style={{ fontSize: '13px', color: 'var(--text2)' }}>PayTR bilgileriniz şifreli olarak saklanır ve asla üçüncü taraflarla paylaşılmaz.</div>
                  </div>
                  <button className="btn bp" onClick={() => saveSettings({ paytr_merchant_id: paytr.merchant_id, paytr_merchant_key: paytr.merchant_key, paytr_merchant_salt: paytr.merchant_salt })} disabled={saving}>
                    {saving ? <Loader2 size={15} /> : <Save size={15} />} Kaydet
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
