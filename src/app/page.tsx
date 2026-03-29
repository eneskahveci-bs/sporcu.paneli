'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { validateTC } from '@/lib/utils/tc-validation'
import { Eye, EyeOff, Loader2, X, Users, CreditCard, ClipboardCheck, MessageSquare, BarChart3, Trophy, GraduationCap, ShieldCheck, Smartphone, ChevronRight } from 'lucide-react'

type LoginTab = 'athlete' | 'coach' | 'admin'

// ── Login Modal ─────────────────────────────────────────────────────────────
function LoginModal({ onClose }: { onClose: () => void }) {
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
      if (!password || password.length !== 6) { setError('Şifre TC\'nin son 6 hanesi (6 karakter)'); return }
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
      if (tab === 'admin' && role !== 'admin') {
        await supabase.auth.signOut(); setError('Bu hesap yönetici girişi için kayıtlı değil.'); return
      }
      onClose()
      if (role === 'athlete' || role === 'parent') {
        router.push('/portal')
      } else if (role === 'coach') {
        router.push('/antrenor')
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="modal-title">Giriş Yap</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="login-tabs">
          {tabs.map(t => (
            <button key={t.key} onClick={() => reset(t.key)} className={`login-tab${tab === t.key ? ' active' : ''}`}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleLogin} className="modal-form">
          {tab !== 'admin' ? (
            <>
              <div className="fg">
                <label className="fl">TC Kimlik No</label>
                <input className="fi" type="text" inputMode="numeric" placeholder="11 haneli TC"
                  value={tc} onChange={e => setTc(e.target.value.replace(/\D/g, '').slice(0, 11))} maxLength={11} />
              </div>
              <div className="fg">
                <label className="fl">Şifre <span className="fh">(TC&apos;nin son 6 hanesi)</span></label>
                <div className="pw-wrap">
                  <input className="fi" type={showPw ? 'text' : 'password'} placeholder="Son 6 hane"
                    value={password} onChange={e => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} />
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
                <input className="fi" type="email" placeholder="yonetici@akademi.com"
                  value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="fg">
                <label className="fl">Şifre</label>
                <div className="pw-wrap">
                  <input className="fi" type={showPw ? 'text' : 'password'} placeholder="Şifreniz"
                    value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
                  <button type="button" className="pw-eye" onClick={() => setShowPw(p => !p)}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </>
          )}
          {error && <div className="modal-error">{error}</div>}
          <button type="submit" disabled={loading} className="modal-submit">
            {loading ? <Loader2 size={16} className="spin" /> : null}
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Akademi Kayıt Modal ───────────────────────────────────────────────────────
function AkademiKayitModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ akademi_adi: '', yetkili_adi: '', email: '', telefon: '', sehir: '', sporlar: '', sporcu_sayisi: '', notlar: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.akademi_adi || !form.yetkili_adi || !form.email || !form.telefon) {
      setError('Akademi adı, yetkili, e-posta ve telefon zorunludur'); return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/academy-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Hata oluştu') }
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="modal-title">Akademi Kayıt Talebi</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {success ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>Talebiniz Alındı!</h4>
            <p style={{ color: 'var(--text2)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
              En kısa sürede <strong>{form.email}</strong> adresinize veya telefonla geri döneceğiz.
            </p>
            <button className="modal-submit" onClick={onClose}>Kapat</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="fg-grid">
              <div className="fg">
                <label className="fl">Akademi Adı <span className="req">*</span></label>
                <input className="fi" placeholder="Örnek Spor Akademisi" value={form.akademi_adi} onChange={e => set('akademi_adi', e.target.value)} />
              </div>
              <div className="fg">
                <label className="fl">Yetkili Kişi <span className="req">*</span></label>
                <input className="fi" placeholder="Ad Soyad" value={form.yetkili_adi} onChange={e => set('yetkili_adi', e.target.value)} />
              </div>
              <div className="fg">
                <label className="fl">E-posta <span className="req">*</span></label>
                <input className="fi" type="email" placeholder="info@akademi.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="fg">
                <label className="fl">Telefon <span className="req">*</span></label>
                <input className="fi" type="tel" placeholder="+90 5xx xxx xx xx" value={form.telefon} onChange={e => set('telefon', e.target.value)} />
              </div>
              <div className="fg">
                <label className="fl">Şehir</label>
                <input className="fi" placeholder="İstanbul" value={form.sehir} onChange={e => set('sehir', e.target.value)} />
              </div>
              <div className="fg">
                <label className="fl">Tahmini Sporcu Sayısı</label>
                <input className="fi" type="number" placeholder="50" value={form.sporcu_sayisi} onChange={e => set('sporcu_sayisi', e.target.value)} />
              </div>
            </div>
            <div className="fg">
              <label className="fl">Spor Dalları</label>
              <input className="fi" placeholder="Futbol, Basketbol, Yüzme..." value={form.sporlar} onChange={e => set('sporlar', e.target.value)} />
            </div>
            <div className="fg">
              <label className="fl">Notlar / Sorular</label>
              <textarea className="fi" rows={3} placeholder="Herhangi bir sorunuz veya notunuz..." value={form.notlar} onChange={e => set('notlar', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            {error && <div className="modal-error">{error}</div>}
            <button type="submit" disabled={loading} className="modal-submit">
              {loading ? <Loader2 size={16} className="spin" /> : null}
              {loading ? 'Gönderiliyor...' : 'Kayıt Talebi Gönder'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Sporcu Ön Kayıt Modal ───────────────────────────────────────────────────
function OnKayitModal({ onClose }: { onClose: () => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', email: '', sport_interest: '', parent_name: '', parent_phone: '', notes: '', kvkk: false })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.first_name || !form.last_name || !form.phone) { setError('Ad, soyad ve telefon zorunludur'); return }
    if (!form.kvkk) { setError('KVKK metnini onaylamanız gerekmektedir'); return }
    setLoading(true)
    try {
      const { error: err } = await supabase.from('pre_registrations').insert({
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        email: form.email || null,
        sport_interest: form.sport_interest || null,
        parent_name: form.parent_name || null,
        parent_phone: form.parent_phone || null,
        notes: form.notes || null,
        status: 'pending',
      })
      if (err) throw err
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="modal-title">Sporcu Ön Kayıt</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {success ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>Ön Kaydınız Alındı!</h4>
            <p style={{ color: 'var(--text2)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
              Başvurunuz incelemeye alındı. Akademi ekibi en kısa sürede sizinle iletişime geçecektir.
            </p>
            <button className="modal-submit" onClick={onClose}>Kapat</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="fg-grid">
              <div className="fg">
                <label className="fl">Ad <span className="req">*</span></label>
                <input className="fi" placeholder="Sporcu adı" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
              </div>
              <div className="fg">
                <label className="fl">Soyad <span className="req">*</span></label>
                <input className="fi" placeholder="Sporcu soyadı" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
              </div>
              <div className="fg">
                <label className="fl">Telefon <span className="req">*</span></label>
                <input className="fi" type="tel" placeholder="+90 5xx xxx xx xx" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div className="fg">
                <label className="fl">E-posta</label>
                <input className="fi" type="email" placeholder="sporcu@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="fg">
                <label className="fl">İlgilendiğiniz Spor Dalı</label>
                <input className="fi" placeholder="Futbol, Basketbol..." value={form.sport_interest} onChange={e => set('sport_interest', e.target.value)} />
              </div>
              <div className="fg">
                <label className="fl">Veli Adı</label>
                <input className="fi" placeholder="Veli/vasi adı soyadı" value={form.parent_name} onChange={e => set('parent_name', e.target.value)} />
              </div>
            </div>
            <div className="fg">
              <label className="fl">Veli Telefonu</label>
              <input className="fi" type="tel" placeholder="+90 5xx xxx xx xx" value={form.parent_phone} onChange={e => set('parent_phone', e.target.value)} />
            </div>
            <div className="fg">
              <label className="fl">Notlar</label>
              <textarea className="fi" rows={2} placeholder="Eklemek istediğiniz bilgiler..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <label className="kvkk-check">
              <input type="checkbox" checked={form.kvkk} onChange={e => set('kvkk', e.target.checked)} />
              <span>
                <Link href="/kvkk" target="_blank" style={{ color: 'var(--blue2)' }}>KVKK Aydınlatma Metni</Link>&apos;ni okudum, kişisel verilerimin işlenmesine onay veriyorum.
              </span>
            </label>
            {error && <div className="modal-error">{error}</div>}
            <button type="submit" disabled={loading} className="modal-submit">
              {loading ? <Loader2 size={16} className="spin" /> : null}
              {loading ? 'Gönderiliyor...' : 'Ön Kayıt Gönder'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [akademiOpen, setAkademiOpen] = useState(false)
  const [onKayitOpen, setOnKayitOpen] = useState(false)

  return (
    <div className="landing-page">
      {akademiOpen && <AkademiKayitModal onClose={() => setAkademiOpen(false)} />}
      {onKayitOpen && <OnKayitModal onClose={() => setOnKayitOpen(false)} />}

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
            <Link href="/login" className="btn-ghost-sm">Giriş Yap</Link>
            <button onClick={() => setAkademiOpen(true)} className="btn-primary-sm">Akademi Kayıt</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="hero-badge"><Trophy size={13} /> Spor Akademisi Yönetim Sistemi</div>
          <h1 className="hero-title">
            Spor Akademinizi<br />
            <span className="hero-title-accent">Profesyonelce</span> Yönetin
          </h1>
          <p className="hero-subtitle">
            Sporcu kaydından ödeme takibine, devam yoklamasından SMS bildirimlerine —
            tüm akademi operasyonlarınızı tek platformda yönetin.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="btn-primary-sm" style={{ fontSize: '1rem', padding: '0.75rem 1.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              Giriş Yap <ChevronRight size={16} />
            </Link>
            <button onClick={() => setAkademiOpen(true)} className="btn-ghost-sm" style={{ fontSize: '1rem', padding: '0.75rem 1.75rem' }}>
              Demo İste
            </button>
          </div>
        </div>
        <div className="hero-visual">
          {/* Dashboard Mockup */}
          <div className="dashboard-mockup">
            <div className="mockup-bar">
              <div className="mockup-dots"><span /><span /><span /></div>
              <div className="mockup-title">sporcu-paneli.vercel.app/dashboard</div>
            </div>
            <div className="mockup-body">
              <div className="mockup-sidebar">
                {['🏠 Ana Sayfa', '🏃 Sporcular', '💳 Ödemeler', '📋 Devam', '📈 Raporlar'].map(item => (
                  <div key={item} className={`mockup-nav-item${item.startsWith('🏠') ? ' active' : ''}`}>{item}</div>
                ))}
              </div>
              <div className="mockup-content">
                <div className="mockup-stats">
                  {[{ n: '124', l: 'Sporcu', c: '#6366f1' }, { n: '18', l: 'Antrenör', c: '#0ea5e9' }, { n: '₺42K', l: 'Gelir', c: '#10b981' }, { n: '96%', l: 'Devam', c: '#f59e0b' }].map(s => (
                    <div key={s.l} className="mockup-stat" style={{ borderLeft: `3px solid ${s.c}` }}>
                      <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>{s.n}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="mockup-table">
                  {['Ahmet Y.', 'Elif K.', 'Can D.'].map((name, i) => (
                    <div key={name} className="mockup-row">
                      <div className="mockup-avatar">{name[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>Futbol</div>
                      </div>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: i === 1 ? '#fef3c7' : '#dcfce7', color: i === 1 ? '#92400e' : '#166534', fontWeight: 600 }}>
                        {i === 1 ? 'Bekliyor' : 'Aktif'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
              { icon: <Users size={22} />, title: 'Sporcu Yönetimi', desc: 'TC kimlik doğrulamalı sporcu kaydı, veli bilgileri, sağlık bilgileri ve dosya yönetimi.', color: '#6366f1' },
              { icon: <CreditCard size={22} />, title: 'Ödeme Takibi', desc: 'Otomatik aidat planları, PayTR entegrasyonu, gecikmiş ödeme bildirimleri ve gelir raporları.', color: '#0ea5e9' },
              { icon: <ClipboardCheck size={22} />, title: 'Devam Yoklaması', desc: 'Günlük devam takibi, mazeretli/özürsüz ayrımı, devam istatistikleri ve veli bilgilendirmesi.', color: '#10b981' },
              { icon: <MessageSquare size={22} />, title: 'SMS & WhatsApp', desc: 'NetGSM entegrasyonu ile toplu SMS gönderimi, WhatsApp Business API desteği.', color: '#f59e0b' },
              { icon: <BarChart3 size={22} />, title: 'Gelişmiş Raporlar', desc: 'Aylık gelir grafikleri, devam analizi, sporcu gelişim takibi ve özelleştirilebilir raporlar.', color: '#8b5cf6' },
              { icon: <Trophy size={22} />, title: 'Çoklu Spor Dalı', desc: 'Futbol, basketbol, yüzme ve daha fazlası — tüm spor dallarını tek panelden yönetin.', color: '#ef4444' },
              { icon: <GraduationCap size={22} />, title: 'Antrenör Paneli', desc: 'Antrenörler için özel erişim, yoklama girişi ve kendi sınıflarını yönetme imkanı.', color: '#06b6d4' },
              { icon: <ShieldCheck size={22} />, title: 'Banka Güvenliği', desc: 'Row Level Security, SSL/TLS şifreleme, KVKK uyumu ve 2FA desteği.', color: '#64748b' },
              { icon: <Smartphone size={22} />, title: 'Sporcu Portalı', desc: 'Sporcular ve veliler için mobil uyumlu kişisel portal — ödeme ve devam görüntüleme.', color: '#ec4899' },
            ].map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon" style={{ background: f.color + '18', color: f.color }}>{f.icon}</div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="landing-logo-icon">🏅</span>
              <span className="landing-logo-text">Sporcu Paneli</span>
            </div>
            <p className="footer-tagline">Spor akademinizi güçlendirin.</p>
          </div>
          <div className="footer-links">
            <div className="footer-link-group">
              <h4>Ürün</h4>
              <a href="#features">Özellikler</a>
            </div>
            <div className="footer-link-group">
              <h4>Hukuki</h4>
              <Link href="/gizlilik">Gizlilik Politikası</Link>
              <Link href="/kullanim-kosullari">Kullanım Koşulları</Link>
              <Link href="/kvkk">KVKK Aydınlatma</Link>
            </div>
            <div className="footer-link-group">
              <h4>İletişim</h4>
              <span style={{ fontSize: '0.875rem', color: 'var(--text3)' }}>Enes Kahveci</span>
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

        /* Nav */
        .landing-nav { position: sticky; top: 0; z-index: 100; background: var(--bg2); border-bottom: 1px solid var(--border); backdrop-filter: blur(12px); }
        .landing-nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; height: 64px; display: flex; align-items: center; gap: 2rem; }
        .landing-logo { display: flex; align-items: center; gap: 0.5rem; margin-right: auto; text-decoration: none; }
        .landing-logo-icon { font-size: 1.5rem; }
        .landing-logo-text { font-size: 1.125rem; font-weight: 700; color: var(--text); }
        .landing-nav-links { display: flex; gap: 2rem; }
        .landing-nav-links a { color: var(--text2); text-decoration: none; font-size: 0.9375rem; transition: color 0.15s; }
        .landing-nav-links a:hover { color: var(--blue2); }
        .landing-nav-actions { display: flex; gap: 0.625rem; }
        .btn-ghost-sm { padding: 0.4375rem 1rem; background: transparent; border: 1px solid var(--border2); border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; color: var(--text); cursor: pointer; transition: all 0.15s; }
        .btn-ghost-sm:hover { background: var(--bg4); border-color: var(--blue2); color: var(--blue2); }
        .btn-primary-sm { padding: 0.4375rem 1rem; background: var(--grad); border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #fff; border: none; cursor: pointer; transition: opacity 0.15s; }
        .btn-primary-sm:hover { opacity: 0.88; }

        /* Hero */
        .landing-hero { max-width: 1200px; margin: 0 auto; padding: 5rem 1.5rem; display: flex; gap: 4rem; align-items: center; }
        .landing-hero-inner { flex: 1; }
        .hero-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.875rem; background: var(--bg4); color: var(--blue2); border: 1px solid var(--border2); border-radius: 2rem; font-size: 0.8125rem; font-weight: 600; margin-bottom: 1.5rem; }
        .hero-title { font-size: clamp(2rem, 4vw, 3.25rem); font-weight: 800; line-height: 1.15; letter-spacing: -0.03em; margin-bottom: 1.25rem; color: var(--text); }
        .hero-title-accent { background: var(--grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hero-subtitle { font-size: 1.0625rem; color: var(--text2); line-height: 1.7; max-width: 480px; margin-bottom: 1.75rem; }
        .hero-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 2rem; }

        /* Dashboard Mockup */
        .dashboard-mockup { background: var(--bg2); border: 1px solid var(--border2); border-radius: 14px; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.3); }
        .mockup-bar { background: var(--bg3); padding: 10px 14px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border); }
        .mockup-dots { display: flex; gap: 5px; }
        .mockup-dots span { width: 10px; height: 10px; border-radius: 50%; background: var(--border2); }
        .mockup-dots span:nth-child(1) { background: #ef4444; }
        .mockup-dots span:nth-child(2) { background: #f59e0b; }
        .mockup-dots span:nth-child(3) { background: #10b981; }
        .mockup-title { font-size: 11px; color: var(--text3); flex: 1; text-align: center; font-family: monospace; }
        .mockup-body { display: flex; height: 280px; }
        .mockup-sidebar { width: 130px; background: var(--bg3); padding: 10px 8px; display: flex; flex-direction: column; gap: 3px; border-right: 1px solid var(--border); flex-shrink: 0; }
        .mockup-nav-item { padding: 7px 10px; border-radius: 6px; font-size: 11px; color: var(--text3); cursor: default; }
        .mockup-nav-item.active { background: var(--grad); color: #fff; font-weight: 600; }
        .mockup-content { flex: 1; padding: 14px; display: flex; flex-direction: column; gap: 10px; overflow: hidden; }
        .mockup-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
        .mockup-stat { background: var(--bg3); border-radius: 8px; padding: 10px 10px 8px; border-left-style: solid; border-left-width: 3px; }
        .mockup-table { display: flex; flex-direction: column; gap: 6px; }
        .mockup-row { display: flex; align-items: center; gap: 8px; padding: 7px 10px; background: var(--bg3); border-radius: 8px; }
        .mockup-avatar { width: 24px; height: 24px; border-radius: 50%; background: var(--grad); color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .hero-visual { flex: 1; max-width: 420px; }

        /* Ön Kayıt Card */
        .onkayit-card { background: var(--bg2); border: 1px solid var(--border2); border-radius: var(--radius); padding: 2rem; box-shadow: var(--shadow); }
        .onkayit-card-top { margin-bottom: 1.25rem; }
        .onkayit-title { font-size: 1.25rem; font-weight: 700; color: var(--text); margin-bottom: 0.5rem; }
        .onkayit-desc { font-size: 0.9rem; color: var(--text2); line-height: 1.6; }
        .onkayit-list { list-style: none; padding: 0; margin: 0 0 1.5rem; display: flex; flex-direction: column; gap: 0.375rem; }
        .onkayit-list li { font-size: 0.875rem; color: var(--text2); }
        .onkayit-btn { width: 100%; padding: 0.875rem; background: var(--grad); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 1rem; font-weight: 700; cursor: pointer; transition: opacity 0.15s; margin-bottom: 0.75rem; }
        .onkayit-btn:hover { opacity: 0.88; }
        .onkayit-note { font-size: 0.8125rem; color: var(--text3); text-align: center; }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .modal-box { background: var(--bg2); border: 1px solid var(--border2); border-radius: var(--radius); width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow); animation: fadeIn 0.18s ease; }
        .modal-wide { max-width: 600px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem 0; }
        .modal-title { font-size: 1.125rem; font-weight: 700; color: var(--text); }
        .modal-close { background: none; border: none; cursor: pointer; color: var(--text3); display: flex; align-items: center; padding: 4px; border-radius: 6px; transition: all 0.15s; }
        .modal-close:hover { background: var(--bg4); color: var(--text); }
        .modal-form { padding: 1.25rem 1.5rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .modal-error { font-size: 0.8125rem; color: var(--red, #ef4444); background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); padding: 0.625rem 0.875rem; border-radius: var(--radius-sm); }
        .modal-submit { padding: 0.75rem; background: var(--grad); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .modal-submit:hover:not(:disabled) { opacity: 0.88; }
        .modal-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Form fields */
        .fg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .fg { display: flex; flex-direction: column; gap: 0.375rem; }
        .fl { font-size: 0.8125rem; font-weight: 600; color: var(--text2); display: flex; align-items: center; gap: 0.25rem; }
        .fh { font-weight: 400; color: var(--text3); font-size: 0.75rem; }
        .req { color: var(--red, #ef4444); }
        .fi { width: 100%; padding: 0.625rem 0.875rem; background: var(--bg); border: 1px solid var(--border2); border-radius: var(--radius-sm); font-size: 0.9375rem; color: var(--text); outline: none; transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box; font-family: inherit; }
        .fi:focus { border-color: var(--blue2); box-shadow: 0 0 0 3px rgba(45,92,179,0.15); }
        .fi::placeholder { color: var(--text3); }
        .pw-wrap { position: relative; }
        .pw-wrap .fi { padding-right: 2.5rem; }
        .pw-eye { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text3); display: flex; align-items: center; transition: color 0.15s; }
        .pw-eye:hover { color: var(--text2); }

        /* Login tabs */
        .login-tabs { display: flex; padding: 1rem 1.5rem 0; border-bottom: 1px solid var(--border); }
        .login-tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.625rem 0.5rem; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-size: 0.75rem; font-weight: 500; color: var(--text3); transition: all 0.15s; margin-bottom: -1px; }
        .login-tab span:first-child { font-size: 1.125rem; }
        .login-tab.active { color: var(--blue2); border-bottom-color: var(--blue2); }
        .login-tab:hover:not(.active) { color: var(--text); }

        /* KVKK check */
        .kvkk-check { display: flex; gap: 0.625rem; align-items: flex-start; cursor: pointer; font-size: 0.8125rem; color: var(--text2); }
        .kvkk-check input { margin-top: 2px; flex-shrink: 0; }

        /* Spin */
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
        .feature-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 0.875rem; }
        .feature-title { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text); }
        .feature-desc { font-size: 0.875rem; color: var(--text2); line-height: 1.6; }

        /* Footer */
        .landing-footer { background: var(--bg2); border-top: 1px solid var(--border); padding: 3rem 1.5rem 1.5rem; margin-top: 2rem; }
        .landing-footer-inner { max-width: 1200px; margin: 0 auto; display: flex; gap: 4rem; margin-bottom: 2.5rem; }
        .footer-brand { flex: 1; }
        .footer-tagline { font-size: 0.875rem; color: var(--text3); margin-top: 0.25rem; }
        .footer-links { display: flex; gap: 3rem; }
        .footer-link-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .footer-link-group h4 { font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text3); margin-bottom: 0.25rem; }
        .footer-link-group a { font-size: 0.875rem; color: var(--text2); text-decoration: none; transition: color 0.15s; }
        .footer-link-group a:hover { color: var(--blue2); }
        .footer-bottom { max-width: 1200px; margin: 0 auto; border-top: 1px solid var(--border); padding-top: 1.5rem; display: flex; justify-content: space-between; font-size: 0.8125rem; color: var(--text3); flex-wrap: wrap; gap: 0.5rem; }

        @media (max-width: 1024px) {
          .landing-hero { flex-direction: column; gap: 2.5rem; }
          .hero-visual { width: 100%; max-width: 100%; }
          .features-grid { grid-template-columns: repeat(2, 1fr); }
          .fg-grid { grid-template-columns: 1fr; }
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
