import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { encodeBase64 } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const MERCHANT_ID = Deno.env.get('PAYTR_MERCHANT_ID') || ''
  const MERCHANT_KEY = Deno.env.get('PAYTR_MERCHANT_KEY') || ''
  const MERCHANT_SALT = Deno.env.get('PAYTR_MERCHANT_SALT') || ''

  if (!MERCHANT_ID || !MERCHANT_KEY || !MERCHANT_SALT) {
    return new Response(JSON.stringify({ error: 'PayTR credentials not configured' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const {
      payment_id,
      athlete_name,
      amount,
      email,
      user_ip,
      currency = 'TL',
    } = body

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const merchant_oid = `SP-${payment_id}-${Date.now()}`
    const paymentAmount = Math.round(amount * 100).toString() // kuruş

    const userBasket = encodeBase64(JSON.stringify([[`Aidat - ${athlete_name}`, paymentAmount, 1]]))

    const hashStr = `${MERCHANT_ID}${user_ip}${merchant_oid}${email}${paymentAmount}${userBasket}0TL1DIRECT${MERCHANT_KEY}`
    const hashBytes = new TextEncoder().encode(hashStr + MERCHANT_SALT)
    const hashBuffer = await crypto.subtle.digest('SHA-256', hashBytes)
    const token = encodeBase64(hashBuffer)

    // merchant_oid'i payment kaydına yaz
    await supabase.from('payments').update({ paytr_merchant_oid: merchant_oid }).eq('id', payment_id)

    const formData = {
      merchant_id: MERCHANT_ID,
      user_ip,
      merchant_oid,
      email,
      payment_amount: paymentAmount,
      paytr_token: token,
      user_basket: userBasket,
      debug_on: '0',
      no_installment: '1',
      max_installment: '0',
      user_name: athlete_name,
      user_address: 'Turkey',
      user_phone: email,
      merchant_ok_url: `${Deno.env.get('APP_URL')}/portal/payment/success`,
      merchant_fail_url: `${Deno.env.get('APP_URL')}/portal/payment/fail`,
      timeout_limit: '30',
      currency,
      test_mode: Deno.env.get('PAYTR_TEST_MODE') || '0',
      lang: 'tr',
    }

    const paytrRes = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData),
    })

    const paytrData = await paytrRes.json()

    if (paytrData.status === 'success') {
      return new Response(JSON.stringify({ token: paytrData.token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: paytrData.reason || 'PayTR token error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
