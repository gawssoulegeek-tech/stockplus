import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getFeaturesForPlan, isValidPlan, MAX_GERANTS } from '@/lib/plan-features'
import { sendBoutiqueApprovedEmail, sendBoutiqueRefusedEmail, sendBoutiqueStatusChangedEmail } from '@/lib/email-server'

const LOG = (step: string, data?: unknown) => console.info(`[SAAS-BOUTIQUES] ${step}`, data ?? '')

async function getOwnerEmail(adminClient: SupabaseClient, ownerId: string | null | undefined): Promise<string | null> {
  if (!ownerId) return null
  const { data: owner } = await adminClient.from('users').select('email').eq('uid', ownerId).single()
  return (owner as { email?: string } | null)?.email || null
}

async function checkSuperadmin(authHeader: string | null, adminClient: SupabaseClient): Promise<{ ok: boolean; error?: string; status?: number }> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, error: 'Authentification requise', status: 401 }
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !user) {
    return { ok: false, error: 'Session invalide', status: 401 }
  }
  const { data: profile } = await adminClient.from('users').select('role').eq('uid', user.id).single()
  if (!profile || (profile as { role: string }).role !== 'superadmin') {
    return { ok: false, error: 'Accès superadmin requis', status: 403 }
  }
  return { ok: true }
}

