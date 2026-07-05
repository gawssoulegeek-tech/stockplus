
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
} from "@/components/ui/sidebar"
import { Link, useLocation } from "wouter"
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
import { useBoutique } from "@/pages/dashboard/layout"

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
      <SidebarHeader className="px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl sena-gradient shadow-lg shadow-orange-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
            <span className="font-headline font-bold text-2xl tracking-tight text-gray-900 uppercase">StockPlus</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4">
        {role === 'superadmin' && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 font-black text-primary uppercase text-[8px] tracking-[0.2em] group-data-[collapsible=icon]:hidden mb-4">Administration SaaS</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className="mb-1">
                  <SidebarMenuButton asChild isActive={pathname === "/saas"} className={cn(
                    "rounded-2xl h-12 transition-all px-4",
                    pathname === "/saas" ? "bg-primary text-white font-bold" : "text-gray-400 hover:bg-orange-50/50 hover:text-gray-900"
                  )}>
                    <Link href="/saas" className="flex items-center gap-4">
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
                    "rounded-2xl h-12 transition-all px-4",
                    pathname === item.url ? "bg-orange-50 text-orange-600 font-bold" : "text-gray-400 hover:bg-orange-50/50 hover:text-gray-900"
                  )}>
                    <Link href={item.url} className="flex items-center gap-4">
                      <item.icon className={cn("h-5 w-5", pathname === item.url ? "text-orange-600" : "text-gray-400")} />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Upgrade Card for Basic Users */}
        {plan === "Basic" && status !== "Essai" && role !== 'superadmin' && (
          <div className="px-4 py-8 group-data-[collapsible=icon]:hidden">
            <div className="rounded-[2.5rem] p-8 bg-gray-900 text-white shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
              <div className="absolute -top-4 -right-4 h-24 w-24 bg-primary/20 rounded-full blur-2xl" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary fill-primary" />
                  <span className="text-xs font-black text-primary uppercase tracking-widest">Plan Pro — 25K</span>
                </div>
                <p className="text-[11px] text-gray-400 font-bold leading-relaxed">Débloquez l'IA Awa complète, le multi-panier et les rapports financiers.</p>
                <Button size="sm" className="w-full h-11 text-[10px] font-black uppercase tracking-widest sena-gradient border-none rounded-xl">Mettre à niveau</Button>
              </div>
            </div>
          </div>
        )}

        {status === "Essai" && role !== 'superadmin' && (
          <div className="px-4 py-6 group-data-[collapsible=icon]:hidden">
            <div className="rounded-[2rem] p-6 bg-orange-50 border border-orange-100 space-y-4 shadow-inner">
              <div className="flex justify-between items-center">
                 <div className="h-10 w-10">
                   {awaData && <Lottie animationData={awaData} loop={true} className="w-full h-full" />}
                 </div>
                 <Badge className="bg-primary text-white border-none font-black text-[8px] uppercase tracking-widest px-3">Essai Pro</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  <span>Usage IA</span>
                  <span>4 / {DAILY_TRIAL_LIMIT}</span>
                </div>
                <Progress value={80} className="h-1.5 bg-orange-100" />
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-gray-50">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-20 rounded-[1.5rem] hover:bg-gray-50 px-4 transition-all">
                  <div className="flex items-center gap-4 w-full">
                    <div className="h-12 w-12 rounded-2xl sena-gradient flex items-center justify-center text-white text-lg font-black shadow-lg shadow-orange-500/20">
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
