import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Search, User, LogOut, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEffect, useState, createContext, useContext } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocation } from "@/lib/compat/wouter"
import { getSupabaseClient } from "@/supabase/client"
import { getUserProfile, getBoutique } from "@/supabase/auth-service"
import { normalizeFeatures } from '@/lib/plan-features'
import { SuperadminNotifications } from "@/components/superadmin/notifications-bell"
import { ErrorBoundary } from "@/components/error-boundary"

const BoutiqueContext = createContext<any>(null)
export const useBoutique = () => useContext(BoutiqueContext)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [pathname, navigate] = useLocation()

  const [isMounted, setIsMounted] = useState(false)
  const [boutique, setBoutique] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isImpersonating, setIsImpersonating] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const supabase = getSupabaseClient()
    let cancelled = false

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (cancelled) return

        if (!session?.user) {
          setIsLoading(false)
          navigate("/login")
          return
        }

        const profile = await getUserProfile(supabase, session.user.id)

        if (cancelled) return

        // ⚠️ Si pas de profil dans la table users → rediriger vers pending-approval
        if (!profile) {
          console.warn('[Layout] Profil users manquant pour', session.user.email, '- redirection vers pending-approval')
          setIsLoading(false)
          navigate('/pending-approval')
          return
        }

        setUserProfile(profile)

        // Superadmin: pas besoin de charger une boutique ni onboarding
        if (profile.role === "superadmin") {
          setIsLoading(false)
          return
        }

        // Owner/manager sans boutique → page d'attente
        if (!profile.boutique_id) {
          setIsLoading(false)
          navigate('/pending-approval')
          return
        }

        const boutiqueData = await getBoutique(supabase, profile.boutique_id)

        if (cancelled) return

        if (boutiqueData) {
          // Vérifier l'expiration de l'essai
          if (boutiqueData.status === 'Essai' && boutiqueData.trial_ends_at) {
            const trialEnd = new Date(boutiqueData.trial_ends_at).getTime()
            if (Date.now() > trialEnd) {
              setIsLoading(false)
              navigate('/pending-approval')
              return
            }
          }

          // Statuts bloquants (la contrainte CHECK Supabase n'accepte que ces valeurs)
          const blockedStatuses = ['Suspendu', 'refuse']
          if (blockedStatuses.includes(boutiqueData.status)) {
            setIsLoading(false)
            navigate('/pending-approval')
            return
          }

          // ✅ Vérifier que l'onboarding est complété
          // (sauf si on est déjà sur /onboarding pour éviter la boucle)
          // ⚠️ Résilient : si la colonne onboarding_completed n'existe pas (migration 004 non exécutée),
          // on considère l'onboarding comme complété (pas de blocage)
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
          const onboardingDone = (profile as any)?.onboarding_completed ?? true  // fallback true si colonne inexistante
          if (!onboardingDone && currentPath !== '/onboarding') {
            setIsLoading(false)
            navigate('/onboarding')
            return
          }

          setBoutique({ ...boutiqueData, features: normalizeFeatures(boutiqueData.features || {}) })
        }
        setIsLoading(false)
      } catch (e: any) {
        console.error("Critical Profile Load Error:", e)
        setIsLoading(false)
      }
    }

    initAuth()

    // Écouter uniquement la déconnexion (pas TOKEN_REFRESHED qui cause les rechargements)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string) => {
        if (event === 'SIGNED_OUT') {
          setUserProfile(null)
          setBoutique(null)
          window.location.href = "/login"
        }
        // Ignorer TOKEN_REFRESHED et INITIAL_SESSION pour éviter les rechargements intempestifs
      }
    )

    return () => {
      cancelled = true
      subscription?.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // ⚠️ [] vide au lieu de [navigate] pour éviter les re-rendus

  const handleLogout = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#FCFCFC] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    )
  }

  if (!userProfile) return null

  return (
    <BoutiqueContext.Provider value={{ boutique, setBoutique, userProfile, setUserProfile, features: boutique?.features || {}, isImpersonating, setIsImpersonating }}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-gray-50/50">
          <header className="flex h-16 md:h-20 shrink-0 items-center gap-3 md:gap-4 transition-all border-b border-gray-100 px-4 md:px-6 bg-white/50 backdrop-blur-md sticky top-0 z-40">
            <div className="flex flex-1 items-center gap-3 md:gap-4 min-w-0">
              <SidebarTrigger className="h-9 w-9 md:h-10 md:w-10 rounded-xl hover:bg-orange-50 hover:text-primary transition-colors shrink-0" />
              <Separator orientation="vertical" className="h-6 bg-gray-200 hidden sm:block" />
              <div className="hidden md:flex relative w-full max-w-md">
                <Search className="absolute left-4 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Chercher..."
                  className="pl-11 h-11 bg-gray-100/50 border-none rounded-xl focus-visible:ring-primary focus-visible:ring-1 transition-all font-medium"
                />
              </div>
              {/* Nom boutique visible sur mobile (compact) */}
              <div className="md:hidden flex-1 min-w-0">
                <span className="text-sm font-bold text-gray-900 truncate block">{boutique?.name || (userProfile.role === 'superadmin' ? 'Supervision SaaS' : 'Ma Boutique')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              <div className="hidden lg:flex flex-col items-end mr-2">
                <span className="text-sm font-bold text-gray-900">{boutique?.name || (userProfile.role === 'superadmin' ? 'Supervision SaaS' : 'Ma Boutique')}</span>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{userProfile?.role}</span>
              </div>

              {/* 🔔 Cloche notifications (superadmin uniquement) */}
              {userProfile?.role === 'superadmin' && <SuperadminNotifications />}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 md:h-11 md:w-11 rounded-xl hover:bg-orange-50 hover:text-primary transition-colors border border-gray-100 bg-white shadow-sm">
                    <User className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-[2rem] p-3 border-gray-100 shadow-3xl">
                  <div className="px-4 py-4 border-b border-gray-50 mb-2">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Session</div>
                    <div className="font-bold text-gray-900 text-lg">{userProfile?.name}</div>
                  </div>
                  <DropdownMenuItem onClick={handleLogout} className="rounded-xl py-4 px-4 font-bold text-red-500 focus:bg-red-50 focus:text-red-600 cursor-pointer">
                    <LogOut className="mr-3 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          {isImpersonating && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 md:px-6 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-xs md:text-sm font-medium text-amber-800 truncate">
                  Mode impersonation — <strong>{boutique?.name}</strong>
                </span>
              </div>
              <Button variant="ghost" size="sm" className="text-amber-700 hover:bg-amber-100 rounded-lg font-bold" onClick={() => { setIsImpersonating(false); setBoutique(null); navigate("/saas") }}>
                Quitter le mode
              </Button>
            </div>
          )}
          <main className="flex-1 p-4 md:p-6 lg:p-12 overflow-auto">
            <ErrorBoundary key={pathname}>
              {children}
            </ErrorBoundary>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </BoutiqueContext.Provider>
  )
}