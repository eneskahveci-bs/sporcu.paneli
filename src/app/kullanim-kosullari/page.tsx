import Link from 'next/link'

export const metadata = { title: 'Kullanım Koşulları | Sporcu Paneli' }

export default function KullanimKosullariPage() {
  const date = '22 Mart 2026'
  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <Link href="/" className="legal-logo">🏅 Sporcu Paneli</Link>
      </nav>
      <div className="legal-container">
        <h1>Kullanım Koşulları</h1>
        <p className="legal-date">Son güncelleme: {date}</p>

        <h2>1. Hizmetin Tanımı</h2>
        <p>Sporcu Paneli, spor akademilerinin sporcu kaydı, ödeme takibi, devam yönetimi ve iletişim operasyonlarını dijitalleştiren bir yönetim yazılımıdır. Hizmet, yönetici, antrenör, sporcu ve veli rollerini destekler.</p>

        <h2>2. Kullanım Şartları</h2>
        <p>Platforma erişerek aşağıdaki koşulları kabul etmiş sayılırsınız:</p>
        <ul>
          <li>Hesabınıza ilişkin giriş bilgilerini gizli tutmak ve üçüncü kişilerle paylaşmamak</li>
          <li>Platformu yalnızca yasal amaçlarla kullanmak</li>
          <li>Diğer kullanıcıların kişisel verilerine yetkisiz erişim sağlamamak</li>
          <li>Sistemi engelleyecek veya zarar verecek herhangi bir eylemde bulunmamak</li>
          <li>Girilen bilgilerin doğru ve güncel olduğunu beyan etmek</li>
        </ul>

        <h2>3. Hesap Güvenliği</h2>
        <p>Hesabınızın güvenliğinden siz sorumlusunuz. Şifrenizin ele geçirildiğini veya yetkisiz erişim gerçekleştiğini düşünüyorsanız derhal <a href="mailto:eneskahveci.bs@gmail.com">eneskahveci.bs@gmail.com</a> adresine bildirin.</p>

        <h2>4. Sporcu / Veli Hesapları</h2>
        <p>Sporcu hesapları, yönetici tarafından akademiye kayıt sürecinde oluşturulur. Giriş bilgileri (TC Kimlik No ve son 6 hane şifre) sporcu/veliye akademi kanalıyla iletilir. Sporcu hesabı yalnızca kendi verilerine erişim hakkı tanır.</p>

        <h2>5. Antrenör Hesapları</h2>
        <p>Antrenörler; sporculara, sınıflara, takvime, devam kayıtlarına ve bildirimlere erişebilir. Ayarlar, antrenör yönetimi ve muhasebe bilgilerine erişim sadece yöneticilere aittir.</p>

        <h2>6. Veri Sahipliği</h2>
        <p>Platforma girilen tüm veriler (sporcu bilgileri, ödeme kayıtları, devam verileri) ilgili akademiye aittir. Sporcu Paneli bu verileri akademi dışında ticari amaçla kullanmaz.</p>

        <h2>7. Hizmet Kesintisi ve Sorumluluk Sınırlaması</h2>
        <p>Sporcu Paneli, hizmetin kesintisiz veya hatasız çalışacağını garanti etmez. Bakım, güncelleme veya teknik sorunlar nedeniyle geçici kesintiler yaşanabilir. Platform, üçüncü taraf hizmetleri (ödeme altyapısı, SMS servisi) kaynaklı aksaklıklardan sorumlu tutulamaz.</p>

        <h2>8. Değişiklikler</h2>
        <p>Kullanım koşulları önceden bildirimde bulunularak değiştirilebilir. Güncel koşullara uymayan kullanıcıların hesapları askıya alınabilir.</p>

        <h2>9. Uygulanacak Hukuk</h2>
        <p>Bu kullanım koşulları Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda İstanbul Merkez Mahkemeleri yetkilidir.</p>

        <h2>10. İletişim</h2>
        <p>Kullanım koşullarına ilişkin sorularınız için:</p>
        <ul>
          <li>E-posta: <a href="mailto:eneskahveci.bs@gmail.com">eneskahveci.bs@gmail.com</a></li>
          <li>Telefon: <a href="tel:+905469775868">+90 546 977 58 68</a></li>
        </ul>

        <div className="legal-footer-links">
          <Link href="/gizlilik">Gizlilik Politikası</Link>
          <Link href="/kvkk">KVKK Aydınlatma Metni</Link>
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
