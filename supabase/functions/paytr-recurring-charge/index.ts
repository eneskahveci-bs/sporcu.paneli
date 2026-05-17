// PayTR otomatik aidat çekimi — günlük cron ile çalıştırılır.
// Supabase Scheduled Functions (cron): "0 3 * * *" (her gün UTC 03:00)
// İlk yapılandırma için: supabase functions deploy paytr-recurring-charge --no-verify-jwt
// Sonra Dashboard → Edge Functions → "Schedule" sekmesinden cron eklenir.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_RETRY = 3

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const MERCHANT_ID = Deno.env.get('PAYTR_MERCHANT_ID') || ''
  const MERCHANT_KEY = Deno.env.get('PAYTR_MERCHANT_KEY') || ''
  const MERCHANT_SALT = Deno.env.get('PAYTR_MERCHANT_SALT') || ''

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const nowIso = new Date().toISOString()

  // İşlenmesi gereken kayıtlar
  const { data: due, error } = await admin
    .from('recurring_payments')
    .select('id, organization_id, athlete_id, amount, currency, paytr_card_token, retry_count, day_of_month')
    .eq('status', 'active')
    .lte('next_charge_at', nowIso)
    .limit(200)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!MERCHANT_ID || !MERCHANT_KEY || !MERCHANT_SALT) {
    return new Response(JSON.stringify({ error: 'PayTR not configured', would_process: due?.length || 0 }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let success = 0, failed = 0

  for (const r of due || []) {
    try {
      // PayTR token-with-saved-card: gerçek prod entegrasyonu PayTR Direct API endpoint'i:
      // https://www.paytr.com/odeme/api/post-auth (kartla saklanan token ile çekim)
      // Bu skeleton, varsa kart token'ı ile karşı tarafa istek atar.
      if (!r.paytr_card_token) {
        await markFailed(admin, r.id, 'no_card_token', r.retry_count, r.day_of_month)
        failed++
        continue
      }

      // === PayTR API çağrısı buraya gelecek (prod-ready entegrasyon) ===
      // Şu an placeholder: başarılı varsay
      const chargeOk = false // gerçek API yanıtı

      if (chargeOk) {
        // payments tablosuna ödeme kaydı
        await admin.from('payments').insert({
          organization_id: r.organization_id,
          athlete_id: r.athlete_id,
          amount: r.amount,
          type: 'income',
          status: 'completed',
          method: 'paytr',
          source: 'plan',
          paid_date: new Date().toISOString().slice(0, 10),
          recurring_id: r.id,
          description: 'Otomatik aidat',
        })
        const next = nextMonthSameDay(r.day_of_month)
        await admin.from('recurring_payments').update({
          last_charged_at: nowIso,
          next_charge_at: next.toISOString(),
          retry_count: 0,
          updated_at: nowIso,
        }).eq('id', r.id)
        success++
      } else {
        await markFailed(admin, r.id, 'charge_failed', r.retry_count, r.day_of_month)
        failed++
      }
    } catch (e) {
      await markFailed(admin, r.id, (e as Error).message, r.retry_count, r.day_of_month)
      failed++
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: due?.length || 0, success, failed }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

async function markFailed(admin: ReturnType<typeof createClient>, id: string, error: string, retryCount: number, dayOfMonth: number) {
  const nextRetry = new Date()
  if (retryCount + 1 >= MAX_RETRY) {
    // Yeni dönem başına geç
    const n = nextMonthSameDay(dayOfMonth)
    await admin.from('recurring_payments').update({
      next_charge_at: n.toISOString(),
      retry_count: 0,
    }).eq('id', id)
  } else {
    nextRetry.setDate(nextRetry.getDate() + 1)
    await admin.from('recurring_payments').update({
      next_charge_at: nextRetry.toISOString(),
      retry_count: retryCount + 1,
    }).eq('id', id)
  }
  // TODO: bildirim gönder (push/email)
  console.error(`recurring_payments ${id} failed:`, error)
}

function nextMonthSameDay(dayOfMonth: number): Date {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(dayOfMonth, lastDayOfMonth))
  d.setHours(3, 0, 0, 0)
  return d
}
