import Link from 'next/link'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gizlilik Politikası',
  description: 'Sporcu Paneli gizlilik politikası — verilerinizin nasıl toplandığı, kullanıldığı ve korunduğu hakkında bilgi.',
  alternates: { canonical: '/gizlilik' },
  robots: { index: true, follow: false },
}

const LEGAL_STYLES = `
  .legal-page { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Inter', -apple-system, sans-serif; }
  .legal-nav { position: sticky; top: 0; z-index: 50; background: var(--bg2); border-bottom: 1px solid var(--border); backdrop-filter: blur(12px); padding: 0 1.5rem; height: 60px; display: flex; align-items: center; gap: 1rem; }
  .legal-logo { display: flex; align-items: center; gap: 0.5rem; font-size: 1.0625rem; font-weight: 700; color: var(--text); text-decoration: none; }
  .legal-container { max-width: 800px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
  .legal-container h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.375rem; color: var(--text); }
  .legal-date { font-size: 0.8125rem; color: var(--text3); margin-bottom: 2.5rem; }
  .legal-container h2 { font-size: 1.125rem; font-weight: 700; margin: 2.25rem 0 0.75rem; color: var(--text); padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
  .legal-container h3 { font-size: 1rem; font-weight: 600; margin: 1.25rem 0 0.5rem; color: var(--text2); }
  .legal-container p { font-size: 0.9375rem; color: var(--text2); line-height: 1.8; margin-bottom: 1rem; }
  .legal-container ul, .legal-container ol { padding-left: 1.5rem; margin-bottom: 1rem; }
  .legal-container li { font-size: 0.9375rem; color: var(--text2); line-height: 1.8; margin-bottom: 0.3rem; }
  .legal-container a { color: var(--blue2); text-decoration: none; }
  .legal-container a:hover { text-decoration: underline; }
  .legal-info-box { background: rgba(45,92,179,0.07); border: 1px solid rgba(45,92,179,0.2); border-radius: 10px; padding: 1rem 1.25rem; margin: 1.25rem 0; }
  .legal-table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem; }
  .legal-table th { background: var(--bg3); padding: 10px 14px; text-align: left; font-weight: 700; color: var(--text); border: 1px solid var(--border); }
  .legal-table td { padding: 9px 14px; color: var(--text2); border: 1px solid var(--border); vertical-align: top; line-height: 1.6; }
  .legal-table tr:nth-child(even) td { background: var(--bg3); }
  .legal-footer-links { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
  .legal-footer-links a { font-size: 0.875rem; color: var(--text3); text-decoration: none; transition: color 0.15s; }
  .legal-footer-links a:hover { color: var(--blue2); }
`

