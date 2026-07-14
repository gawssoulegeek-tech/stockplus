import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * POST /api/waitlist
 * Soumission publique du formulaire de liste d'attente.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { boutique_name, owner_name, phone, email, business_type } = body ?? {}

    // Validation
    if (!boutique_name || !owner_name || !phone) {
      return Response.json({
        error: 'Nom de boutique, nom du gérant et téléphone sont requis'
      }, { status: 400 })
    }

    // Validation téléphone (format sénégalais : +221 XX XXX XX XX ou 7X XXX XX XX)
    const phoneStr = String(phone).replace(/\s/g, '')
    if (phoneStr.length < 9) {
      return Response.json({ error: 'Numéro de téléphone invalide' }, { status: 400 })
    }

    let adminClient
    try {
      adminClient = getSupabaseAdminClient()
    } catch {
      return Response.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }

    // Vérifier doublon (même téléphone ou email)
    const orConditions = [`phone.eq.${phoneStr}`]
    if (email) orConditions.push(`email.eq.${String(email).toLowerCase()}`)

    const { data: existing } = await adminClient
      .from('waitlist')
      .select('id')
      .or(orConditions.join(','))
      .limit(1)

    if (existing && existing.length > 0) {
      return Response.json({
        error: 'Vous êtes déjà sur la liste d\'attente ! Nous vous contacterons bientôt.'
      }, { status: 409 })
    }

    // Insertion
    const { data, error } = await adminClient.from('waitlist').insert({
      boutique_name: String(boutique_name).trim(),
      owner_name: String(owner_name).trim(),
      phone: phoneStr,
      email: email ? String(email).toLowerCase().trim() : null,
      business_type: business_type || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    }).select().single()

    if (error) {
      console.error('[waitlist] Insert error:', error)
      return Response.json({ error: 'Erreur lors de l\'inscription' }, { status: 500 })
    }

    console.log('[waitlist] Nouvelle inscription:', data.id, boutique_name)

    return Response.json({
      success: true,
      message: 'Inscription réussie ! Nous vous contacterons bientôt.',
      id: data.id,
    }, { status: 201 })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne'
    console.error('[waitlist] Exception:', error)
    return Response.json({ error: msg }, { status: 500 })
  }
}
