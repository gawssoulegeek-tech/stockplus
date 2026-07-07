
import { useState, useRef, useEffect, useMemo } from "react"
import Lottie from "lottie-react"
import {
  Plus,
  Search,
  MoreVertical,
  Trash,
  Package,
  ArrowUpCircle,
  AlertTriangle,
  Upload,
  History,
  Minus,
  Eye,
  X,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useBoutique } from "@/views/dashboard/layout"
import { getSupabaseClient } from "@/supabase/client"
import { productService } from "@/services/productService"
import { stockService } from "@/services/stockService"
import { StockMoveType } from "@/types/supabase"

const LOADING_CUBE_URL = "/loading-cube.json"
const EMPTY_BOX_URL = "/lottie/Empty Box Animation.json"
const EXCLAMATION_URL = "/lottie/exclamation_start.json"

export default function InventoryPage() {
  const { toast } = useToast()
  const { boutique, features, userProfile } = useBoutique()

  const [products, setProducts] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isFromScan, setIsFromScan] = useState(false)
  const [loadingData, setLoadingData] = useState<any>(null)
  const [emptyBoxData, setEmptyBoxData] = useState<any>(null)
  const [exclamationData, setExclamationData] = useState<any>(null)

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    unit: "pièce",
    imageUrl: ""
  })

  const [stockDialog, setStockDialog] = useState<{ open: boolean; productId: string; productName: string; currentStock: number }>({ open: false, productId: '', productName: '', currentStock: 0 })
  const [stockQty, setStockQty] = useState("")
  const [adjustDialog, setAdjustDialog] = useState<{ open: boolean; productId: string; productName: string; currentStock: number }>({ open: false, productId: '', productName: '', currentStock: 0 })
  const [adjustQty, setAdjustQty] = useState("")
  const [adjustReason, setAdjustReason] = useState("")
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; productId: string; productName: string; moves: any[] }>({ open: false, productId: '', productName: '', moves: [] })
  const [historyLoading, setHistoryLoading] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [showLowStock, setShowLowStock] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState("all")

  useEffect(() => {
    fetch(LOADING_CUBE_URL)
      .then(res => res.json())
      .then(data => setLoadingData(data))
      .catch(err => console.warn("Lottie error", err))
    fetch(EMPTY_BOX_URL)
      .then(res => res.ok && res.json())
      .then(data => data && setEmptyBoxData(data))
      .catch(() => {})
    fetch(EXCLAMATION_URL)
      .then(res => res.ok && res.json())
      .then(data => data && setExclamationData(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!boutique?.id) return
    const supabase = getSupabaseClient()
    productService.listProducts(supabase, boutique.id, { per_page: 100 })
      .then(res => setProducts(res.data))
      .catch(() => {})
  }, [boutique?.id])

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.min_stock_level != null && p.quantity_in_stock < p.min_stock_level)
  }, [products])

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean))
    return ['all', ...Array.from(cats)] as string[]
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (searchTerm && !p.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      if (showLowStock && (p.min_stock_level == null || p.quantity_in_stock >= p.min_stock_level)) return false
      return true
    })
  }, [products, searchTerm, categoryFilter, showLowStock])

  const refreshProducts = async () => {
    if (!boutique?.id) return
    const supabase = getSupabaseClient()
    try {
      const res = await productService.listProducts(supabase, boutique.id, { per_page: 100 })
      setProducts(res.data)
    } catch {}
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProduct.name || !newProduct.price || !boutique) return

    const stockVal = parseInt(newProduct.stock) || 0
    const supabase = getSupabaseClient()

    try {
      const product = await productService.createProduct(supabase, boutique.id, {
        name: newProduct.name,
        category: newProduct.category || "Général",
        sku: `SKU-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
        price_retail: parseInt(newProduct.price),
        quantity_in_stock: stockVal,
        unit_of_measure: features.units ? newProduct.unit : "pcs",
        image_url: newProduct.imageUrl || "https://picsum.photos/seed/placeholder/400/400",
      })

      if (stockVal > 0) {
        await stockService.createStockMove(supabase, boutique.id, product.id, StockMoveType.PURCHASE, stockVal, {
          reason: "Initialisation stock",
          recorded_by: userProfile?.name,
        })
      }

      setProducts(prev => [product, ...prev])
      setIsDialogOpen(false)
      setNewProduct({ name: "", category: "", price: "", stock: "", unit: "pièce", imageUrl: "" })
      toast({ title: "Produit ajouté", description: "L'inventaire a été mis à jour." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const handleStockAdd = async () => {
    const qty = parseInt(stockQty)
    if (isNaN(qty) || qty <= 0 || !boutique) return
    const supabase = getSupabaseClient()
    try {
      const updated = await productService.updateStockQuantity(supabase, stockDialog.productId, stockDialog.currentStock + qty)
      await stockService.createStockMove(supabase, boutique.id, stockDialog.productId, StockMoveType.PURCHASE, qty, {
        reason: "Réapprovisionnement manuel",
        recorded_by: userProfile?.name,
      })
      setProducts(prev => prev.map(p => p.id === stockDialog.productId ? { ...p, quantity_in_stock: updated.quantity_in_stock } : p))
      setStockDialog({ open: false, productId: '', productName: '', currentStock: 0 })
      setStockQty('')
      toast({ title: "Stock mis à jour", description: `+${qty} ${stockDialog.productName} ajoutés.` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const handleAdjust = async () => {
    const qty = parseInt(adjustQty)
    if (isNaN(qty) || qty === 0 || !boutique) return
    const supabase = getSupabaseClient()
    const newStock = Math.max(0, adjustDialog.currentStock + qty)
    try {
      const updated = await productService.updateStockQuantity(supabase, adjustDialog.productId, newStock)
      await stockService.createStockMove(supabase, boutique.id, adjustDialog.productId, StockMoveType.ADJUSTMENT, qty, {
        reason: adjustReason || "Ajustement manuel",
        recorded_by: userProfile?.name,
      })
      setProducts(prev => prev.map(p => p.id === adjustDialog.productId ? { ...p, quantity_in_stock: updated.quantity_in_stock } : p))
      setAdjustDialog({ open: false, productId: '', productName: '', currentStock: 0 })
      setAdjustQty('')
      setAdjustReason('')
      toast({ title: "Stock ajusté", description: `${qty > 0 ? '+' : ''}${qty} ${adjustDialog.productName}` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const handleViewHistory = async (productId: string, productName: string) => {
    setHistoryDialog({ open: true, productId, productName, moves: [] })
    setHistoryLoading(true)
    const supabase = getSupabaseClient()
    try {
      const res = await stockService.getProductStockHistory(supabase, productId, { per_page: 50 })
      setHistoryDialog(prev => ({ ...prev, moves: res.data }))
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    } finally {
      setHistoryLoading(false)
    }
  }

  const statusBadge = (stock: number) => {
    if (stock <= 0) return { label: 'RUPTURE', class: 'bg-red-50 text-red-500' }
    if (stock <= 5) return { label: 'BAS', class: 'bg-red-50 text-red-500' }
    return { label: 'OK', class: 'bg-green-50 text-green-600' }
  }

  const moveTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      purchase: 'Entrée',
      sale: 'Sortie',
      adjustment: 'Ajustement',
      return: 'Retour',
      damage: 'Perte',
    }
    return map[type] || type
  }

  const formatMoveDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-8">
      {lowStockProducts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-4">
          {exclamationData ? (
            <div className="h-10 w-10 shrink-0">
              <Lottie animationData={exclamationData} loop={true} className="w-full h-full" />
            </div>
          ) : (
            <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-bold text-red-800">Alerte Stock Bas</p>
            <p className="text-sm text-red-600">{lowStockProducts.length} produit(s) ont un stock inférieur au seuil minimum.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-xl border-red-200 text-red-600 hover:bg-red-100"
            onClick={() => { setShowLowStock(true); setCategoryFilter('all') }}
          >
            <Eye className="h-4 w-4 mr-2" /> Voir
          </Button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-headline font-bold text-gray-900 tracking-tight">Inventaire</h1>
          <p className="text-gray-500 font-medium text-lg">Gérez votre catalogue multi-boutiques.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="h-12 px-6 rounded-xl border-gray-200 font-bold">
            <Upload className="h-4 w-4 mr-2" />
            Importer
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="sena-gradient text-white border-none rounded-xl h-12 px-6 font-bold shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Produit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline">Ajouter au Catalogue</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddProduct} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nom du produit</Label>
                  <Input
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    className="h-12 rounded-xl" required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prix (CFA)</Label>
                    <Input
                      type="number"
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                      className="h-12 rounded-xl" required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock initial</Label>
                    <Input
                      type="number"
                      value={newProduct.stock}
                      onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
                      className="h-12 rounded-xl" required
                    />
                  </div>
                </div>

                {features.units && (
                  <div className="space-y-2">
                    <Label>Unité de mesure</Label>
                    <Select value={newProduct.unit} onValueChange={v => setNewProduct({...newProduct, unit: v})}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="pièce">Pièce</SelectItem>
                        <SelectItem value="m">Mètre (m)</SelectItem>
                        <SelectItem value="kg">Kilogramme (kg)</SelectItem>
                        <SelectItem value="L">Litre (L)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button type="submit" className="w-full sena-gradient text-white h-14 rounded-2xl font-bold text-lg shadow-xl shadow-orange-500/20">
                  Enregistrer
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="premium-card overflow-hidden">
        <div className="p-8 border-b bg-gray-50/30 flex flex-wrap items-center gap-4">
          <div className="relative max-w-md w-full flex-1">
            <Search className="absolute left-4 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Chercher un produit..."
              className="pl-11 h-12 rounded-xl bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="lowStock"
                checked={showLowStock}
                onCheckedChange={(v) => setShowLowStock(v === true)}
              />
              <Label htmlFor="lowStock" className="text-sm font-medium text-red-600 cursor-pointer">Stock bas</Label>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-12 w-44 rounded-xl border-gray-200">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat === 'all' ? 'Toutes les catégories' : cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="px-8 h-16 font-bold uppercase text-[10px] tracking-widest">Produit</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Stock</TableHead>
                {features.units && <TableHead className="font-bold uppercase text-[10px] tracking-widest">Unité</TableHead>}
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Prix</TableHead>
                <TableHead className="text-right px-8 font-bold uppercase text-[10px] tracking-widest">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts
                .map((product) => {
                  const badge = statusBadge(product.quantity_in_stock)
                  return (
                  <TableRow key={product.id} className="hover:bg-orange-50/5 group transition-colors">
                    <TableCell className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gray-100 overflow-hidden relative border shrink-0">
                          <img src={product.image_url || "https://picsum.photos/seed/placeholder/400/400"} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{product.name}</span>
                          <span className="text-[10px] font-mono text-gray-400">{product.sku}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                         <span className={`text-lg font-headline font-bold ${product.quantity_in_stock <= 5 ? 'text-red-500' : 'text-gray-900'}`}>{product.quantity_in_stock}</span>
                         <Badge variant="outline" className={`rounded-lg text-[9px] font-black ${badge.class}`}>
                           {badge.label}
                         </Badge>
                      </div>
                    </TableCell>
                    {features.units && (
                      <TableCell className="text-xs font-bold text-gray-500 uppercase">{product.unit_of_measure || 'pcs'}</TableCell>
                    )}
                    <TableCell className="font-headline font-bold text-primary text-lg">{product.price_retail.toLocaleString()} CFA</TableCell>
                    <TableCell className="text-right px-8">
                      <div className="flex justify-end gap-2">
                         <Button
                           variant="ghost"
                           size="icon"
                           className="h-10 w-10 rounded-xl hover:bg-green-50 hover:text-green-600"
                           onClick={() => { setStockDialog({ open: true, productId: product.id, productName: product.name, currentStock: product.quantity_in_stock }); setStockQty('') }}
                         >
                           <ArrowUpCircle className="h-5 w-5" />
                         </Button>
                         <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem
                              onClick={() => { setAdjustDialog({ open: true, productId: product.id, productName: product.name, currentStock: product.quantity_in_stock }); setAdjustQty(''); setAdjustReason('') }}
                            >
                              <Minus className="h-4 w-4 mr-2" /> Ajuster le stock
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewHistory(product.id, product.name)}>
                              <History className="h-4 w-4 mr-2" /> Voir historique
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-500 font-bold"
                              onClick={async () => {
                                const supabase = getSupabaseClient()
                                try {
                                  await productService.deleteProduct(supabase, product.id)
                                  setProducts(prev => prev.filter(p => p.id !== product.id))
                                  toast({ title: "Produit retiré" })
                                } catch (e: any) {
                                  toast({ variant: "destructive", title: "Erreur", description: e.message })
                                }
                              }}
                            >
                              <Trash className="h-4 w-4 mr-2" /> Retirer du catalogue
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )})}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={features.units ? 5 : 4} className="text-center py-16 text-gray-400 font-medium">
                      {emptyBoxData ? (
                        <div className="w-24 h-24 mx-auto mb-3 opacity-60">
                          <Lottie animationData={emptyBoxData} loop={true} className="w-full h-full" />
                        </div>
                      ) : (
                        <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      )}
                      Aucun produit trouvé
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={stockDialog.open} onOpenChange={(o) => setStockDialog({ ...stockDialog, open: o })}>
        <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline">Ajouter du stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-500">Produit : <strong>{stockDialog.productName}</strong></p>
            <p className="text-sm text-gray-500">Stock actuel : <strong>{stockDialog.currentStock}</strong></p>
            <div className="space-y-2">
              <Label>Quantité à ajouter</Label>
              <Input
                type="number"
                min="1"
                value={stockQty}
                onChange={e => setStockQty(e.target.value)}
                className="h-12 rounded-xl"
                placeholder="Ex: 10"
              />
            </div>
            <Button
              className="w-full sena-gradient text-white h-14 rounded-2xl font-bold text-lg"
              onClick={handleStockAdd}
              disabled={!stockQty || parseInt(stockQty) <= 0}
            >
              Valider l'ajout
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustDialog.open} onOpenChange={(o) => setAdjustDialog({ ...adjustDialog, open: o })}>
        <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline">Ajustement de stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-500">Produit : <strong>{adjustDialog.productName}</strong></p>
            <div className="space-y-2">
              <Label>Variation (ex: -2 pour perte, 5 pour surplus)</Label>
              <Input
                type="number"
                value={adjustQty}
                onChange={e => setAdjustQty(e.target.value)}
                className="h-12 rounded-xl"
                placeholder="Ex: -5"
              />
            </div>
            <div className="space-y-2">
              <Label>Raison de l'ajustement</Label>
              <Textarea
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                className="rounded-xl"
                placeholder="Ex: Casse, erreur inventaire..."
              />
            </div>
            <Button
              className="w-full bg-gray-900 text-white h-14 rounded-2xl font-bold text-lg"
              onClick={handleAdjust}
              disabled={!adjustQty || parseInt(adjustQty) === 0}
            >
              Confirmer l'ajustement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialog.open} onOpenChange={(o) => setHistoryDialog({ ...historyDialog, open: o })}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline">Historique : {historyDialog.productName}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {historyLoading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {historyDialog.moves.map((move) => (
                    <div key={move.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2">
                            {moveTypeLabel(move.move_type)}
                          </Badge>
                          <span className="text-[10px] text-gray-400 font-bold">{formatMoveDate(move.move_date)}</span>
                        </div>
                        <p className="text-sm text-gray-600 font-medium">{move.reason || '-'}</p>
                        <p className="text-[10px] text-gray-400 mt-1">Par : {move.recorded_by || '-'}</p>
                      </div>
                      <div className={`text-xl font-headline font-bold ${move.quantity_change > 0 ? 'text-green-500' : 'text-primary'}`}>
                        {move.quantity_change > 0 ? `+${move.quantity_change}` : move.quantity_change}
                      </div>
                    </div>
                  ))}
                  {historyDialog.moves.length === 0 && (
                    <div className="text-center py-10 text-gray-400">Aucun mouvement enregistré.</div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
