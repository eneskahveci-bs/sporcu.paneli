// Web Push broadcast — admin "Bildirim Gönder" sayfasından çağrılır.
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:admin@example.com)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') || ''
  const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') || ''
  const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@sporcupaneli.app'

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    )

    const { data: { user } } = await supabase.auth.getUser(jwt)
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const orgId = user.user_metadata?.organization_id
    const role = user.user_metadata?.role
    if (!orgId || !['admin', 'superadmin'].includes(role)) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { title, message, target = 'all', target_ids = [], url = '/dashboard' } = body
    if (!title || !message) {
      return new Response(JSON.stringify({ error: 'missing_title_or_body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Service-role ile abonelikleri çek (RLS bypass — kontrolü kendimiz yaptık)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    let query = admin.from('push_subscriptions').select('id, endpoint, p256dh, auth, user_id').eq('organization_id', orgId)

    if (target === 'custom' && Array.isArray(target_ids) && target_ids.length) {
      query = query.in('user_id', target_ids)
    }
    const { data: subs, error: subErr } = await query
    if (subErr) {
      return new Response(JSON.stringify({ error: subErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload = JSON.stringify({ title, body: message, url })

    let sent = 0, failed = 0
    const toDelete: string[] = []

    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        sent++
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          toDelete.push(sub.id)
        }
        failed++
      }
    }

    if (toDelete.length) {
      await admin.from('push_subscriptions').delete().in('id', toDelete)
    }

    await admin.from('push_broadcasts').insert({
      organization_id: orgId,
      title, body: message, target,
      target_ids: Array.isArray(target_ids) ? target_ids : null,
      sent_count: sent, failed_count: failed,
      created_by: user.id,
    })

    return new Response(JSON.stringify({ ok: true, sent, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
