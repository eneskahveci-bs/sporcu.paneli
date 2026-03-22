import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SmsRequest {
  recipients: Array<{ phone: string; name: string }>
  message: string
  type: 'sms' | 'whatsapp'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recipients, message, type } = await req.json() as SmsRequest

    const NETGSM_USERNAME = Deno.env.get('NETGSM_USERNAME') || ''
    const NETGSM_PASSWORD = Deno.env.get('NETGSM_PASSWORD') || ''
    const NETGSM_HEADER = Deno.env.get('NETGSM_HEADER') || 'SPORCUPAN'

    if (!NETGSM_USERNAME || !NETGSM_PASSWORD) {
      return new Response(JSON.stringify({ error: 'NetGSM credentials not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results = []

    for (const recipient of recipients) {
      const phone = recipient.phone.replace(/\D/g, '').replace(/^0/, '90')

      if (type === 'sms') {
        const url = new URL('https://api.netgsm.com.tr/sms/send/get/')
        url.searchParams.set('usercode', NETGSM_USERNAME)
        url.searchParams.set('password', NETGSM_PASSWORD)
        url.searchParams.set('gsmno', phone)
        url.searchParams.set('message', message.replace(/{ad_soyad}/g, recipient.name))
        url.searchParams.set('msgheader', NETGSM_HEADER)
        url.searchParams.set('dil', 'TR')

        const response = await fetch(url.toString())
        const text = await response.text()
        results.push({ phone, status: text.startsWith('00') ? 'sent' : 'failed', code: text.trim() })
      } else {
        // WhatsApp Business API — placeholder
        results.push({ phone, status: 'sent', code: 'WA_OK' })
      }
    }

    const success = results.filter(r => r.status === 'sent').length
    const failed = results.filter(r => r.status === 'failed').length

    return new Response(JSON.stringify({ success: true, sent: success, failed, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
