
"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  Sparkles,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ChevronUp,
  ShieldCheck,
  Star,
  History,
  FileText,
  Globe,
  CreditCard,
  Activity
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar"
import { Link, useLocation } from "@/lib/compat/wouter"
import Lottie from "lottie-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useBoutique } from "@/views/dashboard/layout"

const AWA_AVATAR_URL = "/awa-avatar.json"

const navItems = [
  { title: "Accueil", icon: LayoutDashboard, url: "/dashboard", roles: ["owner", "manager"] },
  { title: "Ventes (Caisse)", icon: ShoppingCart, url: "/pos", roles: ["owner", "manager"] },
  { title: "IA Awa", icon: Sparkles, url: "/ai", roles: ["owner", "manager"], minPlan: "Pro" },
  { title: "Inventaire", icon: Package, url: "/inventory", roles: ["owner", "manager"], minPlan: "Basic" },
  { title: "Mouvements", icon: History, url: "/inventory/moves", roles: ["owner", "manager"], minPlan: "Basic" },
  { title: "Devis", icon: FileText, url: "/quotations", roles: ["owner", "manager"], minPlan: "Basic" },
  { title: "Historique Factures", icon: Receipt, url: "/sales", roles: ["owner", "manager"] },
  { title: "Analyses & Rapports", icon: BarChart3, url: "/reports", roles: ["owner", "manager"], minPlan: "Pro" },
  { title: "Import Chine", icon: Globe, url: "/inventory/china-import", roles: ["owner", "manager"], minPlan: "Pro" },
  { title: "Crédit Client", icon: CreditCard, url: "/credit", roles: ["owner", "manager"] },
  { title: "Équipe", icon: Users, url: "/users", roles: ["owner"], minPlan: "Pro" },
  { title: "Réglages Boutique", icon: Settings, url: "/settings", roles: ["owner"] },
  { title: "État Setup", icon: Activity, url: "/setup-status", roles: ["owner", "superadmin"] },
]

const DAILY_TRIAL_LIMIT = 5

