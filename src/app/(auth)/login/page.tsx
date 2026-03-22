'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { validateTC } from '@/lib/utils/tc-validation'
import { ThemeProvider } from '@/providers/ThemeProvider'

function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const [loginType, setLoginType] = useState<'email' | 'tc'>('email')
  const [email, setEmail] = useState('')
  const [tc, setTc] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (loginType === 'tc') {
      if (!tc) errs.tc = 'TC Kimlik No gereklidir'
      else if (!validateTC(tc)) errs.tc = 'Geçersiz TC Kimlik No'
    } else {
      if (!email) errs.email = 'E-posta gereklidir'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Geçersiz e-posta'
    }
    if (!password) errs.password = 'Şifre gereklidir'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    try {
      const supabase = createClient()
      let result

      if (loginType === 'tc') {
        // TC ile giriş - email olarak tc@domain kullan
        result = await supabase.auth.signInWithPassword({
          email: `${tc}@sporcu.tc`,
          password,
        })
      } else {
        result = await supabase.auth.signInWithPassword({ email, password })
      }

      if (result.error) {
        if (result.error.message.includes('Invalid login')) {
          toast.error('TC/E-posta veya şifre hatalı')
        } else {
          toast.error(result.error.message)
        }
        return
      }

      toast.success('Giriş başarılı!')
      router.push(redirect)
      router.refresh()
    } catch {
      toast.error('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🏅</div>
          <div>
            <div className="auth-title">Sporcu Paneli</div>
            <div className="auth-subtitle">Yönetim Sistemine Giriş</div>
          </div>
        </div>

        {/* Login Type Toggle */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', background: 'var(--bg3)', borderRadius: '10px', padding: '4px' }}>
          <button
            type="button"
            onClick={() => setLoginType('email')}
            className="btn"
            style={{
              flex: 1, height: '36px', borderRadius: '7px', fontSize: '13px',
              background: loginType === 'email' ? 'var(--grad)' : 'transparent',
              color: loginType === 'email' ? '#fff' : 'var(--text2)',
            }}
          >
            E-posta ile Giriş
          </button>
          <button
            type="button"
            onClick={() => setLoginType('tc')}
            className="btn"
            style={{
              flex: 1, height: '36px', borderRadius: '7px', fontSize: '13px',
              background: loginType === 'tc' ? 'var(--grad)' : 'transparent',
              color: loginType === 'tc' ? '#fff' : 'var(--text2)',
            }}
          >
            TC ile Giriş
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {loginType === 'email' ? (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label required" htmlFor="email">E-posta</label>
              <input
                id="email"
                type="email"
                className={`form-input${errors.email ? ' error' : ''}`}
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-required="true"
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && <div className="form-error" id="email-error">{errors.email}</div>}
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label required" htmlFor="tc-input">TC Kimlik No</label>
              <input
                id="tc-input"
                type="text"
                inputMode="numeric"
                maxLength={11}
                className={`form-input${errors.tc ? ' error' : ''}`}
                placeholder="11 haneli TC Kimlik No"
                value={tc}
                onChange={(e) => setTc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                aria-required="true"
                aria-describedby={errors.tc ? 'tc-error' : undefined}
              />
              {errors.tc && <div className="form-error" id="tc-error">{errors.tc}</div>}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label required" htmlFor="password">Şifre</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                className={`form-input${errors.password ? ' error' : ''}`}
                placeholder="Şifrenizi girin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                aria-required="true"
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', color: 'var(--text3)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                }}
                aria-label={showPw ? 'Şifreyi gizle' : 'Şifreyi göster'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          <button
            type="submit"
            className="btn bp"
            disabled={loading}
            style={{ width: '100%', height: '44px', fontSize: '15px' }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: 'var(--text3)', fontSize: '12px', marginBottom: '12px' }}>
            <Shield size={12} />
            256-bit SSL şifrelemesi ile korunmaktadır
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text3)' }}>
            Hesabınız yok mu?{' '}
            <Link href="/register" style={{ color: 'var(--blue2)', textDecoration: 'none', fontWeight: 600 }}>
              Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <ThemeProvider>
      <Suspense fallback={<div className="auth-page" />}>
        <LoginPage />
      </Suspense>
    </ThemeProvider>
  )
}
