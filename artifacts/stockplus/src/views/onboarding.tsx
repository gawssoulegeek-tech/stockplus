import { useState, useEffect } from "react"
import { useLocation } from "@/lib/compat/wouter"
import Lottie from "lottie-react"
import {
  ChevronRight,
  ChevronLeft,
  BrainCircuit,
  ShoppingCart,
  LayoutGrid,
  Package,
  TrendingUp,
  Sparkles,
  Check,
  Store,
  Users,
  Target,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { getSupabaseClient } from "@/supabase/client"
import { useToast } from "@/hooks/use-toast"

const AWA_AVATAR_URL = "/awa-avatar.json"
const TUTORIAL_LOTTIE_URL = "https://lottie.host/c129ab85-a847-4276-bafc-f20aec6c1c7a/uRCLJDkr2t.json"

interface BusinessInfo {
  sector: string
  teamSize: string
  monthlyRevenue: string
  expectations: string
}

const SECTORS = [
  { value: "textile", label: "Textile & Wax", icon: "🧵" },
  { value: "electronics", label: "Électronique & Téléphonie", icon: "📱" },
  { value: "grocery", label: "Épicerie & Alimentation", icon: "🛒" },
  { value: "cosmetics", label: "Cosmétiques & Beauté", icon: "💄" },
  { value: "restaurant", label: "Restaurant & Restauration", icon: "🍽️" },
  { value: "hardware", label: "Quincaillerie & Bricolage", icon: "🔨" },
  { value: "pharmacy", label: "Pharmacie & Santé", icon: "💊" },
  { value: "other", label: "Autre commerce", icon: "🏪" },
]

const TEAM_SIZES = [
  { value: "solo", label: "Moi uniquement" },
  { value: "small", label: "2 à 5 gérants" },
  { value: "medium", label: "6 à 10 gérants" },
  { value: "large", label: "Plus de 10 gérants" },
]

const REVENUE_RANGES = [
  { value: "0-500k", label: "Moins de 500 000 FCFA" },
  { value: "500k-2m", label: "500 000 - 2 000 000 FCFA" },
  { value: "2m-10m", label: "2 000 000 - 10 000 000 FCFA" },
  { value: "10m+", label: "Plus de 10 000 000 FCFA" },
]

const TUTORIAL_SLIDES = [
  {
    icon: Package,
    title: "Gérez votre inventaire",
    description: "Ajoutez vos produits, suivez votre stock en temps réel. Recevez des alertes quand un produit est en rupture.",
    color: "bg-orange-50 text-primary",
    tips: [
      "Ajoutez vos produits avec leur prix d'achat et de vente",
      "Le stock se met à jour automatiquement à chaque vente",
      "Recevez des alertes quand le stock est faible",
    ],
  },
  {
    icon: ShoppingCart,
    title: "Vendez avec la Caisse Mobile",
    description: "Enregistrez vos ventes en quelques secondes. Scannez ou sélectionnez vos produits, c'est tout.",
    color: "bg-blue-50 text-blue-600",
    tips: [
      "Sélectionnez les produits vendus",
      "Choisissez le mode de paiement (espèces, mobile money, crédit)",
      "Le ticket se génère automatiquement",
    ],
  },
  {
    icon: TrendingUp,
    title: "Analysez vos performances",
    description: "Visualisez votre chiffre d'affaires, vos meilleurs produits et vos bénéfices en un coup d'œil.",
    color: "bg-green-50 text-green-600",
    tips: [
      "Dashboard en temps réel avec CA du jour",
      "Graphiques sur 7 jours pour suivre les tendances",
      "Alertes stock faible et insights IA par Awa",
    ],
  },
  {
    icon: Sparkles,
    title: "L'IA Awa vous accompagne",
    description: "Awa analyse vos ventes et vous donne des recommandations pour optimiser votre boutique.",
    color: "bg-purple-50 text-purple-600",
    tips: [
      "Insights automatiques sur vos ventes",
      "Recommandations de réapprovisionnement",
      "Scan de factures fournisseurs et photos produits",
    ],
  },
]

export default function OnboardingPage() {
  const [, navigate] = useLocation()
  const { toast } = useToast()
  const [step, setStep] = useState(1) // 1=questionnaire, 2=tutorial, 3=done
  const [tutorialSlide, setTutorialSlide] = useState(0)
  const [isMounted, setIsMounted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [boutiqueName, setBoutiqueName] = useState("votre boutique")
  const [uid, setUid] = useState<string | null>(null)

  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    sector: "",
    teamSize: "",
    monthlyRevenue: "",
    expectations: "",
  })

  useEffect(() => {
    setIsMounted(true)

    const init = async () => {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        navigate("/login")
        return
      }
      setUid(session.user.id)

      // Récupérer le nom de la boutique
      const { data: profile } = await supabase
        .from("users")
        .select("boutique_id, name")
        .eq("uid", session.user.id)
        .maybeSingle()

      if (profile?.boutique_id) {
        const { data: boutique } = await supabase
          .from("boutiques")
          .select("name")
          .eq("id", profile.boutique_id)
          .maybeSingle()
        if (boutique?.name) setBoutiqueName(boutique.name)
      }

      // Vérifier si l'onboarding est déjà fait
      const { data: user } = await supabase
        .from("users")
        .select("onboarding_completed, business_sector, business_team_size, business_monthly_revenue, business_expectations")
        .eq("uid", session.user.id)
        .maybeSingle()

      if (user?.onboarding_completed) {
        navigate("/dashboard")
        return
      }

      // Pré-remplir si des données existent
      if (user?.business_sector) {
        setBusinessInfo({
          sector: user.business_sector || "",
          teamSize: user.business_team_size || "",
          monthlyRevenue: user.business_monthly_revenue || "",
          expectations: user.business_expectations || "",
        })
      }
    }
    init()
  }, [navigate])

  const saveQuestionnaire = async () => {
    if (!uid) return
    setIsSaving(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from("users")
        .update({
          business_sector: businessInfo.sector,
          business_team_size: businessInfo.teamSize,
          business_monthly_revenue: businessInfo.monthlyRevenue,
          business_expectations: businessInfo.expectations,
          onboarding_step: 2,
        })
        .eq("uid", uid)

      if (error) {
        console.warn("[onboarding] Save questionnaire error (non-bloquant):", error.message)
        // Si erreur de colonne manquante, on continue quand même vers le didacticiel
      }
      setStep(2)
    } catch (e: any) {
      console.error("Save questionnaire error:", e)
      // Non-bloquant : on continue vers le didacticiel même si la sauvegarde échoue
      setStep(2)
    } finally {
      setIsSaving(false)
    }
  }

  const completeOnboarding = async () => {
    if (!uid) return
    setIsSaving(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from("users")
        .update({
          onboarding_completed: true,
          onboarding_step: 3,
        })
        .eq("uid", uid)

      if (error) {
        console.warn("[onboarding] Complete error (non-bloquant):", error.message)
      }

      toast({
        title: "Bienvenue sur StockPlus ! 🎉",
        description: "Votre compte est prêt. Vous pouvez maintenant gérer votre boutique.",
      })

      navigate("/dashboard")
    } catch (e: any) {
      console.error("Complete onboarding error:", e)
      // Non-bloquant : on va au dashboard même si la sauvegarde échoue
      navigate("/dashboard")
    } finally {
      setIsSaving(false)
    }
  }

  const canProceedQuestionnaire = businessInfo.sector && businessInfo.teamSize && businessInfo.monthlyRevenue

  if (!isMounted) return null

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="noise-overlay" />

      <div className="w-full max-w-4xl space-y-8 relative z-10">
        {/* Header avec progression */}
        <div className="space-y-4 text-center">
          <div className="inline-flex h-20 w-20 rounded-[2rem] sena-gradient items-center justify-center mb-2 overflow-hidden shadow-2xl shadow-orange-500/20">
            <Lottie path={AWA_AVATAR_URL} loop={true} className="w-full h-full scale-125" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-gray-900 tracking-tighter">
              {step === 1 ? `Bienvenue, ${boutiqueName}` : step === 2 ? "Didacticiel StockPlus" : "C'est prêt !"}
            </h1>
            <p className="text-gray-400 font-medium">
              {step === 1
                ? "Quelques questions pour personnaliser votre expérience."
                : step === 2
                  ? "Découvrez comment utiliser StockPlus en 4 étapes."
                  : "Votre compte est configuré et prêt à l'emploi."}
            </p>
          </div>
          <div className="max-w-md mx-auto space-y-3">
            <Progress value={(step / 3) * 100} className="h-1.5 bg-gray-100" />
            <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">
              Étape {step} / 3 — {step === 1 ? "Profil" : step === 2 ? `Slide ${tutorialSlide + 1}/${TUTORIAL_SLIDES.length}` : "Terminé"}
            </div>
          </div>
        </div>

        {/* ÉTAPE 1 : QUESTIONNAIRE */}
        {step === 1 && (
          <Card className="border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] rounded-[4rem] bg-white overflow-hidden p-10 md:p-12">
            <CardContent className="p-0 space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                  <BrainCircuit className="text-primary h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-headline font-bold text-gray-900">Parlez-nous de votre activité</h2>
                  <p className="text-sm text-gray-400 font-medium">Cela aide Awa à mieux vous servir.</p>
                </div>
              </div>

              {/* Secteur */}
              <div className="space-y-3">
                <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                  <Store className="h-3 w-3 inline mr-1" />
                  Secteur d'activité
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SECTORS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setBusinessInfo({ ...businessInfo, sector: s.value })}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                        businessInfo.sector === s.value
                          ? "border-primary bg-orange-50"
                          : "border-gray-100 hover:border-gray-200 bg-white"
                      )}
                    >
                      <span className="text-2xl">{s.icon}</span>
                      <span className="text-xs font-bold text-gray-700 text-center leading-tight">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Taille équipe + Revenus */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                    <Users className="h-3 w-3 inline mr-1" />
                    Taille de l'équipe
                  </Label>
                  <Select onValueChange={(val) => setBusinessInfo({ ...businessInfo, teamSize: val })} value={businessInfo.teamSize}>
                    <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold">
                      <SelectValue placeholder="Nombre de gérants" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                      {TEAM_SIZES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    Revenu mensuel estimé
                  </Label>
                  <Select onValueChange={(val) => setBusinessInfo({ ...businessInfo, monthlyRevenue: val })} value={businessInfo.monthlyRevenue}>
                    <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold">
                      <SelectValue placeholder="Fourchette de revenu" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                      {REVENUE_RANGES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Attentes */}
              <div className="space-y-3">
                <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                  <Target className="h-3 w-3 inline mr-1" />
                  Qu'attendez-vous de StockPlus ? (optionnel)
                </Label>
                <Input
                  placeholder="Ex: Gérer mon stock plus facilement, suivre mes ventes..."
                  value={businessInfo.expectations}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, expectations: e.target.value })}
                  className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-medium"
                />
              </div>

              <Button
                disabled={!canProceedQuestionnaire || isSaving}
                onClick={saveQuestionnaire}
                className="w-full h-16 sena-gradient text-white font-headline font-bold text-xl rounded-[2rem] shadow-2xl shadow-orange-500/20"
              >
                {isSaving ? "Sauvegarde..." : "Passer au didacticiel"}
                {!isSaving && <ChevronRight className="ml-2 h-6 w-6" />}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ÉTAPE 2 : TUTORIEL */}
        {step === 2 && (
          <div className="space-y-6">
            <Card className="border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] rounded-[4rem] bg-white overflow-hidden p-10 md:p-12">
              <CardContent className="p-0 space-y-8">
                {/* Slide actuel */}
                {(() => {
                  const slide = TUTORIAL_SLIDES[tutorialSlide]
                  const SlideIcon = slide.icon
                  return (
                    <div className="space-y-8">
                      {/* Lottie animation */}
                      <div className="flex justify-center">
                        <div className="h-40 w-40 md:h-48 md:w-48">
                          <Lottie path={TUTORIAL_LOTTIE_URL} loop={true} className="w-full h-full" />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center", slide.color)}>
                          <SlideIcon className="h-7 w-7" />
                        </div>
                        <div className="flex-1">
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Slide {tutorialSlide + 1} sur {TUTORIAL_SLIDES.length}
                          </div>
                          <h2 className="text-2xl font-headline font-bold text-gray-900">{slide.title}</h2>
                        </div>
                      </div>

                      <p className="text-gray-600 text-lg font-medium leading-relaxed">{slide.description}</p>

                      <div className="space-y-3">
                        {slide.tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50">
                            <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="h-4 w-4 text-green-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 leading-relaxed">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Indicateurs de progression */}
                <div className="flex justify-center gap-2 pt-4">
                  {TUTORIAL_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setTutorialSlide(i)}
                      className={cn(
                        "h-2 rounded-full transition-all",
                        i === tutorialSlide ? "w-8 bg-primary" : "w-2 bg-gray-200 hover:bg-gray-300"
                      )}
                    />
                  ))}
                </div>

                {/* Boutons navigation */}
                <div className="flex gap-3 pt-4">
                  {tutorialSlide > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setTutorialSlide(tutorialSlide - 1)}
                      className="h-14 rounded-2xl font-bold border-gray-200 px-8"
                    >
                      <ChevronLeft className="h-5 w-5 mr-1" />
                      Précédent
                    </Button>
                  )}

                  {tutorialSlide < TUTORIAL_SLIDES.length - 1 ? (
                    <Button
                      onClick={() => setTutorialSlide(tutorialSlide + 1)}
                      className="flex-1 h-14 sena-gradient text-white font-headline font-bold text-lg rounded-2xl"
                    >
                      Suivant
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setStep(3)}
                      className="flex-1 h-14 sena-gradient text-white font-headline font-bold text-lg rounded-2xl"
                    >
                      Terminer le didacticiel
                      <Check className="ml-2 h-5 w-5" />
                    </Button>
                  )}
                </div>

                <button
                  onClick={() => setStep(3)}
                  className="w-full text-center text-xs font-bold text-gray-400 hover:text-gray-600 py-2"
                >
                  Passer le didacticiel →
                </button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ÉTAPE 3 : FINAL */}
        {step === 3 && (
          <Card className="border-none shadow-[0_60px_150px_-30px_rgba(0,0,0,0.15)] rounded-[5rem] bg-white overflow-hidden p-10 md:p-16 text-center space-y-10 relative">
            <div className="absolute top-0 left-0 w-full h-3 sena-gradient" />

            <div className="space-y-6">
              <div className="h-32 w-32 rounded-[2.5rem] sena-gradient flex items-center justify-center mx-auto shadow-2xl shadow-orange-500/30 overflow-hidden">
                <Lottie path={AWA_AVATAR_URL} loop={true} className="w-full h-full scale-125" />
              </div>
              <div className="space-y-3">
                <h2 className="text-4xl md:text-5xl font-headline font-bold text-gray-900 tracking-tighter">
                  {boutiqueName} est prête !
                </h2>
                <p className="text-gray-400 font-medium text-lg">
                  Votre compte est configuré. Vous pouvez maintenant gérer votre boutique avec StockPlus.
                </p>
              </div>
            </div>

            {/* Récap */}
            <div className="bg-gray-50 rounded-3xl p-6 space-y-3">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Récapitulatif</div>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <div className="text-xs text-gray-400 font-bold">Secteur</div>
                  <div className="text-sm font-bold text-gray-900">
                    {SECTORS.find(s => s.value === businessInfo.sector)?.label || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-bold">Équipe</div>
                  <div className="text-sm font-bold text-gray-900">
                    {TEAM_SIZES.find(t => t.value === businessInfo.teamSize)?.label || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-bold">Revenu mensuel</div>
                  <div className="text-sm font-bold text-gray-900">
                    {REVENUE_RANGES.find(r => r.value === businessInfo.monthlyRevenue)?.label || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-bold">Statut</div>
                  <div className="text-sm font-bold text-green-600">Essai 14 jours</div>
                </div>
              </div>
            </div>

            <Button
              onClick={completeOnboarding}
              disabled={isSaving}
              className="w-full h-20 sena-gradient text-white font-headline font-bold text-2xl rounded-[2.5rem] shadow-2xl shadow-orange-500/40 active:scale-95 transition-all"
            >
              {isSaving ? "Activation..." : "Lancer StockPlus"}
              {!isSaving && <ArrowRight className="ml-3 h-7 w-7" />}
            </Button>

            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.6em] pt-2">
              Keur'Geek Digital Technology
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
