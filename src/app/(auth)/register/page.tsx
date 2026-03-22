'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ThemeProvider } from '@/providers/ThemeProvider'

function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    orgName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.orgName.trim()) errs.orgName = 'Akademi adı gereklidir'
    if (!form.firstName.trim()) errs.firstName = 'Ad gereklidir'
    if (!form.lastName.trim()) errs.lastName = 'Soyad gereklidir'
    if (!form.email) errs.email = 'E-posta gereklidir'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Geçersiz e-posta'
    if (form.password.length < 8) errs.password = 'Şifre en az 8 karakter olmalıdır'
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Şifreler eşleşmiyor'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    try {
      const supabase = createClient()
      const slug = form.orgName.toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

      // 1. Organizasyon oluştur (service role ile yapılmalı - burada client-side demo)
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: form.orgName, slug, email: form.email, phone: form.phone })
        .select()
        .single()

      if (orgError) {
        if (orgError.code === '23505') {
          toast.error('Bu akademi adı zaten kullanılıyor')
        } else {
          toast.error('Organizasyon oluşturulamadı: ' + orgError.message)
        }
        return
      }

      // 2. Kullanıcı kaydı
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            first_name: form.firstName,
            last_name: form.lastName,
            role: 'admin',
            organization_id: org.id,
            organization_name: org.name,
          },
        },
      })

      if (signUpError) {
        // Org'u geri al
        await supabase.from('organizations').delete().eq('id', org.id)
        toast.error(signUpError.message)
        return
      }

      toast.success('Hesabınız oluşturuldu! E-postanızı doğrulayın.')
      router.push('/login')
    } catch {
      toast.error('Bir hata oluştu. Lütfen tekrar deneyin.')
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
      <input
        id={id}
        type={type}
        className={`form-input${error ? ' error' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required}
      />
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
            <div className="auth-subtitle">Ücretsiz başlayın, istediğiniz zaman büyütün</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Field
              id="orgName" label="Akademi / Kulüp Adı"
              value={form.orgName} onChange={(v) => update('orgName', v)}
              error={errors.orgName} placeholder="Örn: Dragon Futbol Akademisi"
            />

            <div className="grid-2">
              <Field id="firstName" label="Ad" value={form.firstName}
                onChange={(v) => update('firstName', v)} error={errors.firstName} />
              <Field id="lastName" label="Soyad" value={form.lastName}
                onChange={(v) => update('lastName', v)} error={errors.lastName} />
            </div>

            <Field id="email" label="E-posta" type="email"
              value={form.email} onChange={(v) => update('email', v)}
              error={errors.email} placeholder="ornek@email.com" />

            <Field id="phone" label="Telefon" type="tel"
              value={form.phone} onChange={(v) => update('phone', v)}
              error={errors.phone} placeholder="0555 123 4567" required={false} />

            <div className="form-group">
              <label className="form-label required" htmlFor="password">Şifre</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password" type={showPw ? 'text' : 'password'}
                  className={`form-input${errors.password ? ' error' : ''}`}
                  placeholder="En az 8 karakter" value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  style={{ paddingRight: '44px' }} aria-required="true"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex' }}
                  aria-label={showPw ? 'Gizle' : 'Göster'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>

            <Field id="confirmPassword" label="Şifre Tekrar" type="password"
              value={form.confirmPassword} onChange={(v) => update('confirmPassword', v)}
              error={errors.confirmPassword} placeholder="Şifrenizi tekrar girin" />
          </div>

          <button type="submit" className="btn bp" disabled={loading}
            style={{ width: '100%', height: '44px', fontSize: '15px', marginTop: '20px' }}>
            {loading ? <Loader2 size={18} /> : null}
            {loading ? 'Oluşturuluyor...' : 'Akademimi Oluştur'}
          </button>
        </form>

        <p style={{ fontSize: '13px', color: 'var(--text3)', textAlign: 'center', marginTop: '16px' }}>
          Zaten hesabınız var mı?{' '}
          <Link href="/login" style={{ color: 'var(--blue2)', textDecoration: 'none', fontWeight: 600 }}>
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function Page() {
  return <ThemeProvider><RegisterPage /></ThemeProvider>
}
