import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Middleware Supabase :
 * 1. Rafraîchit la session côté serveur (jetons JWT)
 * 2. Protège les routes /dashboard, /saas, /pos, etc.
 * 3. Redirige les utilisateurs non authentifiés vers /login
 */
export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  // Si config manquante, on laisse passer (l'app crashera avec un message clair)
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next()
  }

  const response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as any)
        })
      },
    },
  })

  // Rafraîchir la session (important pour les jetons expirés)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Routes protégées : tout ce qui commence par /dashboard, /pos, /inventory, /sales, /saas, /reports, /users, /quotations, /credit, /settings, /ai, /setup-status
  const protectedPrefixes = [
    '/dashboard',
    '/pos',
    '/inventory',
    '/sales',
    '/saas',
    '/reports',
    '/users',
    '/quotations',
    '/credit',
    '/settings',
    '/ai',
    '/setup-status',
  ]

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))

  // Routes publiques : connexion, inscription, landing, reset, accept-invite
  const publicRoutes = ['/', '/login', '/register', '/password-reset', '/onboarding', '/pending-approval', '/accept-invite']
  const isPublic = publicRoutes.includes(pathname)

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Si déjà connecté et sur /login → rediriger vers /dashboard
  if (user && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match tout sauf :
     * - _next/static, _next/image (assets Next.js)
     * - favicon.ico, robots.txt (fichiers publics)
     * - fichiers dans /public
     * - /api (les routes API gèrent leur propre auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.webmanifest|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico)$).*)',
  ],
}
