import { Resend } from 'resend'
import { NextResponse } from 'next/server'

// HTML özel karakterlerini escape ederek XSS saldırılarını önle
function escHtml(str: unknown): string {
  if (typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Basit rate limiting: IP başına 5 dakikada 3 istek
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen 5 dakika bekleyin.' }, { status: 429 })
    }

    const body = await request.json()
    const { akademi_adi, yetkili_adi, email, telefon, sehir, sporlar, sporcu_sayisi, notlar } = body

    if (!akademi_adi || !yetkili_adi || !email || !telefon) {
      return NextResponse.json({ error: 'Gerekli alanlar eksik' }, { status: 400 })
    }

    // E-posta format kontrolü
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Geçersiz e-posta adresi' }, { status: 400 })
    }

    // Alan uzunluk kontrolü
    if (akademi_adi.length > 200 || yetkili_adi.length > 100 || email.length > 254 || telefon.length > 20) {
      return NextResponse.json({ error: 'Alan değerleri çok uzun' }, { status: 400 })
    }

    // Env var kontrolü
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ success: true }) // Sessizce başarı döndür, e-posta göndermeden
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    // XSS koruması: tüm kullanıcı verileri escape edilir
    await resend.emails.send({
      from: 'Sporcu Paneli <onboarding@resend.dev>',
      to: ['eneskahveci.bs@gmail.com'],
      replyTo: email,
      subject: `Yeni Akademi Kayıt Talebi: ${escHtml(akademi_adi)}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 24px; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #0b225c, #224b93); padding: 20px 24px; border-radius: 8px; margin-bottom: 24px;">
            <h2 style="color: #fff; margin: 0; font-size: 20px;">🏅 Yeni Akademi Kayıt Talebi</h2>
          </div>
          <table style="width:100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
            <tr><td style="padding: 12px 16px; font-weight: 600; width: 160px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">Akademi Adı</td><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${escHtml(akademi_adi)}</td></tr>
            <tr><td style="padding: 12px 16px; font-weight: 600; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">Yetkili Kişi</td><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${escHtml(yetkili_adi)}</td></tr>
            <tr><td style="padding: 12px 16px; font-weight: 600; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">E-posta</td><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${escHtml(email)}</td></tr>
            <tr><td style="padding: 12px 16px; font-weight: 600; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">Telefon</td><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${escHtml(telefon)}</td></tr>
            ${sehir ? `<tr><td style="padding: 12px 16px; font-weight: 600; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">Şehir</td><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${escHtml(sehir)}</td></tr>` : ''}
            ${sporlar ? `<tr><td style="padding: 12px 16px; font-weight: 600; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">Spor Dalları</td><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${escHtml(sporlar)}</td></tr>` : ''}
            ${sporcu_sayisi ? `<tr><td style="padding: 12px 16px; font-weight: 600; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">Tahmini Sporcu</td><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${escHtml(String(sporcu_sayisi))}</td></tr>` : ''}
            ${notlar ? `<tr><td style="padding: 12px 16px; font-weight: 600; background: #f3f4f6;">Notlar</td><td style="padding: 12px 16px;">${escHtml(notlar)}</td></tr>` : ''}
          </table>
          <p style="color: #6b7280; font-size: 12px; margin-top: 16px; text-align: center;">Sporcu Paneli | eneskahveci.bs@gmail.com</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch {
    // İç hata detayı dışarıya sızdırılmıyor
    return NextResponse.json({ error: 'İstek işlenemedi' }, { status: 500 })
  }
}
