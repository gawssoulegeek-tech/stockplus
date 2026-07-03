
"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import LottieWrapper from "@/components/lottie-wrapper"
import {
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Store,
  Plus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Cpu,
  Calendar,
  DollarSign,
  ArrowUpRight,
  BarChart3,
  Star,
  Trash2,
  Clock,
  Smartphone,
  ExternalLink,
  Loader2,
  Users,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/supabase/client"
import { useBoutique } from "../layout"
import { PLAN_PRICES, getFeaturesForPlan, PAID_PLANS, TRIAL_DAYS, PREMIUM_MODULES, getModuleRevenue, MAX_GERANTS } from "@/lib/plan-features"

export default function SaaSAdminPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { userProfile, setBoutique: setContextBoutique, setIsImpersonating } = useBoutique()

  const [boutiques, setBoutiques] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [paymentRequests, setPaymentRequests] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newBoutique, setNewBoutique] = useState({ name: "", ownerName: "", ownerEmail: "", plan: "Essai" })
  const [showConfetti, setShowConfetti] = useState<string | null>(null)
  const confettiTimer = useRef<ReturnType<typeof setTimeout>>()

  const supabase = getSupabaseClient()

  const formatRelativeTime = (dateStr: string) => {
    const now = Date.now()
    const date = new Date(dateStr).getTime()
    const diff = now - date
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "À l'instant"
    if (mins < 60) return `Il y a ${mins} min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `Il y a ${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 30) return `Il y a ${days}j`
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      const { data: boutiquesData, error: boutiquesError } = await supabase
        .from("boutiques")
        .select("*, owner:owner_id(name, email)")
        .order("created_at", { ascending: false })

      if (boutiquesError) throw boutiquesError

      if (boutiquesData) {
        setBoutiques(
          boutiquesData.map((b: any) => ({
            id: b.id,
            name: b.name,
            owner: b.owner?.name || b.owner_id?.slice(0, 8) || "N/A",
            ownerEmail: b.owner?.email || "",
            plan: b.plan,
            status: b.status,
            revenue: PLAN_PRICES[b.plan as keyof typeof PLAN_PRICES] || 0,
            joinDate: new Date(b.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
            aiScans: 0,
            expires: b.subscription_ends_at
              ? new Date(b.subscription_ends_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
              : "N/A",
            hasUsedTrial: b.trial_ends_at !== null,
            team_members_count: b.team_members_count || 1,
          }))
        )
      }

      const { data: logsData, error: logsError } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      if (!logsError && logsData) {
        setLogs(
          logsData.map((l: any) => ({
            id: l.id,
            type:
              l.status === "failure"
                ? "Erreur"
                : l.status === "warning"
                  ? "Avertissement"
                  : "MAJ",
            module: l.entity_type,
            message: l.action + (l.notes ? ` — ${l.notes}` : ""),
            date: formatRelativeTime(l.created_at),
            status:
              l.status === "success"
                ? "Succès"
                : l.status === "failure"
                  ? "Critique"
                  : "Avertissement",
          }))
        )
      }

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*, boutique:boutiques!boutique_id(name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (!paymentsError && paymentsData) {
        setPaymentRequests(
          paymentsData.map((p: any) => ({
            id: p.id,
            type: "Paiement",
            module: "Mobile Money",
            message: `Paiement - ${p.boutique?.name || "Inconnu"}`,
            date: formatRelativeTime(p.created_at),
            status: "En attente",
            shopName: p.boutique?.name,
            requestedPlan: "Pro",
          }))
        )
      }
    } catch (e: any) {
      console.error("Error loading SaaS data:", e)
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les données." })
    }
    setIsLoading(false)
  }

  useEffect(() => {
    setIsMounted(true)
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalMRR = useMemo(() => {
    return boutiques.reduce((acc, b) => {
      if (b.status === "Essai") return acc
      const price = PLAN_PRICES[b.plan as keyof typeof PLAN_PRICES] || 0
      return acc + (b.status === "Actif" ? price : 0)
    }, 0)
  }, [boutiques])

  const totalModuleRevenue = useMemo(() => {
    return boutiques.reduce((acc, b) => {
      const activeModuleIds = PREMIUM_MODULES
        .filter(m => m.featureFlag && (b as any).features?.[m.featureFlag])
        .map(m => m.id)
      return acc + getModuleRevenue(activeModuleIds)
    }, 0)
  }, [boutiques])

  const handleAccessBoutique = async (boutique: any) => {
    try {
      const { data } = await supabase.from("boutiques").select("*").eq("name", boutique.name).single()
      if (data) {
        setContextBoutique(data)
        setIsImpersonating(true)
        toast({
          title: "Accès complet activé",
          description: `Vous gérez maintenant : ${boutique.name}.`,
        })
        setTimeout(() => router.push("/dashboard"), 500)
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const activateBoutiqueFromPayment = async (shopName: string, paymentId: string, planToSet?: string) => {
    try {
      const { data: boutiquesToUpdate } = await supabase.from("boutiques").select("id, plan").eq("name", shopName)

      if (boutiquesToUpdate && boutiquesToUpdate.length > 0) {
        const finalPlan = planToSet || boutiquesToUpdate[0].plan
        await supabase.from("boutiques").update({ status: "Actif", plan: finalPlan, features: getFeaturesForPlan(finalPlan) }).eq("name", shopName)
        await supabase.from("payments").update({ status: "completed" }).eq("id", paymentId)
        await supabase.from("audit_logs").insert([
          {
            boutique_id: boutiquesToUpdate[0].id,
            action: "payment_activated",
            entity_type: "boutiques",
            entity_id: boutiquesToUpdate[0].id,
            notes: `Paiement validé - Plan ${finalPlan}`,
            status: "success",
            created_at: new Date().toISOString(),
          },
        ])
        setPaymentRequests((prev) => prev.filter((p) => p.id !== paymentId))
        loadData()
        toast({
          title: "Paiement validé",
          description: `La boutique ${shopName} est maintenant active sur le plan ${finalPlan}.`,
          action: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        })
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const approveBoutique = async (id: string) => {
    const boutique = boutiques.find((b) => b.id === id)
    if (!boutique) return
    try {
      await supabase
        .from("boutiques")
        .update({
          status: "Essai",
          trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
          features: getFeaturesForPlan(boutique.plan),
          team_members_count: MAX_GERANTS[boutique.plan] || 1,
        })
        .eq("id", id)
      await supabase.from("audit_logs").insert([
        {
          boutique_id: id,
          action: "boutique_approved",
          entity_type: "boutiques",
          entity_id: id,
          notes: `Boutique approuvée — Plan ${boutique.plan}`,
          status: "success",
          created_at: new Date().toISOString(),
        },
      ])
      loadData()
      setShowConfetti(boutique.id)
      if (confettiTimer.current) clearTimeout(confettiTimer.current)
      confettiTimer.current = setTimeout(() => setShowConfetti(null), 2600)
      toast({ title: "Boutique approuvée", description: `${boutique.name} est maintenant en essai.` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const activateTrial = async (id: string) => {
    const boutique = boutiques.find((b) => b.id === id)
    if (!boutique) return
    if (boutique.hasUsedTrial) {
      toast({
        variant: "destructive",
        title: "Action impossible",
        description: "L'essai a déjà été utilisé pour cette boutique.",
      })
      return
    }
    try {
      const now = new Date()
      const expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      await supabase
        .from("boutiques")
        .update({ status: "Essai", plan: "Essai", trial_ends_at: expiry.toISOString() })
        .eq("id", id)
      await supabase.from("audit_logs").insert([
        {
          boutique_id: id,
          action: "trial_activated",
          entity_type: "boutiques",
          entity_id: id,
          notes: "Essai gratuit de 7 jours activé",
          status: "success",
          created_at: new Date().toISOString(),
        },
      ])
      loadData()
      toast({ title: "Essai Gratuit Activé (7 jours)" })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const handleDeploy = async () => {
    try {
      await supabase.from("audit_logs").insert([
        {
          boutique_id: "system",
          action: "system_deploy",
          entity_type: "system",
          notes: "Mise à jour globale 4.0.1 déployée avec succès.",
          status: "success",
          created_at: new Date().toISOString(),
        },
      ])
      loadData()
      toast({ title: "Mise à jour système envoyée" })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const toggleBoutiqueStatus = async (id: string) => {
    const boutique = boutiques.find((b) => b.id === id)
    if (!boutique) return
    const newStatus = boutique.status === "Actif" ? "Suspendu" : "Actif"
    try {
      await supabase.from("boutiques").update({ status: newStatus }).eq("id", id)
      await supabase.from("audit_logs").insert([
        {
          boutique_id: id,
          action: newStatus === "Suspendu" ? "boutique_suspended" : "boutique_activated",
          entity_type: "boutiques",
          entity_id: id,
          notes: `Statut changé à ${newStatus}`,
          status: "success",
          created_at: new Date().toISOString(),
        },
      ])
      loadData()
      toast({ title: "Statut de la boutique mis à jour" })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const cyclePlan = async (id: string) => {
    const boutique = boutiques.find((b) => b.id === id)
    if (!boutique) return
    const currentIndex = PAID_PLANS.indexOf(boutique.plan)
    const newPlan = currentIndex === -1 ? 'Basic' : PAID_PLANS[(currentIndex + 1) % PAID_PLANS.length]
    try {
      await supabase
        .from("boutiques")
        .update({ plan: newPlan, status: boutique.status === "Essai" ? "Actif" : boutique.status, features: getFeaturesForPlan(newPlan) })
        .eq("id", id)
      await supabase.from("audit_logs").insert([
        {
          boutique_id: id,
          action: "plan_changed",
          entity_type: "boutiques",
          entity_id: id,
          notes: `Plan changé de ${boutique.plan} à ${newPlan}`,
          status: "success",
          created_at: new Date().toISOString(),
        },
      ])
      loadData()
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const deleteBoutique = async (id: string) => {
    const boutique = boutiques.find((b) => b.id === id)
    if (!boutique) return
    if (!confirm(`Supprimer définitivement la boutique "${boutique.name}" ? Cette action est irréversible.`)) return
    try {
      await supabase.from("boutiques").delete().eq("id", id)
      loadData()
      toast({ title: "Boutique supprimée", description: `${boutique.name} a été supprimée.` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const handleCreateBoutique = async () => {
    if (!newBoutique.name || !newBoutique.ownerName || !newBoutique.ownerEmail) {
      toast({ variant: "destructive", title: "Champs requis", description: "Remplissez tous les champs." })
      return
    }
    try {
      const boutiqueId = `boutique_${Date.now()}`
      const now = new Date()
      const { error: bError } = await supabase.from("boutiques").insert([
        {
          id: boutiqueId,
          name: newBoutique.name,
          owner_id: "",
          plan: newBoutique.plan,
          status: newBoutique.plan === "Essai" ? "Essai" : "Actif",
          trial_ends_at:
            newBoutique.plan === "Essai" ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
          subscription_ends_at: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          features: getFeaturesForPlan(newBoutique.plan),
          team_members_count: MAX_GERANTS[newBoutique.plan] || 1,
          created_at: now.toISOString(),
        },
      ])
      if (bError) throw bError
      await supabase.from("audit_logs").insert([
        {
          boutique_id: boutiqueId,
          action: "boutique_created",
          entity_type: "boutiques",
          entity_id: boutiqueId,
          notes: `Boutique créée par superadmin : ${newBoutique.name}`,
          status: "success",
          created_at: now.toISOString(),
        },
      ])
      setShowCreateDialog(false)
      setNewBoutique({ name: "", ownerName: "", ownerEmail: "", plan: "Essai" })
      loadData()
      toast({ title: "Boutique créée", description: `${newBoutique.name} a été ajoutée.` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const filteredBoutiques = boutiques.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.owner.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (val: number) => {
    if (!isMounted) return `${val} CFA`
    return `${val.toLocaleString()} CFA`
  }

  const pendingPayments = paymentRequests

  if (!isMounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <LottieWrapper src="edit-document" className="w-32 h-32 opacity-50" />
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-lg sena-gradient flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">SaaS OWNER PANEL</span>
            </div>
            <h1 className="text-5xl font-headline font-bold text-gray-900 tracking-tight">Gestion StockPlus</h1>
            <p className="text-gray-400 text-lg font-medium">Contrôle des abonnements et des accès commerçants.</p>
          </div>
          <div className="hidden lg:block">
            <LottieWrapper src="checkmark" className="w-24 h-24 opacity-60" />
          </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-14 rounded-2xl border-gray-200 font-bold px-8 hover:bg-orange-50"
            onClick={loadData}
            disabled={isLoading}
          >
            {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Rafraîchir
          </Button>
          <Button
            className="sena-gradient text-white h-14 rounded-2xl font-bold px-8 shadow-xl shadow-orange-500/20"
            onClick={handleDeploy}
          >
            <Plus className="h-4 w-4 mr-2" />
            Déployer MAJ
          </Button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-5">
        {[
          { title: "Boutiques Totales", value: boutiques.length.toString(), icon: Store, trend: "+1", color: "text-primary" },
          { title: "MRR Plans (CFA)", value: formatCurrency(totalMRR), icon: TrendingUp, trend: "Plans", color: "text-green-500" },
          { title: "MRR Modules (CFA)", value: formatCurrency(totalModuleRevenue), icon: Cpu, trend: "Add-ons", color: "text-blue-500" },
          { title: "En attente Paiement", value: pendingPayments.length.toString(), icon: Smartphone, trend: "Mobile Money", color: "text-blue-500" },
          { title: "Suspendues (attente)", value: boutiques.filter((b) => b.status === "Suspendu").length.toString(), icon: Clock, trend: "Approbation", color: "text-purple-500" },
        ].map((stat, i) => (
          <Card key={i} className="premium-card">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-gray-50">
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <Badge variant="outline" className="font-bold border-gray-100">
                  {stat.trend}
                </Badge>
              </div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.title}</div>
              <h3 className="text-3xl font-headline font-bold text-gray-900">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="boutiques" className="space-y-8">
        <TabsList className="bg-gray-100 p-1.5 h-14 rounded-2xl w-full max-w-2xl">
          <TabsTrigger value="boutiques" className="rounded-xl flex-1 font-bold">
            Liste des Clients
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-xl flex-1 font-bold">
            Paiements Mobile Money{" "}
            {pendingPayments.length > 0 && (
              <Badge className="ml-2 bg-primary text-white">{pendingPayments.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approvals" className="rounded-xl flex-1 font-bold">
            Approbations{" "}
            {boutiques.filter((b) => b.status === "Suspendu").length > 0 && (
              <Badge className="ml-2 bg-purple-500 text-white">{boutiques.filter((b) => b.status === "Suspendu").length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="modules" className="rounded-xl flex-1 font-bold">
            Modules Premium{" "}
            {PREMIUM_MODULES.filter(m => m.implemented).length > 0 && (
              <Badge className="ml-2 bg-blue-500 text-white">{PREMIUM_MODULES.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-xl flex-1 font-bold">
            Logs Système
          </TabsTrigger>
        </TabsList>

        <TabsContent value="boutiques">
          <Card className="premium-card overflow-hidden">
            <CardHeader className="p-8 border-b">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Chercher une boutique..."
                    className="pl-12 h-12 rounded-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="ml-4 sena-gradient text-white h-12 rounded-xl font-bold px-6 shadow-lg shadow-orange-500/20"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle Boutique
                </Button>
              </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="px-8 font-bold uppercase text-[10px]">Boutique</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Plan</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Status</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Équipe</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Essai Gratuit</TableHead>
                  <TableHead className="text-right px-8 font-bold uppercase text-[10px]">Actions Supervision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBoutiques.map((b) => (
                  <TableRow key={b.id} className="group hover:bg-orange-50/5">
                    <TableCell className="px-8 py-6">
                      <div className="font-bold text-gray-900">{b.name}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{b.owner}</div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cyclePlan(b.id)}
                        className="rounded-lg font-bold bg-orange-50 text-primary"
                      >
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        {b.plan}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          b.status === "Actif"
                            ? "bg-green-50 text-green-600 border-none"
                            : b.status === "Essai"
                              ? "bg-orange-50 text-orange-600 border-none"
                              : b.status === "Suspendu"
                                ? "bg-purple-50 text-purple-600 border-none"
                                : "bg-red-50 text-red-600 border-none"
                        }
                      >
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-600">
                        <Users className="h-4 w-4" />
                        {b.team_members_count}
                      </span>
                    </TableCell>
                    <TableCell>
                      {!b.hasUsedTrial ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => activateTrial(b.id)}
                          className="rounded-lg h-8 text-[10px] font-bold border-orange-200 text-orange-600"
                        >
                          Activer Essai (7j)
                        </Button>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-300 italic">Déjà utilisé</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleAccessBoutique(b)}
                          className="hover:bg-primary/10 text-primary"
                          title="Prendre le contrôle total de la boutique"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleBoutiqueStatus(b.id)}
                          className="hover:bg-red-50"
                          title={b.status === "Actif" ? "Suspendre" : "Activer"}
                        >
                          {b.status === "Actif" ? (
                            <XCircle className="h-5 w-5 text-red-400" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteBoutique(b.id)}
                          className="hover:bg-red-50"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="h-5 w-5 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="premium-card">
            <CardHeader className="p-8 border-b">
              <CardTitle className="font-headline text-2xl">Paiements Mobile Money en attente</CardTitle>
              <CardDescription>Vérifiez votre compte Wave/Orange avant de valider l'accès.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {pendingPayments.length > 0 ? (
                <div className="divide-y">
                  {pendingPayments.map((p) => (
                    <div key={p.id} className="p-8 flex items-center justify-between">
                      <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                          <Smartphone className="h-6 w-6 text-blue-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-bold text-gray-900">{p.shopName || "Inconnu"}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <span>Plan demandé :</span>
                            <Badge className="bg-orange-100 text-primary border-none">
                              {p.requestedPlan || "Inconnu"}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">{p.date}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-red-100 text-red-500 hover:bg-red-50"
                          onClick={async () => {
                            try {
                              await supabase.from("payments").update({ status: "failed" }).eq("id", p.id)
                              setPaymentRequests((prev) => prev.filter((pay) => pay.id !== p.id))
                              toast({ variant: "destructive", title: "Refusé", description: "La demande a été rejetée." })
                            } catch (e: any) {
                              toast({ variant: "destructive", title: "Erreur", description: e.message })
                            }
                          }}
                        >
                          Rejeter
                        </Button>
                        <Button
                          size="sm"
                          className="sena-gradient text-white rounded-xl font-bold"
                          onClick={() => activateBoutiqueFromPayment(p.shopName, p.id, p.requestedPlan)}
                        >
                          Valider et Activer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-16 text-center flex flex-col items-center gap-4">
                  <LottieWrapper src="document" className="w-32 h-32 opacity-70" />
                  <p className="text-gray-400 font-medium italic">Aucun paiement en attente.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card className="premium-card">
            <CardHeader className="p-8 border-b">
              <CardTitle className="font-headline text-2xl">Boutiques suspendues (attente approbation)</CardTitle>
              <CardDescription>Inscriptions récentes en attente de validation manuelle.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {boutiques.filter((b) => b.status === "Suspendu").length > 0 ? (
                <div className="divide-y">
                  {boutiques
                    .filter((b) => b.status === "Suspendu")
                    .map((b) => (
                      <div key={b.id} className="p-8 flex items-center justify-between">
                        <div className="flex gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                            <Store className="h-6 w-6 text-purple-500" />
                          </div>
                          <div className="space-y-1">
                            <div className="font-bold text-gray-900">{b.name}</div>
                            <div className="text-sm text-gray-500">
                              {b.owner} — {b.ownerEmail}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span>Plan demandé :</span>
                              <Badge className="bg-orange-100 text-primary border-none">{b.plan}</Badge>
                              <span>•</span>
                              <span>{b.joinDate}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-red-100 text-red-500 hover:bg-red-50"
                            onClick={async () => {
                              try {
                                await supabase.from("boutiques").update({ status: "refuse" }).eq("id", b.id)
                                loadData()
                                toast({ title: "Demande refusée", description: `${b.name} a été refusée.` })
                              } catch (e: any) {
                                toast({ variant: "destructive", title: "Erreur", description: e.message })
                              }
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Refuser
                          </Button>
                          <Button
                            size="sm"
                            className="sena-gradient text-white rounded-xl font-bold"
                            onClick={() => approveBoutique(b.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approuver (Essai {TRIAL_DAYS}j)
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-16 text-center flex flex-col items-center gap-4">
                  <LottieWrapper src="checkmark" className="w-32 h-32 opacity-70" />
                  <p className="text-gray-400 font-medium italic">Aucune boutique en attente d&apos;approbation.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules">
          <Card className="premium-card">
            <CardHeader className="p-8 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-headline text-2xl">Modules Premium</CardTitle>
                  <CardDescription>Add-ons vendus indépendamment du plan d&apos;abonnement.</CardDescription>
                </div>
                <Badge className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold">
                  {PREMIUM_MODULES.filter(m => m.implemented).length} disponibles
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {PREMIUM_MODULES.map((mod) => (
                  <div key={mod.id} className={`p-6 rounded-2xl border ${mod.implemented ? 'bg-white hover:border-primary/30' : 'bg-gray-50 border-dashed'} transition-colors`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-gray-900">{mod.label}</span>
                      {mod.implemented ? (
                        <Badge className="bg-green-50 text-green-600 border-none text-[10px]">Disponible</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400 border-gray-200 text-[10px]">Bientôt</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-4">{mod.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-headline font-bold text-gray-900">{mod.price.toLocaleString()} FCFA</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">/mois</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="premium-card">
            <CardHeader className="p-8 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline text-2xl">Logs Système</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-red-100 text-red-500 hover:bg-red-50"
                onClick={async () => {
                  try {
                    await supabase.from("audit_logs").delete().neq("id", "none")
                  } catch (_) {}
                  setLogs([])
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Vider
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {logs.map((log) => (
                  <div key={log.id} className="p-6 flex items-start justify-between">
                    <div className="flex gap-4">
                      <div
                        className={`mt-1 h-3 w-3 rounded-full ${log.type === "Erreur" ? "bg-red-500 animate-pulse" : "bg-green-500"}`}
                      />
                      <div>
                        <span className="font-bold text-gray-900 block mb-1">{log.module}</span>
                        <div className="text-sm text-gray-500">{log.message}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">{log.date}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">Nouvelle Boutique</DialogTitle>
            <DialogDescription>Créer manuellement une boutique pour un nouveau commerçant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Nom de la boutique</label>
              <Input
                placeholder="Ex: Dakar Textiles"
                value={newBoutique.name}
                onChange={(e) => setNewBoutique((prev) => ({ ...prev, name: e.target.value }))}
                className="h-12 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Nom du propriétaire</label>
              <Input
                placeholder="Ex: Moussa Diop"
                value={newBoutique.ownerName}
                onChange={(e) => setNewBoutique((prev) => ({ ...prev, ownerName: e.target.value }))}
                className="h-12 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Email du propriétaire</label>
              <Input
                placeholder="Ex: moussa@email.com"
                value={newBoutique.ownerEmail}
                onChange={(e) => setNewBoutique((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                className="h-12 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Plan d'abonnement</label>
              <select
                value={newBoutique.plan}
                onChange={(e) => setNewBoutique((prev) => ({ ...prev, plan: e.target.value }))}
                className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Essai">Essai (14 jours)</option>
                <option value="Basic">Basic — 10 000 CFA/mois</option>
                <option value="Pro">Pro — 25 000 CFA/mois</option>
              </select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="rounded-xl h-12 font-bold">
              Annuler
            </Button>
            <Button onClick={handleCreateBoutique} className="sena-gradient text-white rounded-xl h-12 font-bold px-8">
              <Plus className="h-4 w-4 mr-2" />
              Créer la boutique
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <LottieWrapper src="confetti" className="w-[400px] h-[400px]" />
          <div className="absolute inset-0 bg-black/5" />
        </div>
      )}
    </div>
  )
}
