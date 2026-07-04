import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const CRON_SECRET = process.env.CRON_SECRET
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_API_KEY) {
    return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toISOString().split('T')[0]
  const results: string[] = []

  const { data: boutiques } = await supabase
    .from('boutiques')
    .select('id, name, owner_id, notifications')
    .eq('plan', 'Pro')
    .or(`notifications->>emailReports.eq.true,notifications->>emailReports.is.null`)

  if (!boutiques?.length) {
    return NextResponse.json({ ok: true, sent: 0, message: 'Aucune boutique à notifier' })
  }

  for (const boutique of boutiques) {
    const notif = (boutique.notifications || {}) as Record<string, unknown>
    if (notif.emailReports !== true) continue

    const { data: owner } = await supabase
      .from('users')
      .select('email, name')
      .eq('uid', boutique.owner_id)
      .single()

    if (!owner?.email) continue

    const startOfDay = `${dateStr}T00:00:00.000Z`
    const endOfDay = `${dateStr}T23:59:59.999Z`

    const { data: sales } = await supabase
      .from('sales')
      .select('total, created_at')
      .eq('boutique_id', boutique.id)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)

    const totalRevenue = (sales || []).reduce((sum, s) => sum + (s.total || 0), 0)
    const salesCount = (sales || []).length

    const { data: lowStock } = await supabase
      .from('products')
      .select('name')
      .eq('boutique_id', boutique.id)
      .lte('stock', 5)

    const lowStockCount = (lowStock || []).length

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:sans-serif;background:#f9f9f9;padding:32px">
        <div style="max-width:560px;margin:auto;background:white;border-radius:24px;padding:32px">
          <div style="text-align:center;margin-bottom:24px">
            <h1 style="font-size:24px;margin:0;color:#1a1a2e">StockPlus</h1>
            <p style="color:#666;margin:4px 0 0">Rapport quotidien — ${dateStr}</p>
          </div>
          <div style="background:#fff7ed;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px">
            <p style="font-size:14px;color:#666;margin:0">Chiffre d'affaires</p>
            <p style="font-size:36px;font-weight:bold;color:#f97316;margin:8px 0">${totalRevenue.toLocaleString()} FCFA</p>
          </div>
          <div style="display:flex;gap:16px;margin-bottom:24px">
            <div style="flex:1;background:#f5f5f5;border-radius:12px;padding:16px;text-align:center">
              <p style="font-size:12px;color:#666;margin:0">Ventes</p>
              <p style="font-size:28px;font-weight:bold;color:#1a1a2e;margin:4px 0">${salesCount}</p>
            </div>
            <div style="flex:1;background:#f5f5f5;border-radius:12px;padding:16px;text-align:center">
              <p style="font-size:12px;color:#666;margin:0">Stock faible</p>
              <p style="font-size:28px;font-weight:bold;color:${lowStockCount > 0 ? '#ef4444' : '#22c55e'};margin:4px 0">${lowStockCount}</p>
            </div>
          </div>
          <div style="background:#f0fdf4;border-radius:12px;padding:16px;text-align:center;margin-bottom:24px">
            <p style="font-size:12px;color:#666;margin:0">Panier moyen</p>
            <p style="font-size:20px;font-weight:bold;color:#22c55e;margin:4px 0">${salesCount > 0 ? Math.round(totalRevenue / salesCount).toLocaleString() : 0} FCFA</p>
          </div>
          <p style="font-size:12px;color:#999;text-align:center">StockPlus — ${boutique.name}</p>
        </div>
      </body>
      </html>
    `

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'StockPlus <rapport@senestock.ai>',
          to: owner.email,
          subject: `📊 Rapport ${boutique.name} — ${dateStr}`,
          html,
        }),
      })

      if (res.ok) {
        results.push(`✅ ${boutique.name} → ${owner.email}`)
      } else {
        const err = await res.text()
        results.push(`❌ ${boutique.name}: ${err}`)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur'
      results.push(`❌ ${boutique.name}: ${msg}`)
    }
  }

  return NextResponse.json({ ok: true, sent: results.length, details: results })
}
