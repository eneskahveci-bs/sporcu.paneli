'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Save, Loader2, Building2, Bell, Shield, CreditCard, Upload, Users, Trash2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function SettingsPage() {
  const supabase = createClient()
  const [tab, setTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState({ name: '', phone: '', email: '', address: '', city: '', logo: '', bank_name: '', account_name: '', iban: '' })
  const [sms, setSms] = useState({ netgsm_api_key: '', netgsm_sender_id: '' })
  const [paytr, setPaytr] = useState({ merchant_id: '', merchant_key: '', merchant_salt: '' })
  const [whatsapp, setWhatsapp] = useState({ token: '', phone_id: '' })
  const [admins, setAdmins] = useState<{ id: string; email: string; name?: string; role: string }[]>([])
  const [adminsLoading, setAdminsLoading] = useState(false)
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' })
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [orgId, setOrgId] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const oid = user?.user_metadata?.organization_id
      setOrgId(oid || '')
      setCurrentUserId(user?.id || '')
      const [{ data: orgData }, { data: settings }] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', oid).single(),
        supabase.from('settings').select('*').eq('organization_id', oid),
      ])
      if (orgData) setOrg({
        name: orgData.name || '', phone: orgData.phone || '', email: orgData.email || '',
        address: orgData.address || '', city: orgData.city || '', logo: orgData.logo || '',
        bank_name: orgData.bank_name || '', account_name: orgData.account_name || '', iban: orgData.iban || '',
      })
      if (settings) {
        const get = (key: string) => settings.find((s: { key: string; value: string }) => s.key === key)?.value || ''
        setSms({ netgsm_api_key: get('netgsm_api_key'), netgsm_sender_id: get('netgsm_sender_id') })
        setPaytr({ merchant_id: get('paytr_merchant_id'), merchant_key: get('paytr_merchant_key'), merchant_salt: get('paytr_merchant_salt') })
        setWhatsapp({ token: get('whatsapp_token'), phone_id: get('whatsapp_phone_id') })
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const loadAdmins = async () => {
    setAdminsLoading(true)
    const { data } = await supabase.from('users').select('id, email, first_name, last_name, role').eq('organization_id', orgId)
    setAdmins((data || []).map((u: { id: string; email: string; first_name?: string; last_name?: string; role: string }) => ({
      id: u.id, email: u.email,
      name: u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : undefined,
      role: u.role,
    })))
    setAdminsLoading(false)
  }

  useEffect(() => {
    if (tab === 5 && orgId) loadAdmins()
  }, [tab, orgId])

  const saveOrg = async () => {
    setSaving(true)
    const { error } = await supabase.from('organizations').update({
      name: org.name, phone: org.phone, email: org.email, address: org.address, city: org.city,
      bank_name: org.bank_name, account_name: org.account_name, iban: org.iban,
    }).eq('id', orgId)
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('Organizasyon bilgileri kaydedildi')
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo 2MB\'dan küçük olmalıdır'); return }
    setSaving(true)
    const ext = file.name.split('.').pop()
    const path = `logos/${orgId}.${ext}`
    const { error: upErr } = await supabase.storage.from('organization-assets').upload(path, file, { upsert: true })
    if (upErr) { setSaving(false); toast.error('Yükleme hatası: ' + upErr.message); return }
    const { data: urlData } = supabase.storage.from('organization-assets').getPublicUrl(path)
    const logoUrl = urlData.publicUrl
    const { error } = await supabase.from('organizations').update({ logo: logoUrl }).eq('id', orgId)
    setSaving(false)
    if (error) { toast.error('Kayıt hatası: ' + error.message); return }
    setOrg(p => ({ ...p, logo: logoUrl }))
    toast.success('Logo güncellendi')
  }

  const saveSettings = async (entries: Record<string, string>) => {
    setSaving(true)
    const rows = Object.entries(entries).map(([key, value]) => ({ organization_id: orgId, key, value }))
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'organization_id,key' })
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('Ayarlar kaydedildi')
  }

  const addAdmin = async () => {
    if (!newAdmin.email || !newAdmin.password) { toast.error('E-posta ve şifre zorunludur'); return }
    if (newAdmin.password.length < 6) { toast.error('Şifre en az 6 karakter olmalıdır'); return }
    setAddingAdmin(true)
    const { data, error } = await supabase.auth.signUp({
      email: newAdmin.email,
      password: newAdmin.password,
      options: {
        data: {
          full_name: newAdmin.name,
          organization_id: orgId,
          role: 'admin',
        },
      },
    })
    if (error) { toast.error('Hata: ' + error.message); setAddingAdmin(false); return }
    if (data.user) {
      // Also insert into users table
      await supabase.from('users').upsert({
        id: data.user.id,
        organization_id: orgId,
        email: newAdmin.email,
        first_name: newAdmin.name.split(' ')[0] || newAdmin.name,
        last_name: newAdmin.name.split(' ').slice(1).join(' ') || '',
        role: 'admin',
        is_active: true,
      }, { onConflict: 'id' })
    }
    toast.success('Yönetici eklendi. Onay e-postası gönderildi.')
    setNewAdmin({ name: '', email: '', password: '' })
    setShowAddAdmin(false)
    setAddingAdmin(false)
    loadAdmins()
  }

  const removeAdmin = async (id: string, email: string) => {
    if (!confirm(`${email} adlı yöneticiyi silmek istiyor musunuz?`)) return
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('Yönetici kaldırıldı')
    loadAdmins()
  }

  const TABS = [
    { label: 'Organizasyon', icon: <Building2 size={15} /> },
    { label: 'SMS (NetGSM)', icon: <Bell size={15} /> },
    { label: 'WhatsApp', icon: <Bell size={15} /> },
    { label: 'PayTR Ödeme', icon: <CreditCard size={15} /> },
    { label: 'Yöneticiler', icon: <Users size={15} /> },
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
              {/* Organizasyon */}
              {tab === 0 && (
                <>
                  <h3 className="m-tit" style={{ marginBottom: '20px' }}>Organizasyon Bilgileri</h3>

                  {/* Logo Upload */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', padding: '16px', background: 'var(--bg4)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '12px', background: 'var(--bg3)', border: '2px dashed var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {org.logo ? (
                        <img src={org.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '28px' }}>🏅</span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Akademi Logosu</div>
                      <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '8px' }}>PNG, JPG — maks. 2MB</div>
                      <label style={{ cursor: 'pointer' }}>
                        <span className="btn bs btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Upload size={13} /> Logo Yükle
                        </span>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                      </label>
                    </div>
                  </div>

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

                  {/* Banka Bilgileri */}
                  <h4 style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text2)', marginBottom: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>Banka Bilgileri</h4>
                  <div className="grid-2" style={{ gap: '14px', marginBottom: '20px' }}>
                    <F label="Banka Adı" id="org-bank" value={org.bank_name} onChange={v => setOrg(p => ({ ...p, bank_name: v }))} placeholder="Örn: Ziraat Bankası" />
                    <F label="Hesap Adı" id="org-acc" value={org.account_name} onChange={v => setOrg(p => ({ ...p, account_name: v }))} placeholder="Hesap sahibi adı" />
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                      <label className="form-label" htmlFor="org-iban">IBAN</label>
                      <input id="org-iban" type="text" className="form-input" value={org.iban} onChange={e => setOrg(p => ({ ...p, iban: e.target.value }))} placeholder="TR00 0000 0000 0000 0000 0000 00" style={{ fontFamily: 'monospace', letterSpacing: '1px' }} />
                    </div>
                  </div>

                  <button className="btn bp" onClick={saveOrg} disabled={saving}>
                    {saving ? <Loader2 size={15} /> : <Save size={15} />} {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </>
              )}

              {/* SMS */}
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

              {/* WhatsApp */}
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

              {/* PayTR */}
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

              {/* Yöneticiler */}
              {tab === 4 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                      <h3 className="m-tit">Yöneticiler</h3>
                      <p style={{ color: 'var(--text3)', fontSize: '13px', marginTop: '4px' }}>Akademiye erişimi olan kullanıcılar</p>
                    </div>
                    <button className="btn bp btn-sm" onClick={() => setShowAddAdmin(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Plus size={14} /> Yönetici Ekle
                    </button>
                  </div>

                  {showAddAdmin && (
                    <div style={{ padding: '16px', background: 'var(--bg4)', borderRadius: '10px', border: '1px solid var(--border2)', marginBottom: '20px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '12px', padding: '8px 10px', background: 'rgba(45,92,179,0.1)', borderRadius: '6px' }}>
                        ℹ️ Yeni yönetici <strong>aynı akademi verisini</strong> görecektir. Yönetici e-posta adresine onay bağlantısı gönderilir.
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <F label="Ad Soyad" id="aa-name" value={newAdmin.name} onChange={v => setNewAdmin(p => ({ ...p, name: v }))} placeholder="Örn: Ahmet Yılmaz" />
                        <F label="E-posta *" id="aa-email" value={newAdmin.email} onChange={v => setNewAdmin(p => ({ ...p, email: v }))} type="email" placeholder="admin@akademi.com" />
                        <F label="Şifre * (en az 6 karakter)" id="aa-pass" value={newAdmin.password} onChange={v => setNewAdmin(p => ({ ...p, password: v }))} type="password" placeholder="••••••" />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn bs btn-sm" onClick={() => setShowAddAdmin(false)}>İptal</button>
                          <button className="btn bp btn-sm" onClick={addAdmin} disabled={addingAdmin}>
                            {addingAdmin ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />} Ekle
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {adminsLoading ? (
                    <div style={{ padding: '32px', textAlign: 'center' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto', color: 'var(--text3)' }} /></div>
                  ) : admins.length === 0 ? (
                    <div className="text-faint ts" style={{ textAlign: 'center', padding: '24px' }}>Kayıtlı yönetici bulunamadı</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {admins.map(u => (
                        <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg3)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{u.name || u.email}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                              {u.email} • <span className={`badge ${u.role === 'admin' ? 'badge-blue' : 'badge-green'}`}>{u.role === 'admin' ? 'Yönetici' : 'Antrenör'}</span>
                            </div>
                          </div>
                          {u.id !== currentUserId ? (
                            <button className="btn bd btn-xs" onClick={() => removeAdmin(u.id, u.email)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Trash2 size={12} /> Kaldır
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>(Siz)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
