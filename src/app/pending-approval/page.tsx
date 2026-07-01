"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Clock, CheckCircle2, Loader2, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseClient } from "@/supabase/client"

export default function PendingApprovalPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'pending' | 'approved'>('loading')

  useEffect(() => {
    const check = async () => {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('users')
        .select('boutique_id')
        .eq('uid', session.user.id)
        .single()
      if (profile?.boutique_id) {
        const { data: boutique } = await supabase
          .from('boutiques')
          .select('status')
          .eq('id', profile.boutique_id)
          .single()
        if (boutique?.status === 'en_attente') {
          setStatus('pending')
        } else {
          setStatus('approved')
        }
      } else {
        setStatus('pending')
      }
    }
    check()
    const interval = setInterval(check, 10000)
    return () => clearInterval(interval)
  }, [router])

  const handleLogout = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FCFCFC] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    )
  }

  if (status === 'approved') {
    router.push('/onboarding')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg border-gray-100 shadow-2xl rounded-[3rem] bg-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 sena-gradient" />
        <CardHeader className="space-y-4 pt-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-orange-50 flex items-center justify-center mb-4">
            <Clock className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold text-gray-900 tracking-tighter">
            Inscription soumise
          </CardTitle>
          <CardDescription className="text-gray-500 text-lg font-medium">
            Votre demande de création de boutique est en cours de vérification par notre équipe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-12 px-8">
          <div className="bg-orange-50 rounded-2xl p-6 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm font-medium text-gray-700">
                Vous recevrez un email dès que votre compte sera activé.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm font-medium text-gray-700">
                Cette page se met à jour automatiquement dès l&apos;approbation.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full h-14 rounded-2xl font-bold border-gray-200"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Retour à l&apos;accueil
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
