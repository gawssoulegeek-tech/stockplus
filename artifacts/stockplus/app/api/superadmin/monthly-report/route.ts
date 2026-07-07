import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase-server'
import { requireSuperadmin } from '@/lib/api-auth'
import { PLAN_PRICES } from '@/lib/plan-features'

/**
 * GET /api/superadmin/monthly-report
 * Génère un rapport HTML mensuel imprimable (Ctrl+P → PDF).
 *
 * Query params:
 *   - month=YYYY-MM : mois du rapport (défaut: mois courant)
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperadmin(req)
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  let adminClient
  try {
    adminClient = getSupabaseAdminClient()
  } catch {
    return Response.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const monthParam = searchParams.get('month') // YYYY-MM
  const now = new Date()
  const year = monthParam ? parseInt(monthParam.split('-')[0], 10) : now.getFullYear()
  const month = monthParam ? parseInt(monthParam.split('-')[1], 10) : now.getMonth() + 1

  const startOfMonth = new Date(Date.UTC(year, month - 1, 1)).toISOString()
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString()

  // Récupérer toutes les boutiques
  const { data: boutiques } = await adminClient
    .from('boutiques')
    .select('id, name, owner_id, plan, status, trial_ends_at, created_at, features, team_members_count')
    .order('created_at', { ascending: false })

  // Récupérer les ventes du mois (pour stats agrégées par boutique)
  const { data: sales } = await adminClient
    .from('sales')
    .select('boutique_id, total_amount, sale_date')
    .gte('sale_date', startOfMonth)
    .lte('sale_date', endOfMonth)

  // Récupérer les paiements (abonnements) du mois
  const { data: payments } = await adminClient
    .from('payments')
    .select('id, boutique_id, amount, status, payment_method, created_at')
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth)

  // Calculs
  const allBoutiques = boutiques || []
  const newThisMonth = allBoutiques.filter((b: any) =>
    b.created_at >= startOfMonth && b.created_at <= endOfMonth
  )
  const activeBoutiques = allBoutiques.filter((b: any) => b.status === 'Actif')
  const trialBoutiques = allBoutiques.filter((b: any) => b.status === 'Essai')
  const pendingBoutiques = allBoutiques.filter((b: any) => b.status === 'en_attente')
  const suspendedBoutiques = allBoutiques.filter((b: any) => b.status === 'Suspendu' || b.status === 'refuse')

  const mrr = activeBoutiques.reduce((sum: number, b: any) => {
    const price = (PLAN_PRICES as any)[b.plan] || 0
    return sum + price
  }, 0)

  const allSales = sales || []
  const totalRevenue = allSales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0)

  // Top 5 boutiques par CA du mois
  const revenueByBoutique = new Map<string, number>()
  for (const s of allSales) {
    const bId = (s as any).boutique_id
    revenueByBoutique.set(bId, (revenueByBoutique.get(bId) || 0) + ((s as any).total_amount || 0))
  }
  const topBoutiques = Array.from(revenueByBoutique.entries())
    .map(([bId, rev]) => ({
      name: allBoutiques.find((b: any) => b.id === bId)?.name || 'Inconnu',
      revenue: rev,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Répartition par plan
  const byPlan = ['Basic', 'Pro', 'Premium', 'Essai'].map(plan => ({
    plan,
    count: allBoutiques.filter((b: any) => b.plan === plan).length,
    revenue: allBoutiques
      .filter((b: any) => b.plan === plan && b.status === 'Actif')
      .reduce((s: number, b: any) => s + ((PLAN_PRICES as any)[b.plan] || 0), 0),
  }))

  const monthName = new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Rapport StockPlus - ${monthName}</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; line-height: 1.6; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: 800; color: #f97316; }
    .period { color: #666; font-size: 14px; }
    h1 { font-size: 24px; margin: 0 0 8px; }
    h2 { font-size: 18px; margin: 30px 0 12px; color: #1a1a2e; border-left: 4px solid #f97316; padding-left: 12px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
    .stat-card { background: #f9fafb; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb; }
    .stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .stat-value { font-size: 24px; font-weight: 700; color: #1a1a2e; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
    tr:hover { background: #f9fafb; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-active { background: #d1fae5; color: #065f46; }
    .badge-trial { background: #fef3c7; color: #92400e; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-suspended { background: #fee2e2; color: #991b1b; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">StockPlus</div>
      <h1>Rapport Mensuel Superadmin</h1>
      <div class="period">Période : ${monthName}</div>
    </div>
    <button class="no-print" onclick="window.print()" style="background:#f97316;color:white;border:none;padding:12px 24px;border-radius:12px;font-weight:600;cursor:pointer">📄 Imprimer / PDF</button>
  </div>

  <h2>Statistiques générales</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">MRR (abonnements)</div>
      <div class="stat-value">${mrr.toLocaleString('fr-FR')} F</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">CA total (ventes)</div>
      <div class="stat-value">${totalRevenue.toLocaleString('fr-FR')} F</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Boutiques actives</div>
      <div class="stat-value">${activeBoutiques.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Nouvelles ce mois</div>
      <div class="stat-value">${newThisMonth.length}</div>
    </div>
  </div>

  <h2>Répartition par plan</h2>
  <table>
    <thead>
      <tr><th>Plan</th><th>Nombre de boutiques</th><th>Revenu mensuel (F)</th></tr>
    </thead>
    <tbody>
      ${byPlan.map(p => `
        <tr>
          <td><strong>${p.plan}</strong></td>
          <td>${p.count}</td>
          <td>${p.revenue.toLocaleString('fr-FR')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Statuts des boutiques</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Actives</div>
      <div class="stat-value" style="color:#065f46">${activeBoutiques.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">En essai</div>
      <div class="stat-value" style="color:#92400e">${trialBoutiques.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">En attente</div>
      <div class="stat-value" style="color:#92400e">${pendingBoutiques.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Suspendues/Refusées</div>
      <div class="stat-value" style="color:#991b1b">${suspendedBoutiques.length}</div>
    </div>
  </div>

  <h2>Top 5 boutiques par CA du mois</h2>
  <table>
    <thead>
      <tr><th>#</th><th>Boutique</th><th>CA du mois (F)</th></tr>
    </thead>
    <tbody>
      ${topBoutiques.length === 0
        ? '<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:24px">Aucune vente ce mois</td></tr>'
        : topBoutiques.map((b, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${b.name}</strong></td>
            <td>${b.revenue.toLocaleString('fr-FR')}</td>
          </tr>
        `).join('')
      }
    </tbody>
  </table>

  <h2>Paiements du mois (${(payments || []).length})</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Boutique</th><th>Montant</th><th>Méthode</th><th>Statut</th></tr>
    </thead>
    <tbody>
      ${(payments || []).slice(0, 50).map((p: any) => {
        const bName = allBoutiques.find((b: any) => b.id === p.boutique_id)?.name || '—'
        return `
          <tr>
            <td>${new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
            <td>${bName}</td>
            <td>${(p.amount || 0).toLocaleString('fr-FR')} F</td>
            <td>${p.payment_method || '—'}</td>
            <td>${p.status || '—'}</td>
          </tr>
        `
      }).join('') || '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:24px">Aucun paiement ce mois</td></tr>'}
    </tbody>
  </table>

  <h2>Liste complète des boutiques (${allBoutiques.length})</h2>
  <table>
    <thead>
      <tr><th>Boutique</th><th>Plan</th><th>Statut</th><th>Créée le</th><th>Membres</th></tr>
    </thead>
    <tbody>
      ${allBoutiques.slice(0, 100).map((b: any) => `
        <tr>
          <td><strong>${b.name}</strong></td>
          <td>${b.plan}</td>
          <td><span class="badge badge-${(b.status || '').toLowerCase().replace('é', 'e')}">${b.status}</span></td>
          <td>${new Date(b.created_at).toLocaleDateString('fr-FR')}</td>
          <td>${b.team_members_count || 1}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    Rapport généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • StockPlus
  </div>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
