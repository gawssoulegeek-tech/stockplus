
import { useState, useEffect, useMemo } from "react"
import {
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Download,
  Calendar as CalendarIcon,
  Package,
  History,
  CheckCircle2,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useBoutique } from "@/views/dashboard/layout"
import { getSupabaseClient } from "@/supabase/client"
import { stockService } from "@/services/stockService"
import { StockMoveType } from "@/types/supabase"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const moveTypeConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  purchase: { label: "Entrée", bg: "bg-green-50", text: "text-green-600", border: "border-green-100" },
  sale: { label: "Sortie", bg: "bg-orange-50", text: "text-primary", border: "border-orange-100" },
  adjustment: { label: "Ajustement", bg: "bg-blue-50", text: "text-blue-500", border: "border-blue-100" },
  return: { label: "Entrée", bg: "bg-green-50", text: "text-green-600", border: "border-green-100" },
  damage: { label: "Perte", bg: "bg-red-50", text: "text-red-500", border: "border-red-100" },
}

function getDisplayType(moveType: string) {
  return moveTypeConfig[moveType]?.label || moveType
}

function getTypeBadgeClasses(moveType: string) {
  const cfg = moveTypeConfig[moveType]
  if (!cfg) return "bg-blue-50 text-blue-500 border-blue-100"
  return `${cfg.bg} ${cfg.text} ${cfg.border}`
}

