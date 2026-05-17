// Sporcu antrenman programını imzalı URL ile iCalendar (RFC 5545) feed olarak sunar.
// URL: GET /functions/v1/calendar-feed?athlete_id=<uuid>&sig=<hex>
// Secret: CALENDAR_HMAC_SECRET — imzayı doğrulamak için kullanılır.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DAY_MAP = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}00Z`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SECRET = Deno.env.get('CALENDAR_HMAC_SECRET') || ''
  if (!SECRET) {
    return new Response('Calendar secret not configured', { status: 500, headers: corsHeaders })
  }

  const url = new URL(req.url)
  const athleteId = url.searchParams.get('athlete_id')
  const sig = url.searchParams.get('sig')
  if (!athleteId || !sig) {
    return new Response('Missing params', { status: 400, headers: corsHeaders })
  }

  const expected = await hmacHex(SECRET, athleteId)
  if (!timingSafeEqual(expected, sig)) {
    return new Response('Invalid signature', { status: 403, headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const { data: athlete } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, class_id, organization_id, status')
    .eq('id', athleteId)
    .single()

  if (!athlete || athlete.status !== 'active' || !athlete.class_id) {
    const empty = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Sporcu Paneli//TR','END:VCALENDAR'].join('\r\n')
    return new Response(empty, { headers: { ...corsHeaders, 'Content-Type': 'text/calendar; charset=utf-8' } })
  }

  const { data: cls } = await supabase
    .from('classes')
    .select('id, name, schedule_days, schedule_time, schedule_time_end, sport:sports(name), branch:branches(name, address)')
    .eq('id', athlete.class_id)
    .single()

  if (!cls || !cls.schedule_days?.length || !cls.schedule_time) {
    const empty = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Sporcu Paneli//TR','END:VCALENDAR'].join('\r\n')
    return new Response(empty, { headers: { ...corsHeaders, 'Content-Type': 'text/calendar; charset=utf-8' } })
  }

  const [hStart, mStart] = cls.schedule_time.split(':').map(Number)
  const [hEnd, mEnd] = (cls.schedule_time_end || cls.schedule_time).split(':').map(Number)
  const branchName = (cls.branch as { name?: string } | null)?.name || ''
  const branchAddress = (cls.branch as { address?: string } | null)?.address || ''
  const sportName = (cls.sport as { name?: string } | null)?.name || ''

  // İlk antrenmanı 4 hafta öncesinden başlat, RRULE ile 1 yıl boyunca tekrar
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 7 * 4)

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sporcu Paneli//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Antrenman - ${icsEscape(cls.name)}`,
    'X-WR-TIMEZONE:Europe/Istanbul',
  ]

  // İstanbul saatini UTC'ye çevir (UTC+3, DST yok)
  const tzOffsetMin = -180 // İstanbul UTC+3 → UTC = local - 3h

  for (const dayIdx of cls.schedule_days) {
    // dayIdx 0=Pazartesi … 6=Pazar (sistemde böyle varsayılmış)
    const eventDate = new Date(monday)
    eventDate.setDate(monday.getDate() + dayIdx)
    const dtStart = new Date(eventDate)
    dtStart.setHours(hStart, mStart, 0, 0)
    dtStart.setMinutes(dtStart.getMinutes() + tzOffsetMin)
    const dtEnd = new Date(eventDate)
    dtEnd.setHours(hEnd, mEnd, 0, 0)
    dtEnd.setMinutes(dtEnd.getMinutes() + tzOffsetMin)

    const uid = `${athlete.id}-${cls.id}-${dayIdx}@sporcupaneli`
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${fmtDate(new Date())}`,
      `DTSTART:${fmtDate(dtStart)}`,
      `DTEND:${fmtDate(dtEnd)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${DAY_MAP[dayIdx]};COUNT=52`,
      `SUMMARY:${icsEscape(`${sportName ? sportName + ' - ' : ''}${cls.name}`)}`,
      `DESCRIPTION:${icsEscape(`${athlete.first_name} ${athlete.last_name} - Antrenman`)}`,
      branchAddress ? `LOCATION:${icsEscape(branchName + ' ' + branchAddress)}` : `LOCATION:${icsEscape(branchName)}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')

  return new Response(lines.join('\r\n'), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="antrenman-${athlete.id.slice(0, 8)}.ics"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
})