export default function GizlilikPage() {
  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <Link href="/" className="legal-logo">🏅 Sporcu Paneli</Link>
      </nav>
      <div className="legal-container">
        <h1>Gizlilik Politikası</h1>
        <p className="legal-date">Son güncelleme: 29 Mart 2026 — Sürüm 2.0</p>

        <div className="legal-info-box">
          <p style={{ margin: 0 }}>Bu Gizlilik Politikası; 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK), Avrupa Birliği Genel Veri Koruma Yönetmeliği (GDPR) ve ilgili Türk mevzuatı çerçevesinde hazırlanmıştır. Daha kapsamlı aydınlatma için <Link href="/kvkk">KVKK Aydınlatma Metni</Link>&apos;ni inceleyiniz.</p>
        </div>

        <h2>1. Kapsam ve Uygulama Alanı</h2>
        <p>Bu politika; <strong>sporcu-paneli-rosy.vercel.app</strong> alan adı üzerinden erişilen Sporcu Paneli platformunu, mobil uyumlu web uygulamasını ve ilgili tüm alt sayfaları kapsamaktadır. Platforma erişen tüm kullanıcılar (yönetici, antrenör, sporcu, veli) bu politikaya tabidir.</p>

        <h2>2. Veri Sorumlusu</h2>
        <p>Sporcu Paneli, <strong>Enes Kahveci</strong> tarafından işletilmektedir.</p>
        <ul>
          <li>E-posta: <a href="mailto:eneskahveci.bs@gmail.com">eneskahveci.bs@gmail.com</a></li>
          <li>Telefon: <a href="tel:+905469775868">+90 546 977 58 68</a></li>
        </ul>

        <h2>3. Toplanan Veriler ve Toplama Yöntemleri</h2>
        <h3>3.1 Doğrudan Girilen Veriler</h3>
        <p>Platforma kayıt veya kullanım sırasında aşağıdaki veriler toplanabilmektedir:</p>
        <ul>
          <li>Ad, soyad, TC Kimlik No, doğum tarihi, cinsiyet</li>
          <li>Telefon numarası, e-posta adresi, adres bilgileri</li>
          <li>Sağlık notları ve kan grubu (yalnızca sporcu güvenliği için, açık rıza ile)</li>
          <li>Veli/vasi adı, iletişim bilgileri</li>
          <li>Ödeme bilgileri ve banka dekontları</li>
        </ul>
        <h3>3.2 Otomatik Toplanan Veriler</h3>
        <ul>
          <li>IP adresi ve coğrafi konum (yaklaşık, şehir düzeyinde)</li>
          <li>Tarayıcı türü, sürümü ve işletim sistemi bilgisi</li>
          <li>Cihaz türü (masaüstü/mobil/tablet)</li>
          <li>Oturum açma/kapama zaman damgaları</li>
          <li>Platform içi işlem geçmişi (hangi sayfaların ziyaret edildiği)</li>
        </ul>
        <h3>3.3 Çerezler ve Yerel Depolama</h3>
        <p>Platformumuz yalnızca zorunlu teknik çerezler kullanmaktadır. Reklam, pazarlama veya üçüncü taraf analitik çerezleri kullanılmamaktadır.</p>
        <table className="legal-table">
          <thead><tr><th>Çerez/Depolama</th><th>Amaç</th><th>Tür</th><th>Süre</th></tr></thead>
          <tbody>
            <tr><td><code>sb-[ref]-auth-token</code></td><td>Kimlik doğrulama oturumu</td><td>HttpOnly Cookie</td><td>Oturum</td></tr>
            <tr><td><code>_sub_ok</code></td><td>Abonelik kontrol önbelleği</td><td>Cookie</td><td>1 saat</td></tr>
            <tr><td><code>theme</code> (localStorage)</td><td>Arayüz teması tercihi</td><td>Yerel Depolama</td><td>Kalıcı</td></tr>
            <tr><td><code>notif_seen</code> (localStorage)</td><td>Okunan bildirimler</td><td>Yerel Depolama</td><td>Kalıcı</td></tr>
          </tbody>
        </table>
        <p>Tarayıcı ayarlarından çerezleri silebilir veya devre dışı bırakabilirsiniz. Ancak zorunlu teknik çerezlerin devre dışı bırakılması durumunda platformun bazı özellikleri düzgün çalışmayabilir.</p>

        <h2>4. Üçüncü Taraf Hizmet Sağlayıcılar ve Entegrasyonlar</h2>
        <p>Platform aşağıdaki üçüncü taraf hizmetleri kullanmaktadır. Bu sağlayıcılar kendi gizlilik politikaları kapsamında hareket etmektedir:</p>
        <table className="legal-table">
          <thead><tr><th>Sağlayıcı</th><th>Hizmet</th><th>İşlenen Veri</th><th>Gizlilik Politikası</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>Supabase Inc.</strong></td>
              <td>Veritabanı ve kimlik doğrulama</td>
              <td>Tüm platform verileri</td>
              <td><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">supabase.com/privacy</a></td>
            </tr>
            <tr>
              <td><strong>Vercel Inc.</strong></td>
              <td>Uygulama barındırma (hosting)</td>
              <td>İstek günlükleri, IP adresi</td>
              <td><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">vercel.com/legal/privacy-policy</a></td>
            </tr>
            <tr>
              <td><strong>NetGSM</strong></td>
              <td>SMS bildirimi</td>
              <td>Telefon numarası, mesaj içeriği</td>
              <td><a href="https://www.netgsm.com.tr/gizlilik-politikasi/" target="_blank" rel="noopener noreferrer">netgsm.com.tr</a></td>
            </tr>
            <tr>
              <td><strong>PayTR</strong></td>
              <td>Online ödeme altyapısı</td>
              <td>Ödeme bilgileri (PCI-DSS şifreli)</td>
              <td><a href="https://www.paytr.com/gizlilik-politikasi" target="_blank" rel="noopener noreferrer">paytr.com</a></td>
            </tr>
            <tr>
              <td><strong>Google Fonts</strong></td>
              <td>Yazı tipi hizmeti</td>
              <td>IP adresi, tarayıcı bilgisi (geçici)</td>
              <td><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">policies.google.com</a></td>
            </tr>
          </tbody>
        </table>

        <h2>5. Verilerin Kullanım Amaçları</h2>
        <p>Toplanan veriler yalnızca aşağıdaki belirli amaçlarla kullanılır, bu amaçlar dışında işlenmez:</p>
        <ul>
          <li>Spor akademisi yönetim hizmetlerinin sunulması</li>
          <li>Kullanıcı hesabının oluşturulması ve güvenliğinin sağlanması</li>
          <li>Ödeme ve aidat takibinin yapılması</li>
          <li>Devam yoklaması ve sporcu gelişim takibinin yürütülmesi</li>
          <li>SMS ve e-posta ile veli/sporcu bilgilendirmesi</li>
          <li>Yasal yükümlülüklerin ve resmi bildirimlerin yerine getirilmesi</li>
          <li>Teknik sorun tespiti ve platform iyileştirmesi (anonim istatistik)</li>
          <li>Yetkisiz erişim ve güvenlik ihlali tespiti</li>
        </ul>

        <h2>6. Uluslararası Veri Transferleri</h2>
        <p>Supabase ve Vercel, ABD merkezli şirketler olmakla birlikte AB/EEA veri merkezlerinde barındırma seçeneği sunmaktadır. Veri transferleri aşağıdaki güvenceler çerçevesinde gerçekleştirilmektedir:</p>
        <ul>
          <li><strong>Standart Sözleşme Maddeleri (SCCs):</strong> AB Komisyonu tarafından onaylanan standart maddeler</li>
          <li><strong>Veri İşleme Sözleşmesi (DPA):</strong> Her sağlayıcı ile imzalanmış ikili sözleşme</li>
          <li><strong>KVKK md. 9 uyumu:</strong> Yeterli koruma düzeyinin sağlandığı veya açık rızanın alındığı hallerde aktarım</li>
        </ul>

        <h2>7. Veri Güvenliği</h2>
        <h3>7.1 Teknik Önlemler</h3>
        <ul>
          <li>TLS 1.3 şifreli HTTPS bağlantısı (HTTP yönlendirmesi aktif)</li>
          <li>AES-256 ile bekleyen veri şifreleme (Supabase altyapısı)</li>
          <li>Veritabanı satır düzeyinde güvenlik (Row Level Security — RLS)</li>
          <li>JWT (JSON Web Token) tabanlı oturum yönetimi</li>
          <li>Bcrypt algoritması ile şifre hashleme</li>
          <li>Servis rolü (service role) ile kritik API ayrımı</li>
          <li>Otomatik günlük yedekleme</li>
        </ul>
        <h3>7.2 İdari Önlemler</h3>
        <ul>
          <li>Minimum yetki prensibi (least privilege): Her kullanıcı yalnızca ihtiyaç duyduğu verilere erişebilir</li>
          <li>Rol tabanlı erişim kontrolü (sporcu, antrenör, yönetici, süper admin)</li>
          <li>Üçüncü taraf erişimleri veri işleme sözleşmesine bağlıdır</li>
        </ul>

        <h2>8. Veri Saklama ve Silme</h2>
        <p>Kişisel verileriniz, amaçlarının ortadan kalkması ve yasal saklama sürelerinin dolmasının ardından güvenli biçimde imha edilir. Silme talep etmek için <a href="mailto:eneskahveci.bs@gmail.com">eneskahveci.bs@gmail.com</a> adresine yazabilirsiniz. Talebiniz 30 gün içinde işleme alınır.</p>
        <p><strong>Not:</strong> Vergi ve ticaret hukuku kapsamında saklama zorunluluğu bulunan finansal veriler (10 yıl), yasal sürenin dolması beklenerek imha edilir.</p>

        <h2>9. Küçüklerin Gizliliği</h2>
        <p>Platformumuz, 13 yaş altındaki çocukların kişisel verilerini <strong>doğrudan</strong> toplamamaktadır. 18 yaş altındaki sporcuların verileri, velinin/vasinin açık rızası ile akademi yöneticisi aracılığıyla sisteme girilmektedir. Eğer bir çocuğa ait verilerin onaysız sisteme girildiğini düşünüyorsanız lütfen bizimle iletişime geçin.</p>

        <h2>10. Haklarınız</h2>
        <p>KVKK kapsamındaki haklarınıza ek olarak, GDPR kapsamında da benzer haklara sahipsiniz. Bkz. <Link href="/kvkk">KVKK Aydınlatma Metni — Bölüm 10</Link>.</p>

        <h2>11. Politika Güncellemeleri</h2>
        <p>Bu politika önceden bildirimde bulunularak güncellenebilir. Önemli değişiklikler platform girişinde duyurulacaktır. Politikanın mevcut versiyonu her zaman <a href="/gizlilik">/gizlilik</a> adresinde yayımlanmaktadır.</p>

        <div className="legal-footer-links">
          <Link href="/kvkk">KVKK Aydınlatma Metni</Link>
          <Link href="/kullanim-kosullari">Kullanım Koşulları</Link>
          <Link href="/">Ana Sayfa</Link>
        </div>
      </div>
      <style>{LEGAL_STYLES}</style>
    </div>
  )
}
