import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Herkesin erişebileceği sayfalar (giriş yapılsa da yapılmasa da)
const ALWAYS_PUBLIC = ['/gizlilik', '/kullanim-kosullari', '/kvkk']

// Yalnızca giriş yapmamış kullanıcıların görmesi gereken sayfalar
const AUTH_PUBLIC = ['/', '/login', '/register', '/on-kayit']

// Yalnızca admin erişebilir
const ADMIN_ONLY = ['/settings', '/coaches', '/sports', '/reports', '/inventory']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Hukuki sayfalar — herkese açık
  if (ALWAYS_PUBLIC.some(r => pathname.startsWith(r))) {
    return supabaseResponse
  }

  // Giriş gerektirmeyen sayfalar
  if (AUTH_PUBLIC.includes(pathname)) {
    if (user) {
      // Giriş yapılmışsa dashboard'a yönlendir
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Giriş yapılmamışsa login'e yönlendir
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = user.user_metadata?.role as string

  // Sporcu/veli → yalnızca /portal
  if (role === 'athlete' || role === 'parent') {
    if (!pathname.startsWith('/portal')) {
      return NextResponse.redirect(new URL('/portal', request.url))
    }
  }

  // Antrenör → admin-only sayfalara erişemez
  if (role === 'coach') {
    const blocked = ADMIN_ONLY.some(r => pathname.startsWith(r))
    if (blocked) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
