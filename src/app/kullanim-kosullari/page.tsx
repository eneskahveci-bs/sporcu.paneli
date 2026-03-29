import Link from 'next/link'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kullanım Koşulları',
  description: 'Sporcu Paneli kullanım koşulları — platform kullanımı, abonelik, iade ve veri sahipliği hakkında.',
  alternates: { canonical: '/kullanim-kosullari' },
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
  .legal-warn-box { background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; padding: 1rem 1.25rem; margin: 1.25rem 0; }
  .legal-table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem; }
  .legal-table th { background: var(--bg3); padding: 10px 14px; text-align: left; font-weight: 700; color: var(--text); border: 1px solid var(--border); }
  .legal-table td { padding: 9px 14px; color: var(--text2); border: 1px solid var(--border); vertical-align: top; line-height: 1.6; }
  .legal-table tr:nth-child(even) td { background: var(--bg3); }
  .legal-footer-links { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
  .legal-footer-links a { font-size: 0.875rem; color: var(--text3); text-decoration: none; transition: color 0.15s; }
  .legal-footer-links a:hover { color: var(--blue2); }
`

export default function KullanimKosullariPage() {
  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <Link href="/" className="legal-logo">🏅 Sporcu Paneli</Link>
      </nav>
      <div className="legal-container">
        <h1>Kullanım Koşulları</h1>
        <p className="legal-date">Son güncelleme: 29 Mart 2026 — Sürüm 2.0</p>

        <div className="legal-info-box">
          <p style={{ margin: 0 }}>Platforma erişerek veya hesap oluşturarak bu Kullanım Koşulları&apos;nı, <Link href="/gizlilik">Gizlilik Politikası</Link>&apos;nı ve <Link href="/kvkk">KVKK Aydınlatma Metni</Link>&apos;ni okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan etmiş olursunuz.</p>
        </div>

        <h2>1. Taraflar ve Hizmetin Tanımı</h2>
        <p><strong>Hizmet Sağlayıcı:</strong> Enes Kahveci — Sporcu Paneli (<em>&quot;Platform&quot;</em> veya <em>&quot;Hizmet&quot;</em>)</p>
        <p><strong>Kullanıcı:</strong> Platforma erişen yönetici, antrenör, sporcu veya veli sıfatındaki gerçek veya tüzel kişi</p>
        <p>Sporcu Paneli; spor akademilerinin sporcu kaydı, ödeme takibi, devam yönetimi, antrenör koordinasyonu ve veli iletişimi operasyonlarını dijitalleştiren bir yazılım hizmetidir (SaaS). Platform, birden fazla akademiye eş zamanlı hizmet verebilecek şekilde tasarlanmış çok kiracılı (multi-tenant) bir mimari üzerinde çalışmaktadır.</p>

        <h2>2. Hesap Türleri ve Erişim Yetkileri</h2>
        <table className="legal-table">
          <thead><tr><th>Hesap Türü</th><th>Atama Yöntemi</th><th>Erişim Kapsamı</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>Süper Admin</strong></td>
              <td>Yalnızca Sporcu Paneli ekibi tarafından oluşturulur</td>
              <td>Tüm akademilerin yönetimi, abonelik kontrolü. Sporcu/antrenör verilerine erişemez.</td>
            </tr>
            <tr>
              <td><strong>Akademi Yöneticisi</strong></td>
              <td>Süper admin veya diğer yönetici tarafından oluşturulur</td>
              <td>Kendi akademisinin tüm verileri: sporcu, antrenör, ödeme, devam, raporlar, ayarlar</td>
            </tr>
            <tr>
              <td><strong>Antrenör</strong></td>
              <td>Yönetici tarafından oluşturulur</td>
              <td>Atandığı sınıflara ait sporcu listesi, yoklama, mesajlar. Mali veriler ve ayarlara erişemez.</td>
            </tr>
            <tr>
              <td><strong>Sporcu / Veli</strong></td>
              <td>Yönetici tarafından oluşturulur</td>
              <td>Yalnızca kendi sporcu kaydına ait bilgiler: ödemeler, devam, mesajlar</td>
            </tr>
          </tbody>
        </table>
        <p>Her hesap türü yalnızca kendi organizasyonunun verisine erişebilir. Bu yalıtım, veritabanı satır düzeyinde güvenlik (RLS) ile teknik olarak zorunlu kılınmaktadır.</p>

        <h2>3. 18 Yaş Altı Kullanıcılar</h2>
        <div className="legal-warn-box">
          <p style={{ margin: 0, fontWeight: 600, marginBottom: '0.375rem' }}>⚠️ Önemli — Reşit Olmayanlar İçin</p>
          <p style={{ margin: 0, fontSize: '0.9375rem' }}>18 yaş altındaki sporcuların platformda kayıt yaptırabilmesi için <strong>veli veya yasal vasinin açık onayı zorunludur</strong>. Akademi yöneticisi, kayıt öncesinde veli onayını belgelemelidir. Platform, 13 yaşından küçük çocukların bilgi ve onayı olmaksızın kişisel veri girilmesine izin vermemektedir.</p>
        </div>
        <ul>
          <li>18 yaş altı sporcu hesapları yalnızca akademi yöneticisi tarafından oluşturulabilir.</li>
          <li>Veli/vasi, sporcunun tüm kişisel verilerinin işlenmesine önceden onay vermiş sayılır.</li>
          <li>Sporcu 18 yaşını tamamladığında, hesap devri ve yeni rıza alınması akademi yöneticisinin sorumluluğundadır.</li>
        </ul>

        <h2>4. Abonelik ve Ödeme Koşulları</h2>
        <h3>4.1 Abonelik Planları</h3>
        <table className="legal-table">
          <thead><tr><th>Plan</th><th>Sporcu Limiti</th><th>Şube Limiti</th><th>Ücret</th></tr></thead>
          <tbody>
            <tr><td><strong>Deneme (Trial)</strong></td><td>30 sporcu</td><td>1 şube</td><td>Ücretsiz (14 gün)</td></tr>
            <tr><td><strong>Başlangıç</strong></td><td>50 sporcu</td><td>1 şube</td><td>₺500 / ay</td></tr>
            <tr><td><strong>Profesyonel</strong></td><td>200 sporcu</td><td>5 şube</td><td>₺1.200 / ay</td></tr>
            <tr><td><strong>Kurumsal</strong></td><td>Sınırsız</td><td>Sınırsız</td><td>Özel fiyat</td></tr>
          </tbody>
        </table>
        <h3>4.2 Ödeme ve Faturalama</h3>
        <ul>
          <li>Abonelik ücretleri aylık olarak, belirlenen fatura gününde tahsil edilir.</li>
          <li>Ödeme gecikmesi halinde Sporcu Paneli, hizmet erişimini kısıtlama veya askıya alma hakkını saklı tutar.</li>
          <li>Fiyatlar KDV hariç belirtilmiştir; yasal vergi ve harçlar ayrıca uygulanabilir.</li>
          <li>Fiyat değişiklikleri en az 30 gün öncesinden bildirilir.</li>
        </ul>
        <h3>4.3 İptal ve İade Politikası</h3>
        <ul>
          <li>Abonelik iptali için en az <strong>15 gün</strong> önceden yazılı bildirim gerekmektedir.</li>
          <li>Deneme süresi içinde iptal durumunda ücret alınmaz.</li>
          <li>Aylık abonelik döneminin başlamasından itibaren 7 gün içinde iptal talebinde bulunulması halinde, o aya ait ücret iade edilebilir.</li>
          <li>7 günlük süre aşıldıktan sonra iade yapılmaz.</li>
          <li>Akademi tarafındaki (kullanıcı kaynaklı) nedenlerle oluşan veri kayıplarında sorumluluk kabul edilmez.</li>
        </ul>

        <h2>5. Kabul Edilebilir Kullanım Politikası</h2>
        <p>Platformu kullanarak aşağıdaki yükümlülükleri kabul edersiniz:</p>
        <h3>5.1 İzin Verilen Kullanım</h3>
        <ul>
          <li>Spor akademisi yönetim faaliyetlerinin yürütülmesi</li>
          <li>Sporcu kayıt, ödeme ve devam takibinin yapılması</li>
          <li>Veli ile yasal çerçevede iletişim kurulması</li>
          <li>Akademi ile ilgili yasal yükümlülüklerin yerine getirilmesi</li>
        </ul>
        <h3>5.2 Yasak Kullanımlar</h3>
        <ul>
          <li>Başka kullanıcılara ait kişisel verilere yetkisiz erişim girişimi</li>
          <li>Platformun tersine mühendislik (reverse engineering) ile incelenmesi</li>
          <li>Zararlı yazılım, bot, spider, scraping aracı kullanımı</li>
          <li>Sistemi aşırı yükleme veya hizmet aksatma (DoS) girişimi</li>
          <li>Gerçeğe aykırı, yanıltıcı veya sahte bilgi girişi</li>
          <li>Uygulamayı başka akademilere lisanssız olarak kiralamak veya devretmek</li>
          <li>Kişisel verilerin, sahiplerine bildirim yapılmaksızın üçüncü taraflarla paylaşılması</li>
          <li>Platformun Türk Ceza Kanunu, KVKK veya diğer mevzuata aykırı amaçlarla kullanılması</li>
        </ul>

        <h2>6. Hesap Güvenliği ve Sorumluluk</h2>
        <ul>
          <li>Hesap giriş bilgilerinizin (e-posta, şifre, TC Kimlik No) gizliliği tamamen sizin sorumluluğunuzdadır.</li>
          <li>Hesabınızı üçüncü kişilerle paylaşmak yasaktır.</li>
          <li>Yetkisiz erişim şüphesinde derhal <a href="mailto:eneskahveci.bs@gmail.com">eneskahveci.bs@gmail.com</a> adresini bilgilendirin.</li>
          <li>Hesabınızla gerçekleştirilen işlemler, aksi ispat edilmedikçe size ait kabul edilir.</li>
          <li>Paylaştığınız tüm bilgilerin doğru, güncel ve eksiksiz olduğunu beyan edersiniz.</li>
        </ul>

        <h2>7. Veri Sahipliği ve Taşınabilirlik</h2>
        <ul>
          <li>Platforma girilen tüm veriler (sporcu bilgileri, ödeme kayıtları, devam verileri) ilgili <strong>akademiye aittir</strong>.</li>
          <li>Sporcu Paneli bu verileri akademi dışında ticari amaçla kullanmaz, üçüncü taraflara satmaz.</li>
          <li>Aboneliğin sona ermesi veya iptali halinde akademi, <strong>30 gün</strong> içinde verilerini CSV/Excel formatında talep edebilir.</li>
          <li>30 günlük sürenin dolmasından sonra veriler güvenli biçimde imha edilir.</li>
        </ul>

        <h2>8. Fikri Mülkiyet Hakları</h2>
        <ul>
          <li>Sporcu Paneli platformunun kaynak kodu, tasarımı, logosu, arayüzü ve tüm içerikleri Enes Kahveci&apos;ye aittir.</li>
          <li>Kullanıcılara tanınan hak yalnızca belirtilen amaçlarla platformu <strong>kullanma</strong> hakkıdır; mülkiyet veya lisans devri söz konusu değildir.</li>
          <li>Platform içeriğinin kopyalanması, çoğaltılması, dağıtılması yazılı izin olmaksızın yasaktır.</li>
        </ul>

        <h2>9. Hizmet Seviyesi ve Sorumluluk Sınırları</h2>
        <h3>9.1 Hizmet Taahhütleri</h3>
        <ul>
          <li>Platform, aylık %99 erişilebilirlik hedefiyle işletilmektedir.</li>
          <li>Planlı bakım çalışmaları önceden duyurulacaktır.</li>
          <li>Teknik destek taleplerine 3 iş günü içinde yanıt verilmesi hedeflenmektedir.</li>
        </ul>
        <h3>9.2 Sorumluluk Sınırlamaları</h3>
        <ul>
          <li>Sporcu Paneli, beklenmedik teknik arızalar, üçüncü taraf hizmet kesintileri veya doğal afetler nedeniyle yaşanan hizmet kesintilerinden sorumlu tutulamaz.</li>
          <li>NetGSM, PayTR veya WhatsApp Business gibi üçüncü taraf entegrasyonlardan kaynaklanan aksaklıklarda sorumluluk ilgili sağlayıcılara aittir.</li>
          <li>Kullanıcı hatası veya yetkisiz erişim sonucu oluşan veri kayıplarında Sporcu Paneli sorumlu değildir.</li>
          <li>Herhangi bir durumda Sporcu Paneli&apos;nin azami sorumluluğu, ilgili aylık abonelik ücreti ile sınırlıdır.</li>
        </ul>

        <h2>10. Hesap Askıya Alma ve Fesih</h2>
        <p>Sporcu Paneli aşağıdaki durumlarda önceden bildirim yapmaksızın hesabı askıya alma veya feshetme hakkını saklı tutar:</p>
        <ul>
          <li>Bu koşulların veya yürürlükteki mevzuatın açık ihlali</li>
          <li>Abonelik ücretinin 30 günü aşan gecikmesi</li>
          <li>Sistem güvenliğine yönelik saldırı girişimi tespiti</li>
          <li>Sahte veya yanıltıcı bilgiyle hesap açılması</li>
          <li>Başka kullanıcıların güvenliğini tehdit eden davranış</li>
        </ul>

        <h2>11. Mücbir Sebep</h2>
        <p>Deprem, sel, yangın, savaş, salgın hastalık, siber saldırı, elektrik kesintisi, üçüncü taraf altyapı arızaları veya diğer mücbir sebep halleri nedeniyle hizmetin sunulamaması durumunda Sporcu Paneli sorumlu tutulamaz. Bu süre içindeki abonelik ücretleri, mücbir sebebin süresine orantılı olarak alacak hesabına aktarılabilir.</p>

        <h2>12. Değişiklikler ve Bildirimler</h2>
        <p>Bu Kullanım Koşulları önceden bildirimde bulunularak değiştirilebilir:</p>
        <ul>
          <li>Önemli değişiklikler platform girişinde ve/veya e-posta ile bildirilir.</li>
          <li>Değişiklik tarihinden itibaren 15 gün içinde itiraz edilmezse yeni koşullar kabul edilmiş sayılır.</li>
          <li>Koşulları kabul etmeyen kullanıcılar hesap iptal talebinde bulunabilir.</li>
        </ul>

        <h2>13. Bölünebilirlik (Severability)</h2>
        <p>Bu koşulların herhangi bir hükmünün yetkili mahkeme tarafından geçersiz, yasadışı veya uygulanamaz bulunması halinde, bu hüküm koşullardan ayrılarak kalan hükümler tam olarak yürürlükte olmaya devam eder.</p>

        <h2>14. Uygulanacak Hukuk ve Uyuşmazlık Çözümü</h2>
        <ul>
          <li>Bu Kullanım Koşulları <strong>Türkiye Cumhuriyeti hukukuna</strong> tabidir.</li>
          <li>Taraflar arasında doğabilecek uyuşmazlıklarda öncelikle uzlaşma yoluna gidilmesi kararlaştırılmıştır.</li>
          <li>Uzlaşma sağlanamadığı takdirde <strong>İstanbul (Merkez) Mahkemeleri ve İcra Daireleri</strong> yetkilidir.</li>
          <li>Tüketiciler, ayrıca Türkiye'deki Tüketici Hakem Heyetleri&apos;ne başvurabilir.</li>
        </ul>

        <h2>15. İletişim</h2>
        <p>Bu Kullanım Koşulları&apos;na ilişkin sorularınız veya bildirimleriniz için:</p>
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
      <style>{LEGAL_STYLES}</style>
    </div>
  )
}
