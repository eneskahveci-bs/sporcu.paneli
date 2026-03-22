import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { encodeBase64 } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const MERCHANT_KEY = Deno.env.get('PAYTR_MERCHANT_KEY') || ''
  const MERCHANT_SALT = Deno.env.get('PAYTR_MERCHANT_SALT') || ''

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    const formData = await req.formData()
    const merchant_oid = formData.get('merchant_oid') as string
    const status = formData.get('status') as string
    const total_amount = formData.get('total_amount') as string
    const hash = formData.get('hash') as string

    // Hash doğrulama
    const hashStr = `${merchant_oid}${MERCHANT_SALT}${status}${total_amount}`
    const hashBytes = new TextEncoder().encode(hashStr + MERCHANT_KEY)
    const hashBuffer = await crypto.subtle.digest('SHA-256', hashBytes)
    const expectedHash = encodeBase64(hashBuffer)

    if (hash !== expectedHash) {
      return new Response('PAYTR_HASH_MISMATCH', { status: 400 })
    }

    // Payment kaydını güncelle
    if (status === 'success') {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          paid_date: new Date().toISOString().split('T')[0],
          payment_method: 'online',
        })
        .eq('paytr_merchant_oid', merchant_oid)

      if (error) {
        console.error('Payment update error:', error)
        return new Response('DB_ERROR', { status: 500 })
      }
    } else {
      await supabase
        .from('payments')
        .update({ status: 'pending' })
        .eq('paytr_merchant_oid', merchant_oid)
    }

    return new Response('OK')
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('ERROR', { status: 500 })
  }
})
