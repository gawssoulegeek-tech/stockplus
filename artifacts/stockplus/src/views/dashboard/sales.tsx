import { useState, useEffect, useCallback } from "react"
import {
  Search,
  Filter,
  Download,
  XCircle,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useBoutique } from "@/views/dashboard/layout"
import { getSupabaseClient } from "@/supabase/client"
import { saleService } from "@/services/saleService"

const paymentMethodColors: Record<string, string> = {
  cash: "bg-green-50 text-green-600",
  wave: "bg-blue-50 text-blue-600",
  orange_money: "bg-orange-50 text-orange-600",
  credit: "bg-red-50 text-red-500",
  card: "bg-purple-50 text-purple-600",
  mobile: "bg-blue-50 text-blue-600",
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  credit: "Crédit",
  card: "Carte",
  mobile: "Mobile Money",
}

const paymentStatusColors: Record<string, string> = {
  complete: "bg-green-50 text-green-600",
  partial: "bg-orange-50 text-orange-600",
  pending: "bg-red-50 text-red-500",
}

const paymentStatusLabels: Record<string, string> = {
  complete: "Payée",
  partial: "Partielle",
  pending: "En attente",
}

export default function SalesHistoryPage() {
  const { boutique, features, userProfile } = useBoutique()
  const { toast } = useToast()

  const [sales, setSales] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(15)
  const [loading, setLoading] = useState(true)

  // Search & filters
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saleItems, setSaleItems] = useState<any[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)

  // Void dialog
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)
  const [voidSaleId, setVoidSaleId] = useState<string | null>(null)
  const [voidReason, setVoidReason] = useState("")
  const [voiding, setVoiding] = useState(false)

  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailSale, setDetailSale] = useState<any>(null)
  const [detailItems, setDetailItems] = useState<any[]>([])

  const canVoid = userProfile?.role === 'superadmin' || userProfile?.role === 'owner' || userProfile?.role === 'admin'

  const fetchSales = useCallback(async () => {
    if (!boutique?.id) return
    setLoading(true)
    const supabase = getSupabaseClient()
    try {
      const result = await saleService.listSales(supabase, boutique.id, {
        page,
        per_page: perPage,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      setSales(result.data)
      setTotalCount(result.total)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    } finally {
      setLoading(false)
    }
  }, [boutique?.id, page, perPage, dateFrom, dateTo, toast])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  const totalPages = Math.ceil(totalCount / perPage)

  const searched = sales.filter(s => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      s.invoice_number?.toLowerCase().includes(term) ||
      s.customer_name?.toLowerCase().includes(term)
    )
  })

  const filtered = searched.filter(s => {
    if (statusFilter === "all") return true
    return s.payment_status === statusFilter
  })

  const toggleExpand = async (saleId: string) => {
    if (expandedId === saleId) {
      setExpandedId(null)
      setSaleItems([])
      return
    }
    setExpandedId(saleId)
    setItemsLoading(true)
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('sale_items')
      .select()
      .eq('sale_id', saleId)
    setSaleItems(data || [])
    setItemsLoading(false)
  }

  const openDetail = async (sale: any) => {
    setDetailSale(sale)
    setDetailDialogOpen(true)
    setDetailItems([])
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('sale_items')
      .select()
      .eq('sale_id', sale.id)
    setDetailItems(data || [])
  }

  const handleVoid = async () => {
    if (!voidSaleId || !voidReason.trim()) return
    setVoiding(true)
    const supabase = getSupabaseClient()
    try {
      await saleService.voidSale(supabase, voidSaleId, voidReason)
      setSales(prev => prev.filter(s => s.id !== voidSaleId))
      setTotalCount(prev => prev - 1)
      toast({ title: "Vente annulée", description: "La vente a été marquée comme annulée." })
      setVoidDialogOpen(false)
      setVoidReason("")
      setVoidSaleId(null)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    } finally {
      setVoiding(false)
    }
  }

  const handleExportCSV = () => {
    const headers = ["Facture", "Date", "Client", "Total", "Méthode", "Statut", "Vendeur"]
    const rows = filtered.map(s => [
      s.invoice_number || s.id,
      s.sale_date ? new Date(s.sale_date).toLocaleDateString() : "—",
      s.customer_name || "—",
      ((s.total_amount || 0)).toFixed(0),
      paymentMethodLabels[s.payment_method] || s.payment_method || "—",
      paymentStatusLabels[s.payment_status] || s.payment_status || "—",
      s.seller_name || "—",
    ])
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ventes_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Export CSV", description: "Fichier téléchargé." })
  }

  return (
    <div className="space-y-10">
      {/* Debug indicator */}
      <div className="flex gap-4 text-[11px] font-mono bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-yellow-700">
        <span>boutique: <b>{boutique?.id?.slice(0,16) || '—'}</b></span>
        <span>ventes: <b>{totalCount}</b></span>
        <span>chargement: <b>{loading ? 'oui' : 'non'}</b></span>
        <span>page: <b>{page}</b></span>
      </div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-headline font-bold text-gray-900 tracking-tight">Historique des Ventes</h1>
          <p className="text-gray-400 text-lg font-medium">Consultez et gérez toutes vos transactions.</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="rounded-2xl h-14 px-6 font-bold border-gray-200"
            onClick={handleExportCSV}
          >
            <Download className="h-5 w-5 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            className={`rounded-2xl h-14 px-6 font-bold border-gray-200 ${showFilters ? 'bg-orange-50 border-primary text-primary' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-5 w-5 mr-2" />
            Filtres
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="premium-card bg-white border-gray-100">
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Statut</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="complete">Payée</SelectItem>
                    <SelectItem value="partial">Partielle</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Du</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Au</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  className="h-12 rounded-xl font-bold text-gray-500"
                  onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilter("all"); setSearchTerm(""); setPage(1) }}
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Chercher par facture ou client..."
          className="pl-11 h-12 rounded-xl bg-white border-gray-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Sales Table */}
      <Card className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="px-8 h-16 font-bold uppercase text-[10px] tracking-widest">Facture</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Date</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Client</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Total</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Méthode</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Statut</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Vendeur</TableHead>
                <TableHead className="text-right px-8 font-bold uppercase text-[10px] tracking-widest">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-gray-400 font-medium">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-gray-400 font-medium">
                    Aucune vente trouvée.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((sale) => {
                  const isExpanded = expandedId === sale.id
                  const methodColor = paymentMethodColors[sale.payment_method] || "bg-gray-50 text-gray-500"
                  const statusColor = paymentStatusColors[sale.payment_status] || "bg-gray-50 text-gray-500"
                  return (
                    <TableRow
                      key={sale.id}
                      className={`border-b border-gray-50 group hover:bg-orange-50/10 cursor-pointer ${isExpanded ? 'bg-orange-50/20' : ''}`}
                      onClick={() => toggleExpand(sale.id)}
                    >
                      <TableCell className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={`h-4 w-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                          <span className="font-bold text-gray-900">{sale.invoice_number || (sale.id ? sale.id.slice(0, 8) : '—')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-bold text-gray-500">
                        {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="font-bold text-gray-800">{sale.customer_name || '—'}</TableCell>
                      <TableCell className="font-headline font-bold text-gray-900">
                        {(sale.total_amount || 0).toLocaleString()} CFA
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`rounded-lg text-[9px] font-black border-none ${methodColor}`}>
                          {paymentMethodLabels[sale.payment_method] || sale.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`rounded-lg text-[9px] font-black border-none ${statusColor}`}>
                          {paymentStatusLabels[sale.payment_status] || sale.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-bold text-gray-500">{sale.seller_name || '—'}</TableCell>
                      <TableCell className="text-right px-8">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-orange-50 hover:text-primary"
                            onClick={(e) => { e.stopPropagation(); openDetail(sale) }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canVoid && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                setVoidSaleId(sale.id)
                                setVoidReason("")
                                setVoidDialogOpen(true)
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Expanded items */}
        {expandedId && (
          <div className="border-t border-gray-100 bg-gray-50/30 p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Articles de la vente</p>
            {itemsLoading ? (
              <p className="text-sm text-gray-400 font-medium">Chargement...</p>
            ) : saleItems.length === 0 ? (
              <p className="text-sm text-gray-400 font-medium">Aucun article détaillé.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-none">
                    <TableHead className="font-bold text-gray-700 text-xs">Produit</TableHead>
                    <TableHead className="text-center font-bold text-gray-700 text-xs">Qté</TableHead>
                    <TableHead className="text-right font-bold text-gray-700 text-xs">Prix unitaire</TableHead>
                    <TableHead className="text-right font-bold text-gray-700 text-xs">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleItems.map((item) => (
                    <TableRow key={item.id} className="border-b border-gray-100 hover:bg-transparent">
                      <TableCell className="font-bold text-gray-800 py-3">{item.product_name}</TableCell>
                      <TableCell className="text-center font-bold text-gray-500">{item.quantity}</TableCell>
                      <TableCell className="text-right font-bold text-gray-500">{item.unit_price?.toLocaleString()} CFA</TableCell>
                      <TableCell className="text-right font-headline font-bold text-gray-900">{(item.item_total || (item.unit_price || 0) * (item.quantity || 0) || 0).toLocaleString()} CFA</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-8 py-6 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-500">
              Page {page} sur {totalPages} ({totalCount} ventes)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Void Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline text-red-500">Annuler la vente</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Veuillez indiquer le motif de l'annulation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>Motif d'annulation</Label>
              <Input
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                className="h-12 rounded-xl"
                placeholder="Ex: Erreur de saisie, retour client..."
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-14 rounded-xl font-bold"
                onClick={() => setVoidDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                className="flex-1 h-14 rounded-2xl font-bold text-lg"
                disabled={voiding || !voidReason.trim()}
                onClick={handleVoid}
              >
                {voiding ? "Annulation..." : "Confirmer l'annulation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] p-0 overflow-hidden">
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline">Facture de vente</DialogTitle>
              <DialogDescription className="text-gray-500">
                Détails de la transaction et récapitulatif de la facture.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 rounded-3xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Facture</p>
                  <p className="font-bold text-gray-900 text-lg">{detailSale?.invoice_number || detailSale?.id?.slice(0, 8)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Date</p>
                  <p className="font-bold text-gray-900">{detailSale?.sale_date ? new Date(detailSale.sale_date).toLocaleDateString('fr-FR') : '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Client</p>
                  <p className="font-bold text-gray-900">{detailSale?.customer_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Vendeur</p>
                  <p className="font-bold text-gray-900">{detailSale?.seller_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Méthode</p>
                  <Badge variant="outline" className={`rounded-lg text-[9px] font-black border-none ${paymentMethodColors[detailSale?.payment_method] || 'bg-gray-50 text-gray-500'}`}>
                    {paymentMethodLabels[detailSale?.payment_method] || detailSale?.payment_method}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Statut</p>
                  <Badge variant="outline" className={`rounded-lg text-[9px] font-black border-none ${paymentStatusColors[detailSale?.payment_status] || 'bg-gray-50 text-gray-500'}`}>
                    {paymentStatusLabels[detailSale?.payment_status] || detailSale?.payment_status}
                  </Badge>
                </div>
              </div>
              {detailSale?.notes && (
                <div className="rounded-2xl bg-white p-4 border border-gray-100 text-sm text-gray-600">
                  <p className="font-black text-gray-700 mb-2">Notes</p>
                  <p>{detailSale.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Articles</p>
              {detailItems.length === 0 ? (
                <p className="text-sm text-gray-400 font-medium">Aucun article.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-none bg-gray-50/50">
                      <TableHead className="font-bold text-gray-700 text-xs">Produit</TableHead>
                      <TableHead className="text-center font-bold text-gray-700 text-xs">Qté</TableHead>
                      <TableHead className="text-right font-bold text-gray-700 text-xs">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailItems.map((item) => (
                      <TableRow key={item.id} className="border-b border-gray-50">
                        <TableCell className="font-bold text-gray-800 py-3">{item.product_name}</TableCell>
                        <TableCell className="text-center font-bold text-gray-500">{item.quantity}</TableCell>
                        <TableCell className="text-right font-headline font-bold text-gray-900">{(item.item_total || (item.unit_price || 0) * (item.quantity || 0) || 0).toLocaleString()} CFA</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2 pt-6 border-t border-gray-100">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Montant total</p>
                <p className="text-2xl font-headline font-bold text-gray-900">{detailSale?.total_amount?.toLocaleString()} CFA</p>
              </div>
              <div className="space-y-2 text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Paiement</p>
                <p className="font-bold text-gray-900">{paymentStatusLabels[detailSale?.payment_status] || detailSale?.payment_status || '—'}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
