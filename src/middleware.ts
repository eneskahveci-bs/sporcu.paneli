import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/login', '/register', '/on-kayit']
const PORTAL_ROUTES = ['/portal']
const ADMIN_ROUTES = ['/settings', '/coaches', '/classes', '/sports', '/sms', '/pre-registrations']

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

  // Public routes - herkes erişebilir
  if (PUBLIC_ROUTES.includes(pathname)) {
    if (user) {
      // Giriş yapmışsa dashboard'a yönlendir
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
    return supabaseResponse
  }

  // Giriş yapmamışsa login'e yönlendir
  if (!user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Kullanıcı rolünü metadata'dan al
  const role = user.user_metadata?.role as string

  // Sporcu/veli sadece portal'a erişebilir
  if (role === 'athlete' || role === 'parent') {
    if (!pathname.startsWith('/portal')) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/portal'
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Antrenör admin sayfalarına erişemez
  if (role === 'coach') {
    const isAdminRoute = ADMIN_ROUTES.some(r => pathname.startsWith(r))
    if (isAdminRoute) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
