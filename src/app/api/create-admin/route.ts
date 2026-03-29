import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkEnvVars } from '@/lib/api-utils'

// Admin kullanıcısı oluşturur — e-posta onayı gerekmez, anında giriş yapılabilir
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  if (user.user_metadata?.role !== 'admin') return NextResponse.json({ error: 'Yalnızca admin erişebilir' }, { status: 403 })

  const { name, email, password } = await request.json()
  if (!email || !password) return NextResponse.json({ error: 'E-posta ve şifre zorunludur' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'Şifre en az 8 karakter olmalıdır' }, { status: 400 })

  const orgId = user.user_metadata?.organization_id
  const orgName = user.user_metadata?.organization_name || ''
  const nameParts = (name || '').trim().split(' ')

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: newUser, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,   // onaysız, direkt aktif
    user_metadata: {
      role: 'admin',
      organization_id: orgId,
      organization_name: orgName,
      full_name: name || email,
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
    },
  })

  if (error) {
    const msg = error.message.includes('already registered')
      ? 'Bu e-posta adresi zaten kayıtlı'
      : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // users tablosuna da ekle (varsa)
  try {
    await admin.from('users').upsert({
      id: newUser.user.id,
      organization_id: orgId,
      email,
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      role: 'admin',
      is_active: true,
    }, { onConflict: 'id' })
  } catch { /* tablo yoksa ignore */ }

  return NextResponse.json({ success: true, user_id: newUser.user.id })
}
