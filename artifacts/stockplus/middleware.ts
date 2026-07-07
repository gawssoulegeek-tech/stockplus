import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware simplifié :
 * - Protège les routes /dashboard, /saas, etc. en vérifiant la présence
 *   d'un cookie de session Supabase (sb-*).
 * - NE fait PAS d'appel réseau (pas de getUser()) → rapide, pas de boucle.
 * - NE redirige PAS les users connectés depuis /login vers /dashboard
 *   (cela causait des boucles quand le profil users était manquant).
 *   Le layout dashboard gère lui-même cette redirection côté client.
 */
export async function middleware(request: NextRequest) {
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

  // Vérifie la présence d'un cookie Supabase (sb-...)
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith('sb-'))

  // Si route protégée sans session → rediriger vers /login
  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // ⚠️ On NE redirige PAS /login → /dashboard côté serveur.
  // C'est le client (login.tsx) qui gère la navigation après login réussi.
  // Cela évite les boucles de redirection quand le profil est manquant.

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.webmanifest|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico)$).*)',
  ],
}
