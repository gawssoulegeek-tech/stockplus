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
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useLocation } from "wouter"
import { getSupabaseClient } from "@/supabase/client"
import { useBoutique } from "@/pages/dashboard/layout"
import { PLAN_PRICES, getFeaturesForPlan, PAID_PLANS, TRIAL_DAYS, PREMIUM_MODULES, getModuleRevenue, MAX_GERANTS } from "@/lib/plan-features"

export default function SaaSAdminPage() {
  const { toast } = useToast()
  const [, navigate] = useLocation()
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
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
            features: b.features,
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
        setTimeout(() => navigate("/dashboard"), 500)
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const activateBoutiqueFromPayment = async (shopName: string, paymentId: string, planToSet?: string) => {
    try {
      await apiPost('activate-payment', { id: paymentId, shopName, paymentId, planToSet })
      setPaymentRequests((prev) => prev.filter((p) => p.id !== paymentId))
      loadData()
      toast({
        title: "Paiement validé",
        description: `La boutique ${shopName} est maintenant active sur le plan ${planToSet || 'actuel'}.`,
        action: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const approveBoutique = async (id: string) => {
    const boutique = boutiques.find((b) => b.id === id)
    if (!boutique) return
    try {
      await apiPost('approve', { id })
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
    try {
      await apiPost('toggle-status', { id })
      loadData()
      toast({ title: "Statut de la boutique mis à jour" })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const cyclePlan = async (id: string) => {
    try {
      await apiPost('cycle-plan', { id })
      loadData()
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const apiPost = async (action: string, body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/saas/boutiques', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({ ...body, action }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Erreur serveur')
    }
    return res.json()
  }

  const deleteBoutique = async (id: string) => {
    const boutique = boutiques.find((b) => b.id === id)
    if (!boutique) return
    if (!confirm(`Supprimer définitivement la boutique "${boutique.name}" ? Cette action est irréversible.`)) return
    try {
      await apiPost('delete', { id })
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
                          className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => handleAccessBoutique(b)}
                          title="Se connecter en tant que"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl hover:bg-orange-50 hover:text-primary transition-colors"
                          onClick={() => toggleBoutiqueStatus(b.id)}
                          title="Changer statut"
                        >
                          {b.status === "Actif" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
                          onClick={() => deleteBoutique(b.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
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
          <div className="grid gap-6 md:grid-cols-3">
            {pendingPayments.map((p) => (
              <Card key={p.id} className="premium-card overflow-hidden">
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-blue-500" />
                    </div>
                    <Badge className="bg-amber-50 text-amber-600 border-none font-bold uppercase text-[10px]">
                      {p.status}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-xl font-headline font-bold text-gray-900">{p.shopName}</h3>
                    <p className="text-sm text-gray-400 font-medium">Demande de passage au plan {p.requestedPlan}</p>
                  </div>
                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="text-xs text-gray-400 font-bold">{p.date}</div>
                    <Button
                      className="sena-gradient text-white h-10 px-6 rounded-xl font-bold"
                      onClick={() => activateBoutiqueFromPayment(p.shopName, p.id, p.requestedPlan)}
                    >
                      Valider 10K
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {pendingPayments.length === 0 && (
              <div className="col-span-full py-20 text-center bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                <Smartphone className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                <p className="font-bold text-gray-400">Aucune demande de paiement en attente.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="approvals">
          <div className="grid gap-6 md:grid-cols-2">
            {boutiques
              .filter((b) => b.status === "Suspendu")
              .map((b) => (
                <Card key={b.id} className="premium-card p-8 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-purple-50 flex items-center justify-center">
                      <Clock className="h-7 w-7 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-headline font-bold">{b.name}</h3>
                      <p className="text-sm text-gray-400 font-medium">Inscrit le {b.joinDate}</p>
                      <p className="text-xs text-gray-400">{b.ownerEmail}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="bg-purple-500 hover:bg-purple-600 text-white h-12 px-6 rounded-xl font-bold"
                      onClick={() => approveBoutique(b.id)}
                    >
                      Approuver
                    </Button>
                    {showConfetti === b.id && (
                      <div className="absolute inset-0 z-50 pointer-events-none">
                        <LottieWrapper src="confetti" className="w-full h-full" />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            {boutiques.filter((b) => b.status === "Suspendu").length === 0 && (
              <div className="col-span-full py-20 text-center bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                <CheckCircle2 className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                <p className="font-bold text-gray-400">Toutes les boutiques ont été traitées.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="modules">
          <div className="grid gap-6 md:grid-cols-3">
            {PREMIUM_MODULES.map((mod) => (
              <Card key={mod.id} className="premium-card p-8 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-blue-50">
                    <Cpu className="h-6 w-6 text-blue-500" />
                  </div>
                  <Badge className={mod.implemented ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400"}>
                    {mod.implemented ? "Déployé" : "En dev"}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-lg font-headline font-bold">{mod.label}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed mt-1">{mod.description}</p>
                </div>
                <div className="pt-4 flex items-center justify-between border-t border-gray-50">
                  <span className="font-headline font-bold text-primary">{mod.price.toLocaleString()} CFA</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">/mois</span>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="premium-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="px-8 font-bold uppercase text-[10px]">Type</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Module</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Action</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Statut</TableHead>
                  <TableHead className="text-right px-8 font-bold uppercase text-[10px]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="group hover:bg-orange-50/5">
                    <TableCell className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        {log.type === "Erreur" ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                          <RefreshCw className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="font-bold">{log.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-gray-600">{log.module}</TableCell>
                    <TableCell className="text-xs font-medium text-gray-400">{log.message}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          log.status === "Succès"
                            ? "text-green-600 border-green-200"
                            : log.status === "Avertissement"
                              ? "text-amber-600 border-amber-200"
                              : "text-red-600 border-red-200"
                        }
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-8 text-xs font-medium text-gray-400">{log.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-3xl font-headline font-bold">Nouvelle Boutique</DialogTitle>
            <DialogDescription className="font-medium text-gray-500">Ajoutez manuellement un commerçant sur la plateforme.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label className="font-bold text-gray-700">Nom de la boutique</Label>
              <Input
                placeholder="ex: Boutique du Nord"
                className="h-14 rounded-2xl"
                value={newBoutique.name}
                onChange={(e) => setNewBoutique({ ...newBoutique, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Propriétaire</Label>
                <Input
                  placeholder="Nom complet"
                  className="h-14 rounded-2xl"
                  value={newBoutique.ownerName}
                  onChange={(e) => setNewBoutique({ ...newBoutique, ownerName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Email</Label>
                <Input
                  type="email"
                  placeholder="email@exemple.com"
                  className="h-14 rounded-2xl"
                  value={newBoutique.ownerEmail}
                  onChange={(e) => setNewBoutique({ ...newBoutique, ownerEmail: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-gray-700">Plan initial</Label>
              <div className="flex gap-2">
                {["Essai", "Basic", "Pro"].map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={newBoutique.plan === p ? "default" : "outline"}
                    className={`flex-1 h-12 rounded-xl font-bold ${newBoutique.plan === p ? "sena-gradient border-none" : ""}`}
                    onClick={() => setNewBoutique({ ...newBoutique, plan: p })}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="pt-8">
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)} className="h-14 rounded-2xl font-bold">
              Annuler
            </Button>
            <Button onClick={handleCreateBoutique} className="sena-gradient text-white h-14 px-8 rounded-2xl font-bold shadow-xl shadow-orange-500/20">
              Créer la boutique
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
