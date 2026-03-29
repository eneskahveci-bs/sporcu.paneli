import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { checkEnvVars } from '@/lib/api-utils'
import { checkRateLimit } from '@/lib/rate-limiter'
import { writeAuditLog, getClientIp } from '@/lib/audit'
import { validatePassword } from '@/lib/password-validator'

export async function POST(request: Request) {
  const env = checkEnvVars(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
  if (!env.ok) return env.response

  // Rate limiting: IP başına 10 dakikada 3 kayıt denemesi
  const ip = getClientIp(request)
  const rl = await checkRateLimit({ key: `ip:${ip}:register`, limit: 3, windowSeconds: 600 })
  if (!rl.allowed) return rl.response

  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 })
  }

  const { orgName, firstName, lastName, email, phone, password } = body

  // Zorunlu alan kontrolü
  if (!orgName?.trim() || !firstName?.trim() || !lastName?.trim() || !email || !password) {
    return NextResponse.json({ error: 'Tüm zorunlu alanlar doldurulmalıdır' }, { status: 400 })
  }

  // Alan uzunluğu
  if (orgName.length > 200 || firstName.length > 100 || lastName.length > 100 || email.length > 254) {
    return NextResponse.json({ error: 'Alan değerleri çok uzun' }, { status: 400 })
  }

  // E-posta format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Geçersiz e-posta adresi' }, { status: 400 })
  }

  // Güçlü şifre kontrolü
  const pwCheck = validatePassword(password, { email })
  if (!pwCheck.valid) {
    return NextResponse.json({ error: pwCheck.errors[0] }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Slug oluştur — benzersiz olmasını garantile
  let baseSlug = orgName.toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 60)

  if (!baseSlug) baseSlug = 'akademi'

  let slug = baseSlug
  let attempt = 0
  while (attempt < 10) {
    const { data: existing } = await admin.from('organizations').select('id').eq('slug', slug).single()
    if (!existing) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  // 1. Organizasyon oluştur (service role — anon key ile yapılmıyordu)
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({ name: orgName.trim(), slug, email, phone: phone?.trim() || null })
    .select()
    .single()

  if (orgErr) {
    if (orgErr.code === '23505') return NextResponse.json({ error: 'Bu akademi adı zaten kullanılıyor' }, { status: 409 })
    return NextResponse.json({ error: 'Organizasyon oluşturulamadı' }, { status: 500 })
  }

  // 2. Auth kullanıcı oluştur (service role ile — e-posta doğrulama Supabase ayarına göre)
  const nameParts = `${firstName.trim()} ${lastName.trim()}`.split(' ')
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,          // Supabase'in kendi e-posta doğrulama akışını kullan
    user_metadata: {
      role: 'admin',
      organization_id: org.id,
      organization_name: org.name,
      full_name: `${firstName.trim()} ${lastName.trim()}`,
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(' ') || '',
    },
  })

  if (authErr) {
    // Geri al: org'u sil
    await admin.from('organizations').delete().eq('id', org.id)
    if (authErr.message.includes('already registered') || authErr.status === 422) {
      return NextResponse.json({ error: 'Bu e-posta adresi zaten kayıtlı' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Hesap oluşturulamadı' }, { status: 500 })
  }

  // 3. Trial abonelik oluştur
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 14)

  const { error: subErr } = await admin.from('subscriptions').insert({
    organization_id: org.id,
    plan: 'trial',
    status: 'trial',
    price_monthly: 0,
    max_athletes: 30,
    max_branches: 1,
    trial_ends_at: trialEnd.toISOString(),
    current_period_end: trialEnd.toISOString(),
  })

  if (subErr) {
    // Kritik değil, devam et ama logla
    console.error('[register-org] subscription insert error:', subErr.message)
  }

  // 4. Audit log
  await writeAuditLog({
    organization_id: org.id,
    user_id: authData.user.id,
    user_email: email,
    action: 'organization.create',
    resource_type: 'organization',
    resource_id: org.id,
    resource_name: org.name,
    ip_address: ip,
    metadata: { plan: 'trial' },
  })

  return NextResponse.json({ success: true, org_id: org.id })
}
