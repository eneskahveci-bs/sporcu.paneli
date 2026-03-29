import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: 'Yetkisiz' }, { status: 401 })

    const orgId = user.user_metadata?.organization_id
    const body = await req.json()
    const { recipients, message, type } = body

    if (!recipients?.length || !message) {
      return NextResponse.json({ success: false, error: 'Eksik parametre' }, { status: 400 })
    }

    // Güvenlik limitleri
    if (recipients.length > 500) {
      return NextResponse.json({ success: false, error: 'Tek seferde en fazla 500 alıcıya gönderilebilir' }, { status: 400 })
    }
    if (message.length > 1500) {
      return NextResponse.json({ success: false, error: 'Mesaj çok uzun (maks 1500 karakter)' }, { status: 400 })
    }
    if (message.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Mesaj boş olamaz' }, { status: 400 })
    }

    // Get settings
    const { data: settings } = await supabase.from('settings').select('key, value').eq('organization_id', orgId)
    const get = (key: string) => settings?.find((s: { key: string; value: string }) => s.key === key)?.value || ''

    const results: { phone: string; name: string; status: string; error?: string }[] = []

    if (type === 'sms') {
      const apiKey = get('netgsm_api_key')
      const senderId = get('netgsm_sender_id')

      if (!apiKey || !senderId) {
        return NextResponse.json({ success: false, error: 'NetGSM API anahtarı veya gönderici başlığı ayarlanmamış. Lütfen Ayarlar > SMS bölümünden yapılandırın.' }, { status: 400 })
      }

      for (const r of recipients) {
        const phone = r.phone?.replace(/\D/g, '').replace(/^0/, '90').replace(/^(?!90)/, '90')
        try {
          const params = new URLSearchParams({
            usercode: apiKey,
            password: '',
            gsmno: phone,
            message,
            msgheader: senderId,
            dil: 'TR',
          })
          const res = await fetch(`https://api.netgsm.com.tr/sms/send/get/?${params}`)
          const text = await res.text()
          const code = text.trim().split(' ')[0]
          results.push({ phone, name: r.name, status: code === '00' || code === '01' || code === '02' ? 'sent' : 'failed', error: code !== '00' && code !== '01' && code !== '02' ? `Kod: ${code}` : undefined })
        } catch (e) {
          results.push({ phone, name: r.name, status: 'failed', error: String(e) })
        }
      }
    } else if (type === 'whatsapp') {
      const token = get('whatsapp_token')
      const phoneId = get('whatsapp_phone_id')

      if (!token || !phoneId) {
        return NextResponse.json({ success: false, error: 'WhatsApp API token veya Phone Number ID ayarlanmamış. Lütfen Ayarlar > WhatsApp bölümünden yapılandırın.' }, { status: 400 })
      }

      for (const r of recipients) {
        const phone = r.phone?.replace(/\D/g, '').replace(/^0/, '90').replace(/^(?!90)/, '90')
        try {
          const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone,
              type: 'text',
              text: { body: message },
            }),
          })
          const data = await res.json()
          results.push({ phone, name: r.name, status: data.messages ? 'sent' : 'failed', error: data.error?.message })
        } catch (e) {
          results.push({ phone, name: r.name, status: 'failed', error: String(e) })
        }
      }
    }

    // Log all results
    if (results.length > 0) {
      await supabase.from('sms_logs').insert(
        results.map(r => ({
          organization_id: orgId,
          recipient_name: r.name,
          recipient_phone: r.phone,
          message,
          status: r.status,
          type,
          sent_at: new Date().toISOString(),
        }))
      )
    }

    const sentCount = results.filter(r => r.status === 'sent').length
    return NextResponse.json({ success: true, sent: sentCount, failed: results.length - sentCount })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
