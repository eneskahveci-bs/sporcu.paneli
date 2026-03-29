import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Verify caller is authenticated admin
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = user.user_metadata?.role
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const organization_id = user.user_metadata?.organization_id
  if (!organization_id) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
  }

  const body = await request.json()
  const {
    pre_registration_id,
    first_name, last_name, tc,
    birth_date, gender, phone, email: athleteEmail,
    city, sport_id, notes,
  } = body

  if (!tc || tc.length !== 11) {
    return NextResponse.json({ error: 'TC Kimlik No (11 hane) gereklidir' }, { status: 400 })
  }
  if (!first_name || !last_name) {
    return NextResponse.json({ error: 'Ad ve soyad gereklidir' }, { status: 400 })
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Insert athlete record
  const { data: athlete, error: athleteError } = await adminSupabase
    .from('athletes')
    .insert({
      organization_id,
      first_name,
      last_name,
      tc,
      birth_date: birth_date || null,
      gender: gender || null,
      phone: phone || null,
      email: athleteEmail || null,
      city: city || null,
      sport_id: sport_id || null,
      notes: notes || null,
      status: 'active',
    })
    .select()
    .single()

  if (athleteError) {
    return NextResponse.json({ error: athleteError.message }, { status: 500 })
  }

  // 2. Create auth user (TC@sporcu.tc / last 6 digits)
  // ⚠️ GÜVENLİK UYARISI: Varsayılan şifre zayıftır (TC son 6 hane).
  // Kullanıcı ilk girişte şifre değiştirmeye zorlanmalıdır.
  const password = tc.slice(-6)
  const { error: authError } = await adminSupabase.auth.admin.createUser({
    email: `${tc}@sporcu.tc`,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'athlete',
      organization_id,
      athlete_id: athlete.id,
      full_name: `${first_name} ${last_name}`,
      requiresPasswordChange: true, // İlk girişte şifre değiştirme bayrağı
    },
  })

  if (authError && !authError.message.includes('already been registered')) {
    console.error('Auth user creation error:', authError.message)
    // Don't fail — athlete DB record was created, admin can set up login later
  }

  // 3. Update pre_registration status
  if (pre_registration_id) {
    await adminSupabase
      .from('pre_registrations')
      .update({ status: 'converted', converted_athlete_id: athlete.id })
      .eq('id', pre_registration_id)
  }

  return NextResponse.json({ success: true, athlete_id: athlete.id })
}
