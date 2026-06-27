
"use client"

import { useState, useEffect, useMemo } from "react"
import {
  BarChart3,
  TrendingUp,
  Download,
  Target,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Star,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Pie,
  PieChart,
  CartesianGrid
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function ReportsPage() {
  const { toast } = useToast()
  const [period, setPeriod] = useState("year")
  const [sales, setSales] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [plan, setPlan] = useState("Basic")
  const [status, setStatus] = useState("Actif")

  useEffect(() => {
    const savedSales = localStorage.getItem("sena_sales")
    const savedProducts = localStorage.getItem("sena_products")
    if (savedSales) setSales(JSON.parse(savedSales))
    if (savedProducts) setProducts(JSON.parse(savedProducts))

    const savedBoutiques = JSON.parse(localStorage.getItem("sena_boutiques_data") || "[]")
    const currentShop = localStorage.getItem("shop_name")
    const myBoutique = savedBoutiques.find((b: any) => b.name === currentShop)
    if (myBoutique) {
      setPlan(myBoutique.plan)
      setStatus(myBoutique.status)
    }
  }, [])

  const effectivePlan = status === "Essai" ? "Pro" : (plan === "Premium" ? "Pro" : plan)

  const filteredSales = useMemo(() => {
    const now = new Date()
    return sales.filter(sale => {
      const saleDate = new Date(sale.date)
      if (period === "30-days") {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(now.getDate() - 30)
        return saleDate >= thirtyDaysAgo
      }
      return true
    })
  }, [sales, period])

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, sale) => acc + (sale.total || 0), 0)
    const avgOrder = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0
    const totalSalesCount = filteredSales.length
    const estimatedMargin = 28.5 

    return { revenue: totalRevenue, avgOrder, totalSalesCount, margin: estimatedMargin }
  }, [filteredSales])

  const monthlyData = useMemo(() => {
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]
    const data = months.map(m => ({ name: m, revenue: 0, profit: 0 }))
    filteredSales.forEach(sale => {
      const parts = sale.date.split(' ')
      const monthName = parts[1]?.substring(0, 3)
      const index = months.findIndex(m => m.startsWith(monthName))
      if (index !== -1) {
        data[index].revenue += sale.total
        data[index].profit += sale.total * 0.3
      }
    })
    return data.filter(d => d.revenue > 0 || months.indexOf(d.name) <= new Date().getMonth())
  }, [filteredSales])

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {}
    filteredSales.forEach(sale => {
      sale.products?.forEach((p: any) => {
        const originalProduct = products.find(op => op.name === p.name)
        const cat = originalProduct?.category || "Général"
        categories[cat] = (categories[cat] || 0) + (p.qty * p.price)
      })
    })
    const colors = ["#FF8800", "#FFAA44", "#FFCC88", "#FFE5C4", "#FFDAB9"]
    return Object.entries(categories).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length]
    }))
  }, [filteredSales, products])

  if (effectivePlan === "Basic") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Card className="premium-card p-16 text-center bg-gray-50/50 border-none shadow-none max-w-2xl space-y-10">
          <div className="h-32 w-32 rounded-[2.5rem] bg-orange-100 flex items-center justify-center mx-auto shadow-xl shadow-orange-500/10">
            <Lock className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-4">
            <Badge className="bg-primary/10 text-primary border-none px-5 py-1 rounded-full font-black text-[10px] tracking-widest uppercase">Plan Pro Requis</Badge>
            <h2 className="text-4xl md:text-5xl font-headline font-bold text-gray-900 tracking-tighter">Analyses & Rapports</h2>
            <div className="text-gray-500 font-medium text-lg max-w-md mx-auto leading-relaxed">
              Les statistiques détaillées, marges bénéficiaires et prévisions de vente sont réservées au plan <strong className="text-gray-900">Pro (25 000 FCFA)</strong>.
            </div>
          </div>
          <Button className="sena-gradient text-white h-20 px-16 rounded-[2rem] font-bold text-2xl shadow-2xl shadow-orange-500/30 group">
            <Star className="h-6 w-6 mr-3 fill-white" />
            Activer le Plan Pro
            <ChevronRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
          </Button>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">StockPlus Intelligence</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-6xl font-headline font-bold text-gray-900 tracking-tighter">Bilan & Analyses</h1>
          <p className="text-gray-500 font-medium text-lg">Visualisez la santé financière de votre boutique.</p>
        </div>
        <div className="flex gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[200px] h-14 rounded-2xl border-gray-200 bg-white font-bold shadow-sm">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
              <SelectItem value="30-days">Derniers 30 jours</SelectItem>
              <SelectItem value="year">Année en cours</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-14 px-8 rounded-2xl border-gray-200 font-bold shadow-sm hover:bg-orange-50 hover:text-primary transition-all">
            <Download className="h-5 w-5 mr-3" />
            Exporter CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Chiffre d'Affaires", value: `${stats.revenue.toLocaleString()} CFA`, icon: DollarSign, color: "text-primary" },
          { title: "Marge Bénéficiaire", value: `${stats.margin}%`, icon: TrendingUp, color: "text-green-500" },
          { title: "Panier Moyen", value: `${Math.round(stats.avgOrder).toLocaleString()} CFA`, icon: Target, color: "text-blue-500" },
          { title: "Ventes Totales", value: stats.totalSalesCount, icon: BarChart3, color: "text-orange-400" },
        ].map((stat, i) => (
          <Card key={i} className="premium-card shadow-xl border-none">
            <CardContent className="p-10">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 rounded-2xl bg-gray-50 group-hover:bg-orange-50 transition-colors">
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.title}</p>
              <h3 className="text-3xl font-headline font-bold text-gray-900 tracking-tight">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="premium-card shadow-2xl border-none overflow-hidden">
          <CardHeader className="p-10 pb-0">
            <CardTitle className="font-headline text-3xl">Performance CA</CardTitle>
            <CardDescription className="text-lg font-medium">Revenus et profits par mois</CardDescription>
          </CardHeader>
          <CardContent className="h-[450px] p-10">
            <ChartContainer config={{
              revenue: { label: "CA (CFA)", color: "hsl(var(--primary))" },
              profit: { label: "Profit (CFA)", color: "#22c55e" }
            }}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
                <YAxis hide />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[12, 12, 0, 0]} barSize={40} />
                <Bar dataKey="profit" fill="#22c55e" radius={[12, 12, 0, 0]} barSize={40} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="premium-card shadow-2xl border-none overflow-hidden">
          <CardHeader className="p-10 pb-0">
            <CardTitle className="font-headline text-3xl">Ventes par Catégorie</CardTitle>
            <CardDescription className="text-lg font-medium">Répartition du chiffre d'affaires</CardDescription>
          </CardHeader>
          <CardContent className="h-[450px] p-10 flex flex-col items-center justify-center">
            {categoryData.length > 0 ? (
              <div className="flex flex-col items-center gap-10 w-full h-full">
                <div className="flex-1 w-full h-full min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={100}
                        outerRadius={140}
                        paddingAngle={10}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}
                        formatter={(value: number) => `${value.toLocaleString()} CFA`} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-6">
                  {categoryData.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-gray-400 font-medium italic">Aucune donnée disponible pour cette période.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
