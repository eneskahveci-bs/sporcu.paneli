import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: abonelik oluştur veya güncelle
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const body = await request.json()
  const { organization_id, plan, status, price_monthly, billing_day, current_period_end, max_athletes, max_branches, notes } = body
  if (!organization_id) return NextResponse.json({ error: 'organization_id gerekli' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const payload = {
    organization_id,
    plan:              plan || 'trial',
    status:            status || 'trial',
    price_monthly:     price_monthly ?? 0,
    billing_day:       billing_day ?? 1,
    current_period_end: current_period_end || null,
    max_athletes:      max_athletes ?? 30,
    max_branches:      max_branches ?? 1,
    notes:             notes || null,
    updated_at:        new Date().toISOString(),
  }

  const { data, error } = await admin
    .from('subscriptions')
    .upsert(payload, { onConflict: 'organization_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, subscription: data })
}
