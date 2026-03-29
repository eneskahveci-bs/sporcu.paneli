'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2, Eye, EyeOff, KeyRound, User } from 'lucide-react'
import { toast } from 'sonner'
import { getInitials } from '@/lib/utils/formatters'

export default function ProfilePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email: string; full_name: string; role: string; org_name: string } | null>(null)

  // Profil formu
  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Şifre formu
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  const ROLE_LABELS: Record<string, string> = {
    admin: 'Yönetici', superadmin: 'Süper Admin', coach: 'Antrenör', athlete: 'Sporcu', parent: 'Veli',
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      const fullName = u.user_metadata?.full_name || `${u.user_metadata?.first_name || ''} ${u.user_metadata?.last_name || ''}`.trim() || u.email?.split('@')[0] || ''
      setUser({
        id: u.id,
        email: u.email || '',
        full_name: fullName,
        role: u.user_metadata?.role || 'admin',
        org_name: u.user_metadata?.organization_name || '',
      })
      setName(fullName)
      setLoading(false)
    }
    load()
  }, [supabase])

  const saveName = async () => {
    if (!name.trim()) { toast.error('İsim boş olamaz'); return }
    setSavingName(true)
    const nameParts = name.trim().split(' ')
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: name.trim(),
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(' '),
      },
    })
    setSavingName(false)
    if (error) { toast.error(error.message); return }
    setUser(u => u ? { ...u, full_name: name.trim() } : u)
    toast.success('İsim güncellendi')
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPw) { toast.error('Mevcut şifrenizi girin'); return }
    if (newPw.length < 8) { toast.error('Yeni şifre en az 8 karakter olmalıdır'); return }
    if (newPw !== confirmPw) { toast.error('Şifreler eşleşmiyor'); return }
    if (newPw === currentPw) { toast.error('Yeni şifre mevcut şifreden farklı olmalıdır'); return }

    setSavingPw(true)
    // Mevcut şifreyi doğrulamak için yeniden giriş yap
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user!.email,
      password: currentPw,
    })
    if (signInErr) { setSavingPw(false); toast.error('Mevcut şifre hatalı'); return }

    const { error } = await supabase.auth.updateUser({ password: newPw })
    setSavingPw(false)
    if (error) { toast.error(error.message); return }

    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    toast.success('Şifreniz başarıyla değiştirildi')
  }

  if (loading) return (
    <DashboardLayout title="Profilim">
      <div style={{ padding: 64, textAlign: 'center' }}>
        <Loader2 size={28} style={{ margin: '0 auto', color: 'var(--text3)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="Profilim">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profilim</h1>
          <p className="page-subtitle">Hesap bilgilerinizi ve şifrenizi yönetin</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, maxWidth: 900 }}>

        {/* Profil Kartı */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {getInitials(user?.full_name || '')}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>{user?.full_name}</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>{user?.email}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <span className="badge badge-blue" style={{ fontSize: 11 }}>{ROLE_LABELS[user?.role || 'admin']}</span>
                {user?.org_name && <span className="badge badge-gray" style={{ fontSize: 11 }}>{user.org_name}</span>}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
              <User size={14} /> Görünen İsim
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="form-input"
                style={{ flex: 1 }}
                placeholder="Ad Soyad"
              />
              <button className="btn bp" onClick={saveName} disabled={savingName} style={{ whiteSpace: 'nowrap' }}>
                {savingName ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                {savingName ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>E-posta</div>
              <div style={{ fontSize: 14, color: 'var(--text2)', background: 'var(--bg3)', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                {user?.email}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>E-posta değişikliği için yöneticinize başvurun</div>
            </div>
          </div>
        </div>

        {/* Şifre Değiştirme Kartı */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 7 }}>
            <KeyRound size={14} /> Şifre Değiştir
          </div>
          <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Mevcut Şifre</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Mevcut şifreniz"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShowPw(p => !p)} style={eyeBtn}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Yeni Şifre <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 11 }}>(min 8 karakter)</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Yeni şifreniz"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  style={{ paddingRight: 40 }}
                />
              </div>
              {/* Güç göstergesi */}
              {newPw.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: passwordStrength(newPw) >= i ? strengthColor(passwordStrength(newPw)) : 'var(--border2)' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: strengthColor(passwordStrength(newPw)) }}>
                    {['', 'Zayıf', 'Orta', 'İyi', 'Güçlü'][passwordStrength(newPw)]}
                  </div>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Yeni Şifre Tekrar</label>
              <input
                type={showPw ? 'text' : 'password'}
                className="form-input"
                placeholder="Şifrenizi tekrar girin"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
              />
              {confirmPw && newPw !== confirmPw && (
                <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>Şifreler eşleşmiyor</div>
              )}
              {confirmPw && newPw === confirmPw && newPw.length >= 8 && (
                <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>✓ Şifreler eşleşiyor</div>
              )}
            </div>
            <button type="submit" className="btn bp" disabled={savingPw} style={{ marginTop: 4 }}>
              {savingPw ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <KeyRound size={14} />}
              {savingPw ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
            </button>
          </form>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </DashboardLayout>
  )
}

function passwordStrength(pw: string): number {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) score++
  return Math.min(score, 4)
}

function strengthColor(score: number): string {
  return ['', '#ef4444', '#f59e0b', '#0ea5e9', '#10b981'][score]
}

const eyeBtn: React.CSSProperties = {
  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex',
}
