import Link from 'next/link'

export const metadata = {
  title: 'Sporcu Paneli — Spor Akademisi Yönetim Sistemi',
  description: 'Türkiye\'nin en gelişmiş spor akademisi yönetim sistemi. Sporcu kayıt, ödeme takibi, devam yoklaması ve çok daha fazlası.',
}

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <span className="landing-logo-icon">🏅</span>
            <span className="landing-logo-text">Sporcu Paneli</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features">Özellikler</a>
            <a href="#pricing">Fiyatlandırma</a>
            <a href="#contact">İletişim</a>
          </div>
          <div className="landing-nav-actions">
            <Link href="/login" className="btn-outline-sm">Giriş Yap</Link>
            <Link href="/register" className="btn-primary-sm">Ücretsiz Başla</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="hero-badge">🚀 Türkiye&apos;nin #1 Spor Akademisi Yazılımı</div>
          <h1 className="hero-title">
            Spor Akademinizi<br />
            <span className="hero-title-accent">Profesyonelce</span> Yönetin
          </h1>
          <p className="hero-subtitle">
            Sporcu kaydından ödeme takibine, devam yoklamasından SMS bildirimlerine —
            tüm akademi operasyonlarınızı tek platformda yönetin.
          </p>
          <div className="hero-actions">
            <Link href="/register" className="btn-hero-primary">
              Ücretsiz Deneyin
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
            </Link>
            <Link href="/on-kayit" className="btn-hero-secondary">
              Ön Kayıt Formu
            </Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">500+</span>
              <span className="hero-stat-label">Aktif Akademi</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">50.000+</span>
              <span className="hero-stat-label">Kayıtlı Sporcu</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">%99.9</span>
              <span className="hero-stat-label">Uptime</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-dashboard-preview">
            <div className="preview-header">
              <div className="preview-dot red" />
              <div className="preview-dot yellow" />
              <div className="preview-dot green" />
              <span className="preview-url">sporcu.paneli.app/dashboard</span>
            </div>
            <div className="preview-stats-row">
              {[
                { icon: '👥', label: 'Toplam Sporcu', value: '247', change: '+12' },
                { icon: '💰', label: 'Bu Ay Gelir', value: '₺48.500', change: '+8%' },
                { icon: '✅', label: 'Devam Oranı', value: '%94', change: '+2%' },
                { icon: '⚠️', label: 'Gecikmiş', value: '3', change: '-5' },
              ].map((s, i) => (
                <div key={i} className="preview-stat-card">
                  <div className="preview-stat-icon">{s.icon}</div>
                  <div className="preview-stat-info">
                    <div className="preview-stat-label">{s.label}</div>
                    <div className="preview-stat-value">{s.value}</div>
                    <div className="preview-stat-change positive">{s.change}</div>
                  </div>
                </div>
              ))}
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
              {
                icon: '👤',
                title: 'Sporcu Yönetimi',
                desc: 'TC kimlik doğrulamalı sporcu kaydı, veli bilgileri, sağlık bilgileri ve dosya yönetimi.',
              },
              {
                icon: '💳',
                title: 'Ödeme Takibi',
                desc: 'Otomatik aidat planları, PayTR entegrasyonu, gecikmiş ödeme bildirimleri ve gelir raporları.',
              },
              {
                icon: '📋',
                title: 'Devam Yoklaması',
                desc: 'Günlük devam takibi, mazeretli/özürsüz ayrımı, devam istatistikleri ve veli bilgilendirmesi.',
              },
              {
                icon: '📱',
                title: 'SMS & WhatsApp',
                desc: 'NetGSM entegrasyonu ile toplu SMS gönderimi, WhatsApp Business API desteği.',
              },
              {
                icon: '📊',
                title: 'Gelişmiş Raporlar',
                desc: 'Aylık gelir grafikleri, devam analizi, sporcu gelişim takibi ve özelleştirilebilir raporlar.',
              },
              {
                icon: '🏆',
                title: 'Çoklu Spor Dalı',
                desc: 'Futbol, basketbol, yüzme ve daha fazlası — tüm spor dallarını tek panelden yönetin.',
              },
              {
                icon: '👨‍🏫',
                title: 'Antrenör Paneli',
                desc: 'Antrenörler için özel erişim, yoklama girişi ve kendi sınıflarını yönetme imkanı.',
              },
              {
                icon: '🔐',
                title: 'Banka Güvenliği',
                desc: 'Row Level Security, SSL/TLS şifreleme, KVKK uyumu ve 2FA desteği.',
              },
              {
                icon: '📲',
                title: 'Sporcu Portalı',
                desc: 'Sporcular ve veliler için mobil uyumlu kişisel portal — ödeme ve devam görüntüleme.',
              },
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

      {/* Pricing */}
      <section id="pricing" className="landing-section landing-section-alt">
        <div className="landing-section-inner">
          <div className="section-header">
            <h2 className="section-title">Şeffaf Fiyatlandırma</h2>
            <p className="section-subtitle">Akademinizin büyüklüğüne göre en uygun planı seçin</p>
          </div>
          <div className="pricing-grid">
            {[
              {
                name: 'Başlangıç',
                price: 'Ücretsiz',
                period: '',
                desc: 'Küçük akademiler için mükemmel',
                features: [
                  'En fazla 50 sporcu',
                  '1 antrenör hesabı',
                  'Temel raporlar',
                  'E-posta bildirimleri',
                  'Sporcu portalı',
                ],
                cta: 'Ücretsiz Başla',
                href: '/register',
                highlighted: false,
              },
              {
                name: 'Profesyonel',
                price: '₺499',
                period: '/ay',
                desc: 'Büyüyen akademiler için ideal',
                features: [
                  'Sınırsız sporcu',
                  '10 antrenör hesabı',
                  'Gelişmiş raporlar',
                  'SMS & WhatsApp bildirimleri',
                  'PayTR ödeme entegrasyonu',
                  'Çoklu şube desteği',
                  'Öncelikli destek',
                ],
                cta: 'Hemen Başla',
                href: '/register',
                highlighted: true,
              },
              {
                name: 'Kurumsal',
                price: 'İletişime Geçin',
                period: '',
                desc: 'Büyük spor kulüpleri için',
                features: [
                  'Her şey dahil',
                  'Sınırsız antrenör',
                  'Özel entegrasyonlar',
                  'API erişimi',
                  'White-label seçeneği',
                  '7/24 öncelikli destek',
                  'Özel onboarding',
                ],
                cta: 'İletişime Geçin',
                href: '#contact',
                highlighted: false,
              },
            ].map((p, i) => (
              <div key={i} className={`pricing-card ${p.highlighted ? 'pricing-card-highlighted' : ''}`}>
                {p.highlighted && <div className="pricing-badge">En Popüler</div>}
                <h3 className="pricing-name">{p.name}</h3>
                <div className="pricing-price">
                  <span className="pricing-amount">{p.price}</span>
                  {p.period && <span className="pricing-period">{p.period}</span>}
                </div>
                <p className="pricing-desc">{p.desc}</p>
                <ul className="pricing-features">
                  {p.features.map((f, j) => (
                    <li key={j}>
                      <span className="pricing-check">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={p.href} className={`pricing-cta ${p.highlighted ? 'pricing-cta-highlighted' : ''}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2 className="cta-title">Akademinizi Dijitalleştirin</h2>
          <p className="cta-subtitle">Hemen ücretsiz hesap oluşturun, kart bilgisi gerekmez.</p>
          <div className="cta-actions">
            <Link href="/register" className="btn-hero-primary">
              Ücretsiz Hesap Oluştur
            </Link>
            <Link href="/on-kayit" className="btn-hero-secondary">
              Ön Kayıt Yaptır
            </Link>
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
              <a href="#pricing">Fiyatlandırma</a>
              <Link href="/register">Kayıt Ol</Link>
            </div>
            <div className="footer-link-group">
              <h4>Hukuki</h4>
              <a href="#">Gizlilik Politikası</a>
              <a href="#">Kullanım Koşulları</a>
              <a href="#">KVKK Aydınlatma</a>
            </div>
            <div className="footer-link-group">
              <h4>İletişim</h4>
              <a href="mailto:destek@sporcupaneli.com">destek@sporcupaneli.com</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Sporcu Paneli. Tüm hakları saklıdır.</p>
          <p>🇹🇷 Türkiye&apos;de geliştirildi — KVKK uyumlu</p>
        </div>
      </footer>

      <style>{`
        .landing-page { min-height: 100vh; background: var(--bg-primary); color: var(--text-primary); font-family: var(--font-sans, system-ui, sans-serif); }

        /* Nav */
        .landing-nav { position: sticky; top: 0; z-index: 50; background: var(--bg-primary); border-bottom: 1px solid var(--border-color); backdrop-filter: blur(12px); }
        .landing-nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; height: 64px; display: flex; align-items: center; gap: 2rem; }
        .landing-logo { display: flex; align-items: center; gap: 0.5rem; text-decoration: none; margin-right: auto; }
        .landing-logo-icon { font-size: 1.5rem; }
        .landing-logo-text { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); }
        .landing-nav-links { display: flex; gap: 2rem; }
        .landing-nav-links a { color: var(--text-secondary); text-decoration: none; font-size: 0.9375rem; transition: color 0.15s; }
        .landing-nav-links a:hover { color: var(--accent); }
        .landing-nav-actions { display: flex; gap: 0.75rem; }
        .btn-outline-sm { padding: 0.4375rem 1rem; border: 1px solid var(--border-color); border-radius: 0.5rem; font-size: 0.875rem; font-weight: 500; color: var(--text-primary); text-decoration: none; transition: all 0.15s; }
        .btn-outline-sm:hover { border-color: var(--accent); color: var(--accent); }
        .btn-primary-sm { padding: 0.4375rem 1rem; background: var(--accent); border-radius: 0.5rem; font-size: 0.875rem; font-weight: 500; color: #fff; text-decoration: none; transition: all 0.15s; }
        .btn-primary-sm:hover { opacity: 0.9; }

        /* Hero */
        .landing-hero { max-width: 1200px; margin: 0 auto; padding: 5rem 1.5rem; display: flex; gap: 4rem; align-items: center; }
        .landing-hero-inner { flex: 1; }
        .hero-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.875rem; background: var(--accent-light, rgba(59,130,246,0.1)); color: var(--accent); border-radius: 2rem; font-size: 0.8125rem; font-weight: 600; margin-bottom: 1.5rem; }
        .hero-title { font-size: clamp(2rem, 4vw, 3.25rem); font-weight: 800; line-height: 1.15; letter-spacing: -0.03em; margin-bottom: 1.25rem; }
        .hero-title-accent { color: var(--accent); }
        .hero-subtitle { font-size: 1.125rem; color: var(--text-secondary); line-height: 1.7; margin-bottom: 2rem; max-width: 480px; }
        .hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 3rem; }
        .btn-hero-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: var(--accent); color: #fff; border-radius: 0.625rem; font-weight: 600; text-decoration: none; transition: all 0.15s; font-size: 1rem; }
        .btn-hero-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(59,130,246,0.3); }
        .btn-hero-secondary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border: 1.5px solid var(--border-color); color: var(--text-primary); border-radius: 0.625rem; font-weight: 600; text-decoration: none; transition: all 0.15s; font-size: 1rem; }
        .btn-hero-secondary:hover { border-color: var(--accent); color: var(--accent); }
        .hero-stats { display: flex; gap: 2rem; align-items: center; }
        .hero-stat { text-align: center; }
        .hero-stat-value { display: block; font-size: 1.75rem; font-weight: 800; color: var(--accent); }
        .hero-stat-label { font-size: 0.8125rem; color: var(--text-muted); }
        .hero-stat-divider { width: 1px; height: 40px; background: var(--border-color); }

        /* Hero Visual */
        .hero-visual { flex: 1; }
        .hero-dashboard-preview { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 1rem; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,0.12); }
        .preview-header { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: var(--bg-tertiary, var(--bg-secondary)); border-bottom: 1px solid var(--border-color); }
        .preview-dot { width: 10px; height: 10px; border-radius: 50%; }
        .preview-dot.red { background: #ff5f57; }
        .preview-dot.yellow { background: #febc2e; }
        .preview-dot.green { background: #28c840; }
        .preview-url { margin-left: 0.5rem; font-size: 0.75rem; color: var(--text-muted); }
        .preview-stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border-color); padding: 1rem; gap: 0.75rem; }
        .preview-stat-card { background: var(--bg-primary); border-radius: 0.5rem; padding: 1rem; display: flex; gap: 0.75rem; align-items: flex-start; }
        .preview-stat-icon { font-size: 1.5rem; }
        .preview-stat-label { font-size: 0.6875rem; color: var(--text-muted); margin-bottom: 0.125rem; }
        .preview-stat-value { font-size: 1.0625rem; font-weight: 700; }
        .preview-stat-change { font-size: 0.6875rem; }
        .preview-stat-change.positive { color: #22c55e; }

        /* Sections */
        .landing-section { padding: 5rem 0; }
        .landing-section-alt { background: var(--bg-secondary); }
        .landing-section-inner { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
        .section-header { text-align: center; margin-bottom: 3.5rem; }
        .section-title { font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
        .section-subtitle { font-size: 1.0625rem; color: var(--text-secondary); }

        /* Features */
        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .feature-card { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 0.75rem; padding: 1.5rem; transition: all 0.2s; }
        .feature-card:hover { border-color: var(--accent); box-shadow: 0 4px 16px rgba(59,130,246,0.08); transform: translateY(-2px); }
        .feature-icon { font-size: 2rem; margin-bottom: 0.75rem; }
        .feature-title { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; }
        .feature-desc { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; }

        /* Pricing */
        .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; align-items: start; }
        .pricing-card { background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 1rem; padding: 2rem; position: relative; }
        .pricing-card-highlighted { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 16px 48px rgba(59,130,246,0.15); }
        .pricing-badge { position: absolute; top: -0.875rem; left: 50%; transform: translateX(-50%); background: var(--accent); color: #fff; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.875rem; border-radius: 2rem; white-space: nowrap; }
        .pricing-name { font-size: 1.125rem; font-weight: 700; margin-bottom: 0.75rem; }
        .pricing-price { display: flex; align-items: baseline; gap: 0.25rem; margin-bottom: 0.5rem; }
        .pricing-amount { font-size: 2rem; font-weight: 800; }
        .pricing-period { font-size: 0.9375rem; color: var(--text-muted); }
        .pricing-desc { font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.5rem; }
        .pricing-features { list-style: none; padding: 0; margin: 0 0 1.5rem; display: flex; flex-direction: column; gap: 0.625rem; }
        .pricing-features li { display: flex; align-items: center; gap: 0.625rem; font-size: 0.875rem; }
        .pricing-check { color: #22c55e; font-weight: 700; }
        .pricing-cta { display: block; text-align: center; padding: 0.75rem; border: 1.5px solid var(--border-color); border-radius: 0.5rem; font-weight: 600; text-decoration: none; color: var(--text-primary); transition: all 0.15s; font-size: 0.9375rem; }
        .pricing-cta:hover { border-color: var(--accent); color: var(--accent); }
        .pricing-cta-highlighted { background: var(--accent); border-color: var(--accent); color: #fff; }
        .pricing-cta-highlighted:hover { opacity: 0.9; color: #fff; }

        /* CTA */
        .landing-cta { background: var(--accent); padding: 5rem 1.5rem; text-align: center; }
        .landing-cta-inner { max-width: 640px; margin: 0 auto; }
        .cta-title { font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 800; color: #fff; margin-bottom: 0.75rem; }
        .cta-subtitle { font-size: 1.0625rem; color: rgba(255,255,255,0.85); margin-bottom: 2rem; }
        .cta-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
        .landing-cta .btn-hero-primary { background: #fff; color: var(--accent); }
        .landing-cta .btn-hero-primary:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
        .landing-cta .btn-hero-secondary { border-color: rgba(255,255,255,0.4); color: #fff; }
        .landing-cta .btn-hero-secondary:hover { border-color: #fff; background: rgba(255,255,255,0.1); color: #fff; }

        /* Footer */
        .landing-footer { background: var(--bg-secondary); border-top: 1px solid var(--border-color); padding: 3rem 1.5rem 1.5rem; }
        .landing-footer-inner { max-width: 1200px; margin: 0 auto; display: flex; gap: 4rem; margin-bottom: 2.5rem; }
        .footer-brand { flex: 1; }
        .footer-brand .landing-logo-icon { font-size: 1.5rem; }
        .footer-tagline { font-size: 0.875rem; color: var(--text-muted); margin-top: 0.5rem; }
        .footer-links { display: flex; gap: 3rem; }
        .footer-link-group h4 { font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 0.75rem; }
        .footer-link-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .footer-link-group a { font-size: 0.875rem; color: var(--text-secondary); text-decoration: none; transition: color 0.15s; }
        .footer-link-group a:hover { color: var(--accent); }
        .footer-bottom { max-width: 1200px; margin: 0 auto; border-top: 1px solid var(--border-color); padding-top: 1.5rem; display: flex; justify-content: space-between; font-size: 0.8125rem; color: var(--text-muted); flex-wrap: wrap; gap: 0.5rem; }

        @media (max-width: 1024px) {
          .landing-hero { flex-direction: column; }
          .hero-visual { width: 100%; }
          .features-grid { grid-template-columns: repeat(2, 1fr); }
          .pricing-grid { grid-template-columns: 1fr; max-width: 400px; margin: 0 auto; }
        }
        @media (max-width: 640px) {
          .landing-nav-links { display: none; }
          .features-grid { grid-template-columns: 1fr; }
          .hero-stats { gap: 1rem; }
          .landing-footer-inner { flex-direction: column; gap: 2rem; }
          .footer-links { flex-direction: column; gap: 1.5rem; }
          .preview-stats-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
