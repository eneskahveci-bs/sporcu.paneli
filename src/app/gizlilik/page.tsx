import Link from 'next/link'

export const metadata = { title: 'Gizlilik Politikası | Sporcu Paneli' }

export default function GizlilikPage() {
  const date = '22 Mart 2026'
  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <Link href="/" className="legal-logo">🏅 Sporcu Paneli</Link>
      </nav>
      <div className="legal-container">
        <h1>Gizlilik Politikası</h1>
        <p className="legal-date">Son güncelleme: {date}</p>

        <h2>1. Veri Sorumlusu</h2>
        <p>Sporcu Paneli uygulaması, Enes Kahveci tarafından işletilmektedir. Bu gizlilik politikası, platformumuzun kişisel verileri nasıl topladığını, kullandığını ve koruduğunu açıklar.</p>

        <h2>2. Toplanan Veriler</h2>
        <p>Platformumuz aşağıdaki kişisel verileri işleyebilir:</p>
        <ul>
          <li>Kimlik bilgileri (ad, soyad, TC Kimlik No, doğum tarihi)</li>
          <li>İletişim bilgileri (telefon, e-posta, adres)</li>
          <li>Sağlık bilgileri (kan grubu, sağlık notları — yalnızca sporcu güvenliği için)</li>
          <li>Veli/vasi bilgileri</li>
          <li>Ödeme ve devam kayıtları</li>
          <li>Kullanım verileri (giriş zamanları, işlem kayıtları)</li>
        </ul>

        <h2>3. Verilerin Kullanım Amacı</h2>
        <p>Toplanan veriler yalnızca aşağıdaki amaçlarla kullanılır:</p>
        <ul>
          <li>Sporcu kaydı ve takibinin yönetilmesi</li>
          <li>Ödeme ve devam takibinin yapılması</li>
          <li>Veli bilgilendirme mesajlarının iletilmesi</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi</li>
          <li>Platform güvenliğinin sağlanması</li>
        </ul>

        <h2>4. Veri Güvenliği</h2>
        <p>Kişisel verileriniz Supabase altyapısı üzerinde barındırılmakta olup aşağıdaki güvenlik önlemleri uygulanmaktadır:</p>
        <ul>
          <li>256-bit SSL/TLS şifreleme</li>
          <li>Satır seviyesinde güvenlik (Row Level Security — RLS) politikaları</li>
          <li>Rol tabanlı erişim kontrolü</li>
          <li>Düzenli güvenlik denetimleri</li>
        </ul>

        <h2>5. Üçüncü Taraflarla Paylaşım</h2>
        <p>Kişisel verileriniz; yasal zorunluluk olmadıkça, açık onayınız bulunmadıkça üçüncü taraflarla paylaşılmaz. Teknik altyapı sağlayıcılarımız (Supabase, Vercel) veri işleme sözleşmeleri çerçevesinde hareket etmektedir.</p>

        <h2>6. Veri Saklama Süresi</h2>
        <p>Kişisel verileriniz, hizmet ilişkisinin sona ermesinden itibaren yasal saklama yükümlülükleri çerçevesinde (en fazla 10 yıl) saklanır ve ardından güvenli şekilde silinir.</p>

        <h2>7. Haklarınız</h2>
        <p>KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
        <ul>
          <li>Verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>İşleniyorsa bilgi talep etme</li>
          <li>İşleme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
          <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri öğrenme</li>
          <li>Eksik veya yanlış işlenmiş olması hâlinde düzeltilmesini isteme</li>
          <li>Silinmesini veya yok edilmesini isteme</li>
          <li>Otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhine sonuç oluşmasına itiraz etme</li>
        </ul>

        <h2>8. İletişim</h2>
        <p>Gizlilik politikamız hakkında sorularınız için:</p>
        <ul>
          <li>E-posta: <a href="mailto:eneskahveci.bs@gmail.com">eneskahveci.bs@gmail.com</a></li>
          <li>Telefon: <a href="tel:+905469775868">+90 546 977 58 68</a></li>
        </ul>

        <div className="legal-footer-links">
          <Link href="/kvkk">KVKK Aydınlatma Metni</Link>
          <Link href="/kullanim-kosullari">Kullanım Koşulları</Link>
          <Link href="/">Ana Sayfa</Link>
        </div>
      </div>

      <style>{`
        .legal-page { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Inter', -apple-system, sans-serif; }
        .legal-nav { position: sticky; top: 0; z-index: 50; background: var(--bg2); border-bottom: 1px solid var(--border); backdrop-filter: blur(12px); padding: 0 1.5rem; height: 60px; display: flex; align-items: center; }
        .legal-logo { display: flex; align-items: center; gap: 0.5rem; font-size: 1.0625rem; font-weight: 700; color: var(--text); text-decoration: none; }
        .legal-container { max-width: 760px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
        .legal-container h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.5rem; color: var(--text); }
        .legal-date { font-size: 0.875rem; color: var(--text3); margin-bottom: 2.5rem; }
        .legal-container h2 { font-size: 1.125rem; font-weight: 700; margin: 2rem 0 0.75rem; color: var(--text); }
        .legal-container p { font-size: 0.9375rem; color: var(--text2); line-height: 1.75; margin-bottom: 1rem; }
        .legal-container ul { padding-left: 1.5rem; margin-bottom: 1rem; }
        .legal-container li { font-size: 0.9375rem; color: var(--text2); line-height: 1.75; margin-bottom: 0.25rem; }
        .legal-container a { color: var(--blue2); text-decoration: none; }
        .legal-container a:hover { text-decoration: underline; }
        .legal-footer-links { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
        .legal-footer-links a { font-size: 0.875rem; color: var(--text3); text-decoration: none; transition: color 0.15s; }
        .legal-footer-links a:hover { color: var(--blue2); text-decoration: none; }
      `}</style>
    </div>
  )
}
