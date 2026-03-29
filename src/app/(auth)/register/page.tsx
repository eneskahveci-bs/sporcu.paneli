'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { validatePassword, SCORE_LABELS, SCORE_COLORS } from '@/lib/password-validator'

function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ orgName: '', firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  const pwValidation = validatePassword(form.password, { email: form.email })

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.orgName.trim()) errs.orgName = 'Akademi adı gereklidir'
    if (!form.firstName.trim()) errs.firstName = 'Ad gereklidir'
    if (!form.lastName.trim()) errs.lastName = 'Soyad gereklidir'
    if (!form.email) errs.email = 'E-posta gereklidir'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Geçersiz e-posta'
    if (!pwValidation.valid) errs.password = pwValidation.errors[0]
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Şifreler eşleşmiyor'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/register-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: form.orgName,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) toast.error(data.error || 'Bu bilgiler zaten kayıtlı')
        else toast.error(data.error || 'Kayıt sırasında hata oluştu')
        return
      }
      toast.success('Hesabınız oluşturuldu! E-postanızı doğrulayın.')
      router.push('/login')
    } catch {
      toast.error('Bağlantı hatası. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ id, label, type = 'text', value, onChange, error, placeholder, required = true }: {
    id: string; label: string; type?: string; value: string;
    onChange: (v: string) => void; error?: string; placeholder?: string; required?: boolean
  }) => (
    <div className="form-group">
      <label className={`form-label${required ? ' required' : ''}`} htmlFor={id}>{label}</label>
      <input id={id} type={type} className={`form-input${error ? ' error' : ''}`}
        placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} aria-required={required} />
      {error && <div className="form-error">{error}</div>}
    </div>
  )

  return (
    <div className="auth-bg">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">🏅</div>
          <div>
            <div className="auth-title">Akademinizi Oluşturun</div>
            <div className="auth-subtitle">14 gün ücretsiz deneme — kredi kartı gerekmez</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Field id="orgName" label="Akademi / Kulüp Adı"
              value={form.orgName} onChange={(v) => update('orgName', v)}
              error={errors.orgName} placeholder="Örn: Dragon Futbol Akademisi" />

            <div className="grid-2">
              <Field id="firstName" label="Ad" value={form.firstName}
                onChange={(v) => update('firstName', v)} error={errors.firstName} />
              <Field id="lastName" label="Soyad" value={form.lastName}
                onChange={(v) => update('lastName', v)} error={errors.lastName} />
            </div>

            <Field id="email" label="E-posta" type="email" value={form.email}
              onChange={(v) => update('email', v)} error={errors.email} placeholder="ornek@email.com" />

            <Field id="phone" label="Telefon" type="tel" value={form.phone}
              onChange={(v) => update('phone', v)} error={errors.phone}
              placeholder="0555 123 4567" required={false} />

            {/* Şifre alanı — güç göstergesi ile */}
            <div className="form-group">
              <label className="form-label required" htmlFor="password">Şifre</label>
              <div style={{ position: 'relative' }}>
                <input id="password" type={showPw ? 'text' : 'password'}
                  className={`form-input${errors.password ? ' error' : ''}`}
                  placeholder="En az 8 karakter" value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  style={{ paddingRight: '44px' }} aria-required="true" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <div className="form-error">{errors.password}</div>}

              {/* Şifre güç göstergesi */}
              {form.password.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: pwValidation.score > i ? SCORE_COLORS[pwValidation.score] : 'var(--border2)', transition: 'background 0.2s' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: SCORE_COLORS[pwValidation.score], fontWeight: 600 }}>
                      {SCORE_LABELS[pwValidation.score]}
                    </span>
                    {pwValidation.suggestions[0] && (
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>💡 {pwValidation.suggestions[0]}</span>
                    )}
                  </div>
                  {/* Geçilen/kalan kurallar */}
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[
                      { ok: form.password.length >= 8, text: 'En az 8 karakter' },
                      { ok: /[a-zA-Z]/.test(form.password), text: 'En az bir harf' },
                      { ok: /[0-9]/.test(form.password), text: 'En az bir rakam' },
                    ].map(r => (
                      <div key={r.text} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: r.ok ? '#10b981' : 'var(--text3)' }}>
                        {r.ok ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {r.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Field id="confirmPassword" label="Şifre Tekrar" type="password"
              value={form.confirmPassword} onChange={(v) => update('confirmPassword', v)}
              error={errors.confirmPassword} placeholder="Şifrenizi tekrar girin" />
          </div>

          <button type="submit" className="btn bp" disabled={loading}
            style={{ width: '100%', height: '44px', fontSize: '15px', marginTop: '20px' }}>
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {loading ? 'Oluşturuluyor...' : 'Akademimi Oluştur'}
          </button>
        </form>

        <p style={{ fontSize: '13px', color: 'var(--text3)', textAlign: 'center', marginTop: '16px' }}>
          Zaten hesabınız var mı?{' '}
          <Link href="/login" style={{ color: 'var(--blue2)', textDecoration: 'none', fontWeight: 600 }}>Giriş Yap</Link>
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'center', marginTop: '8px', lineHeight: 1.5 }}>
          Kayıt olarak <Link href="/kullanim-kosullari" style={{ color: 'var(--blue2)' }}>Kullanım Koşulları</Link>'nı ve{' '}
          <Link href="/kvkk" style={{ color: 'var(--blue2)' }}>KVKK</Link>'yı kabul etmiş olursunuz.
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function Page() {
  return <ThemeProvider><RegisterPage /></ThemeProvider>
}
