import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Middleware Supabase avec @supabase/ssr
 *
 * - Rafraîchit la session côté serveur (jetons JWT expirés)
 * - Propage les cookies vers le navigateur
 * - Protège les routes /dashboard, /saas, etc.
 */
export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  // Si config manquante, on laisse passer
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

  // Si route protégée sans user → rediriger vers /login
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Si user connecté et sur /login ou /register → rediriger vers /dashboard
  // SAUF si /register a des paramètres (boutique=...) = création de compte pour un tiers
  if (user && (pathname === '/login' || pathname === '/register')) {
    const hasQueryParams = request.nextUrl.searchParams.toString().length > 0
    if (pathname === '/register' && hasQueryParams) {
      // Laisser passer : le superadmin crée un compte pour un prospect
      return response
    }
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.webmanifest|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico)$).*)',
  ],
}
