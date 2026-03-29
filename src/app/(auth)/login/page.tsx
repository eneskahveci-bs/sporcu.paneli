'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { validateTC } from '@/lib/utils/tc-validation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

type LoginTab = 'athlete' | 'coach' | 'admin'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<LoginTab>('athlete')
  const [tc, setTc] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reset = (t: LoginTab) => { setTab(t); setError(''); setTc(''); setEmail(''); setPassword('') }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (tab !== 'admin') {
      if (!tc || tc.length !== 11) { setError('TC Kimlik No 11 haneli olmalıdır'); return }
      if (!validateTC(tc)) { setError('Geçersiz TC Kimlik No'); return }
      if (!password || password.length < 6) { setError('Şifre en az 6 karakter olmalıdır'); return }
    } else {
      if (!email || !password) { setError('E-posta ve şifre gereklidir'); return }
    }
    setLoading(true)
    try {
      const loginEmail = tab === 'athlete' ? `${tc}@sporcu.tc` : tab === 'coach' ? `${tc}@antrenor.tc` : email
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      if (authErr) { setError('Giriş bilgileri hatalı.'); return }
      const role = data.user?.user_metadata?.role
      if (tab === 'athlete' && role !== 'athlete' && role !== 'parent') {
        await supabase.auth.signOut(); setError('Bu hesap sporcu/veli girişi için kayıtlı değil.'); return
      }
      if (tab === 'coach' && role !== 'coach') {
        await supabase.auth.signOut(); setError('Bu hesap antrenör girişi için kayıtlı değil.'); return
      }
      if (tab === 'admin' && role !== 'admin' && role !== 'superadmin') {
        await supabase.auth.signOut(); setError('Bu hesap yönetici girişi için kayıtlı değil.'); return
      }
      if (role === 'athlete' || role === 'parent') {
        router.push('/portal')
      } else if (role === 'coach') {
        router.push('/antrenor')
      } else if (role === 'superadmin') {
        router.push('/superadmin')
      } else {
        router.push('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  const tabs: { key: LoginTab; label: string; icon: string }[] = [
    { key: 'athlete', label: 'Sporcu / Veli', icon: '🏃' },
    { key: 'coach', label: 'Antrenör', icon: '👨‍🏫' },
    { key: 'admin', label: 'Yönetici', icon: '🔐' },
  ]

  return (
    <div className="login-page">
      {/* Navbar */}
      <nav className="login-nav">
        <Link href="/" className="login-nav-logo">
          <span>🏅</span>
          <span>Sporcu Paneli</span>
        </Link>
      </nav>

      {/* Login Card */}
      <div className="login-container">
        <div className="login-split-left">
          <div className="login-brand">
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏅</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', lineHeight: 1.2 }}>Spor Akademinizi<br />Profesyonelce Yönetin</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.7, marginBottom: '2rem' }}>Sporcu takibi, ödeme yönetimi, yoklama sistemi ve daha fazlası tek platformda.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['✓ TC kimlik doğrulama', '✓ Çoklu şube desteği', '✓ SMS & WhatsApp bildirimleri', '✓ KVKK uyumlu'].map(f => (
                <div key={f} style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{f}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="login-card">
          <div className="login-card-header">
            <h1 className="login-card-title">Giriş Yap</h1>
            <p className="login-card-subtitle">Hesabınıza erişmek için türünüzü seçin</p>
          </div>

          {/* Tabs */}
          <div className="login-tabs">
            {tabs.map(t => (
              <button key={t.key} onClick={() => reset(t.key)} className={`login-tab${tab === t.key ? ' active' : ''}`}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="login-form">
            {tab !== 'admin' ? (
              <>
                <div className="fg">
                  <label className="fl">TC Kimlik No</label>
                  <input
                    className="fi"
                    type="text"
                    inputMode="numeric"
                    placeholder="11 haneli TC"
                    value={tc}
                    onChange={e => setTc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    maxLength={11}
                    autoFocus
                  />
                </div>
                <div className="fg">
                  <label className="fl">Şifre</label>
                  <div className="pw-wrap">
                    <input
                      className="fi"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Şifreniz"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button type="button" className="pw-eye" onClick={() => setShowPw(p => !p)}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="fg">
                  <label className="fl">E-posta</label>
                  <input
                    className="fi"
                    type="email"
                    placeholder="yonetici@akademi.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                <div className="fg">
                  <label className="fl">Şifre</label>
                  <div className="pw-wrap">
                    <input
                      className="fi"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Şifreniz"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button type="button" className="pw-eye" onClick={() => setShowPw(p => !p)}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {error && <div className="login-error">{error}</div>}

            <button type="submit" disabled={loading} className="login-submit">
              {loading ? <Loader2 size={16} className="spin" /> : null}
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="login-card-footer">
            <Link href="/" className="login-back-link">← Ana sayfaya dön</Link>
          </div>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          display: flex;
          flex-direction: column;
        }

        /* Nav */
        .login-nav {
          height: 64px;
          display: flex;
          align-items: center;
          padding: 0 1.5rem;
          border-bottom: 1px solid var(--border);
          background: var(--bg2);
        }
        .login-nav-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          color: var(--text);
          font-size: 1.125rem;
          font-weight: 700;
        }
        .login-nav-logo span:first-child { font-size: 1.5rem; }

        /* Container */
        .login-container {
          flex: 1;
          display: flex;
          align-items: stretch;
          justify-content: center;
        }
        .login-split-left {
          flex: 1;
          background: var(--grad);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 2.5rem;
          max-width: 420px;
        }
        .login-brand { max-width: 320px; }
        @media (max-width: 768px) {
          .login-split-left { display: none; }
        }

        /* Card */
        .login-card {
          width: 100%;
          max-width: 440px;
          background: var(--bg2);
          border-left: 1px solid var(--border2);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 3rem 2.5rem;
          box-shadow: none;
          border-radius: 0;
          animation: fadeIn 0.2s ease;
        }
        @media (max-width: 768px) {
          .login-card { border-radius: var(--radius); border: 1px solid var(--border2); box-shadow: var(--shadow); padding: 2rem 1.5rem; margin: 2rem 1rem; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .login-card-header {
          padding: 2rem 2rem 0;
          text-align: center;
        }
        .login-card-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 0.375rem;
        }
        .login-card-subtitle {
          font-size: 0.875rem;
          color: var(--text3);
        }

        /* Tabs */
        .login-tabs {
          display: flex;
          margin: 1.5rem 2rem 0;
          border-bottom: 1px solid var(--border);
        }
        .login-tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 0.625rem 0.5rem;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text3);
          transition: all 0.15s;
          margin-bottom: -1px;
        }
        .login-tab span:first-child { font-size: 1.25rem; }
        .login-tab.active { color: var(--blue2); border-bottom-color: var(--blue2); font-weight: 600; }
        .login-tab:hover:not(.active) { color: var(--text); }

        /* Form */
        .login-form {
          padding: 1.5rem 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .fg { display: flex; flex-direction: column; gap: 0.375rem; }
        .fl { font-size: 0.8125rem; font-weight: 600; color: var(--text2); }
        .fh { font-weight: 400; color: var(--text3); font-size: 0.75rem; }
        .fi {
          width: 100%;
          padding: 0.75rem 1rem;
          background: var(--bg);
          border: 1px solid var(--border2);
          border-radius: var(--radius-sm);
          font-size: 0.9375rem;
          color: var(--text);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
          font-family: inherit;
        }
        .fi:focus { border-color: var(--blue2); box-shadow: 0 0 0 3px rgba(45,92,179,0.15); }
        .fi::placeholder { color: var(--text3); }

        .pw-wrap { position: relative; }
        .pw-wrap .fi { padding-right: 2.75rem; }
        .pw-eye {
          position: absolute;
          right: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text3);
          display: flex;
          align-items: center;
          transition: color 0.15s;
          padding: 0;
        }
        .pw-eye:hover { color: var(--text2); }

        .login-error {
          font-size: 0.8125rem;
          color: var(--red, #ef4444);
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
          padding: 0.625rem 0.875rem;
          border-radius: var(--radius-sm);
        }

        .login-submit {
          padding: 0.875rem;
          background: var(--grad);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }
        .login-submit:hover:not(:disabled) { opacity: 0.88; }
        .login-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Footer */
        .login-card-footer {
          padding: 0 2rem 1.75rem;
          text-align: center;
        }
        .login-back-link {
          font-size: 0.8125rem;
          color: var(--text3);
          text-decoration: none;
          transition: color 0.15s;
        }
        .login-back-link:hover { color: var(--blue2); }

        /* Spin */
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 480px) {
          .login-card-header { padding: 1.5rem 1.5rem 0; }
          .login-tabs { margin: 1.25rem 1.5rem 0; }
          .login-form { padding: 1.25rem 1.5rem 1.25rem; }
          .login-card-footer { padding: 0 1.5rem 1.5rem; }
        }
      `}</style>
    </div>
  )
}
