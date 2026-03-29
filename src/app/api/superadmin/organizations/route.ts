import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: orgs, error } = await admin
    .from('organizations')
    .select('id, name, slug, email, phone, city, logo, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: subs } = await admin
    .from('subscriptions')
    .select('*')

  const { data: athleteCounts } = await admin
    .from('athletes')
    .select('organization_id')

  const { data: branchCounts } = await admin
    .from('branches')
    .select('organization_id')

  const subMap = Object.fromEntries((subs || []).map(s => [s.organization_id, s]))
  const athleteMap: Record<string, number> = {}
  const branchMap: Record<string, number> = {}
  ;(athleteCounts || []).forEach(a => { athleteMap[a.organization_id] = (athleteMap[a.organization_id] || 0) + 1 })
  ;(branchCounts  || []).forEach(b => { branchMap[b.organization_id]  = (branchMap[b.organization_id]  || 0) + 1 })

  const result = (orgs || []).map(org => ({
    ...org,
    subscription: subMap[org.id] || null,
    athlete_count: athleteMap[org.id] || 0,
    branch_count:  branchMap[org.id]  || 0,
  }))

  return NextResponse.json({ organizations: result })
}
