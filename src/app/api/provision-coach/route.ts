import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

// Antrenör için auth kullanıcısı oluşturur (admin yetkisi gerekir)
// Email: {tc}@antrenor.tc | Şifre: TC'nin son 6 hanesi
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  if (user.user_metadata?.role !== 'admin') return NextResponse.json({ error: 'Yalnızca admin erişebilir' }, { status: 403 })

  const { coach_id, tc } = await request.json()
  if (!coach_id || !tc) return NextResponse.json({ error: 'coach_id ve tc gerekli' }, { status: 400 })

  const organization_id = user.user_metadata?.organization_id

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: coach } = await admin
    .from('coaches')
    .select('first_name, last_name, auth_user_id, email')
    .eq('id', coach_id)
    .single()

  if (coach?.auth_user_id) {
    return NextResponse.json({ success: true, already_exists: true, user_id: coach.auth_user_id })
  }

  const email = `${tc}@antrenor.tc`
  const password = tc.slice(-6)
  const fullName = coach ? `${coach.first_name} ${coach.last_name}` : ''

  const { data: existing } = await admin.auth.admin.getUserByEmail(email)

  let userId: string

  if (existing?.user) {
    const { error } = await admin.auth.admin.updateUserById(existing.user.id, {
      user_metadata: { role: 'coach', organization_id, coach_id, full_name: fullName },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    userId = existing.user.id
  } else {
    const { data: newUser, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'coach', organization_id, coach_id, full_name: fullName },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    userId = newUser.user.id
  }

  await admin.from('coaches').update({ auth_user_id: userId }).eq('id', coach_id)

  // Hoş geldin e-postası gönder
  const { data: org } = await admin.from('organizations').select('name').eq('id', organization_id).single()
  if (coach?.email) {
    await sendWelcomeEmail({
      toEmail: coach.email,
      fullName,
      loginEmail: email,
      loginPassword: password,
      orgName: org?.name || 'Spor Akademisi',
      role: 'coach',
    })
  }

  return NextResponse.json({ success: true, user_id: userId, email, password_hint: `TC son 6 hane: ${password}` })
}
