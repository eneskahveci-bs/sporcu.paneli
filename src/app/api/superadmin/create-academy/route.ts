import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PLAN_CONFIG } from '@/types'

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const { org_name, city, email, phone, plan, price_monthly, admin_email, admin_password, admin_name } = await request.json()
  if (!org_name || !admin_email || !admin_password) {
    return NextResponse.json({ error: 'org_name, admin_email ve admin_password zorunludur' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const slug = org_name.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')

  // 1. Org oluştur
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({ name: org_name, slug, email: email || null, phone: phone || null, city: city || null })
    .select()
    .single()
  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 })

  // 2. Abonelik oluştur
  const selectedPlan = (plan || 'trial') as keyof typeof PLAN_CONFIG
  const planCfg = PLAN_CONFIG[selectedPlan]
  const trialEnd = new Date(); trialEnd.setDate(trialEnd.getDate() + 14)
  const periodEnd = selectedPlan === 'trial' ? trialEnd : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)

  await admin.from('subscriptions').insert({
    organization_id:     org.id,
    plan:                selectedPlan,
    status:              selectedPlan === 'trial' ? 'trial' : 'active',
    price_monthly:       price_monthly ?? planCfg.price,
    max_athletes:        planCfg.max_athletes,
    max_branches:        planCfg.max_branches,
    trial_ends_at:       selectedPlan === 'trial' ? trialEnd.toISOString() : null,
    current_period_end:  periodEnd.toISOString(),
  })

  // 3. Admin kullanıcı oluştur
  const nameParts = (admin_name || '').split(' ')
  const { data: newUser, error: userErr } = await admin.auth.admin.createUser({
    email: admin_email,
    password: admin_password,
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      organization_id: org.id,
      organization_name: org_name,
      full_name: admin_name || admin_email,
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
    },
  })
  if (userErr) {
    await admin.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: userErr.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    organization: org,
    user_id: newUser.user.id,
    credentials: { email: admin_email, password: admin_password },
  })
}
