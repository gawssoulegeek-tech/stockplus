import { useState, useEffect } from "react"
import { Link, useLocation } from "@/lib/compat/wouter"
import { Sparkles, ArrowRight, Mail, Lock, Eye, EyeOff, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { signInUser } from "@/supabase/auth-service"
import { getSupabaseClient } from "@/supabase/client"
import { useToast } from "@/hooks/use-toast"
import Lottie from "lottie-react"

const LOADING_CUBE_URL = "/loading-cube.json"
const LOGIN_LOTTIE_URL = "/lottie/Login.json"

export default function LoginPage() {
  const [, navigate] = useLocation()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loadingData, setLoadingData] = useState<any>(null)
  const [loginLottieData, setLoginLottieData] = useState<any>(null)

  useEffect(() => {
    fetch(LOADING_CUBE_URL)
      .then(res => res.ok && res.json())
      .then(data => data && setLoadingData(data))
      .catch(err => console.warn("Lottie Load error", err))
    fetch(LOGIN_LOTTIE_URL)
      .then(res => res.ok && res.json())
      .then(data => data && setLoginLottieData(data))
      .catch(err => console.warn("Login Lottie Load error", err))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsLoading(true)

    try {
      const cleanEmail = email.trim().toLowerCase()
      const supabase = getSupabaseClient()

      const result = await signInUser(supabase, cleanEmail, password)

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Erreur de connexion",
          description: result.error || "Email ou mot de passe incorrect.",
        })
        setIsLoading(false)
        return
      }

      // ✅ Important : ne pas faire setIsLoading(false) avant la navigation
      // pour garder le loader visible pendant la transition.
      // Mais on utilise un timeout de sécurité au cas où la navigation échouerait.
      setTimeout(() => setIsLoading(false), 3000)

      navigate("/dashboard")

    } catch (error: any) {
      console.error("Auth Error:", error.message)
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: "Email ou mot de passe incorrect.",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4 relative overflow-hidden">
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-50 flex flex-col items-center justify-center">
          <div className="h-48 w-48">
            {loadingData && <Lottie animationData={loadingData} loop={true} />}
          </div>
          <p className="mt-4 font-headline font-bold text-2xl text-primary animate-pulse">Ouverture de session...</p>
        </div>
      )}

      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-200 rounded-full blur-[120px]" />
      </div>

      {loginLottieData && (
        <div className="hidden lg:block absolute left-[8%] top-1/2 -translate-y-1/2 w-[400px] h-[400px] opacity-80 pointer-events-none">
          <Lottie animationData={loginLottieData} loop={true} className="w-full h-full" />
        </div>
      )}

      <div className="w-full max-w-md space-y-8">
        <Card className="border-gray-100 shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="space-y-4 pt-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4">
              <img src="/logo.png" alt="StockPlus" className="h-16 w-16 object-contain" />
            </div>
            <CardTitle className="text-4xl font-headline font-bold text-primary tracking-tight">Espace Client</CardTitle>
            <CardDescription className="text-gray-500 font-medium text-lg">
              <span className="text-primary font-bold">Accédez</span> à la gestion de votre boutique.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold text-gray-700 ml-1">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-12 rounded-xl border-gray-100 bg-gray-50/30 focus-visible:ring-primary focus:bg-white transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <Label htmlFor="password" dir="ltr" className="text-sm font-bold text-gray-700">Mot de passe</Label>
                  <Link href="/password-reset" className="text-xs font-bold text-primary hover:underline">Oublié ?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12 h-12 rounded-xl border-gray-100 bg-gray-50/30 focus-visible:ring-primary focus:bg-white transition-all font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 h-5 w-5 text-gray-400 hover:text-primary transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 sena-gradient text-white font-bold text-xl rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                disabled={isLoading}
              >
                {isLoading ? "Connexion..." : "Ouvrir ma boutique"}
                {!isLoading && <ArrowRight className="ml-2 h-6 w-6" />}
              </Button>

              <div className="text-center pt-2">
                <div className="text-gray-400 font-medium text-sm">
                  Pas encore de compte ?{" "}
                  <Link href="/register" className="text-primary font-bold hover:underline inline-flex items-center gap-1">
                    <Store className="h-3 w-3" /> S'inscrire
                  </Link>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <div className="text-center space-y-2">
           <p className="font-headline font-bold text-gray-400 text-lg opacity-50 uppercase tracking-widest">Keur'Geek Digital</p>
        </div>
      </div>
    </div>
  )
}
