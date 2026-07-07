import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const protectedPrefixes = ['/dashboard','/pos','/inventory','/sales','/saas','/reports','/users','/quotations','/credit','/settings','/ai','/setup-status']
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))

  const hasSession = request.cookies.has('sb-access-token') || request.cookies.has('supabase-auth-token')

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (hasSession && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.webmanifest|api|.*\.(?:svg|png|jpg|jpeg|gif|webp|json|ico)$).*)'],
}
