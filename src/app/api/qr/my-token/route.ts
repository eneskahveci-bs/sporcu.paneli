import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: athlete } = await supabase
    .from('athletes')
    .select('id, qr_token, first_name, last_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!athlete) return NextResponse.json({ error: 'no_athlete' }, { status: 404 })

  let token = athlete.qr_token
  if (!token) {
    token = randomBytes(24).toString('hex')
    await supabase.from('athletes').update({ qr_token: token }).eq('id', athlete.id)
  }

  return NextResponse.json({
    token,
    name: `${athlete.first_name} ${athlete.last_name}`,
  })
}

// Token rotate (güvenlik için sporcu istediğinde yenileyebilir)
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: athlete } = await supabase
    .from('athletes').select('id').eq('auth_user_id', user.id).maybeSingle()
  if (!athlete) return NextResponse.json({ error: 'no_athlete' }, { status: 404 })

  const newToken = randomBytes(24).toString('hex')
  await supabase.from('athletes').update({ qr_token: newToken }).eq('id', athlete.id)
  return NextResponse.json({ token: newToken })
}
