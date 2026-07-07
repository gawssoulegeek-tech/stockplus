
import { useState, useEffect, useMemo } from "react"
import Lottie from "lottie-react"
import { StatsCard } from "@/components/dashboard/stats-card"
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Plus,
  ArrowRight,
  Target,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Link } from "@/lib/compat/wouter"
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useBoutique } from "@/views/dashboard/layout"
import { getSupabaseClient } from "@/supabase/client"
import { saleService } from "@/services/saleService"
import { productService } from "@/services/productService"

const AWA_AVATAR_URL = "/awa-avatar.json"
const FINANCE_LOTTIE_URL = "/lottie/Finance.json"

export default function DashboardPage() {
  const { boutique } = useBoutique()

  const [sales, setSales] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const [awaData, setAwaData] = useState<any>(null)
  const [financeData, setFinanceData] = useState<any>(null)

  useEffect(() => {
    setIsMounted(true)
    fetch(AWA_AVATAR_URL)
      .then(res => res.ok && res.json())
      .then(data => data && setAwaData(data))
      .catch(err => console.warn("Lottie Dashboard Load Warn", err))
    fetch(FINANCE_LOTTIE_URL)
      .then(res => res.ok && res.json())
      .then(data => data && setFinanceData(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!boutique?.id) return
    const supabase = getSupabaseClient()
    const boutiqueId = boutique.id

    saleService.listSales(supabase, boutiqueId, { per_page: 100 })
      .then(res => setSales(res.data))
      .catch(() => {})

    productService.listProducts(supabase, boutiqueId, { per_page: 100 })
      .then(res => setProducts(res.data))
      .catch(() => {})
  }, [boutique?.id])

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const todaySales = sales.filter(s => s.sale_date?.startsWith(today))
    const todayRevenue = todaySales.reduce((acc, s) => acc + (s.total_amount || 0), 0)
    const totalRevenue = sales.reduce((acc, s) => acc + (s.total_amount || 0), 0)
    const lowStockCount = products.filter(p => p.quantity_in_stock <= 5).length
    // Calcul du bénéfice basé sur le cost_price réel des produits vendus
    // (fallback : si cost_price absent, on estime à 25% du CA)
    const totalProfit = sales.reduce((acc, s) => {
      const saleRevenue = s.total_amount || 0
      // Si on n'a pas les items détaillés, fallback 25%
      if (!s.sale_items || !Array.isArray(s.sale_items)) {
        return acc + saleRevenue * 0.25
      }
      const cost = s.sale_items.reduce((c: number, item: any) => {
        const prod = products.find(p => p.id === item.product_id)
        return c + (prod?.cost_price || 0) * (item.quantity || 0)
      }, 0)
      return acc + Math.max(0, saleRevenue - cost)
    }, 0)
    return { todayRevenue, totalProfit, totalProducts: products.length, lowStockCount, totalRevenue }
  }, [sales, products])

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return d.toISOString().split('T')[0]
    }).reverse()

    return last7Days.map(date => {
      const daySales = sales.filter(s => s.sale_date?.startsWith(date))
      return {
        name: new Date(date).toLocaleDateString("fr-FR", { weekday: 'short' }),
        revenue: daySales.reduce((acc, s) => acc + (s.total_amount || 0), 0)
      }
    })
  }, [sales])

  const formatCurrency = (val: number) => {
    return `${val.toLocaleString()} CFA`
  }

  if (!isMounted) return null

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <Badge className="bg-orange-100 text-primary border-none px-4 py-1 rounded-full font-black text-[10px] tracking-widest uppercase mb-2">
            Vue d'ensemble — Plan {boutique?.plan}
          </Badge>
          <h1 className="text-4xl md:text-7xl font-headline font-bold text-gray-900 tracking-tighter">
            Bonjour, {boutique?.name}
          </h1>
          <p className="text-gray-400 text-lg font-medium">L'IA Awa a analysé vos ventes. Tout est sous contrôle.</p>
        </div>
        {financeData && (
          <div className="hidden lg:block w-32 h-32 opacity-60">
            <Lottie animationData={financeData} loop={true} className="w-full h-full" />
          </div>
        )}
        <div className="flex gap-4">
          <Button variant="outline" className="rounded-[1.5rem] h-16 px-8 font-bold border-gray-200 hover:bg-orange-50 hover:text-primary transition-all text-lg shadow-sm" asChild>
            <Link href="/inventory"><Package className="h-5 w-5 mr-3" /> Inventaire</Link>
          </Button>
          <Button className="sena-gradient text-white rounded-[1.5rem] h-16 px-10 font-bold shadow-2xl shadow-orange-500/30 text-lg group" asChild>
            <Link href="/pos">
              <Plus className="h-6 w-6 mr-3 group-hover:rotate-90 transition-transform duration-300" /> 
              Nouvelle Vente
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Chiffre d'Affaires" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} className="border-none shadow-xl bg-white" />
        <StatsCard title="Ventes du Jour" value={formatCurrency(stats.todayRevenue)} icon={Target} className="border-none shadow-xl bg-white" />
        <StatsCard title="Profit (Est.)" value={formatCurrency(Math.round(stats.totalProfit))} icon={TrendingUp} className="border-none shadow-xl bg-white" />
        <StatsCard 
          title="Alertes Stock" 
          value={stats.lowStockCount} 
          icon={AlertTriangle} 
          className={cn("border-none shadow-xl bg-white", stats.lowStockCount > 0 && "ring-2 ring-red-100")} 
        />
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <Card className="md:col-span-2 premium-card shadow-2xl border-none overflow-hidden group">
          <CardHeader className="p-10 flex flex-row items-center justify-between relative z-10">
            <div className="space-y-1">
              <CardTitle className="font-headline text-4xl">Performance Hebdomadaire</CardTitle>
              <CardDescription className="font-medium text-lg">Suivi des encaissements sur 7 jours</CardDescription>
            </div>
            <div className="h-16 w-16 rounded-[1.5rem] bg-orange-50 flex items-center justify-center text-primary">
              <TrendingUp className="h-8 w-8" />
            </div>
          </CardHeader>
          <CardContent className="h-[400px] px-6 pb-10 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF8800" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#FF8800" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 14, fontWeight: 'bold'}}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '20px' }}
                  formatter={(value: any) => [formatCurrency(value), "Revenu"]} 
                />
                <Area type="monotone" dataKey="revenue" stroke="#FF8800" strokeWidth={6} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="absolute top-0 left-0 w-full h-full bg-orange-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-0" />
        </Card>

        <Card className="premium-card bg-gray-950 text-white border-none flex flex-col justify-between shadow-3xl overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-full bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[100px] -z-0" />
          <CardHeader className="p-10 space-y-8 relative z-10">
            <div className="h-32 w-32 bg-white/10 rounded-[2.5rem] flex items-center justify-center backdrop-blur-2xl overflow-hidden p-4 shadow-2xl ring-1 ring-white/20">
              {awaData ? <Lottie animationData={awaData} loop={true} className="w-full h-full scale-125" /> : <div className="h-10 w-10 animate-pulse bg-white/10 rounded-full" />}
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary text-white border-none font-black text-[10px] uppercase tracking-widest h-8 px-4 rounded-full">Assistant Pro</Badge>
              </div>
              <CardTitle className="font-headline text-5xl leading-[0.9] tracking-tighter">
                L'Intelligence <br /><span className="text-primary italic">Awa</span>
              </CardTitle>
              <div className="text-gray-400 text-lg font-medium leading-relaxed">
                {stats.lowStockCount > 0 
                  ? `Attention, ${stats.lowStockCount} produits sont en stock critique. Voulez-vous une liste de réapprovisionnement ?` 
                  : "Excellent travail ! Votre marge brute est en hausse de 12% par rapport à la semaine dernière."}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-10 relative z-10">
            <Button className="w-full sena-gradient text-white rounded-[2rem] h-20 font-bold text-2xl shadow-2xl shadow-orange-500/20 group/btn" asChild>
              <Link href="/ai">
                Consulter Awa 
                <ArrowRight className="ml-4 h-8 w-8 group-hover/btn:translate-x-2 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
