import { useState, useEffect } from "react"
import Lottie from "lottie-react"
import { Link, useLocation } from "@/lib/compat/wouter"
import { Sparkles, ArrowRight, Mail, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { resetPassword } from "@/supabase/auth-service"
import { getSupabaseClient } from "@/supabase/client"

const PIN_CODE_URL = "/lottie/Pin code Password Protection, Secure Login animation.json"

export default function PasswordResetPage() {
  const [, navigate] = useLocation()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [pinCodeData, setPinCodeData] = useState<any>(null)

  useEffect(() => {
    fetch(PIN_CODE_URL)
      .then(res => res.ok && res.json())
      .then(data => data && setPinCodeData(data))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast({
        variant: "destructive",
        title: "Email requis",
        description: "Veuillez entrer votre adresse email.",
      })
      return
    }

    setIsLoading(true)

    try {
      const supabase = getSupabaseClient()
      const result = await resetPassword(supabase, email)

      if (!result.success) {
        toast({
          variant: "destructive",
          title: result.message,
          description: result.error || "Une erreur est survenue.",
        })
        setIsLoading(false)
        return
      }

      setIsSubmitted(true)
      toast({
        title: "Email envoyé !",
        description: "Vérifiez votre email pour réinitialiser votre mot de passe.",
      })
    } catch (error: any) {
      console.error("Password reset error:", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la réinitialisation.",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-200 rounded-full blur-[120px]" />
      </div>

      {pinCodeData && (
        <div className="hidden lg:block absolute right-[8%] top-1/2 -translate-y-1/2 w-[350px] h-[350px] opacity-70 pointer-events-none">
          <Lottie animationData={pinCodeData} loop={true} className="w-full h-full" />
        </div>
      )}

      <div className="w-full max-w-md space-y-8">
        <Card className="border-gray-100 shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="space-y-4 pt-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl sena-gradient flex items-center justify-center shadow-xl shadow-orange-500/20 mb-4">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-4xl font-headline font-bold text-primary tracking-tight">
              Réinitialiser mot de passe
            </CardTitle>
            <CardDescription className="text-gray-500 font-medium text-lg">
              Entrez votre email pour recevoir les instructions de réinitialisation.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-4">
            {isSubmitted ? (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                  <h3 className="font-bold text-green-900 text-lg mb-2">Email envoyé avec succès</h3>
                  <p className="text-green-700 text-sm">
                    Vérifiez votre boîte mail pour les instructions de réinitialisation.
                  </p>
                </div>

                <Link href="/login" className="block">
                  <Button
                    className="w-full h-14 sena-gradient text-white font-bold text-xl rounded-2xl shadow-xl shadow-orange-500/20"
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" /> Retour à la connexion
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-bold text-gray-700 ml-1">
                    Email
                  </Label>
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

                <Button
                  type="submit"
                  className="w-full h-14 sena-gradient text-white font-bold text-xl rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-5 w-5" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      Envoyer les instructions
                      <ArrowRight className="ml-2 h-6 w-6" />
                    </>
                  )}
                </Button>

                <div className="text-center pt-2">
                  <Link href="/login" className="text-primary font-bold hover:underline inline-flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" /> Retour à la connexion
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <p className="font-headline font-bold text-gray-400 text-lg opacity-50 uppercase tracking-widest">Keur'Geek Digital</p>
        </div>
      </div>
    </div>
  )
}
