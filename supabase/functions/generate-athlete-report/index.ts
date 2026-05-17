// Sporcu için Claude API ile gelişim raporu üretir.
// Prompt caching ZORUNLU — system prompt'a cache_control eklenir.
// Secret: ANTHROPIC_API_KEY
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `Sen bir spor akademisinin uzman antrenörüsün. Sporcu verilerine bakıp Türkçe, profesyonel ama anlaşılır bir gelişim raporu hazırlıyorsun.

Rapor şu bölümlerden oluşmalı:
1. **Sportif Gelişim** — fitness test sonuçlarındaki trend
2. **Antrenmana Devamlılık** — yoklama analizi (% katılım, son hafta/ay trendleri)
3. **Davranış & Disiplin** — varsa antrenör notlarına atıf
4. **Öneriler** — somut, uygulanabilir 3-5 madde

Kurallar:
- Maksimum 400 kelime
- Markdown formatı kullan (başlıklar, listeler)
- Spesifik veri göster (örn "son 3 ayda %12 iyileşme")
- Olumsuz gözlemleri yapıcı tonda yaz
- Velinin de okuyabileceği saygılı bir dil tut`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
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
    if (!orgId || !['admin', 'coach', 'superadmin'].includes(role)) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { athlete_id, period_months = 3 } = await req.json()
    if (!athlete_id) return new Response(JSON.stringify({ error: 'athlete_id_required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const periodFrom = new Date()
    periodFrom.setMonth(periodFrom.getMonth() - period_months)

    // Sporcu verilerini topla
    const [{ data: athlete }, { data: attendance }, { data: fitness }, { data: org }] = await Promise.all([
      supabase.from('athletes').select('first_name, last_name, birth_date, sport:sports(name), class:classes(name), notes').eq('id', athlete_id).single(),
      supabase.from('attendance').select('date, status').eq('athlete_id', athlete_id).gte('date', periodFrom.toISOString().slice(0, 10)),
      supabase.from('fitness_tests').select('test_type, value, unit, recorded_at, notes').eq('athlete_id', athlete_id).gte('recorded_at', periodFrom.toISOString()).order('recorded_at'),
      supabase.from('organizations').select('name').eq('id', orgId).single(),
    ])

    if (!athlete) return new Response(JSON.stringify({ error: 'athlete_not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const total = attendance?.length || 0
    const present = attendance?.filter(a => a.status === 'present').length || 0
    const absent = attendance?.filter(a => a.status === 'absent').length || 0
    const pct = total ? Math.round((present / total) * 100) : 0
    const age = athlete.birth_date ? Math.floor((Date.now() - new Date(athlete.birth_date).getTime()) / (365.25 * 24 * 3600 * 1000)) : null
    const sportName = (athlete.sport as { name?: string } | null)?.name
    const className = (athlete.class as { name?: string } | null)?.name

    const userMessage = `## Sporcu Bilgileri
- İsim: ${athlete.first_name} ${athlete.last_name}
- Yaş: ${age ?? 'belirtilmemiş'}
- Branş: ${sportName ?? '-'}
- Sınıf: ${className ?? '-'}
${athlete.notes ? `- Antrenör notu: ${athlete.notes}` : ''}

## Devamlılık (son ${period_months} ay)
- Toplam kayıt: ${total}
- Geldi: ${present}, Gelmedi: ${absent}
- Katılım oranı: %${pct}

## Fitness Test Geçmişi
${fitness && fitness.length > 0 ? fitness.map(f => `- ${f.recorded_at.slice(0, 10)} ${f.test_type}: ${f.value} ${f.unit}${f.notes ? ' (' + f.notes + ')' : ''}`).join('\n') : 'Henüz test kaydı yok.'}

Bu veriler ışığında gelişim raporu hazırla.`

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        system: [
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: `Akademi: ${org?.name || 'Sporcu Paneli'}`, cache_control: { type: 'ephemeral' } },
        ],
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!apiRes.ok) {
      const err = await apiRes.text()
      return new Response(JSON.stringify({ error: 'anthropic_error', detail: err }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiJson = await apiRes.json()
    const content = apiJson.content?.[0]?.text || ''

    await supabase.from('athlete_ai_reports').insert({
      organization_id: orgId,
      athlete_id, period_from: periodFrom.toISOString().slice(0, 10),
      period_to: new Date().toISOString().slice(0, 10),
      content_md: content,
      model: 'claude-sonnet-4-6',
      tokens_input: apiJson.usage?.input_tokens || 0,
      tokens_output: apiJson.usage?.output_tokens || 0,
      generated_by: user.id,
    })

    return new Response(JSON.stringify({
      ok: true, content,
      usage: apiJson.usage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
