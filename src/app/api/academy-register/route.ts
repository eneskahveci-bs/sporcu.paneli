import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { akademi_adi, yetkili_adi, email, telefon, sehir, sporlar, sporcu_sayisi, notlar } = body

    if (!akademi_adi || !yetkili_adi || !email || !telefon) {
      return NextResponse.json({ error: 'Gerekli alanlar eksik' }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'Sporcu Paneli <onboarding@resend.dev>',
      to: ['eneskahveci.bs@gmail.com'],
      replyTo: email,
      subject: `Yeni Akademi Kayıt Talebi: ${akademi_adi}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 24px; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #0b225c, #224b93); padding: 20px 24px; border-radius: 8px; margin-bottom: 24px;">
            <h2 style="color: #fff; margin: 0; font-size: 20px;">🏅 Yeni Akademi Kayıt Talebi</h2>
          </div>
          <table style="width:100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
            <tr>
              <td style="padding: 12px 16px; font-weight: 600; width: 160px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">Akademi Adı</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${akademi_adi}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; font-weight: 600; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">Yetkili Kişi</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${yetkili_adi}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; font-weight: 600; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">E-posta</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; font-weight: 600; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">Telefon</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;"><a href="tel:${telefon}">${telefon}</a></td>
            </tr>
            ${sehir ? `<tr><td style="padding: 12px 16px; font-weight: 600; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">Şehir</td><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${sehir}</td></tr>` : ''}
            ${sporlar ? `<tr><td style="padding: 12px 16px; font-weight: 600; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">Spor Dalları</td><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${sporlar}</td></tr>` : ''}
            ${sporcu_sayisi ? `<tr><td style="padding: 12px 16px; font-weight: 600; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">Tahmini Sporcu</td><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${sporcu_sayisi}</td></tr>` : ''}
            ${notlar ? `<tr><td style="padding: 12px 16px; font-weight: 600; background: #f3f4f6;">Notlar</td><td style="padding: 12px 16px;">${notlar}</td></tr>` : ''}
          </table>
          <p style="color: #6b7280; font-size: 12px; margin-top: 16px; text-align: center;">Sporcu Paneli | eneskahveci.bs@gmail.com</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Academy register email error:', err)
    return NextResponse.json({ error: 'Email gönderilemedi' }, { status: 500 })
  }
}
