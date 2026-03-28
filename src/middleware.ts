import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Herkesin erişebileceği sayfalar
const ALWAYS_PUBLIC = ['/gizlilik', '/kullanim-kosullari', '/kvkk']

// Yalnızca giriş yapmamış kullanıcıların görmesi gereken sayfalar
const AUTH_PUBLIC = ['/', '/login', '/register', '/on-kayit']

// Yalnızca admin erişebilir
const ADMIN_ONLY = ['/settings', '/coaches', '/sports', '/reports', '/inventory', '/branches']

export async function middleware(request: NextRequest) {
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

  // Hukuki sayfalar — herkese açık
  if (ALWAYS_PUBLIC.some(r => pathname.startsWith(r))) return supabaseResponse

  // Giriş gerektirmeyen sayfalar
  if (AUTH_PUBLIC.includes(pathname)) {
    if (user) {
      // Giriş yapılmışsa role'e göre yönlendir
      const role = user.user_metadata?.role
      if (role === 'athlete' || role === 'parent') return NextResponse.redirect(new URL('/portal', request.url))
      if (role === 'coach') return NextResponse.redirect(new URL('/antrenor', request.url))
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Giriş yapılmamışsa ana sayfaya yönlendir (login modal otomatik açılır)
  if (!user) {
    return NextResponse.redirect(new URL('/?modal=login', request.url))
  }

  const role = user.user_metadata?.role as string | undefined

  // ── Sporcu / Veli → yalnızca /portal ──────────────────────────────────────
  if (role === 'athlete' || role === 'parent') {
    if (!pathname.startsWith('/portal')) {
      return NextResponse.redirect(new URL('/portal', request.url))
    }
    return supabaseResponse
  }

  // ── Antrenör → yalnızca /antrenor ─────────────────────────────────────────
  if (role === 'coach') {
    if (!pathname.startsWith('/antrenor')) {
      return NextResponse.redirect(new URL('/antrenor', request.url))
    }
    return supabaseResponse
  }

  // ── Admin → dashboard (portal ve antrenor erişimi yok) ─────────────────────
  if (pathname.startsWith('/portal') || pathname.startsWith('/antrenor')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Admin-only sayfalar için kontrol
  if (ADMIN_ONLY.some(r => pathname.startsWith(r)) && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
