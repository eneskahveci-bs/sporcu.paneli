import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendOverdueEmail } from '@/lib/email'

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  if (user.user_metadata?.role !== 'admin') return NextResponse.json({ error: 'Yalnızca admin erişebilir' }, { status: 403 })

  const { payment_id } = await request.json()
  if (!payment_id) return NextResponse.json({ error: 'payment_id gerekli' }, { status: 400 })

  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: payment } = await admin
    .from('payments')
    .select('*, athletes(first_name, last_name, email, parent_email)')
    .eq('id', payment_id)
    .single()

  if (!payment) return NextResponse.json({ error: 'Ödeme bulunamadı' }, { status: 404 })

  const organization_id = user.user_metadata?.organization_id
  const { data: org } = await admin.from('organizations').select('name').eq('id', organization_id).single()

  const athlete = payment.athletes as { first_name: string; last_name: string; email?: string; parent_email?: string } | null
  const toEmail = athlete?.email || athlete?.parent_email
  if (!toEmail) return NextResponse.json({ error: 'Sporcu e-posta adresi yok' }, { status: 400 })

  await sendOverdueEmail({
    toEmail,
    athleteName: athlete ? `${athlete.first_name} ${athlete.last_name}` : payment.athlete_name || '',
    amount: payment.amount,
    dueDate: payment.due_date,
    orgName: org?.name || 'Spor Akademisi',
  })

  return NextResponse.json({ success: true })
}