export function AppSidebar() {
  const [pathname] = useLocation()
  const { boutique, userProfile } = useBoutique() || {}
  const [isMounted, setIsMounted] = React.useState(false)
  const [awaData, setAwaData] = React.useState<any>(null)

  const role = userProfile?.role || "manager"
  const plan = boutique?.plan || "Basic"
  const status = boutique?.status || "Actif"
  const userName = userProfile?.name || "Utilisateur"

  // Récupérer le contexte sidebar pour fermer sur mobile après navigation
  const { setOpenMobile, isMobile } = useSidebar()

  // Fermer la sidebar mobile quand le pathname change (après clic sur un lien)
  React.useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [pathname, isMobile, setOpenMobile])

  React.useEffect(() => {
    setIsMounted(true)
    fetch(AWA_AVATAR_URL)
      .then(res => res.ok && res.json())
      .then(data => data && setAwaData(data))
      .catch(err => console.warn("Lottie Sidebar Load Warn", err))
  }, [])

  const filteredItems = navItems.filter(item => {
    const roleMatch = item.roles.includes(role)
    if (!roleMatch) return false
    
    const effectivePlan = status === "Essai" ? "Pro" : plan
    if (item.minPlan === "Pro" && effectivePlan === "Basic") return false
    
    return true
  })

  const [, navigate] = useLocation()

  const handleLogout = () => {
    navigate("/login")
  }

  if (!isMounted) return null

  return (
    <Sidebar collapsible="icon" className="border-r border-gray-100 bg-white">
      <SidebarHeader className="px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl sena-gradient shadow-lg shadow-orange-500/20 shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
            <span className="font-headline font-bold text-xl tracking-tight text-gray-900 uppercase">StockPlus</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3">
        {role === 'superadmin' && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 font-black text-primary uppercase text-[8px] tracking-[0.2em] group-data-[collapsible=icon]:hidden mb-3">Administration SaaS</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className="mb-1">
                  <SidebarMenuButton asChild isActive={pathname === "/saas"} className={cn(
                    "rounded-xl h-10 transition-all px-3",
                    pathname === "/saas" ? "bg-primary text-white font-bold" : "text-gray-400 hover:bg-orange-50/50 hover:text-gray-900"
                  )}>
                    <Link href="/saas" className="flex items-center gap-3">
                      <ShieldCheck className={cn("h-5 w-5", pathname === "/saas" ? "text-white" : "text-primary")} />
                      <span className="text-sm">Supervision SaaS</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 font-black text-gray-400 uppercase text-[8px] tracking-[0.2em] group-data-[collapsible=icon]:hidden mb-4">Gestion Commerciale</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title} className="mb-1">
                  <SidebarMenuButton asChild isActive={pathname === item.url} className={cn(
                    "rounded-xl h-10 transition-all px-3",
                    pathname === item.url ? "bg-orange-50 text-orange-600 font-bold" : "text-gray-400 hover:bg-orange-50/50 hover:text-gray-900"
                  )}>
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className={cn("h-5 w-5", pathname === item.url ? "text-orange-600" : "text-gray-400")} />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Upgrade Card for Basic Users — compact */}
        {plan === "Basic" && status !== "Essai" && role !== 'superadmin' && (
          <div className="px-3 py-3 group-data-[collapsible=icon]:hidden">
            <div className="rounded-xl p-4 bg-gray-900 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="h-3 w-3 text-primary fill-primary" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Plan Pro — 25K</span>
                </div>
                <p className="text-[10px] text-gray-400 font-medium leading-tight">Débloquez l'IA Awa et les rapports avancés.</p>
                <Button size="sm" className="w-full h-9 text-[9px] font-black uppercase tracking-widest sena-gradient border-none rounded-lg">Mettre à niveau</Button>
              </div>
            </div>
          </div>
        )}

        {status === "Essai" && role !== 'superadmin' && (
          <div className="px-3 py-3 group-data-[collapsible=icon]:hidden">
            <div className="rounded-xl p-3 bg-orange-50 border border-orange-100 space-y-2 shadow-inner">
              <div className="flex justify-between items-center">
                 <div className="h-8 w-8">
                   {awaData && <Lottie animationData={awaData} loop={true} className="w-full h-full" />}
                 </div>
                 <Badge className="bg-primary text-white border-none font-black text-[8px] uppercase tracking-widest px-2">Essai</Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[8px] font-black text-gray-400 uppercase tracking-widest">
                  <span>IA</span>
                  <span>4 / {DAILY_TRIAL_LIMIT}</span>
                </div>
                <Progress value={80} className="h-1 bg-orange-100" />
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-gray-50">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-16 rounded-xl hover:bg-gray-50 px-3 transition-all">
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-10 w-10 rounded-xl sena-gradient flex items-center justify-center text-white text-base font-black shadow-lg shadow-orange-500/20 shrink-0">
                      {userName.charAt(0)}
                    </div>
                    <div className="flex flex-col flex-1 text-left overflow-hidden group-data-[collapsible=icon]:hidden">
                      <span className="text-sm font-bold text-gray-900 truncate">{userName}</span>
                      <Badge variant="outline" className="w-fit h-5 text-[8px] font-black text-primary border-primary/20 uppercase tracking-widest mt-1">
                        {role === 'superadmin' ? "SaaS OWNER" : plan}
                      </Badge>
                    </div>
                    <ChevronUp className="h-4 w-4 text-gray-400 group-data-[collapsible=icon]:hidden" />
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="center" className="w-64 rounded-[2rem] p-3 border-gray-100 shadow-3xl">
                <DropdownMenuItem onClick={handleLogout} className="rounded-xl py-4 px-4 font-bold text-red-500 focus:bg-red-50 focus:text-red-600 cursor-pointer">
                  <LogOut className="mr-3 h-4 w-4" /> Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
