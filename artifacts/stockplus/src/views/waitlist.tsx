import { useState, useEffect } from "react"
import { Link, useLocation } from "@/lib/compat/wouter"
import {
  Sparkles,
  ArrowRight,
  Store,
  User,
  Phone,
  Mail,
  Tag,
  Check,
  Loader2,
  Clock,
  PartyPopper,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

const BUSINESS_TYPES = [
  { value: "alimentation", label: "🛒 Épicerie / Alimentation" },
  { value: "textile", label: "🧵 Textile / Wax" },
  { value: "cosmetiques", label: "💄 Cosmétiques / Beauté" },
  { value: "electronique", label: "📱 Électronique / Téléphonie" },
  { value: "restaurant", label: "🍽️ Restaurant / Restauration" },
  { value: "quincaillerie", label: "🔨 Quincaillerie / Bricolage" },
  { value: "pharmacie", label: "💊 Pharmacie / Santé" },
  { value: "autre", label: "🏪 Autre commerce" },
]

export default function WaitlistPage() {
  const [, navigate] = useLocation()
  const { toast } = useToast()
  const [isMounted, setIsMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const [formData, setFormData] = useState({
    boutique_name: "",
    owner_name: "",
    phone: "",
    email: "",
    business_type: "",
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.boutique_name || !formData.owner_name || !formData.phone) {
      toast({
        variant: "destructive",
        title: "Champs requis",
        description: "Nom de boutique, nom du gérant et téléphone sont obligatoires.",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur')
      }

      setIsSuccess(true)
      toast({
        title: "Inscription réussie ! 🎉",
        description: "Vous êtes sur la liste d'attente. Nous vous contacterons bientôt.",
      })
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isMounted) return null

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] p-6 relative overflow-hidden">
        <div className="noise-overlay" />
        <div className="absolute inset-0 -z-10 overflow-hidden opacity-30">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary rounded-full blur-[150px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-100 rounded-full blur-[150px]" />
        </div>

        <Card className="w-full max-w-lg border-gray-100 shadow-2xl rounded-[3rem] bg-white overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 sena-gradient" />
          <CardContent className="p-12 space-y-8 text-center">
            <div className="h-24 w-24 rounded-3xl bg-green-50 flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="h-12 w-12 text-green-500" />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-headline font-bold text-gray-900 tracking-tighter">
                Vous êtes inscrit !
              </h1>
              <p className="text-gray-500 text-lg font-medium leading-relaxed">
                Merci pour votre intérêt dans StockPlus. Vous êtes maintenant sur notre liste d'attente.
                Nous vous contacterons dès qu'une place se libère pour la bêta.
              </p>
            </div>

            <div className="bg-orange-50 rounded-2xl p-6 space-y-3 text-left">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm font-medium text-gray-700">
                  Nous ouvrons les inscriptions progressivement pour garantir un accompagnement de qualité à chaque commerçant.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm font-medium text-gray-700">
                  Vous recevrez un appel ou un WhatsApp pour finaliser votre inscription.
                </p>
              </div>
            </div>

            <Button
              onClick={() => navigate("/")}
              className="w-full h-14 sena-gradient text-white font-headline font-bold text-xl rounded-2xl"
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] p-6 relative overflow-hidden">
      <div className="noise-overlay" />
      <div className="absolute inset-0 -z-10 overflow-hidden opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-100 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-xl">
        <Card className="border-gray-100 shadow-2xl rounded-[3rem] bg-white overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 sena-gradient" />
          <CardContent className="p-10 space-y-8">
            {/* Badge Bêta privée */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-black text-primary uppercase tracking-widest">Bêta privée — Inscriptions limitées</span>
              </div>
            </div>

            <div className="space-y-4 text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center">
                <img src="/logo.png" alt="StockPlus" className="h-16 w-16 object-contain" />
              </div>
              <div>
                <h1 className="text-3xl font-headline font-bold text-gray-900 tracking-tighter">
                  Rejoignez la liste d'attente
                </h1>
                <p className="text-gray-500 font-medium mt-2">
                  Soyez parmi les premiers à moderniser votre boutique avec StockPlus.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nom de la boutique *</Label>
                <div className="relative">
                  <Store className="absolute left-4 top-3.5 h-5 w-5 text-gray-300" />
                  <Input
                    placeholder="Ex: Boutique Keur'Geek"
                    value={formData.boutique_name}
                    onChange={(e) => setFormData({ ...formData, boutique_name: e.target.value })}
                    className="pl-12 h-14 rounded-2xl border-gray-100 bg-gray-50/30 font-bold focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nom du gérant *</Label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-300" />
                  <Input
                    placeholder="Prénom & Nom"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="pl-12 h-14 rounded-2xl border-gray-100 bg-gray-50/30 font-bold focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Téléphone (WhatsApp) *</Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 h-5 w-5 text-gray-300" />
                  <Input
                    type="tel"
                    placeholder="+221 78 000 00 00"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-12 h-14 rounded-2xl border-gray-100 bg-gray-50/30 font-bold focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Email <span className="text-gray-300 normal-case">(optionnel)</span></Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-300" />
                  <Input
                    type="email"
                    placeholder="votre@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-12 h-14 rounded-2xl border-gray-100 bg-gray-50/30 font-bold focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Type de commerce</Label>
                <Select onValueChange={(v) => setFormData({ ...formData, business_type: v })}>
                  <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/30 font-bold">
                    <SelectValue placeholder="Choisir un secteur" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {BUSINESS_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-16 sena-gradient text-white font-headline font-bold text-xl rounded-[2rem] shadow-2xl shadow-orange-500/20 mt-6"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-6 w-6 mr-2 animate-spin" /> Inscription...</>
                ) : (
                  <>Rejoindre la liste d'attente <ArrowRight className="ml-2 h-6 w-6" /></>
                )}
              </Button>
            </form>

            <div className="text-center">
              <Link href="/" className="text-xs font-bold text-gray-400 hover:text-primary transition-colors">
                ← Retour à l'accueil
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
