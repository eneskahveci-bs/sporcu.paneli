import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ALWAYS_PUBLIC = ['/gizlilik', '/kullanim-kosullari', '/kvkk', '/suspended']
const AUTH_PUBLIC   = ['/', '/login', '/register', '/on-kayit']
const ADMIN_ONLY    = ['/settings', '/coaches', '/sports', '/reports', '/inventory', '/branches']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Herkese açık sayfalar
  if (ALWAYS_PUBLIC.some(r => pathname.startsWith(r))) return supabaseResponse

  // Giriş gerektirmeyen sayfalar
  if (AUTH_PUBLIC.includes(pathname)) {
    if (user) {
      const role = user.user_metadata?.role
      if (role === 'superadmin')                return NextResponse.redirect(new URL('/superadmin', request.url))
      if (role === 'athlete' || role === 'parent') return NextResponse.redirect(new URL('/portal', request.url))
      if (role === 'coach')                     return NextResponse.redirect(new URL('/antrenor', request.url))
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Giriş zorunlu
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const role = user.user_metadata?.role as string | undefined

  // ── Süper Admin ────────────────────────────────────────────────────────────
  if (role === 'superadmin') {
    if (!pathname.startsWith('/superadmin')) {
      return NextResponse.redirect(new URL('/superadmin', request.url))
    }
    return supabaseResponse
  }

  // ── Sporcu / Veli ──────────────────────────────────────────────────────────
  if (role === 'athlete' || role === 'parent') {
    if (!pathname.startsWith('/portal')) return NextResponse.redirect(new URL('/portal', request.url))
    return supabaseResponse
  }

  // ── Antrenör ───────────────────────────────────────────────────────────────
  if (role === 'coach') {
    if (!pathname.startsWith('/antrenor')) return NextResponse.redirect(new URL('/antrenor', request.url))
    return supabaseResponse
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  if (pathname.startsWith('/portal') || pathname.startsWith('/antrenor') || pathname.startsWith('/superadmin')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Abonelik kontrolü (cookie cache — saatte bir yenilenir)
  const subCacheOk = request.cookies.get('_sub_ok')?.value
  if (!subCacheOk && role === 'admin') {
    const orgId = user.user_metadata?.organization_id
    if (orgId) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('organization_id', orgId)
        .single()

      if (sub?.status === 'suspended' || sub?.status === 'cancelled') {
        return NextResponse.redirect(new URL('/suspended', request.url))
      }
      // 1 saat cache
      supabaseResponse.cookies.set('_sub_ok', '1', { maxAge: 3600, path: '/' })
    }
  }

  // Admin-only sayfalar
  if (ADMIN_ONLY.some(r => pathname.startsWith(r)) && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico|txt|xml)$).*)',
  ],
}
