// WhatsApp Business Cloud API mesaj gönderimi
// Secrets: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const PHONE_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || ''
  const TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || ''
  if (!PHONE_ID || !TOKEN) {
    return new Response(JSON.stringify({ error: 'WhatsApp not configured' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const auth = req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const { data: { user } } = await supabase.auth.getUser(auth)
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const orgId = user.user_metadata?.organization_id
    const role = user.user_metadata?.role
    if (!orgId || !['admin', 'superadmin'].includes(role)) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { recipients, body, template_name } = await req.json() as { recipients: { phone: string; name?: string; athlete_id?: string }[]; body: string; template_name?: string }
    if (!Array.isArray(recipients) || !recipients.length || !body) {
      return new Response(JSON.stringify({ error: 'invalid_input' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let sent = 0, failed = 0
    const results: { phone: string; status: string; error?: string; wa_message_id?: string }[] = []

    for (const r of recipients) {
      try {
        const payload = template_name
          ? { messaging_product: 'whatsapp', to: r.phone, type: 'template', template: { name: template_name, language: { code: 'tr' } } }
          : { messaging_product: 'whatsapp', to: r.phone, type: 'text', text: { body } }

        const apiRes = await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const apiJson = await apiRes.json()
        const ok = apiRes.ok && apiJson.messages?.[0]?.id

        await supabase.from('wa_messages').insert({
          organization_id: orgId,
          athlete_id: r.athlete_id || null,
          to_phone: r.phone, template_name: template_name || null, body,
          status: ok ? 'sent' : 'failed',
          wa_message_id: apiJson.messages?.[0]?.id || null,
          error: ok ? null : JSON.stringify(apiJson.error || apiJson).slice(0, 500),
        })

        if (ok) { sent++; results.push({ phone: r.phone, status: 'sent', wa_message_id: apiJson.messages[0].id }) }
        else    { failed++; results.push({ phone: r.phone, status: 'failed', error: apiJson.error?.message }) }
      } catch (e) {
        failed++
        results.push({ phone: r.phone, status: 'failed', error: (e as Error).message })
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, failed, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
