import Link from 'next/link'

export const metadata = { title: 'KVKK Aydınlatma Metni | Sporcu Paneli' }

export default function KVKKPage() {
  const date = '22 Mart 2026'
  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <Link href="/" className="legal-logo">🏅 Sporcu Paneli</Link>
      </nav>
      <div className="legal-container">
        <h1>KVKK Aydınlatma Metni</h1>
        <p className="legal-date">Son güncelleme: {date}</p>

        <p>6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, kişisel verilerinizin işlenmesine ilişkin olarak aydınlatma yükümlülüğümüzü yerine getirmek amacıyla bu metin hazırlanmıştır.</p>

        <h2>1. Veri Sorumlusu</h2>
        <p><strong>Enes Kahveci</strong> (bundan böyle &quot;Sporcu Paneli&quot; olarak anılacaktır), KVKK kapsamında veri sorumlusu sıfatıyla hareket etmektedir.</p>
        <p>İletişim: <a href="mailto:eneskahveci.bs@gmail.com">eneskahveci.bs@gmail.com</a> | <a href="tel:+905469775868">+90 546 977 58 68</a></p>

        <h2>2. İşlenen Kişisel Veriler</h2>
        <p>Sporcu Paneli kapsamında aşağıdaki kategorilerde kişisel veri işlenmektedir:</p>
        <ul>
          <li><strong>Kimlik Verileri:</strong> Ad, soyad, TC Kimlik No, doğum tarihi, cinsiyet</li>
          <li><strong>İletişim Verileri:</strong> Cep telefonu, e-posta adresi, ikamet adresi, şehir</li>
          <li><strong>Sağlık Verileri:</strong> Kan grubu, sağlık notları (özel nitelikli kişisel veri)</li>
          <li><strong>Finansal Veriler:</strong> Ödeme kayıtları, aidat bilgileri</li>
          <li><strong>Eğitim Verileri:</strong> Devam durumu, branş bilgisi, sınıf bilgisi</li>
          <li><strong>Veli/Vasi Bilgileri:</strong> Veli adı, soyadı, iletişim bilgileri</li>
          <li><strong>İşlem Güvenliği Verileri:</strong> Giriş zamanları, IP adresi, tarayıcı bilgisi</li>
        </ul>

        <h2>3. Kişisel Verilerin İşlenme Amacı</h2>
        <p>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
        <ul>
          <li>Spor akademisi üyelik ve kayıt işlemlerinin yürütülmesi</li>
          <li>Ödeme ve aidat takibinin gerçekleştirilmesi</li>
          <li>Devam durumu ve yoklama takibinin yapılması</li>
          <li>Sporcu gelişiminin izlenmesi</li>
          <li>Veli/vasi bilgilendirmesinin sağlanması (SMS, e-posta)</li>
          <li>Acil durum iletişiminin kurulması</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi</li>
          <li>Platform güvenliğinin ve bütünlüğünün korunması</li>
        </ul>

        <h2>4. Hukuki İşleme Sebepleri</h2>
        <p>Verileriniz aşağıdaki hukuki sebeplere dayanılarak işlenmektedir:</p>
        <ul>
          <li>Açık rızanız (sağlık verileri ve pazarlama iletişimi için)</li>
          <li>Sözleşmenin ifası (üyelik ve hizmet sözleşmesi)</li>
          <li>Meşru menfaatler (platform güvenliği)</li>
          <li>Yasal yükümlülük (vergi, denetim kayıtları)</li>
        </ul>

        <h2>5. Kişisel Verilerin Aktarılması</h2>
        <p>Kişisel verileriniz, yasal zorunluluk bulunmadıkça üçüncü kişilere aktarılmaz. Teknik altyapı sağlayıcılarımız (<strong>Supabase Inc.</strong> — veri tabanı, <strong>Vercel Inc.</strong> — hosting) ile yapılan işlemci sözleşmeleri çerçevesinde verileriniz bu sağlayıcıların güvenli sunucularında barındırılmaktadır.</p>

        <h2>6. Kişisel Verilerin Saklanma Süresi</h2>
        <p>Kişisel verileriniz, akademi üyeliğinizin aktif olduğu süre boyunca ve ilişkinin sona ermesinden itibaren Türk Ticaret Kanunu ve vergi mevzuatı kapsamında gerekli saklama süreleri boyunca (en fazla 10 yıl) muhafaza edilir.</p>

        <h2>7. Kişisel Veri Güvenliği</h2>
        <p>Verilerinizin güvenliği için teknik ve idari önlemler alınmaktadır:</p>
        <ul>
          <li>TLS 1.3 ile şifreli veri iletimi</li>
          <li>Veritabanı düzeyinde satır bazlı erişim kontrolü (RLS)</li>
          <li>Güçlü parola politikaları ve oturum yönetimi</li>
          <li>Düzenli yedekleme ve güvenlik güncellemeleri</li>
        </ul>

        <h2>8. İlgili Kişinin Hakları</h2>
        <p>KVKK&apos;nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>
        <ul>
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>İşlenmişse buna ilişkin bilgi talep etme</li>
          <li>İşlenme amacını öğrenme ve amaca uygun kullanılıp kullanılmadığını öğrenme</li>
          <li>Yurt içi veya yurt dışında aktarıldığı üçüncü kişileri öğrenme</li>
          <li>Eksik veya yanlış işlenmiş olması halinde düzeltilmesini isteme</li>
          <li>Silinmesini veya yok edilmesini isteme</li>
          <li>Otomatik sistemler yoluyla aleyhinize sonuç oluşturulmasına itiraz etme</li>
          <li>Zarar görmeniz durumunda zararın giderilmesini talep etme</li>
        </ul>

        <h2>9. Başvuru Yolu</h2>
        <p>Yukarıdaki haklarınıza ilişkin başvurularınızı aşağıdaki kanallar aracılığıyla iletebilirsiniz:</p>
        <ul>
          <li>E-posta: <a href="mailto:eneskahveci.bs@gmail.com">eneskahveci.bs@gmail.com</a></li>
          <li>Telefon: <a href="tel:+905469775868">+90 546 977 58 68</a></li>
        </ul>
        <p>Başvurularınız, kimliğinizin teyit edilmesinin ardından 30 (otuz) gün içinde yanıtlanacaktır.</p>

        <div className="legal-footer-links">
          <Link href="/gizlilik">Gizlilik Politikası</Link>
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
