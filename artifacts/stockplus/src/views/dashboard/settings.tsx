import { useState, useEffect } from "react"
import Lottie from "lottie-react"
import {
  Store,
  Bell,
  Lock,
  Save,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Crown,
  Users,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useBoutique } from "@/views/dashboard/layout"
import { getSupabaseClient } from "@/supabase/client"
import { useLocation } from "@/lib/compat/wouter"
import { PREMIUM_MODULES, getModuleRevenue } from "@/lib/plan-features"

const SUCCESS_LOTTIE_URL = "/lottie/Success.json"
const WARNING_LOTTIE_URL = "/lottie/warning.json"

export default function SettingsPage() {
  const [, navigate] = useLocation()
  const { toast } = useToast()
  const { boutique, features, userProfile } = useBoutique()

  const [isLoading, setIsLoading] = useState(false)
  const [storeName, setStoreName] = useState("")
  const [flags, setFlags] = useState(features)
  const [emailReports, setEmailReports] = useState(false)
  const [togglingEmail, setTogglingEmail] = useState(false)
  const [successLottieData, setSuccessLottieData] = useState<any>(null)
  const [warningLottieData, setWarningLottieData] = useState<any>(null)
  const [showSuccessAnim, setShowSuccessAnim] = useState(false)

  useEffect(() => {
    if (boutique) {
      setStoreName(boutique.name)
      setFlags(boutique.features)
      const notif = (boutique.notifications || {}) as Record<string, unknown>
      setEmailReports(notif.emailReports === true)
    }
    fetch(SUCCESS_LOTTIE_URL)
      .then(res => res.ok && res.json())
      .then(data => data && setSuccessLottieData(data))
      .catch(() => {})
    fetch(WARNING_LOTTIE_URL)
      .then(res => res.ok && res.json())
      .then(data => data && setWarningLottieData(data))
      .catch(() => {})
  }, [boutique])

  const handleSave = async () => {
    if (!boutique) return
    setIsLoading(true)
    const supabase = getSupabaseClient()
    try {
      const { error } = await supabase
        .from('boutiques')
        .update({
          name: storeName,
          features: flags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', boutique.id)

      if (error) throw error
      toast({ title: "Paramètres mis à jour", description: "Les changements ont été appliqués avec succès." })
      setShowSuccessAnim(true)
      setTimeout(() => setShowSuccessAnim(false), 3000)
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" })
    } finally {
      setIsLoading(false)
    }
  }

  const isAdmin = userProfile?.role === "owner" || userProfile?.role === "superadmin"
  const isPro = boutique?.plan === "Pro" || boutique?.status === "Essai"

  const handleToggleEmailReports = async (value: boolean) => {
    if (!boutique) return
    setTogglingEmail(true)
    setEmailReports(value)
    try {
      const res = await fetch('/api/boutique/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boutiqueId: boutique.id, emailReports: value }),
      })
      if (!res.ok) {
        setEmailReports(!value)
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour la préférence." })
      } else {
        toast({ title: value ? "Rapports activés" : "Rapports désactivés", description: "Vous recevrez le rapport quotidien par email." })
      }
    } catch {
      setEmailReports(!value)
      toast({ variant: "destructive", title: "Erreur" })
    } finally {
      setTogglingEmail(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {showSuccessAnim && successLottieData && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="w-48 h-48">
            <Lottie animationData={successLottieData} loop={false} autoplay={true} className="w-full h-full" />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-headline font-bold">Réglages</h1>
        <Button onClick={handleSave} className="sena-gradient text-white h-12 px-8 rounded-xl font-bold shadow-lg" disabled={isLoading}>
          {isLoading ? "Enregistrement..." : "Enregistrer les modifications"}
          <Save className="ml-2 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="features" className="space-y-8">
        <TabsList className="bg-gray-100 h-14 rounded-2xl w-full max-w-3xl p-1.5 overflow-x-auto">
          <TabsTrigger value="store" className="rounded-xl flex-1 font-bold whitespace-nowrap"><Store className="mr-2 h-4" /> Boutique</TabsTrigger>
          <TabsTrigger value="features" className="rounded-xl flex-1 font-bold whitespace-nowrap"><Cpu className="mr-2 h-4" /> Feature Flags</TabsTrigger>
          <TabsTrigger value="subscription" className="rounded-xl flex-1 font-bold whitespace-nowrap"><Crown className="mr-2 h-4" /> Abonnement</TabsTrigger>
          <TabsTrigger value="modules" className="rounded-xl flex-1 font-bold whitespace-nowrap"><Cpu className="mr-2 h-4" /> Modules Premium</TabsTrigger>
          <TabsTrigger value="team" className="rounded-xl flex-1 font-bold whitespace-nowrap"><Users className="mr-2 h-4" /> Équipe</TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl flex-1 font-bold whitespace-nowrap"><Lock className="mr-2 h-4" /> Sécurité</TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          <Card className="premium-card">
            <CardHeader className="p-8">
              <CardTitle className="text-2xl">Identité</CardTitle>
              <CardDescription>Informations visibles sur vos factures.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="font-bold">Nom de la Boutique</Label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="h-12 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card className="premium-card">
            <CardHeader className="p-8 border-b bg-gray-50/30">
              <CardTitle className="text-2xl flex items-center gap-3">
                <Cpu className="text-primary" />
                Configuration du SaaS
              </CardTitle>
              <CardDescription>Activez les modules avancés pour personnaliser votre gestion.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              {!isAdmin ? (
                <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200 flex items-center gap-4 text-orange-700">
                  {warningLottieData ? (
                    <div className="h-8 w-8 shrink-0">
                      <Lottie animationData={warningLottieData} loop={true} className="w-full h-full" />
                    </div>
                  ) : (
                    <AlertCircle />
                  )}
                  <span className="font-bold">Seul l'administrateur peut modifier les Feature Flags de la boutique.</span>
                </div>
              ) : (
                <div className="grid gap-8 md:grid-cols-2">
                  {[
                    { id: "units", label: "Unités de mesure", desc: "kg, mètres, litres pour vos produits.", icon: "📏" },
                    { id: "wholesale", label: "Vente en Gros", desc: "Gérez les prix de gros et les cartons.", icon: "📦" },
                    { id: "credit", label: "Ventes à Crédit", desc: "Suivi des créances et acomptes clients.", icon: "💳" },
                    { id: "customers", label: "Gestion Clients", desc: "Ajoutez un nom client sur chaque vente.", icon: "👤" },
                    { id: "importChina", label: "Import Chine", desc: "Calculez vos coûts de revient internationaux.", icon: "🌍" },
                    { id: "reports", label: "Rapports avancés", desc: "Tableaux de bord et analyses détaillées.", icon: "📊" },
                    { id: "multiCart", label: "Multi-panier", desc: "Gérez plusieurs paniers d'achat simultanés.", icon: "🛒" },
                    { id: "historicalMoves", label: "Mouvements historiques", desc: "Enregistrez des stocks anciens (inventaire initial).", icon: "🕰️" },
                  ].map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-6 rounded-2xl border bg-white hover:bg-orange-50/10 transition-colors group">
                      <div className="flex gap-4">
                        <div className="text-2xl h-12 w-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                          {f.icon}
                        </div>
                        <div>
                          <Label className="font-bold text-lg block mb-1">{f.label}</Label>
                          <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={flags[f.id]}
                        onCheckedChange={(v) => setFlags({...flags, [f.id]: v})}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules">
          <Card className="premium-card">
            <CardHeader className="p-8 border-b bg-gray-50/30">
              <CardTitle className="text-2xl flex items-center gap-3">
                <Cpu className="text-primary" />
                Modules Premium
              </CardTitle>
              <CardDescription>
                Activez des fonctionnalités supplémentaires pour personnaliser votre gestion. 
                Contactez l&apos;administrateur pour souscrire.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {PREMIUM_MODULES.map((mod) => {
                  const isActive = mod.featureFlag ? (features[mod.featureFlag] || false) : false
                  return (
                    <div key={mod.id} className={`p-6 rounded-2xl border ${isActive ? 'bg-green-50/30 border-green-200' : 'bg-white border-gray-100'} transition-colors`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-gray-900">{mod.label}</span>
                        {isActive ? (
                          <Badge className="bg-green-50 text-green-600 border-none text-[10px]">Actif</Badge>
                        ) : mod.implemented ? (
                          <Badge variant="outline" className="text-gray-400 border-gray-200 text-[10px]">Disponible</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-400 border-dashed text-[10px]">Bientôt</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-4">{mod.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-headline font-bold">{mod.price.toLocaleString()} FCFA</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">/mois</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-8 p-6 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">Total modules actifs</p>
                  <p className="text-sm text-gray-500">Revenu supplémentaire généré par vos modules</p>
                </div>
                <p className="text-3xl font-headline font-bold text-gray-900">
                  {getModuleRevenue(
                    PREMIUM_MODULES.filter(m => m.featureFlag && features[m.featureFlag]).map(m => m.id)
                  ).toLocaleString()} FCFA
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <Card className="premium-card">
            <CardHeader className="p-8 border-b bg-gray-50/30">
              <CardTitle className="text-2xl flex items-center gap-3">
                <Crown className="text-primary" />
                Abonnement
              </CardTitle>
              <CardDescription>Gérez votre plan et votre cycle de facturation.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="p-6 rounded-2xl border bg-white space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Plan actuel</p>
                  <p className="text-3xl font-headline font-bold text-gray-900">{boutique?.plan || "Essai"}</p>
                </div>
                <div className="p-6 rounded-2xl border bg-white space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Statut</p>
                  <Badge variant="outline" className={`rounded-lg text-sm font-black px-4 py-2 mt-1 ${
                    boutique?.status === "Actif" ? "bg-green-50 text-green-600 border-green-200" :
                    boutique?.status === "Suspendu" ? "bg-red-50 text-red-500 border-red-200" :
                    "bg-amber-50 text-amber-600 border-amber-200"
                  }`}>
                    {boutique?.status || "Essai"}
                  </Badge>
                </div>
                <div className="p-6 rounded-2xl border bg-white space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fin d'essai</p>
                  <p className="text-xl font-headline font-bold text-gray-900">
                    {boutique?.trial_ends_at ? new Date(boutique.trial_ends_at).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div className="p-6 rounded-2xl border bg-white space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Prochaine facturation</p>
                  <p className="text-xl font-headline font-bold text-gray-900">
                    {boutique?.subscription_ends_at ? new Date(boutique.subscription_ends_at).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
              <div className="p-6 rounded-2xl border bg-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-2xl h-12 w-12 rounded-xl bg-gray-50 flex items-center justify-center">
                    <Bell />
                  </div>
                  <div>
                    <Label className="font-bold text-lg block mb-1">Rapport quotidien par email</Label>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {isPro
                        ? "Recevez chaque matin le récapitulatif de la veille (CA, ventes, stocks)."
                        : "Disponible avec le plan Pro."}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={emailReports}
                  onCheckedChange={handleToggleEmailReports}
                  disabled={!isPro || togglingEmail}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              <div className="flex justify-end">
                <Button className="sena-gradient text-white h-12 px-8 rounded-xl font-bold shadow-lg">
                  <CreditCard className="mr-2 h-4" />
                  Mettre à niveau
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card className="premium-card">
            <CardHeader className="p-8 border-b bg-gray-50/30">
              <CardTitle className="text-2xl flex items-center gap-3">
                <Users className="text-primary" />
                Équipe
              </CardTitle>
              <CardDescription>Gérez les membres de votre boutique.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="p-6 rounded-2xl border bg-white space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Membres de l'équipe</p>
                <p className="text-4xl font-headline font-bold text-gray-900">{boutique?.team_members_count || 0}</p>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => navigate("/users")}
                  className="sena-gradient text-white h-12 px-8 rounded-xl font-bold shadow-lg"
                >
                  <Users className="mr-2 h-4" />
                  Gérer l'équipe
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
