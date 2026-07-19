import { useEffect, useState } from "react"
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Download, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useBoutique } from "@/views/dashboard/layout"
import { getSupabaseClient } from "@/supabase/client"
import { saleService } from "@/services/saleService"
import { paymentService } from "@/services/paymentService"
import { Sale, Payment, PaymentMethod } from "@/types/supabase"

type Period = "day" | "week" | "month" | "year"

export default function AccountingPage() {
  const { boutique, features } = useBoutique()
  const supabase = getSupabaseClient()
  const [sales, setSales] = useState<Sale[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>("month")

  useEffect(() => {
    if (!boutique?.id) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const now = new Date()
        let fromDate: string
        if (period === "day") fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        else if (period === "week") {
          const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7); fromDate = weekAgo.toISOString()
        } else if (period === "month") {
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        } else {
          fromDate = new Date(now.getFullYear(), 0, 1).toISOString()
        }

        const [salesRes, paymentsRes] = await Promise.all([
          saleService.listSales(supabase, boutique.id, { per_page: 500, date_from: fromDate }),
          paymentService.list(supabase, boutique.id, { per_page: 500, from_date: fromDate }),
        ])
        setSales(salesRes.data)
        setPayments(paymentsRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [boutique?.id, period])

  const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0)
  const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const pendingDebts = sales.filter(s => s.payment_status !== 'complete').reduce((sum, s) => sum + ((s.total_amount || 0) - (s.amount_paid || 0)), 0)
  const totalDiscounts = sales.reduce((sum, s) => sum + (s.discount_amount || 0), 0)

  const byMethod = sales.reduce((acc, s) => {
    const method = s.payment_method || 'cash'
    acc[method] = (acc[method] || 0) + (s.total_amount || 0)
    return acc
  }, {} as Record<string, number>)

  const methodLabels: Record<string, string> = {
    cash: 'Espèces',
    card: 'Carte',
    mobile: 'Mobile Money',
    credit: 'Crédit',
  }

  const exportCSV = () => {
    const header = "Date;Client;Montant;Méthode;Statut\n"
    const rows = sales.map(s =>
      `${new Date(s.sale_date).toLocaleDateString('fr-FR')};${s.customer_name || 'N/A'};${(s.total_amount / 100).toFixed(0)};${s.payment_method};${s.payment_status}`
    ).join("\n")
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `comptabilite_${period}_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (!features.comptabilite) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="text-3xl font-bold">Comptabilité désactivée</div>
        <div className="text-gray-500 max-w-lg">Cette fonctionnalité est disponible dans le plan Pro.</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold">Comptabilité</h1>
          <p className="text-gray-500 font-medium">Synthèse financière de votre boutique.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
              <SelectTrigger className="w-32 h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Aujourd'hui</SelectItem>
                <SelectItem value="week">7 jours</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="h-12 rounded-xl" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { title: "Revenu total", value: totalRevenue, icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
          { title: "Encaissements", value: totalPayments, icon: DollarSign, color: "text-blue-500", bg: "bg-blue-50" },
          { title: "Créances impayées", value: pendingDebts, icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" },
          { title: "Remises accordées", value: totalDiscounts, icon: BarChart3, color: "text-orange-500", bg: "bg-orange-50" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.title}</div>
              <h3 className="text-2xl font-headline font-bold text-gray-900">
                {(stat.value / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par moyen de paiement</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            ) : Object.keys(byMethod).length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Aucune donnée</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(byMethod).sort(([, a], [, b]) => b - a).map(([method, amount]) => (
                  <div key={method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{methodLabels[method] || method}</span>
                      <span className="font-bold">{(amount / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(amount / totalRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dernières transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : (
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {sales.slice(0, 20).map(sale => (
                  <div key={sale.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <div className="text-sm font-medium">{sale.customer_name || 'Anonyme'}</div>
                      <div className="text-xs text-gray-400">{new Date(sale.sale_date).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{(sale.total_amount / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</div>
                      <Badge className={
                        sale.payment_status === 'complete' ? 'bg-green-100 text-green-700' :
                        sale.payment_status === 'partial' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }>{sale.payment_status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
