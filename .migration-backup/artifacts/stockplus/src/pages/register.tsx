import { useState, Suspense } from "react"
import { Link, useLocation, useSearchParams } from "wouter"
import { Sparkles, ArrowRight, Mail, Lock, Store, User, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/supabase/client"

function RegisterForm() {
  const [, navigate] = useLocation()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    boutiqueName: "",
    ownerName: "",
    email: "",
    password: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsLoading(true)
    try {
      // Call the signup API route
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          ownerName: formData.ownerName,
          boutiqueName: formData.boutiqueName,
          plan: searchParams[0].get('plan') || 'Basic',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Erreur d'inscription",
          description: data.error || "Une erreur est survenue lors de la création de votre profil.",
        })
        setIsLoading(false)
        return
      }

      // Success! Establish a client-side session so downstream pages
      // (which read the session directly from the browser Supabase client)
      // recognize the user as authenticated.
      const supabase = getSupabaseClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (signInError) {
        console.error("Post-signup sign-in error:", signInError)
        toast({
          variant: "destructive",
          title: "Compte créé, mais connexion impossible",
          description: "Veuillez vous connecter manuellement avec vos identifiants.",
        })
        navigate("/login")
        setIsLoading(false)
        return
      }

      if (data.pending) {
        toast({
          title: "Inscription soumise !",
          description: "Votre compte est en attente d'approbation par un administrateur.",
        })
        navigate("/pending-approval")
      } else {
        toast({
          title: "Boutique créée !",
          description: "Bienvenue sur StockPlus. Votre accès est prêt.",
        })
        navigate("/onboarding")
      }
      
    } catch (error: any) {
      console.error("Registration flow error:", error)
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: error.message || "Une erreur est survenue lors de la création de votre profil.",
      })
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-gray-100 shadow-2xl rounded-[3rem] bg-white overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-2 sena-gradient" />
      <CardHeader className="space-y-4 pt-16 text-center">
        <div className="mx-auto h-20 w-20 rounded-3xl sena-gradient flex items-center justify-center shadow-2xl shadow-orange-500/20 mb-4">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        <CardTitle className="text-4xl font-headline font-bold text-gray-900 tracking-tighter">Lancez votre boutique</CardTitle>
        <CardDescription className="text-gray-500 font-medium text-lg">
          Créez votre compte administrateur <span className="text-primary font-bold">StockPlus</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-10 pt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nom de la Boutique</Label>
            <div className="relative">
              <Store className="absolute left-4 top-3.5 h-5 w-5 text-gray-300" />
              <Input
                placeholder="Ex: Boutique Keur'Geek"
                value={formData.boutiqueName}
                onChange={(e) => setFormData({...formData, boutiqueName: e.target.value})}
                className="pl-12 h-14 rounded-2xl border-gray-100 bg-gray-50/30 font-bold focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nom complet</Label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-300" />
              <Input
                placeholder="Prénom & Nom"
                value={formData.ownerName}
                onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
                className="pl-12 h-14 rounded-2xl border-gray-100 bg-gray-50/30 font-bold focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email professionnel</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-300" />
              <Input
                type="email"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="pl-12 h-14 rounded-2xl border-gray-100 bg-gray-50/30 font-bold focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-300" />
              <Input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="pl-12 h-14 rounded-2xl border-gray-100 bg-gray-50/30 font-bold focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-18 sena-gradient text-white font-headline font-bold text-xl rounded-[2rem] shadow-2xl shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] mt-6 py-8"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "Créer ma Boutique"}
            {!isLoading && <ArrowRight className="ml-2 h-6 w-6" />}
          </Button>

          <div className="flex items-center justify-center gap-2 pt-6">
            <Link href="/login" className="text-xs font-bold text-gray-400 hover:text-primary flex items-center gap-2 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Déjà un compte ? Se connecter
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] p-6 relative">
      <div className="noise-overlay" />
      <div className="absolute inset-0 -z-10 overflow-hidden opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-100 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-xl">
        <Suspense fallback={<div className="text-center font-headline font-bold">Initialisation...</div>}>
          <RegisterForm />
        </Suspense>
        
        <div className="text-center mt-12 space-y-3">
           <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">Powered by</p>
           <p className="font-headline font-bold text-gray-900 text-xl tracking-tighter">Keur'Geek Digital Technology</p>
        </div>
      </div>
    </div>
  )
}