export async function PATCH(req: NextRequest) {
  try {
    let adminClient
    try {
      adminClient = getSupabaseAdminClient()
    } catch {
      return Response.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }

    const check = await checkSuperadmin(req.headers.get('authorization'), adminClient)
    if (!check.ok) return Response.json({ error: check.error }, { status: check.status })

    const body = await req.json().catch(() => ({}))
    const { id, action, ...data } = body ?? {}

    // L'action 'create' n'a pas besoin d'id (il est généré plus tard)
    if (action !== 'create' && !id) {
      return Response.json({ error: 'id requis' }, { status: 400 })
    }
    if (!action) {
      return Response.json({ error: 'action requise' }, { status: 400 })
    }

    switch (action) {
      case 'create': {
        LOG('=== Création boutique par admin ===')
        const { name, ownerName, ownerEmail, plan } = data as {
          name?: string; ownerName?: string; ownerEmail?: string; plan?: string
        }
        LOG('Données reçues', { name, ownerName, ownerEmail, plan })

        if (!name || !ownerName || !ownerEmail) {
          return Response.json({ error: 'Champs requis : name, ownerName, ownerEmail' }, { status: 400 })
        }

        const normalizedEmail = String(ownerEmail).trim().toLowerCase()
        const tempPassword = `Temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

        // Étape 1 : Créer l'utilisateur Auth
        LOG('Étape 1 : création Auth user...', { email: normalizedEmail })
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { name: ownerName },
        })

        if (authError) {
          LOG('ÉCHEC Étape 1 (createUser)', { message: authError.message, code: (authError as { code?: string }).code })
          return Response.json({
            error: `Erreur création utilisateur: ${authError.message}`,
            code: (authError as { code?: string }).code ?? undefined,
          }, { status: (authError as { status?: number }).status ?? 400 })
        }

        if (!authData.user) {
          return Response.json({ error: 'Échec création compte utilisateur' }, { status: 500 })
        }

        const uid = authData.user.id
        LOG('Étape 1 OK', { uid })

        // Étape 2 : Créer le profil dans public.users
        const selectedPlan = isValidPlan(plan) ? plan : 'Essai'
        const permissions = {
          canManageUsers: true, canDeleteSales: true, canManageFeatures: true,
          canViewReports: true, canUseAdvancedIA: true, canExportData: true,
          canManageProducts: true, canManageInventory: true,
        }

        LOG('Étape 2 : insertion public.users...', { uid, role: 'owner' })
        const { error: userInsertError } = await adminClient.from('users').insert({
          uid,
          email: normalizedEmail,
          name: ownerName,
          role: 'owner',
          boutique_id: null,
          permissions,
          created_at: new Date().toISOString(),
        })

        if (userInsertError) {
          LOG('ÉCHEC Étape 2 (insert users)', userInsertError)
          // Nettoyage : supprimer l'utilisateur Auth
          await adminClient.auth.admin.deleteUser(uid).catch(e =>
            LOG('Cleanup : échec suppression auth user', e)
          )
          return Response.json({
            error: `Erreur création profil: ${userInsertError.message}`,
            code: userInsertError.code,
          }, { status: 500 })
        }

        // Étape 3 : Créer la boutique
        const boutiqueId = `boutique_${Date.now()}`
        const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

        LOG('Étape 3 : insertion public.boutiques...', { boutiqueId, name, plan: selectedPlan })
        const { error: boutiqueInsertError } = await adminClient.from('boutiques').insert({
          id: boutiqueId,
          name,
          owner_id: uid,
          plan: selectedPlan,
          status: 'Essai',
          trial_ends_at: trialEndsAt,
          features: getFeaturesForPlan(selectedPlan),
          team_members_count: MAX_GERANTS[selectedPlan] || 1,
          is_active: true,
          created_at: new Date().toISOString(),
        })

        if (boutiqueInsertError) {
          LOG('ÉCHEC Étape 3 (insert boutique)', boutiqueInsertError)
          // Nettoyage
          await adminClient.from('users').delete().eq('uid', uid).catch(e =>
            LOG('Cleanup : échec suppression users', e)
          )
          await adminClient.auth.admin.deleteUser(uid).catch(e =>
            LOG('Cleanup : échec suppression auth user', e)
          )
          return Response.json({
            error: `Erreur création boutique: ${boutiqueInsertError.message}`,
            code: boutiqueInsertError.code,
          }, { status: 500 })
        }

        // Étape 4 : Lier le profil à la boutique
        LOG('Étape 4 : mise à jour boutique_id sur users...')
        const { error: updateError } = await adminClient.from('users')
          .update({ boutique_id: boutiqueId })
          .eq('uid', uid)

        if (updateError) {
          LOG('ÉCHEC Étape 4 (update users.boutique_id)', updateError)
          // Non-bloquant : la boutique existe déjà
        }

        LOG('✅ Création boutique terminée avec succès', { uid, boutiqueId })
        return Response.json({
          ok: true,
          boutique: { id: boutiqueId, name, plan: selectedPlan, ownerId: uid, ownerEmail: normalizedEmail },
        }, { status: 201 })
      }

      case 'approve': {
        const { data: bout } = await adminClient.from('boutiques').select('plan, name, owner_id').eq('id', id).single()
        if (!bout) return Response.json({ error: 'Boutique introuvable' }, { status: 404 })
        const b = bout as { plan: string; name: string; owner_id: string | null }
        const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        await adminClient.from('boutiques').update({ status: 'Essai', trial_ends_at: trialEndsAt, team_members_count: 1, is_active: true }).eq('id', id)
        const ownerEmail = await getOwnerEmail(adminClient, b.owner_id)
        if (ownerEmail) void sendBoutiqueApprovedEmail(ownerEmail, b.name, trialEndsAt)
        return Response.json({ ok: true })
      }
      case 'toggle-status': {
        const { data: boutique } = await adminClient.from('boutiques').select('status, name, owner_id').eq('id', id).single()
        if (!boutique) return Response.json({ error: 'Boutique introuvable' }, { status: 404 })
        const b = boutique as { status: string; name: string; owner_id: string | null }
        const newStatus = b.status === 'Actif' ? 'Suspendu' : 'Actif'
        await adminClient.from('boutiques').update({ status: newStatus }).eq('id', id)
        const ownerEmail = await getOwnerEmail(adminClient, b.owner_id)
        if (ownerEmail) void sendBoutiqueStatusChangedEmail(ownerEmail, b.name, newStatus as 'Actif' | 'Suspendu')
        return Response.json({ ok: true, status: newStatus })
      }
      case 'delete': {
        await adminClient.from('boutiques').delete().eq('id', id)
        return Response.json({ ok: true })
      }
      case 'refuse': {
        const { data: bout } = await adminClient.from('boutiques').select('name, owner_id').eq('id', id).single()
        // ✅ On garde 'refuse' comme valeur, qui est maintenant dans l'enum boutique_status
        // (voir supabase/migrations/000_complete_schema.sql)
        await adminClient.from('boutiques').update({ status: 'refuse', is_active: false }).eq('id', id)
        if (bout) {
          const b = bout as { name: string; owner_id: string | null }
          const ownerEmail = await getOwnerEmail(adminClient, b.owner_id)
          if (ownerEmail) void sendBoutiqueRefusedEmail(ownerEmail, b.name)
        }
        return Response.json({ ok: true })
      }
      case 'cycle-plan': {
        const { data: bout } = await adminClient.from('boutiques').select('plan, status').eq('id', id).single()
        if (!bout) return Response.json({ error: 'Boutique introuvable' }, { status: 404 })
        const b = bout as { plan: string; status: string }
        const PAID_PLANS = ['Basic', 'Pro', 'Premium']
        const currentIndex = PAID_PLANS.indexOf(b.plan)
        const newPlan = currentIndex === -1 ? 'Basic' : PAID_PLANS[(currentIndex + 1) % PAID_PLANS.length]
        await adminClient.from('boutiques').update({ plan: newPlan, status: b.status === 'Essai' ? 'Actif' : b.status }).eq('id', id)
        return Response.json({ ok: true, plan: newPlan })
      }
      case 'activate-payment': {
        const { shopName, paymentId, planToSet } = data as { shopName?: string; paymentId?: string; planToSet?: string }
        if (!shopName || !paymentId) {
          return Response.json({ error: 'shopName et paymentId requis' }, { status: 400 })
        }
        const { data: shops } = await adminClient.from('boutiques').select('id, plan').eq('name', shopName)
        if (!shops || shops.length === 0) return Response.json({ error: 'Boutique introuvable' }, { status: 404 })
        const finalPlan = planToSet || (shops as { plan: string }[])[0].plan
        await adminClient.from('boutiques').update({ status: 'Actif', plan: finalPlan }).eq('name', shopName)
        await adminClient.from('payments').update({ status: 'completed' }).eq('id', paymentId)
        return Response.json({ ok: true })
      }
      default:
        return Response.json({ error: 'Action inconnue' }, { status: 400 })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur interne'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    let adminClient
    try {
      adminClient = getSupabaseAdminClient()
    } catch {
      return Response.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }

    const check = await checkSuperadmin(req.headers.get('authorization'), adminClient)
    if (!check.ok) return Response.json({ error: check.error }, { status: check.status })

    const table = req.nextUrl.searchParams.get('table')
    if (table === 'audit_logs') {
      const { error } = await adminClient.from('audit_logs').delete().neq('id', 'none')
      if (error) throw error
      return Response.json({ ok: true })
    }

    return Response.json({ error: 'Table non prise en charge' }, { status: 400 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur interne'
    return Response.json({ error: msg }, { status: 500 })
  }
}