export default function StockMovesPage() {
  const { toast } = useToast()
  const { boutique } = useBoutique()

  const [moves, setMoves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [moveTypeFilter, setMoveTypeFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!boutique?.id) return
    fetchMoves()
  }, [boutique?.id, moveTypeFilter, dateFrom, dateTo])

  const fetchMoves = async () => {
    setLoading(true)
    const supabase = getSupabaseClient()
    try {
      let query = supabase
        .from('stock_moves')
        .select('*, products(name, sku)')
        .eq('boutique_id', boutique.id)

      if (moveTypeFilter !== 'all') {
        query = query.eq('move_type', moveTypeFilter)
      }

      if (dateFrom) {
        query = query.gte('move_date', dateFrom)
      }

      if (dateTo) {
        query = query.lte('move_date', dateTo)
      }

      const { data, error } = await query
        .order('move_date', { ascending: false })
        .limit(500)

      if (error) throw error
      setMoves(data || [])
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    } finally {
      setLoading(false)
    }
  }

  const filteredMoves = useMemo(() => {
    if (!searchTerm) return moves
    const term = searchTerm.toLowerCase()
    return moves.filter(m =>
      m.products?.name?.toLowerCase().includes(term) ||
      m.reason?.toLowerCase().includes(term) ||
      m.recorded_by?.toLowerCase().includes(term)
    )
  }, [moves, searchTerm])

  const stats = useMemo(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const recent = moves.filter(m => new Date(m.move_date) >= thirtyDaysAgo)

    const entreeQty = recent
      .filter(m => m.move_type === 'purchase' || m.move_type === 'return')
      .reduce((sum, m) => sum + m.quantity_change, 0)

    const sortieQty = recent
      .filter(m => m.move_type === 'sale' || m.move_type === 'damage')
      .reduce((sum, m) => sum + m.quantity_change, 0)

    const ajustementQty = recent
      .filter(m => m.move_type === 'adjustment')
      .reduce((sum, m) => sum + m.quantity_change, 0)

    return { entreeQty, sortieQty, ajustementQty }
  }, [moves])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleExport = () => {
    const headers = ['Date', 'Produit', 'Type', 'Quantité', 'Raison', 'Utilisateur']
    const rows = filteredMoves.map(m => [
      new Date(m.move_date).toLocaleString('fr-FR'),
      m.products?.name || 'Inconnu',
      getDisplayType(m.move_type),
      m.quantity_change,
      m.reason || '',
      m.recorded_by || '',
    ])

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mouvements-stock-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Exportation terminée",
      description: "L'historique des mouvements a été téléchargé en CSV.",
      // @ts-ignore
      action: <CheckCircle2 className="h-5 w-5 text-green-500" />
    })
  }

  const handleNewMove = () => {
    toast({
      title: "Nouveau mouvement",
      description: "Veuillez utiliser le module Ventes ou Inventaire pour générer des mouvements.",
    })
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-headline font-bold text-gray-900 tracking-tight">Mouvements de Stock</h1>
          <p className="text-gray-500 font-medium text-lg">Tracez chaque entrée, sortie et ajustement de vos produits.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport} className="h-12 px-6 rounded-xl border-gray-200 font-bold shadow-sm">
            <Download className="h-4 w-4 mr-2 text-primary" />
            Exporter
          </Button>
          <Button onClick={handleNewMove} className="sena-gradient text-white border-none rounded-xl shadow-lg shadow-orange-500/20 h-12 px-8 font-bold">
            <History className="h-4 w-4 mr-2" />
            Nouveau Mouvement
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { title: "Entrées (30j)", value: stats.entreeQty >= 0 ? `+${stats.entreeQty}` : `${stats.entreeQty}`, sub: "Articles reçus", icon: ArrowDownLeft, color: "text-green-500" },
          { title: "Sorties (30j)", value: `${stats.sortieQty}`, sub: "Articles vendus", icon: ArrowUpRight, color: "text-primary" },
          { title: "Ajustements", value: `${stats.ajustementQty >= 0 ? '+' : ''}${stats.ajustementQty || '0'}`, sub: "Pertes ou corrections", icon: ArrowUpDown, color: "text-orange-400" },
        ].map((stat, i) => (
          <Card key={i} className="border-gray-100 shadow-xl rounded-3xl bg-white group hover:border-primary/20 transition-all">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-gray-50 group-hover:bg-orange-50 transition-colors">
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.title}</p>
              <h3 className="text-3xl font-headline font-bold text-gray-900 tracking-tight">{stat.value}</h3>
              <p className="text-xs text-gray-400 font-medium mt-2">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-gray-100 shadow-xl rounded-3xl bg-white overflow-hidden">
        <CardHeader className="p-8 border-b border-gray-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Chercher par produit ou raison..."
                className="pl-12 h-12 rounded-xl border-gray-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className={`h-12 px-6 rounded-xl border-gray-200 font-bold gap-2 ${showFilters ? 'bg-orange-50 border-primary/30' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className={`h-4 w-4 ${showFilters ? 'text-primary' : 'text-gray-400'}`} />
                Filtres
              </Button>
            </div>
          </div>
          {showFilters && (
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-400" />
                <Select value={moveTypeFilter} onValueChange={setMoveTypeFilter}>
                  <SelectTrigger className="h-10 w-44 rounded-xl border-gray-200 text-sm">
                    <SelectValue placeholder="Type de mouvement" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="purchase">Entrée (Achat)</SelectItem>
                    <SelectItem value="sale">Sortie (Vente)</SelectItem>
                    <SelectItem value="adjustment">Ajustement</SelectItem>
                    <SelectItem value="return">Retour</SelectItem>
                    <SelectItem value="damage">Perte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 w-44 rounded-xl border-gray-200 text-sm"
                />
                <span className="text-gray-400 text-sm">à</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 w-44 rounded-xl border-gray-200 text-sm"
                />
              </div>
              {(moveTypeFilter !== 'all' || dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                  onClick={() => { setMoveTypeFilter('all'); setDateFrom(''); setDateTo('') }}
                >
                  <X className="h-4 w-4 mr-1" /> Réinitialiser
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400 font-medium">Chargement des mouvements...</p>
              </div>
            </div>
          ) : filteredMoves.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Package className="h-12 w-12 text-gray-300" />
                <p className="text-sm text-gray-400 font-medium">Aucun mouvement trouvé</p>
              </div>
            </div>
          ) : (
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="border-gray-100 hover:bg-transparent">
                <TableHead className="font-bold text-gray-600 px-8 h-16 uppercase text-[10px] tracking-widest">Date & Heure</TableHead>
                <TableHead className="font-bold text-gray-600 h-16 uppercase text-[10px] tracking-widest">Produit</TableHead>
                <TableHead className="font-bold text-gray-600 h-16 uppercase text-[10px] tracking-widest">Type</TableHead>
                <TableHead className="font-bold text-gray-600 h-16 uppercase text-[10px] tracking-widest">Quantité</TableHead>
                <TableHead className="font-bold text-gray-600 h-16 uppercase text-[10px] tracking-widest">Raison</TableHead>
                <TableHead className="font-bold text-gray-600 h-16 uppercase text-[10px] tracking-widest">Utilisateur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMoves.map((move) => {
                const displayType = getDisplayType(move.move_type)
                return (
                <TableRow key={move.id} className="border-gray-50 group hover:bg-orange-50/10">
                  <TableCell className="px-8 py-5 text-sm text-gray-500 font-medium">{formatDate(move.move_date)}</TableCell>
                  <TableCell className="font-bold text-gray-900">{move.products?.name || 'Produit inconnu'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`rounded-lg font-bold px-3 py-1 ${getTypeBadgeClasses(move.move_type)}`}>
                      {displayType}
                    </Badge>
                  </TableCell>
                  <TableCell className={`font-headline font-bold text-lg ${move.quantity_change > 0 ? 'text-green-500' : 'text-primary'}`}>
                    {move.quantity_change > 0 ? `+${move.quantity_change}` : move.quantity_change}
                  </TableCell>
                  <TableCell className="text-gray-600 font-medium text-sm">{move.reason || '-'}</TableCell>
                  <TableCell className="font-bold text-gray-800">{move.recorded_by || '-'}</TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
