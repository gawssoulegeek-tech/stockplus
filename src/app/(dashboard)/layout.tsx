
"use client"

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
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/supabase/client"
import { getUserProfile, getBoutique } from "@/supabase/auth-service"

const BoutiqueContext = createContext<any>(null)
export const useBoutique = () => useContext(BoutiqueContext)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  const [isMounted, setIsMounted] = useState(false)
  const [boutique, setBoutique] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isImpersonating, setIsImpersonating] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const supabase = getSupabaseClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: any) => {
        if (!session?.user) {
          setIsLoading(false)
          router.push("/login")
          return
        }

        try {
          const profile = await getUserProfile(supabase, session.user.id)

          if (!profile) {
            const newProfile = {
              uid: session.user.id,
              email: session.user.email,
              name: session.user.email?.split('@')[0] || "Utilisateur",
              role: session.user.email === "root@senestock.ai" ? "superadmin" : "owner",
              boutique_id: null,
            }
            setUserProfile(newProfile)
            setIsLoading(false)
            return
          }

          setUserProfile(profile)

          if (profile.role === "superadmin" || !profile.boutique_id) {
            setIsLoading(false)
            return
          }

          const boutiqueData = await getBoutique(supabase, profile.boutique_id)
          if (boutiqueData) {
            if (boutiqueData.status === 'en_attente') {
              router.push('/pending-approval')
              return
            }
            setBoutique(boutiqueData)
          }
          setIsLoading(false)
        } catch (e: any) {
          console.error("Critical Profile Load Error:", e)
          setIsLoading(false)
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [router])

  const handleLogout = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push("/login")
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
          <header className="flex h-20 shrink-0 items-center gap-4 transition-all border-b border-gray-100 px-6 bg-white/50 backdrop-blur-md sticky top-0 z-40">
            <div className="flex flex-1 items-center gap-4">
              <SidebarTrigger className="h-10 w-10 rounded-xl hover:bg-orange-50 hover:text-primary transition-colors" />
              <Separator orientation="vertical" className="h-6 bg-gray-200" />
              <div className="hidden md:flex relative w-full max-w-md">
                <Search className="absolute left-4 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Chercher..."
                  className="pl-11 h-11 bg-gray-100/50 border-none rounded-xl focus-visible:ring-primary focus-visible:ring-1 transition-all font-medium"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-sm font-bold text-gray-900">{boutique?.name || (userProfile.role === 'superadmin' ? 'Supervision SaaS' : 'Ma Boutique')}</span>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{userProfile?.role}</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl hover:bg-orange-50 hover:text-primary transition-colors border border-gray-100 bg-white shadow-sm">
                    <User className="h-5 w-5" />
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
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  Mode impersonation actif — Vous gérez <strong>{boutique?.name}</strong>
                </span>
              </div>
              <Button variant="ghost" size="sm" className="text-amber-700 hover:bg-amber-100 rounded-lg font-bold" onClick={() => { setIsImpersonating(false); setBoutique(null); router.push("/saas") }}>
                Quitter le mode
              </Button>
            </div>
          )}
          <main className="flex-1 p-6 md:p-12 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </BoutiqueContext.Provider>
  )
}
