import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

// Sporcu için auth kullanıcısı oluşturur (admin yetkisi gerekir)
// Email: {tc}@sporcu.tc | Şifre: TC'nin son 6 hanesi
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  if (user.user_metadata?.role !== 'admin') return NextResponse.json({ error: 'Yalnızca admin erişebilir' }, { status: 403 })

  const { athlete_id, tc } = await request.json()
  if (!athlete_id || !tc) return NextResponse.json({ error: 'athlete_id ve tc gerekli' }, { status: 400 })

  const organization_id = user.user_metadata?.organization_id

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: athlete } = await admin
    .from('athletes')
    .select('first_name, last_name, auth_user_id, email, parent_email')
    .eq('id', athlete_id)
    .single()

  if (athlete?.auth_user_id) {
    return NextResponse.json({ success: true, already_exists: true, user_id: athlete.auth_user_id })
  }

  const email = `${tc}@sporcu.tc`
  const password = tc.slice(-6)
  const fullName = athlete ? `${athlete.first_name} ${athlete.last_name}` : ''

  // Kullanıcı zaten var mı kontrol et
  const { data: existing } = await admin.auth.admin.getUserByEmail(email)

  let userId: string

  if (existing?.user) {
    const { error } = await admin.auth.admin.updateUserById(existing.user.id, {
      user_metadata: { role: 'athlete', organization_id, athlete_id, full_name: fullName },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    userId = existing.user.id
  } else {
    const { data: newUser, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'athlete', organization_id, athlete_id, full_name: fullName },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    userId = newUser.user.id
  }

  await admin.from('athletes').update({ auth_user_id: userId }).eq('id', athlete_id)

  // Organizasyon adını al ve hoş geldin e-postası gönder
  const { data: org } = await admin.from('organizations').select('name').eq('id', organization_id).single()
  const toEmail = athlete?.email || athlete?.parent_email
  if (toEmail) {
    await sendWelcomeEmail({
      toEmail,
      fullName,
      loginEmail: email,
      loginPassword: password,
      orgName: org?.name || 'Spor Akademisi',
      role: 'athlete',
    })
  }

  return NextResponse.json({ success: true, user_id: userId, email, password_hint: `TC son 6 hane: ${password}` })
}
