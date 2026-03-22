'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { validateTC } from '@/lib/utils/tc-validation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

type LoginTab = 'athlete' | 'coach' | 'admin'

function LoginWidget() {
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
      if (!password || password.length !== 6) { setError('Şifre TC\'nin son 6 hanesi olmalıdır (6 karakter)'); return }
    } else {
      if (!email || !password) { setError('E-posta ve şifre gereklidir'); return }
    }

    setLoading(true)
    try {
      const loginEmail = tab !== 'admin' ? `${tc}@sporcu.tc` : email
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: loginEmail, password })

      if (authErr) {
        setError('Giriş bilgileri hatalı. Lütfen kontrol edin.')
        return
      }

      const role = data.user?.user_metadata?.role
      if (tab === 'athlete' && role !== 'athlete' && role !== 'parent') {
        await supabase.auth.signOut()
        setError('Bu hesap sporcu/veli girişi için kayıtlı değil.')
        return
      }
      if (tab === 'coach' && role !== 'coach') {
        await supabase.auth.signOut()
        setError('Bu hesap antrenör girişi için kayıtlı değil.')
        return
      }
      if (tab === 'admin' && role !== 'admin') {
        await supabase.auth.signOut()
        setError('Bu hesap yönetici girişi için kayıtlı değil.')
        return
      }

      if (role === 'athlete' || role === 'parent') router.push('/portal')
      else router.push('/dashboard')
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
    <div className="login-widget">
      <div className="login-widget-header">
        <h3 className="login-widget-title">Giriş Yap</h3>
        <p className="login-widget-sub">Hesap türünüzü seçin</p>
      </div>

      <div className="login-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => reset(t.key)}
            className={`login-tab ${tab === t.key ? 'active' : ''}`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleLogin} className="login-form">
        {tab !== 'admin' ? (
          <>
            <div className="lw-group">
              <label className="lw-label">TC Kimlik No</label>
              <input
                className="lw-input"
                type="text"
                inputMode="numeric"
                placeholder="11 haneli TC Kimlik No"
                value={tc}
                onChange={e => setTc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                maxLength={11}
                autoComplete="username"
              />
            </div>
            <div className="lw-group">
              <label className="lw-label">Şifre <span className="lw-hint">(TC&apos;nin son 6 hanesi)</span></label>
              <div className="lw-pw-wrap">
                <input
                  className="lw-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Son 6 hane"
                  value={password}
                  onChange={e => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  autoComplete="current-password"
                />
                <button type="button" className="lw-eye" onClick={() => setShowPw(p => !p)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="lw-group">
              <label className="lw-label">E-posta</label>
              <input
                className="lw-input"
                type="email"
                placeholder="yonetici@akademi.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="lw-group">
              <label className="lw-label">Şifre</label>
              <div className="lw-pw-wrap">
                <input
                  className="lw-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Şifreniz"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className="lw-eye" onClick={() => setShowPw(p => !p)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </>
        )}

        {error && <div className="lw-error">{error}</div>}

        <button type="submit" disabled={loading} className="lw-btn">
          {loading ? <Loader2 size={16} className="spin" /> : null}
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  )
}

export default function LandingPage() {
  const [notify, setNotify] = useState(false)

  const handleAkademiKayit = () => {
    setNotify(true)
    setTimeout(() => setNotify(false), 4000)
  }

  return (
    <div className="landing-page">
      {/* Notification */}
      {notify && (
        <div className="lp-notify">
          Akademi kaydı için lütfen <strong>eneskahveci.bs@gmail.com</strong> veya <strong>+90 546 977 58 68</strong> ile iletişime geçin.
        </div>
      )}

      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <span className="landing-logo-icon">🏅</span>
            <span className="landing-logo-text">Sporcu Paneli</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features">Özellikler</a>
            <a href="#contact">İletişim</a>
          </div>
          <div className="landing-nav-actions">
            <button onClick={handleAkademiKayit} className="btn-primary-sm">Akademi Kayıt</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="hero-badge">🏅 Spor Akademisi Yönetim Sistemi</div>
          <h1 className="hero-title">
            Spor Akademinizi<br />
            <span className="hero-title-accent">Profesyonelce</span> Yönetin
          </h1>
          <p className="hero-subtitle">
            Sporcu kaydından ödeme takibine, devam yoklamasından SMS bildirimlerine —
            tüm akademi operasyonlarınızı tek platformda yönetin.
          </p>
        </div>
        <div className="hero-visual">
          <LoginWidget />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="landing-section">
        <div className="landing-section-inner">
          <div className="section-header">
            <h2 className="section-title">Her İhtiyacınız İçin Bir Çözüm</h2>
            <p className="section-subtitle">Spor akademinizi büyütmek için ihtiyaç duyduğunuz her şey tek bir platformda</p>
          </div>
          <div className="features-grid">
            {[
              { icon: '👤', title: 'Sporcu Yönetimi', desc: 'TC kimlik doğrulamalı sporcu kaydı, veli bilgileri, sağlık bilgileri ve dosya yönetimi.' },
              { icon: '💳', title: 'Ödeme Takibi', desc: 'Otomatik aidat planları, PayTR entegrasyonu, gecikmiş ödeme bildirimleri ve gelir raporları.' },
              { icon: '📋', title: 'Devam Yoklaması', desc: 'Günlük devam takibi, mazeretli/özürsüz ayrımı, devam istatistikleri ve veli bilgilendirmesi.' },
              { icon: '📱', title: 'SMS & WhatsApp', desc: 'NetGSM entegrasyonu ile toplu SMS gönderimi, WhatsApp Business API desteği.' },
              { icon: '📊', title: 'Gelişmiş Raporlar', desc: 'Aylık gelir grafikleri, devam analizi, sporcu gelişim takibi ve özelleştirilebilir raporlar.' },
              { icon: '🏆', title: 'Çoklu Spor Dalı', desc: 'Futbol, basketbol, yüzme ve daha fazlası — tüm spor dallarını tek panelden yönetin.' },
              { icon: '👨‍🏫', title: 'Antrenör Paneli', desc: 'Antrenörler için özel erişim, yoklama girişi ve kendi sınıflarını yönetme imkanı.' },
              { icon: '🔐', title: 'Banka Güvenliği', desc: 'Row Level Security, SSL/TLS şifreleme, KVKK uyumu ve 2FA desteği.' },
              { icon: '📲', title: 'Sporcu Portalı', desc: 'Sporcular ve veliler için mobil uyumlu kişisel portal — ödeme ve devam görüntüleme.' },
            ].map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-brand">
            <span className="landing-logo-icon">🏅</span>
            <span className="landing-logo-text">Sporcu Paneli</span>
            <p className="footer-tagline">Spor akademinizi güçlendirin.</p>
          </div>
          <div className="footer-links">
            <div className="footer-link-group">
              <h4>Ürün</h4>
              <a href="#features">Özellikler</a>
              <Link href="/on-kayit">Ön Kayıt</Link>
            </div>
            <div className="footer-link-group">
              <h4>Hukuki</h4>
              <a href="#">Gizlilik Politikası</a>
              <a href="#">Kullanım Koşulları</a>
              <a href="#">KVKK Aydınlatma</a>
            </div>
            <div className="footer-link-group">
              <h4>İletişim</h4>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Enes Kahveci</span>
              <a href="mailto:eneskahveci.bs@gmail.com">eneskahveci.bs@gmail.com</a>
              <a href="tel:+905469775868">+90 546 977 58 68</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Sporcu Paneli. Tüm hakları saklıdır.</p>
          <p>🇹🇷 Türkiye&apos;de geliştirildi — KVKK uyumlu</p>
        </div>
      </footer>

      <style>{`
        .landing-page { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }

        /* Notification */
        .lp-notify { position: fixed; top: 1rem; left: 50%; transform: translateX(-50%); z-index: 9999; background: var(--bg4); border: 1px solid var(--blue2); border-radius: 0.75rem; padding: 0.875rem 1.25rem; font-size: 0.875rem; color: var(--text); box-shadow: var(--shadow); max-width: 480px; width: 90%; text-align: center; animation: slideDown 0.3s ease; }
        @keyframes slideDown { from { opacity:0; transform: translateX(-50%) translateY(-1rem); } to { opacity:1; transform: translateX(-50%) translateY(0); } }

        /* Nav */
        .landing-nav { position: sticky; top: 0; z-index: 50; background: var(--bg2); border-bottom: 1px solid var(--border); backdrop-filter: blur(12px); }
        .landing-nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; height: 64px; display: flex; align-items: center; gap: 2rem; }
        .landing-logo { display: flex; align-items: center; gap: 0.5rem; text-decoration: none; margin-right: auto; }
        .landing-logo-icon { font-size: 1.5rem; }
        .landing-logo-text { font-size: 1.125rem; font-weight: 700; color: var(--text); }
        .landing-nav-links { display: flex; gap: 2rem; }
        .landing-nav-links a { color: var(--text2); text-decoration: none; font-size: 0.9375rem; transition: color 0.15s; }
        .landing-nav-links a:hover { color: var(--blue2); }
        .landing-nav-actions { display: flex; gap: 0.75rem; }
        .btn-primary-sm { padding: 0.4375rem 1rem; background: var(--grad); border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #fff; border: none; cursor: pointer; transition: opacity 0.15s; text-decoration: none; }
        .btn-primary-sm:hover { opacity: 0.88; }

        /* Hero */
        .landing-hero { max-width: 1200px; margin: 0 auto; padding: 5rem 1.5rem; display: flex; gap: 4rem; align-items: center; }
        .landing-hero-inner { flex: 1; }
        .hero-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.875rem; background: var(--bg4); color: var(--blue2); border: 1px solid var(--border2); border-radius: 2rem; font-size: 0.8125rem; font-weight: 600; margin-bottom: 1.5rem; }
        .hero-title { font-size: clamp(2rem, 4vw, 3.25rem); font-weight: 800; line-height: 1.15; letter-spacing: -0.03em; margin-bottom: 1.25rem; color: var(--text); }
        .hero-title-accent { background: var(--grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hero-subtitle { font-size: 1.0625rem; color: var(--text2); line-height: 1.7; max-width: 480px; }
        .hero-visual { flex: 1; }

        /* Login Widget */
        .login-widget { background: var(--bg2); border: 1px solid var(--border2); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); }
        .login-widget-header { padding: 1.5rem 1.5rem 0; }
        .login-widget-title { font-size: 1.125rem; font-weight: 700; color: var(--text); margin-bottom: 0.25rem; }
        .login-widget-sub { font-size: 0.8125rem; color: var(--text3); }
        .login-tabs { display: flex; padding: 1rem 1.5rem 0; border-bottom: 1px solid var(--border); }
        .login-tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.625rem 0.5rem; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-size: 0.75rem; font-weight: 500; color: var(--text3); transition: all 0.15s; margin-bottom: -1px; }
        .login-tab span:first-child { font-size: 1.25rem; }
        .login-tab.active { color: var(--blue2); border-bottom-color: var(--blue2); }
        .login-tab:hover:not(.active) { color: var(--text); }
        .login-form { padding: 1.25rem 1.5rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .lw-group { display: flex; flex-direction: column; gap: 0.375rem; }
        .lw-label { font-size: 0.8125rem; font-weight: 600; color: var(--text2); display: flex; align-items: center; gap: 0.375rem; }
        .lw-hint { font-weight: 400; color: var(--text3); font-size: 0.75rem; }
        .lw-input { width: 100%; padding: 0.625rem 0.875rem; background: var(--bg); border: 1px solid var(--border2); border-radius: var(--radius-sm); font-size: 0.9375rem; color: var(--text); outline: none; transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box; }
        .lw-input:focus { border-color: var(--blue2); box-shadow: 0 0 0 3px rgba(45,92,179,0.15); }
        .lw-input::placeholder { color: var(--text3); }
        .lw-pw-wrap { position: relative; }
        .lw-pw-wrap .lw-input { padding-right: 2.5rem; }
        .lw-eye { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text3); display: flex; align-items: center; padding: 0; transition: color 0.15s; }
        .lw-eye:hover { color: var(--text2); }
        .lw-error { font-size: 0.8125rem; color: var(--red); background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); padding: 0.625rem 0.875rem; border-radius: var(--radius-sm); }
        .lw-btn { padding: 0.75rem; background: var(--grad); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s, box-shadow 0.15s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .lw-btn:hover:not(:disabled) { opacity: 0.88; box-shadow: var(--shadow-sm); }
        .lw-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Sections */
        .landing-section { padding: 5rem 0; }
        .landing-section-inner { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
        .section-header { text-align: center; margin-bottom: 3.5rem; }
        .section-title { font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.75rem; color: var(--text); }
        .section-subtitle { font-size: 1.0625rem; color: var(--text2); }

        /* Features */
        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
        .feature-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem; transition: all 0.2s; }
        .feature-card:hover { border-color: var(--border2); box-shadow: var(--shadow-sm); transform: translateY(-2px); }
        .feature-icon { font-size: 2rem; margin-bottom: 0.75rem; }
        .feature-title { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text); }
        .feature-desc { font-size: 0.875rem; color: var(--text2); line-height: 1.6; }

        /* Footer */
        .landing-footer { background: var(--bg2); border-top: 1px solid var(--border); padding: 3rem 1.5rem 1.5rem; margin-top: 2rem; }
        .landing-footer-inner { max-width: 1200px; margin: 0 auto; display: flex; gap: 4rem; margin-bottom: 2.5rem; }
        .footer-brand { flex: 1; }
        .footer-tagline { font-size: 0.875rem; color: var(--text3); margin-top: 0.5rem; }
        .footer-links { display: flex; gap: 3rem; }
        .footer-link-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .footer-link-group h4 { font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text3); margin-bottom: 0.25rem; }
        .footer-link-group a { font-size: 0.875rem; color: var(--text2); text-decoration: none; transition: color 0.15s; }
        .footer-link-group a:hover { color: var(--blue2); }
        .footer-bottom { max-width: 1200px; margin: 0 auto; border-top: 1px solid var(--border); padding-top: 1.5rem; display: flex; justify-content: space-between; font-size: 0.8125rem; color: var(--text3); flex-wrap: wrap; gap: 0.5rem; }

        @media (max-width: 1024px) {
          .landing-hero { flex-direction: column; gap: 2.5rem; }
          .hero-visual { width: 100%; }
          .features-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .landing-nav-links { display: none; }
          .landing-hero { padding: 2.5rem 1rem; }
          .features-grid { grid-template-columns: 1fr; }
          .landing-footer-inner { flex-direction: column; gap: 2rem; }
          .footer-links { flex-direction: column; gap: 1.5rem; }
        }
      `}</style>
    </div>
  )
}
