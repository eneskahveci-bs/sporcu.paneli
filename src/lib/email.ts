import { Resend } from 'resend'

const getResend = () => {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

const FROM = process.env.RESEND_FROM_EMAIL || 'Sporcu Paneli <noreply@resend.dev>'

export async function sendWelcomeEmail({
  toEmail, fullName, loginEmail, loginPassword, orgName, role,
}: {
  toEmail: string
  fullName: string
  loginEmail: string
  loginPassword: string
  orgName: string
  role: 'athlete' | 'coach'
}) {
  const resend = getResend()
  if (!resend || !toEmail || !toEmail.includes('@') || toEmail.endsWith('@sporcu.tc') || toEmail.endsWith('@antrenor.tc')) return

  const roleLabel = role === 'coach' ? 'Antrenör' : 'Sporcu'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: `${orgName} — Portalınız Hazır`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#fff">
          <div style="background:linear-gradient(135deg,#2d5cb3,#6366f1);border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
            <div style="font-size:36px;margin-bottom:8px">🏅</div>
            <h2 style="color:#fff;margin:0;font-size:20px">${orgName}</h2>
            <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px">Sporcu Paneli</p>
          </div>
          <h3 style="color:#1e293b;margin-bottom:6px">Merhaba, ${fullName}!</h3>
          <p style="color:#475569;margin-bottom:20px;line-height:1.6">
            ${orgName} spor akademisi sistemine <strong>${roleLabel}</strong> olarak kaydınız oluşturulmuştur.
            Aşağıdaki bilgilerle portala giriş yapabilirsiniz.
          </p>
          <div style="background:#f1f5f9;border-radius:10px;padding:18px;margin-bottom:20px;border:1px solid #e2e8f0">
            ${appUrl ? `<div style="margin-bottom:10px;font-size:14px"><span style="color:#64748b">🌐 Adres:</span> <a href="${appUrl}" style="color:#2d5cb3;font-weight:600">${appUrl}</a></div>` : ''}
            <div style="margin-bottom:10px;font-size:14px"><span style="color:#64748b">📧 Kullanıcı Adı:</span> <strong style="font-family:monospace;background:#e2e8f0;padding:2px 8px;border-radius:4px">${loginEmail}</strong></div>
            <div style="font-size:14px"><span style="color:#64748b">🔑 Şifre:</span> <strong style="font-family:monospace;background:#e2e8f0;padding:2px 8px;border-radius:4px">${loginPassword}</strong></div>
          </div>
          <p style="color:#94a3b8;font-size:13px;line-height:1.5">
            Güvenliğiniz için ilk girişte şifrenizi değiştirmenizi öneririz.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
          <p style="color:#cbd5e1;font-size:12px;text-align:center">Bu e-posta ${orgName} tarafından otomatik gönderilmiştir.</p>
        </div>
      `,
    })
  } catch { /* Email gönderimi başarısız olsa da provision devam eder */ }
}

export async function sendOverdueEmail({
  toEmail, athleteName, amount, dueDate, orgName,
}: {
  toEmail: string
  athleteName: string
  amount: number
  dueDate: string
  orgName: string
}) {
  const resend = getResend()
  if (!resend || !toEmail || !toEmail.includes('@')) return

  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: `${orgName} — Gecikmiş Ödeme Hatırlatması`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#fff">
          <div style="background:#ef4444;border-radius:12px;padding:18px;text-align:center;margin-bottom:24px">
            <div style="font-size:32px;margin-bottom:6px">⚠️</div>
            <h2 style="color:#fff;margin:0;font-size:18px">${orgName}</h2>
          </div>
          <h3 style="color:#1e293b">Ödeme Hatırlatması</h3>
          <p style="color:#475569;line-height:1.6">
            Sayın Veli,<br/><br/>
            <strong>${athleteName}</strong> için <strong>${Number(amount).toLocaleString('tr-TR')} ₺</strong> tutarındaki
            ödemenizin son tarihi <strong>${new Date(dueDate).toLocaleDateString('tr-TR')}</strong> geçmiştir.
          </p>
          <p style="color:#475569;line-height:1.6">
            Ödemelerinizi sporcu portalı üzerinden "Ödedim — Bildirim Gönder" butonuyla bildirebilir
            veya akademimizle iletişime geçebilirsiniz.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
          <p style="color:#cbd5e1;font-size:12px;text-align:center">Bu e-posta ${orgName} tarafından otomatik gönderilmiştir.</p>
        </div>
      `,
    })
  } catch { /* Email gönderimi başarısız olsa da devam eder */ }
}
