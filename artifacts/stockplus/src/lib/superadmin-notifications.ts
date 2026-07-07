/**
 * Notifications Superadmin
 * - Stocke les notifications dans la table `notifications`
 * - Envoie aussi un email au superadmin via Resend
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const SUPERADMIN_NOTIFICATION_TOPICS = [
  'new_signup',
  'payment_request',
  'trial_expiring',
  'trial_expired',
  'boutique_suspended',
  'boutique_refused',
] as const

export type SuperadminNotificationTopic = typeof SUPERADMIN_NOTIFICATION_TOPICS[number]

interface CreateNotificationInput {
  type: SuperadminNotificationTopic
  title: string
  message: string
  boutique_id?: string
  metadata?: Record<string, unknown>
}

/**
 * Crée une notification pour TOUS les superadmins + envoie un email
 */
export async function notifySuperadmins(
  adminClient: SupabaseClient,
  input: CreateNotificationInput
): Promise<void> {
  try {
    // 1. Trouver tous les superadmins
    const { data: superadmins, error: uErr } = await adminClient
      .from('users')
      .select('uid, email')
      .eq('role', 'superadmin')

    if (uErr || !superadmins?.length) {
      console.warn('[notifySuperadmins] Aucun superadmin trouvé:', uErr?.message)
      return
    }

    // 2. Insérer une notification par superadmin
    const notifications = superadmins.map((s: { uid: string; email: string }) => ({
      boutique_id: input.boutique_id || 'system',
      user_id: s.uid,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.metadata || {},
      is_read: false,
      created_at: new Date().toISOString(),
    }))

    const { error: nErr } = await adminClient.from('notifications').insert(notifications)
    if (nErr) {
      console.warn('[notifySuperadmins] Erreur insertion notifications:', nErr.message)
    }

    // 3. Envoyer un email au premier superadmin (évite le spam si plusieurs)
    const primaryEmail = superadmins[0].email
    if (primaryEmail) {
      await sendSuperadminEmail(primaryEmail, input.title, input.message)
    }
  } catch (e) {
    console.error('[notifySuperadmins] Exception:', e)
  }
}

async function sendSuperadminEmail(to: string, subject: string, text: string): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    console.warn('[sendSuperadminEmail] RESEND_API_KEY manquant')
    return
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'StockPlus Admin <notifications@stockplus.app>',
        to,
        subject: `[StockPlus] ${subject}`,
        html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f9f9f9;padding:32px">
<div style="max-width:560px;margin:auto;background:white;border-radius:24px;padding:32px">
  <h2 style="color:#1a1a2e;margin:0 0 16px">${subject}</h2>
  <p style="color:#333;line-height:1.6">${text}</p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://stockplus.app'}/saas"
     style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:16px">
    Voir sur le dashboard
  </a>
  <p style="color:#999;font-size:12px;margin-top:24px">Notification automatique StockPlus</p>
</div>
</body></html>`,
      }),
    })
    if (!res.ok) {
      console.warn('[sendSuperadminEmail] Resend error:', await res.text())
    }
  } catch (e) {
    console.error('[sendSuperadminEmail] Exception:', e)
  }
}
