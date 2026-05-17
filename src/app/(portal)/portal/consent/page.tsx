'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { Loader2, FileSignature, CheckCircle, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/utils/formatters'
import { SignaturePad, type SignaturePadHandle } from '@/components/ui/SignaturePad'

interface Form {
  id: string
  title: string
  description?: string
  status: string
  signed_at?: string
  signer_name?: string
  expires_at?: string
  created_at: string
}

function ConsentInner() {
  const supabase = createClient()
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState<Form | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: athlete } = await supabase.from('athletes').select('id').eq('auth_user_id', user.id).maybeSingle()
    if (!athlete) { setLoading(false); return }
    const { data } = await supabase.from('consent_forms').select('*').eq('athlete_id', athlete.id).order('created_at', { ascending: false })
    setForms((data || []) as Form[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const pending = forms.filter(f => f.status === 'pending')
  const signed = forms.filter(f => f.status !== 'pending')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 16 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Link href="/portal" style={{ color: 'var(--text2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={18} /> Portal
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <FileSignature size={24} color="var(--blue2)" />
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Onay Formları</h1>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><Loader2 size={24} className="spin" /></div>
        ) : (
          <>
            {pending.length > 0 && (
              <>
                <h2 style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 8, fontWeight: 600 }}>İmza Bekleyen</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {pending.map(f => (
                    <div key={f.id} className="card" style={{ padding: 14, borderLeft: '3px solid #f59e0b' }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
                      {f.description && <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>{f.description}</div>}
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>
                        Oluşturulma: {formatDate(f.created_at)} {f.expires_at && `· Son: ${formatDate(f.expires_at)}`}
                      </div>
                      <button className="btn bp" onClick={() => setSigning(f)}><FileSignature size={14} /> İmzala</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {signed.length > 0 && (
              <>
                <h2 style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 8, fontWeight: 600 }}>Geçmiş</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {signed.map(f => (
                    <div key={f.id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckCircle size={16} color="#22c55e" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{f.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {f.signer_name} · {f.signed_at ? formatDateTime(f.signed_at) : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {forms.length === 0 && (
              <div className="empty-state"><div className="empty-state-icon"><FileSignature size={40} /></div><div className="empty-state-title">Form yok</div></div>
            )}
          </>
        )}

        {signing && <SignModal form={signing} onClose={() => setSigning(null)} onDone={() => { setSigning(null); load() }} />}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </div>
  )
}

function SignModal({ form, onClose, onDone }: { form: Form; onClose: () => void; onDone: () => void }) {
  const supabase = createClient()
  const padRef = useRef<SignaturePadHandle>(null)
  const [signerName, setSignerName] = useState('')
  const [signerTc, setSignerTc] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSign = async () => {
    if (!padRef.current || padRef.current.isEmpty()) { toast.error('Lütfen imza alanını doldurun'); return }
    if (!signerName.trim() || !signerTc.trim()) { toast.error('Ad-soyad ve TC gerekli'); return }
    if (!accepted) { toast.error('KVKK onayı gerekli'); return }
    setSaving(true)
    const signatureData = padRef.current.toDataURL()
    const { error } = await supabase.from('consent_forms').update({
      signature_data: signatureData,
      signed_at: new Date().toISOString(),
      signer_name: signerName,
      signer_tc: signerTc,
      status: 'signed',
    }).eq('id', form.id)
    setSaving(false)
    if (error) { toast.error('Hata: ' + error.message); return }
    toast.success('İmza kaydedildi')
    onDone()
  }

  return (
    <div className="modal-overlay" onClick={saving ? undefined : onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{form.title}</h2>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {form.description && (
            <div style={{ background: 'var(--bg3)', padding: 12, borderRadius: 8, fontSize: 13, color: 'var(--text2)', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
              {form.description}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group"><label className="form-label required">Ad Soyad</label><input className="form-input" value={signerName} onChange={e => setSignerName(e.target.value)} /></div>
            <div className="form-group"><label className="form-label required">TC No</label><input className="form-input" maxLength={11} value={signerTc} onChange={e => setSignerTc(e.target.value.replace(/\D/g, ''))} /></div>
          </div>
          <div>
            <label className="form-label required">İmza</label>
            <SignaturePad ref={padRef} height={180} />
            <button onClick={() => padRef.current?.clear()} style={{ marginTop: 6, background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}>Temizle</button>
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text2)' }}>
            <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} style={{ marginTop: 3 }} />
            <span>Bu dijital imzanın KEP/mobil imza yerine geçmediğini, yalnızca görsel onay niteliğinde olduğunu ve KVKK kapsamında işlendiğini kabul ediyorum.</span>
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn bs" onClick={onClose} disabled={saving}>İptal</button>
          <button className="btn bp" onClick={handleSign} disabled={saving}>
            {saving ? <Loader2 size={14} className="spin" /> : <FileSignature size={14} />} İmzala ve Gönder
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ConsentPortalPage() {
  return <ThemeProvider><ConsentInner /></ThemeProvider>
}
