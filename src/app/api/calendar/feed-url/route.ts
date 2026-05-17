import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: athlete } = await supabase
    .from('athletes').select('id').eq('auth_user_id', user.id).maybeSingle()

  if (!athlete) return NextResponse.json({ error: 'no_athlete' }, { status: 404 })

  const secret = process.env.CALENDAR_HMAC_SECRET
  if (!secret) return NextResponse.json({ error: 'not_configured' }, { status: 503 })

  const sig = createHmac('sha256', secret).update(athlete.id).digest('hex')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const feedUrl = `${supabaseUrl}/functions/v1/calendar-feed?athlete_id=${athlete.id}&sig=${sig}`

  return NextResponse.json({ feedUrl })
}
