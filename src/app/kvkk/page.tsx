import Link from 'next/link'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni',
  description: '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında Sporcu Paneli kişisel veri işleme aydınlatma metni.',
  alternates: { canonical: '/kvkk' },
  robots: { index: true, follow: false },
}

const LEGAL_STYLES = `
  .legal-page { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Inter', -apple-system, sans-serif; }
  .legal-nav { position: sticky; top: 0; z-index: 50; background: var(--bg2); border-bottom: 1px solid var(--border); backdrop-filter: blur(12px); padding: 0 1.5rem; height: 60px; display: flex; align-items: center; gap: 1rem; }
  .legal-logo { display: flex; align-items: center; gap: 0.5rem; font-size: 1.0625rem; font-weight: 700; color: var(--text); text-decoration: none; }
  .legal-container { max-width: 800px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
  .legal-container h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.375rem; color: var(--text); }
  .legal-date { font-size: 0.8125rem; color: var(--text3); margin-bottom: 0.25rem; }
  .legal-version { font-size: 0.8125rem; color: var(--text3); margin-bottom: 2.5rem; }
  .legal-container h2 { font-size: 1.125rem; font-weight: 700; margin: 2.25rem 0 0.75rem; color: var(--text); padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
  .legal-container h3 { font-size: 1rem; font-weight: 600; margin: 1.25rem 0 0.5rem; color: var(--text2); }
  .legal-container p { font-size: 0.9375rem; color: var(--text2); line-height: 1.8; margin-bottom: 1rem; }
  .legal-container ul, .legal-container ol { padding-left: 1.5rem; margin-bottom: 1rem; }
  .legal-container li { font-size: 0.9375rem; color: var(--text2); line-height: 1.8; margin-bottom: 0.3rem; }
  .legal-container a { color: var(--blue2); text-decoration: none; }
  .legal-container a:hover { text-decoration: underline; }
  .legal-info-box { background: rgba(45,92,179,0.07); border: 1px solid rgba(45,92,179,0.2); border-radius: 10px; padding: 1rem 1.25rem; margin: 1.25rem 0; }
  .legal-warn-box { background: rgba(245,158,11,0.07); border: 1px solid rgba(245,158,11,0.25); border-radius: 10px; padding: 1rem 1.25rem; margin: 1.25rem 0; }
  .legal-table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem; }
  .legal-table th { background: var(--bg3); padding: 10px 14px; text-align: left; font-weight: 700; color: var(--text); border: 1px solid var(--border); }
  .legal-table td { padding: 9px 14px; color: var(--text2); border: 1px solid var(--border); vertical-align: top; line-height: 1.6; }
  .legal-table tr:nth-child(even) td { background: var(--bg3); }
  .legal-footer-links { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
  .legal-footer-links a { font-size: 0.875rem; color: var(--text3); text-decoration: none; transition: color 0.15s; }
  .legal-footer-links a:hover { color: var(--blue2); }
  .badge-legal { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; margin-left: 6px; }
  .badge-red { background: rgba(239,68,68,0.12); color: #ef4444; border: 1px solid rgba(239,68,68,0.25); }
  .badge-blue { background: rgba(45,92,179,0.12); color: var(--blue2); border: 1px solid rgba(45,92,179,0.25); }
`

