import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Bu fonksiyon: sporcu/veli için auth.users kaydı oluşturur
// Admin tarafından çağrılır — service_role key kullanır
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const { athlete_id, tc_no, phone, role, organization_id } = await req.json()

    if (!tc_no || !phone) {
      return new Response(JSON.stringify({ error: 'tc_no and phone required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const email = `${tc_no}@sporcu.tc`
    const password = tc_no // İlk şifre TC kimlik numarası

    // Kullanıcı zaten var mı kontrol et
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const exists = existingUsers?.users.find(u => u.email === email)

    if (exists) {
      // Mevcut kullanıcıyı güncelle
      const { data, error } = await supabase.auth.admin.updateUserById(exists.id, {
        user_metadata: { role, organization_id, athlete_id, phone },
      })
      if (error) throw error
      return new Response(JSON.stringify({ user_id: data.user.id, created: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Yeni kullanıcı oluştur
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, organization_id, athlete_id, phone },
    })

    if (error) throw error

    return new Response(JSON.stringify({ user_id: data.user.id, created: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
