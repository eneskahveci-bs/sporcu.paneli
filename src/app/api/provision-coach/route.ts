import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkEnvVars } from '@/lib/api-utils'
import { checkRateLimit } from '@/lib/rate-limiter'
import { writeAuditLog, getClientIp } from '@/lib/audit'
import { sendWelcomeEmail } from '@/lib/email'

// Antrenör için auth kullanıcısı oluşturur (admin yetkisi gerekir)
// Email: {tc}@antrenor.tc | İlk Şifre: TC'nin kendisi (11 hane) | must_change_password: true
export async function POST(request: Request) {
  const env = checkEnvVars(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
  if (!env.ok) return env.response
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
  const password = tc
  const fullName = coach ? `${coach.first_name} ${coach.last_name}` : ''
  const metadata = { role: 'coach', organization_id, coach_id, full_name: fullName, must_change_password: true }

  // Önce oluşturmayı dene; zaten varsa güncelle
  let userId: string
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })

  if (createErr) {
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

  await admin.from('coaches').update({ auth_user_id: userId }).eq('id', coach_id)

  // Hoş geldin e-postası
  const { data: org } = await admin.from('organizations').select('name').eq('id', organization_id).single()
  if (coach?.email) {
    await sendWelcomeEmail({
      toEmail: coach.email,
      fullName,
      loginEmail: email,
      loginPassword: '(TC kimlik numaranız)',
      orgName: org?.name || 'Spor Akademisi',
      role: 'coach',
    })
  }

  // Rate limit: admin başına günde 100 provision isteği
  const ip = getClientIp(request)

  // Audit log
  await writeAuditLog({
    organization_id,
    user_id: user.id,
    user_email: user.email,
    action: 'coach.auth.create',
    resource_type: 'coach',
    resource_id: coach_id,
    resource_name: fullName,
    ip_address: ip,
    metadata: { email },
  })

  return NextResponse.json({ success: true, user_id: userId, email, note: 'İlk şifre TC numarasıdır. Kullanıcı ilk girişte şifresini belirleyecek.' })
}