export default function KVKKPage() {
  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <Link href="/" className="legal-logo">🏅 Sporcu Paneli</Link>
        <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--text3)' }}>6698 sayılı KVKK uyarınca</span>
      </nav>
      <div className="legal-container">
        <h1>Kişisel Verilerin Korunması Kanunu (KVKK) Aydınlatma Metni</h1>
        <p className="legal-date">Son güncelleme: 29 Mart 2026</p>
        <p className="legal-version">Sürüm: 2.0 — 6698 Sayılı Kişisel Verilerin Korunması Kanunu ve ilgili ikincil mevzuat uyarınca hazırlanmıştır.</p>

        <div className="legal-info-box">
          <p style={{ margin: 0, fontSize: '0.9375rem' }}>
            <strong>Önemli Not:</strong> Bu aydınlatma metni, 6698 sayılı KVKK&apos;nın 10. maddesi ile Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ kapsamında hazırlanmıştır. Platformumuza giriş yaparak veya hizmetlerimizden yararlanarak bu metnin farkında olduğunuzu kabul etmiş olursunuz.
          </p>
        </div>

        <h2>1. Veri Sorumlusu ve Temsilcisi</h2>
        <p>
          <strong>Veri Sorumlusu:</strong> Enes Kahveci (bundan böyle <em>&quot;Veri Sorumlusu&quot;</em> veya <em>&quot;Sporcu Paneli&quot;</em> olarak anılacaktır)
        </p>
        <table className="legal-table">
          <tbody>
            <tr><td style={{ width: '35%', fontWeight: 600 }}>Unvan</td><td>Enes Kahveci — Sporcu Paneli</td></tr>
            <tr><td style={{ fontWeight: 600 }}>E-posta</td><td><a href="mailto:eneskahveci.bs@gmail.com">eneskahveci.bs@gmail.com</a></td></tr>
            <tr><td style={{ fontWeight: 600 }}>Telefon</td><td><a href="tel:+905469775868">+90 546 977 58 68</a></td></tr>
            <tr><td style={{ fontWeight: 600 }}>Hizmet Adresi</td><td>sporcu-paneli-rosy.vercel.app</td></tr>
          </tbody>
        </table>

        <h2>2. İşlenen Kişisel Veriler ve Kategorileri</h2>
        <p>Platformumuzda aşağıdaki kişisel veri kategorileri işlenmektedir. Özel nitelikli kişisel veriler <span className="badge-legal badge-red">ÖNV</span> ibaresiyle, olağan kişisel veriler <span className="badge-legal badge-blue">KV</span> ibaresiyle belirtilmiştir.</p>

        <table className="legal-table">
          <thead>
            <tr><th>Veri Kategorisi</th><th>Kapsam</th><th>Tür</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Kimlik Verileri</strong></td><td>Ad, soyad, TC Kimlik No, doğum tarihi, cinsiyet, fotoğraf (isteğe bağlı)</td><td><span className="badge-legal badge-blue">KV</span></td></tr>
            <tr><td><strong>İletişim Verileri</strong></td><td>Cep telefonu numarası, e-posta adresi, ikamet adresi, şehir, posta kodu</td><td><span className="badge-legal badge-blue">KV</span></td></tr>
            <tr><td><strong>Sağlık Verileri</strong></td><td>Kan grubu, bilinen kronik hastalıklar, ilaç kullanımı, sağlık notları, engel durumu</td><td><span className="badge-legal badge-red">ÖNV</span></td></tr>
            <tr><td><strong>Finansal Veriler</strong></td><td>Ödeme kayıtları, aidat tutarları, banka dekontu görüntüleri, gecikme bilgileri</td><td><span className="badge-legal badge-blue">KV</span></td></tr>
            <tr><td><strong>Eğitim/Sportif Veriler</strong></td><td>Kayıtlı olduğu spor dalı, branş, sınıf bilgisi, devam durumu, antrenman katılımı, sportif gelişim notları</td><td><span className="badge-legal badge-blue">KV</span></td></tr>
            <tr><td><strong>Veli/Vasi Bilgileri</strong></td><td>Veli adı soyadı, veli TC Kimlik No, telefon, e-posta, yasal velayet/vesayet bilgisi</td><td><span className="badge-legal badge-blue">KV</span></td></tr>
            <tr><td><strong>İşlem Güvenliği Verileri</strong></td><td>Giriş/çıkış zaman damgaları, IP adresi, tarayıcı ve cihaz bilgisi, oturum token verileri</td><td><span className="badge-legal badge-blue">KV</span></td></tr>
            <tr><td><strong>Biyometrik Veriler</strong></td><td>Fotoğraf (profil resmi — yalnızca isteğe bağlı yüklenmesi durumunda)</td><td><span className="badge-legal badge-red">ÖNV</span></td></tr>
          </tbody>
        </table>

        <div className="legal-warn-box">
          <p style={{ margin: 0, fontWeight: 600, marginBottom: '0.375rem' }}>⚠️ Özel Nitelikli Kişisel Veriler Hakkında</p>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            Sağlık verileri ve biyometrik veriler, 6698 sayılı KVKK&apos;nın 6. maddesi uyarınca <strong>özel nitelikli kişisel veri</strong> niteliği taşımaktadır. Bu veriler, yalnızca sporcunun veya küçük sporcular söz konusu olduğunda velinin/vasinin <strong>açık ve yazılı rızası</strong> alınarak işlenmektedir. Rızanızı geri çekme hakkınız saklıdır.
          </p>
        </div>

        <h2>3. Küçük Çocukların (18 Yaş Altı) Kişisel Verileri</h2>
        <p>Platformumuzda sporcu kaydı yapılan kişilerin 18 yaş altında olması mümkündür. Bu durumda:</p>
        <ul>
          <li>Kayıt işlemi, velinin/vasinin açık rızası alınarak gerçekleştirilmektedir.</li>
          <li>Küçük sporcunun kişisel verileri yalnızca veli/vasi onaylı yasal temsilci sıfatıyla işlenmektedir.</li>
          <li>Sağlık verileri de dahil olmak üzere tüm özel nitelikli veriler için veli/vasinin ek yazılı onayı gerekmektedir.</li>
          <li>18 yaşını dolduran sporculara kendi hesapları devredilmekte ve açık rıza yeniden alınmaktadır.</li>
        </ul>

        <h2>4. Kişisel Verilerin İşlenme Amaçları</h2>
        <p>Kişisel verileriniz aşağıdaki amaçlarla sınırlı olarak işlenmektedir:</p>
        <ol>
          <li>Spor akademisi üyelik ve kayıt işlemlerinin yürütülmesi</li>
          <li>Ödeme, aidat ve finansal takibin gerçekleştirilmesi</li>
          <li>Devam durumu, yoklama ve katılım takibinin yapılması</li>
          <li>Sporcu gelişiminin ve performansının izlenmesi</li>
          <li>Veli/vasi bilgilendirme iletişiminin sağlanması (SMS, e-posta bildirimleri)</li>
          <li>Acil durumlarda yetkili kişilere ulaşılması</li>
          <li>Antrenör ve yönetici ile iletişim kanallarının oluşturulması</li>
          <li>Platform güvenliğinin ve yetkisiz erişim önlenmesinin sağlanması</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi (vergi, SGK bildirimi vb.)</li>
          <li>Hizmet kalitesinin iyileştirilmesi amacıyla anonim istatistik üretimi</li>
        </ol>

        <h2>5. Kişisel Veri İşlemenin Hukuki Dayanaklarr</h2>
        <p>Verileriniz 6698 sayılı KVKK&apos;nın 5. ve 6. maddeleri kapsamında aşağıdaki hukuki sebeplere dayanılarak işlenmektedir:</p>

        <table className="legal-table">
          <thead>
            <tr><th>Veri Kategorisi</th><th>Hukuki Dayanak</th></tr>
          </thead>
          <tbody>
            <tr><td>Kimlik ve iletişim verileri</td><td>Sözleşmenin kurulması ve ifası (md. 5/2-c) • Meşru menfaat (md. 5/2-f)</td></tr>
            <tr><td>Sağlık verileri</td><td>Açık rıza (md. 6/2) — sporcu güvenliği amacıyla</td></tr>
            <tr><td>Finansal veriler</td><td>Sözleşmenin ifası (md. 5/2-c) • Yasal yükümlülük (md. 5/2-ç)</td></tr>
            <tr><td>Eğitim/sportif veriler</td><td>Sözleşmenin ifası (md. 5/2-c)</td></tr>
            <tr><td>İşlem güvenliği verileri</td><td>Meşru menfaat (md. 5/2-f) • Yasal yükümlülük (md. 5/2-ç)</td></tr>
            <tr><td>Profil fotoğrafı</td><td>Açık rıza (md. 6/2)</td></tr>
            <tr><td>Pazarlama iletişimi</td><td>Açık rıza (md. 5/1)</td></tr>
          </tbody>
        </table>

        <h2>6. Kişisel Verilerin Aktarılması</h2>
        <h3>6.1 Yurt İçi Aktarımlar</h3>
        <p>Kişisel verileriniz, yasal zorunluluk bulunması halinde ilgili kamu kurum ve kuruluşlarına aktarılabilir. Bunun dışında yurt içinde herhangi bir üçüncü kişiye aktarım yapılmamaktadır.</p>

        <h3>6.2 Yurt Dışı Aktarımlar</h3>
        <p>Platformumuzun teknik altyapısı, Türkiye dışında faaliyet gösteren aşağıdaki hizmet sağlayıcılar tarafından desteklenmektedir. Bu aktarımlar, 6698 sayılı KVKK&apos;nın 9. maddesi ve Yurt Dışına Kişisel Veri Aktarılmasına İlişkin Usul ve Esaslar Hakkında Yönetmelik uyarınca yürütülmektedir:</p>

        <table className="legal-table">
          <thead>
            <tr><th>Hizmet Sağlayıcı</th><th>Ülke</th><th>Aktarılan Veri</th><th>Hukuki Dayanak</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Supabase Inc.</strong></td><td>ABD (EU veri merkezleri)</td><td>Tüm platform verileri (şifreli)</td><td>Standart Sözleşme Maddeleri (SCCs) + Veri İşleme Sözleşmesi</td></tr>
            <tr><td><strong>Vercel Inc.</strong></td><td>ABD (küresel CDN)</td><td>Uygulama kodu, günlük verileri</td><td>Standart Sözleşme Maddeleri (SCCs)</td></tr>
            <tr><td><strong>NetGSM</strong></td><td>Türkiye</td><td>Telefon numarası, SMS içeriği</td><td>Sözleşmenin ifası</td></tr>
            <tr><td><strong>PayTR</strong></td><td>Türkiye</td><td>Ödeme bilgileri (PCI-DSS uyumlu)</td><td>Sözleşmenin ifası</td></tr>
          </tbody>
        </table>

        <div className="legal-info-box">
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            <strong>AB/GDPR Uyumu:</strong> Supabase ve Vercel ile imzalanan Veri İşleme Sözleşmeleri (DPA), Avrupa Birliği Genel Veri Koruma Yönetmeliği (GDPR) kapsamındaki Standart Sözleşme Maddelerini içermektedir. Kişisel verileriniz bu hizmet sağlayıcıların sunucularında şifrelenerek saklanmaktadır.
          </p>
        </div>

        <h2>7. Kişisel Verilerin Saklanma Süreleri</h2>
        <table className="legal-table">
          <thead>
            <tr><th>Veri Kategorisi</th><th>Saklama Süresi</th><th>Dayanak</th></tr>
          </thead>
          <tbody>
            <tr><td>Kimlik ve iletişim</td><td>Üyelik süresi + 10 yıl</td><td>Türk Ticaret Kanunu md. 82</td></tr>
            <tr><td>Finansal kayıtlar</td><td>Üyelik süresi + 10 yıl</td><td>Vergi Usul Kanunu md. 253</td></tr>
            <tr><td>Sağlık verileri</td><td>Üyelik süresi + 10 yıl</td><td>Sağlık mevzuatı + TTK</td></tr>
            <tr><td>Devam/yoklama kayıtları</td><td>Üyelik süresi + 5 yıl</td><td>Meşru menfaat</td></tr>
            <tr><td>İşlem güvenliği kayıtları</td><td>3 yıl</td><td>5651 Sayılı Kanun</td></tr>
            <tr><td>Silme talep edilmesi</td><td>30 gün içinde imha</td><td>KVKK md. 7</td></tr>
          </tbody>
        </table>
        <p>Saklama süreleri sona erdiğinde kişisel verileriniz; kişisel verileri silme, yok etme veya anonim hale getirme yöntemleriyle imha edilir ve buna ilişkin periyodik imha planı uygulanır.</p>

        <h2>8. Kişisel Veri Güvenliği</h2>
        <p>KVKK&apos;nın 12. maddesi uyarınca kişisel verilerinizin güvenliğini sağlamak amacıyla aşağıdaki teknik ve idari önlemler alınmaktadır:</p>
        <h3>Teknik Önlemler</h3>
        <ul>
          <li>TLS 1.3 protokolü ile uçtan uca şifreli veri iletimi</li>
          <li>AES-256 ile bekleyen veriler (data at rest) şifreleme</li>
          <li>PostgreSQL Row Level Security (RLS) — her kullanıcı yalnızca kendi organizasyonunun verisine erişebilir</li>
          <li>JWT tabanlı kimlik doğrulama ve oturum yönetimi</li>
          <li>Güçlü parola politikası (minimum 8 karakter)</li>
          <li>Şüpheli giriş denemelerinde hesap kilitleme mekanizması</li>
          <li>Günlük otomatik yedekleme (Supabase yedekleme altyapısı)</li>
          <li>Servis rolleri ile rol tabanlı erişim kontrolü (RBAC)</li>
        </ul>
        <h3>İdari Önlemler</h3>
        <ul>
          <li>Kişisel verilere erişim, yalnızca yetkili personel ile sınırlıdır</li>
          <li>Veri işleyici sıfatındaki hizmet sağlayıcılarla veri işleme sözleşmesi imzalanmıştır</li>
          <li>Kişisel veri ihlali tespitinde 72 saat içinde Kişisel Verileri Koruma Kurulu&apos;na bildirim yapılır</li>
          <li>Etkilenen veri sahipleri, makul süre içinde bilgilendirilir</li>
        </ul>

        <h2>9. Veri İhlali Bildirimi</h2>
        <p>Kişisel verilerinizin ihlale uğradığını fark ettiğimiz takdirde, 6698 sayılı KVKK&apos;nın 12/5. maddesi uyarınca:</p>
        <ul>
          <li>İhlal tespitinden itibaren <strong>72 saat</strong> içinde Kişisel Verileri Koruma Kurulu&apos;na bildirim yapılır.</li>
          <li>İlgili kişiler (veri sahipleri), ihlalden etkilenmeleri halinde <strong>makul süre</strong> içinde bilgilendirilir.</li>
          <li>İhlalin kapsamı, olası etkileri ve alınan önlemler şeffaf biçimde paylaşılır.</li>
        </ul>

        <h2>10. İlgili Kişinin Hakları (KVKK Madde 11)</h2>
        <p>Kişisel veri sahibi olarak aşağıdaki haklara sahipsiniz:</p>
        <ol>
          <li><strong>Bilgi alma hakkı:</strong> Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li><strong>Erişim hakkı:</strong> Kişisel verilerinize ve işleme faaliyetlerine ilişkin bilgi talep etme</li>
          <li><strong>Düzeltme hakkı:</strong> Eksik veya yanlış verilerin düzeltilmesini isteme</li>
          <li><strong>Silme/imha hakkı:</strong> İşleme şartlarının ortadan kalkması halinde silinmesini talep etme</li>
          <li><strong>Aktarım bildirimi:</strong> Düzeltme/silme işleminin aktarılan üçüncü kişilere bildirilmesini isteme</li>
          <li><strong>İtiraz hakkı:</strong> Otomatik sistemler yoluyla aleyhinize sonuç oluşturulmasına itiraz etme</li>
          <li><strong>Zararın giderilmesi:</strong> Kanuna aykırı işleme nedeniyle uğradığınız zararın tazminini talep etme</li>
          <li><strong>Rıza geri çekme:</strong> Açık rızaya dayalı işlemler için rızanızı her zaman geri çekme</li>
        </ol>

        <h2>11. Başvuru Usulü</h2>
        <p>Haklarınızı kullanmak için aşağıdaki yöntemlerle başvurabilirsiniz:</p>
        <table className="legal-table">
          <thead><tr><th>Başvuru Kanalı</th><th>Adres / Bilgi</th></tr></thead>
          <tbody>
            <tr><td>E-posta</td><td><a href="mailto:eneskahveci.bs@gmail.com">eneskahveci.bs@gmail.com</a></td></tr>
            <tr><td>Telefon</td><td><a href="tel:+905469775868">+90 546 977 58 68</a></td></tr>
          </tbody>
        </table>
        <p>Başvurular; talebinizin açıkça belirtilmesi, kimliğinizi doğrulayıcı bilgiler (ad, soyad, TC Kimlik No) ve iletişim bilgilerini içerecek şekilde yapılmalıdır. Kimliğinizin teyidinin ardından başvurular <strong>30 (otuz) gün</strong> içinde yanıtlanır; bu süre zorunluluk halinde 60 güne kadar uzatılabilir.</p>
        <p>Yanıtımızın yetersiz olduğunu düşünüyorsanız <strong>Kişisel Verileri Koruma Kurumu</strong>&apos;na şikâyette bulunma hakkınız saklıdır. (<a href="https://www.kvkk.gov.tr" target="_blank" rel="noopener noreferrer">www.kvkk.gov.tr</a>)</p>

        <h2>12. Çerez (Cookie) Politikası</h2>
        <p>Platformumuz, temel işlevlerin çalışması için zorunlu teknik çerezler kullanmaktadır. Bu çerezler şunlardır:</p>
        <table className="legal-table">
          <thead><tr><th>Çerez Adı</th><th>Amaç</th><th>Süre</th></tr></thead>
          <tbody>
            <tr><td><code>sb-*</code></td><td>Supabase kimlik doğrulama oturumu</td><td>Oturum süresi</td></tr>
            <tr><td><code>_sub_ok</code></td><td>Abonelik kontrol önbelleği</td><td>1 saat</td></tr>
            <tr><td><code>theme</code></td><td>Arayüz teması tercihi (dark/light)</td><td>1 yıl</td></tr>
            <tr><td><code>notif_seen</code></td><td>Okunmuş bildirimler (localStorage)</td><td>Kalıcı (yerel depolama)</td></tr>
          </tbody>
        </table>
        <p>Analitik, reklam veya pazarlama amacıyla üçüncü taraf çerezleri kullanılmamaktadır.</p>

        <h2>13. Değişiklikler</h2>
        <p>Bu aydınlatma metni, mevzuat değişiklikleri veya platform güncellemeleri doğrultusunda revize edilebilir. Önemli değişiklikler platform üzerinden duyurulacaktır. En güncel versiyona her zaman <a href="/kvkk">/kvkk</a> adresinden ulaşabilirsiniz.</p>

        <div className="legal-footer-links">
          <Link href="/gizlilik">Gizlilik Politikası</Link>
          <Link href="/kullanim-kosullari">Kullanım Koşulları</Link>
          <Link href="/">Ana Sayfa</Link>
        </div>
      </div>
      <style>{LEGAL_STYLES}</style>
    </div>
  )
}
