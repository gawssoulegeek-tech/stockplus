"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, XCircle, Loader2, LogIn, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseClient } from "@/supabase/client"
import { invitationService } from "@/services/invitationService"
import Link from "next/link"

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationId = searchParams.get('id')

  const [status, setStatus] = useState<'loading' | 'login' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')
  const [invitation, setInvitation] = useState<any>(null)

  useEffect(() => {
    if (!invitationId) {
      setStatus('error')
      setError('Lien d\'invitation invalide.')
      return
    }

    const checkInvitation = async () => {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Fetch invitation details
      const { data: inv, error: invError } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', invitationId)
        .single()

      if (invError || !inv) {
        setStatus('error')
        setError('Invitation introuvable ou expirée.')
        return
      }

      if (inv.status !== 'pending') {
        setStatus('error')
        setError('Cette invitation a déjà été utilisée ou révoquée.')
        return
      }

      setInvitation(inv)

      if (!user) {
        setStatus('login')
        return
      }

      // User is logged in, accept the invitation
      await acceptInvitation(supabase, inv, user.id)
    }

    checkInvitation()
  }, [invitationId])

  const acceptInvitation = async (supabase: any, inv: any, userId: string) => {
    try {
      // Update user's boutique_id and role
      await supabase.from('users').update({
        boutique_id: inv.boutique_id,
        role: inv.invited_role,
        updated_at: new Date().toISOString(),
      }).eq('uid', userId)

      // Mark invitation as accepted
      await invitationService.accept(supabase, inv.id, userId)

      // Audit log
      await supabase.from('audit_logs').insert({
        boutique_id: inv.boutique_id,
        actor_id: userId,
        action: 'invitation_accepted',
        entity_type: 'invitations',
        entity_id: inv.id,
        notes: `Invitation acceptée par ${inv.invited_email}`,
        status: 'success',
        created_at: new Date().toISOString(),
      })

      setStatus('success')
    } catch (e: any) {
      setStatus('error')
      setError(e.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
      <Card className="w-full max-w-md border-gray-100 shadow-2xl rounded-[2.5rem]">
        <CardHeader className="text-center pt-12 space-y-4">
          {status === 'loading' && (
            <>
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <CardTitle className="text-2xl font-headline">Vérification de l'invitation...</CardTitle>
            </>
          )}
          {status === 'login' && (
            <>
              <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Mail className="h-8 w-8 text-amber-500" />
              </div>
              <CardTitle className="text-2xl font-headline">Vous êtes invité !</CardTitle>
              <CardDescription>
                {invitation?.invited_email} — Connectez-vous pour rejoindre l'équipe.
              </CardDescription>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="mx-auto h-16 w-16 rounded-2xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-2xl font-headline">Invitation acceptée !</CardTitle>
              <CardDescription>
                Vous faites maintenant partie de l'équipe.
              </CardDescription>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="mx-auto h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-headline">Erreur</CardTitle>
              <CardDescription>{error}</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="p-8 pt-4 text-center">
          {status === 'login' && (
            <Button asChild className="w-full h-14 rounded-2xl font-bold text-lg sena-gradient shadow-lg shadow-orange-500/20">
              <Link href="/login">
                <LogIn className="h-5 w-5 mr-3" />
                Se connecter
              </Link>
            </Button>
          )}
          {status === 'success' && (
            <Button asChild className="w-full h-14 rounded-2xl font-bold text-lg sena-gradient shadow-lg shadow-orange-500/20">
              <Link href="/dashboard">
                Accéder au tableau de bord
              </Link>
            </Button>
          )}
          {status === 'error' && (
            <Button asChild variant="outline" className="rounded-2xl h-14 font-bold">
              <Link href="/login">
                Retour à la connexion
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}
