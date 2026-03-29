import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Admin, sporcu veya antrenörün şifresini TC numarasına sıfırlar ve must_change_password: true yapar
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  if (user.user_metadata?.role !== 'admin') return NextResponse.json({ error: 'Yalnızca admin erişebilir' }, { status: 403 })

  const { type, id } = await request.json()  // type: 'athlete' | 'coach', id: veritabanı kaydı id'si
  if (!type || !id) return NextResponse.json({ error: 'type ve id gerekli' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // TC ve auth_user_id'yi al
  const table = type === 'athlete' ? 'athletes' : 'coaches'
  const { data: record, error: fetchErr } = await admin
    .from(table)
    .select('tc, auth_user_id, first_name, last_name')
    .eq('id', id)
    .single()

  if (fetchErr || !record) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
  if (!record.auth_user_id) return NextResponse.json({ error: 'Bu kullanıcının henüz giriş hesabı yok' }, { status: 400 })
  if (!record.tc) return NextResponse.json({ error: 'TC kimlik numarası eksik' }, { status: 400 })

  // Şifreyi TC'ye sıfırla ve must_change_password = true yap
  const { error: updateErr } = await admin.auth.admin.updateUserById(record.auth_user_id, {
    password: record.tc,
    user_metadata: {
      must_change_password: true,
    },
  })

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    message: `${record.first_name} ${record.last_name} şifresi TC numarasına sıfırlandı. Bir sonraki girişte yeni şifre belirleyecek.`,
  })
}
