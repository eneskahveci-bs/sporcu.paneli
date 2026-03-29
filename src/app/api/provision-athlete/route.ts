import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

// Sporcu için auth kullanıcısı oluşturur (admin yetkisi gerekir)
// Email: {tc}@sporcu.tc | İlk Şifre: TC'nin kendisi (11 hane) | must_change_password: true
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
  const password = tc
  const fullName = athlete ? `${athlete.first_name} ${athlete.last_name}` : ''
  const metadata = { role: 'athlete', organization_id, athlete_id, full_name: fullName, must_change_password: true }

  // Önce oluşturmayı dene; zaten varsa güncelle
  let userId: string
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })

  if (createErr) {
    // Kullanıcı zaten mevcut — listUsers ile bul ve güncelle
    if (createErr.message?.toLowerCase().includes('already') || createErr.status === 422) {
      const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })
      const existing = users.find(u => u.email === email)
      if (!existing) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 500 })
      const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, { password, user_metadata: metadata })
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
      userId = existing.id
    } else {
      return NextResponse.json({ error: createErr.message }, { status: 500 })
    }
  } else {
    userId = newUser.user.id
  }

  await admin.from('athletes').update({ auth_user_id: userId }).eq('id', athlete_id)

  // Hoş geldin e-postası
  const { data: org } = await admin.from('organizations').select('name').eq('id', organization_id).single()
  const toEmail = athlete?.email || athlete?.parent_email
  if (toEmail) {
    await sendWelcomeEmail({
      toEmail,
      fullName,
      loginEmail: email,
      loginPassword: '(TC kimlik numaranız)',
      orgName: org?.name || 'Spor Akademisi',
      role: 'athlete',
    })
  }

  return NextResponse.json({ success: true, user_id: userId, email, note: 'İlk şifre TC numarasıdır. Kullanıcı ilk girişte şifresini belirleyecek.' })
}
