
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
  Image as ImageIcon,
  Loader2,
  ScanLine,
  FileText,
  Camera,
  FileSpreadsheet,
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
    unitContent: "",  // nombre d'unités de base par unité (ex: 1 carton = 24 pièces)
    imageUrl: ""
  })

  // 📏 Configuration des unités par type
  const UNIT_CONFIG: Record<string, { type: string; baseUnit?: string; baseLabel?: string; defaultContent?: number }> = {
    "pièce": { type: "unité" },
    // Poids
    "kg": { type: "poids", baseUnit: "g", baseLabel: "grammes (g)", defaultContent: 1000 },
    "g": { type: "poids" },
    // Longueur
    "m": { type: "longueur", baseUnit: "cm", baseLabel: "centimètres (cm)", defaultContent: 100 },
    "cm": { type: "longueur" },
    // Volume
    "L": { type: "volume", baseUnit: "mL", baseLabel: "millilitres (mL)", defaultContent: 1000 },
    "mL": { type: "volume" },
    // Conditionnement (emballage)
    "carton": { type: "conditionnement", baseUnit: "pièce", baseLabel: "pièces", defaultContent: 1 },
    "sac": { type: "conditionnement", baseUnit: "pièce", baseLabel: "pièces", defaultContent: 1 },
    "boîte": { type: "conditionnement", baseUnit: "pièce", baseLabel: "pièces", defaultContent: 1 },
    "paquet": { type: "conditionnement", baseUnit: "pièce", baseLabel: "pièces", defaultContent: 1 },
    "lot": { type: "conditionnement", baseUnit: "pièce", baseLabel: "pièces", defaultContent: 1 },
  }

  const currentUnitConfig = UNIT_CONFIG[newProduct.unit] || { type: "unité" }
  const showUnitContent = currentUnitConfig.type !== "unité" && currentUnitConfig.baseUnit

  // Upload image (plan Basic)
  const [imageUploading, setImageUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Scan facture fournisseur (plan Pro)
  const [scanDialogOpen, setScanDialogOpen] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [scannedProducts, setScannedProducts] = useState<any[]>([])
  const scanFileRef = useRef<HTMLInputElement>(null)

  // Import CSV
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [csvPreview, setCsvPreview] = useState<any[]>([])
  const [csvLoading, setCsvLoading] = useState(false)

  const [stockDialog, setStockDialog] = useState<{ open: boolean; productId: string; productName: string; currentStock: number }>({ open: false, productId: '', productName: '', currentStock: 0 })
  const [stockQty, setStockQty] = useState("")
  const [adjustDialog, setAdjustDialog] = useState<{ open: boolean; productId: string; productName: string; currentStock: number }>({ open: false, productId: '', productName: '', currentStock: 0 })
  const [adjustQty, setAdjustQty] = useState("")
  const [adjustReason, setAdjustReason] = useState("")
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; productId: string; productName: string; moves: any[] }>({ open: false, productId: '', productName: '', moves: [] })
  const [historyLoading, setHistoryLoading] = useState(false)
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
    const unitContent = parseInt(newProduct.unitContent) || 1  // défaut 1 (ex: 1 pièce = 1 pièce)
    // Stock total en unités de base (pièces) = nombre d'unités × contenu par unité
    // Ex: 10 cartons × 24 pièces = 240 pièces
    const totalStockInPieces = stockVal * unitContent
    const supabase = getSupabaseClient()

    try {
      const product = await productService.createProduct(supabase, boutique.id, {
        name: newProduct.name,
        category: newProduct.category || "Général",
        sku: `SKU-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
        price_retail: parseInt(newProduct.price),
        quantity_in_stock: totalStockInPieces,  // stock total en unités de base
        unit_of_measure: newProduct.unit,
        // unit_content stocké dans metadata ou colonne dédiée (migration 007)
        image_url: newProduct.imageUrl || "https://picsum.photos/seed/placeholder/400/400",
      })

      // Mettre à jour unit_content si la colonne existe
      if (unitContent > 1) {
        await supabase
          .from('products')
          .update({ unit_content: unitContent } as any)
          .eq('id', product.id)
          .then(() => {})
          .catch(() => {})  // non-bloquant si colonne inexistante
      }

      if (totalStockInPieces > 0) {
        await stockService.createStockMove(supabase, boutique.id, product.id, StockMoveType.PURCHASE, totalStockInPieces, {
          reason: `Initialisation stock (${stockVal} ${newProduct.unit}${stockVal > 1 ? 's' : ''} × ${unitContent})`,
          recorded_by: userProfile?.name,
        })
      }

      setProducts(prev => [{ ...product, unit_content: unitContent } as any, ...prev])
      setIsDialogOpen(false)
      setNewProduct({ name: "", category: "", price: "", stock: "", unit: "pièce", unitContent: "", imageUrl: "" })
      toast({ title: "Produit ajouté", description: "L'inventaire a été mis à jour." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  // 📸 Upload image produit (plan Basic)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !boutique) return

    // Validation
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Image trop lourde", description: "Maximum 2 Mo." })
      return
    }
    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Format invalide", description: "Choisissez une image (PNG, JPG, WebP)." })
      return
    }

    setImageUploading(true)
    try {
      const supabase = getSupabaseClient()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `${boutique.id}/products/${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('products')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName)

      setNewProduct(prev => ({ ...prev, imageUrl: publicUrl }))
      toast({ title: "Image uploadée", description: "L'image du produit a été ajoutée." })
    } catch (e: any) {
      console.error('Image upload error:', e)
      // Fallback : utiliser l'URL externe ou un placeholder
      toast({
        variant: "destructive",
        title: "Upload échoué",
        description: "Le bucket Storage 'products' n'existe pas. Créez-le dans Supabase → Storage."
      })
    } finally {
      setImageUploading(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  // 📷 Prise de photo directe (caméra)
  // Réutilise handleImageUpload mais avec capture="environment"
  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Convertir l'événement pour réutiliser handleImageUpload
    await handleImageUpload(e)
  }

  // 📊 Import CSV de produits
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !boutique) return

    setCsvLoading(true)
    setImportDialogOpen(true)

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(l => l.trim())
      
      if (lines.length < 2) {
        toast({ variant: "destructive", title: "CSV vide", description: "Le fichier doit avoir un en-tête + au moins 1 ligne." })
        return
      }

      // Parser le CSV (supporte virgule et point-virgule)
      const delimiter = lines[0].includes(';') ? ';' : ','
      const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase())
      
      const products = lines.slice(1).map(line => {
        const values = line.split(delimiter)
        const obj: any = {}
        headers.forEach((h, i) => {
          obj[h] = values[i]?.trim() || ''
        })
        return {
          name: obj.name || obj.nom || obj.produit || 'Produit',
          category: obj.category || obj.categorie || obj.cat || 'Général',
          price: parseFloat(obj.price || obj.prix || obj.prix_vente || '0') || 0,
          stock: parseInt(obj.stock || obj.quantite || obj.qty || '0') || 0,
          sku: obj.sku || obj.code || '',
          cost_price: parseFloat(obj.cost_price || obj.prix_achat || obj.cout || '0') || 0,
        }
      })

      setCsvPreview(products)
      toast({ title: "CSV chargé", description: `${products.length} produits prêts à importer.` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur CSV", description: e.message })
    } finally {
      setCsvLoading(false)
      if (csvInputRef.current) csvInputRef.current.value = ''
    }
  }

  const importCsvProducts = async () => {
    if (!boutique || csvPreview.length === 0) return
    const supabase = getSupabaseClient()
    let imported = 0

    for (const p of csvPreview) {
      try {
        const product = await productService.createProduct(supabase, boutique.id, {
          name: p.name,
          sku: p.sku || `SKU-${Date.now().toString(36).toUpperCase()}-${imported}`,
          cost_price: p.cost_price,
          price_retail: p.price,
          quantity_in_stock: p.stock,
          category: p.category,
          is_active: true,
        })

        if (p.stock > 0) {
          await stockService.createStockMove(supabase, boutique.id, product.id, StockMoveType.PURCHASE, p.stock, {
            reason: `Import CSV (${p.name})`,
            recorded_by: userProfile?.name,
          })
        }
        imported++
      } catch (e) {
        console.error('Import CSV product error:', e)
      }
    }

    refreshProducts()
    setImportDialogOpen(false)
    setCsvPreview([])
    toast({ title: "Import terminé", description: `${imported} produit(s) importé(s).` })
  }

  // 📄 Scan facture fournisseur (plan Pro) via Gemini IA
  const handleScanInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !boutique) return

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Fichier trop lourd", description: "Maximum 5 Mo." })
      return
    }

    setScanLoading(true)
    setScannedProducts([])
    setScanDialogOpen(true)

    try {
      // Convertir en base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const base64Data = result.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Appeler l'API IA d'extraction de facture
      const { data: { session } } = await getSupabaseClient().auth.getSession()
      const res = await fetch('/api/ai/invoice-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          invoiceDataUri: `data:${file.type};base64,${base64}`,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur lors du scan')
      }

      const data = await res.json()
      const extracted = data.products || []
      setScannedProducts(extracted)

      if (extracted.length === 0) {
        toast({ variant: "destructive", title: "Aucun produit détecté", description: "L'IA n'a pas trouvé de produits sur cette facture." })
      } else {
        toast({ title: "Facture scannée", description: `${extracted.length} produits détectés. Vérifiez et validez.` })
      }
    } catch (e: any) {
      console.error('Scan invoice error:', e)
      toast({ variant: "destructive", title: "Erreur scan", description: e.message })
    } finally {
      setScanLoading(false)
      if (scanFileRef.current) scanFileRef.current.value = ''
    }
  }

  // Importer en stock les produits scannés
  const importScannedProducts = async () => {
    if (!boutique || scannedProducts.length === 0) return
    const supabase = getSupabaseClient()
    let imported = 0

    for (const p of scannedProducts) {
      try {
        const product = await productService.createProduct(supabase, boutique.id, {
          name: p.name,
          sku: `SKU-${Date.now().toString(36).toUpperCase()}-${imported}`,
          cost_price: Math.round(p.purchasePrice || 0),
          price_retail: Math.round((p.purchasePrice || 0) * 1.3), // +30% marge par défaut
          quantity_in_stock: p.quantity || 0,
          category: 'Importé',
          is_active: true,
        })

        if ((p.quantity || 0) > 0) {
          await stockService.createStockMove(supabase, boutique.id, product.id, StockMoveType.PURCHASE, p.quantity, {
            reason: `Import facture (${p.name})`,
            recorded_by: userProfile?.name,
          })
        }
        imported++
      } catch (e) {
        console.error('Import product error:', e)
      }
    }

    // Refresh products list
    refreshProducts()
    setScanDialogOpen(false)
    setScannedProducts([])
    toast({ title: "Import terminé", description: `${imported} produit(s) ajouté(s) au stock.` })
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
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvUpload}
            className="hidden"
          />
          <Button variant="outline" onClick={() => csvInputRef.current?.click()} className="h-12 px-6 rounded-xl border-gray-200 font-bold">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Importer CSV
          </Button>
          {/* 🔍 Scan facture fournisseur (plan Pro uniquement) */}
          {features.supplierInvoiceScan && (
            <>
              <input
                ref={scanFileRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleScanInvoice}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => scanFileRef.current?.click()}
                className="h-12 px-6 rounded-xl border-primary text-primary font-bold hover:bg-orange-50"
              >
                <ScanLine className="h-4 w-4 mr-2" />
                Scanner Facture
              </Button>
            </>
          )}
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
                {/* 📸 Upload image produit + Caméra */}
                <div className="space-y-2">
                  <Label>Image du produit</Label>
                  <div className="flex items-center gap-3">
                    {newProduct.imageUrl ? (
                      <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-gray-100">
                        <img src={newProduct.imageUrl} alt="Aperçu" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewProduct({ ...newProduct, imageUrl: "" })}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      {/* Input caméra (capture) */}
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleCameraCapture}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={imageUploading}
                          className="h-10 rounded-xl font-bold border-gray-200 flex-1 text-xs"
                        >
                          {imageUploading ? (
                            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> ...</>
                          ) : (
                            <><Upload className="h-3 w-3 mr-1" /> Galerie</>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => cameraInputRef.current?.click()}
                          disabled={imageUploading}
                          className="h-10 rounded-xl font-bold border-gray-200 flex-1 text-xs"
                        >
                          <Camera className="h-3 w-3 mr-1" />
                          Photo
                        </Button>
                      </div>
                      <p className="text-[10px] text-gray-400">PNG, JPG, WebP — max 2 Mo</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nom du produit</Label>
                  <Input
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    className="h-12 rounded-xl" required
                  />
                </div>

                {/* Catégorie optionnelle */}
                <div className="space-y-2">
                  <Label>Catégorie <span className="text-gray-400 font-normal">(optionnel)</span></Label>
                  <Input
                    value={newProduct.category}
                    onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                    placeholder="Ex: Boissons, Électronique, Cosmétiques..."
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stock initial</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={newProduct.stock}
                        onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
                        className="h-12 rounded-xl pr-16" required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        {newProduct.unit}{(parseInt(newProduct.stock) || 0) > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Prix (CFA)</Label>
                    <Input
                      type="number"
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                      className="h-12 rounded-xl" required
                    />
                  </div>
                </div>

                {/* Unité de mesure — disponible pour tous les plans */}
                <div className="space-y-2">
                  <Label>Unité de mesure</Label>
                  <Select value={newProduct.unit} onValueChange={v => {
                    const config = UNIT_CONFIG[v] || { type: "unité" }
                    // Pré-remplir le contenu par unité avec la valeur par défaut
                    // (ex: kg → 1000 g, m → 100 cm, L → 1000 mL)
                    const defaultContent = config.defaultContent && config.defaultContent > 1
                      ? String(config.defaultContent)
                      : ""
                    setNewProduct({ ...newProduct, unit: v, unitContent: defaultContent })
                  }}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="pièce">Pièce</SelectItem>
                      <SelectItem value="carton">Carton</SelectItem>
                      <SelectItem value="sac">Sac</SelectItem>
                      <SelectItem value="boîte">Boîte</SelectItem>
                      <SelectItem value="paquet">Paquet</SelectItem>
                      <SelectItem value="lot">Lot</SelectItem>
                      <SelectItem value="kg">Kilogramme (kg)</SelectItem>
                      <SelectItem value="g">Gramme (g)</SelectItem>
                      <SelectItem value="L">Litre (L)</SelectItem>
                      <SelectItem value="mL">Millilitre (mL)</SelectItem>
                      <SelectItem value="m">Mètre (m)</SelectItem>
                      <SelectItem value="cm">Centimètre (cm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Contenu par unité (conversion vers sous-unité) */}
                {showUnitContent && currentUnitConfig.baseUnit && currentUnitConfig.baseLabel && (
                  <div className="space-y-2">
                    <Label>
                      {currentUnitConfig.type === "conditionnement"
                        ? <>Contenu par {newProduct.unit} <span className="text-gray-400 font-normal">({currentUnitConfig.baseLabel})</span></>
                        : <>Conversion <span className="text-gray-400 font-normal">(1 {newProduct.unit} = ? {currentUnitConfig.baseLabel})</span></>}
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        value={newProduct.unitContent}
                        onChange={e => setNewProduct({...newProduct, unitContent: e.target.value})}
                        placeholder={`Ex: ${currentUnitConfig.defaultContent || 1}`}
                        className="h-12 rounded-xl"
                        min="1"
                      />
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        = 1 {newProduct.unit}
                      </span>
                    </div>
                    {newProduct.unitContent && parseInt(newProduct.unitContent) > 0 && newProduct.stock && (
                      <p className="text-xs text-primary font-bold">
                        → Stock total : {(parseInt(newProduct.stock) * parseInt(newProduct.unitContent)).toLocaleString()} {currentUnitConfig.baseUnit === "pièce" ? "pièces" : currentUnitConfig.baseLabel}
                        <span className="font-normal text-gray-500"> ({newProduct.stock} {newProduct.unit}{parseInt(newProduct.stock) > 1 ? 's' : ''} × {newProduct.unitContent})</span>
                      </p>
                    )}
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

      {/* 📄 Dialogue scan facture fournisseur */}
      <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Scan Facture Fournisseur
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {scanLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-gray-500 font-medium">Analyse de la facture en cours...</p>
                <p className="text-xs text-gray-400">L'IA Awa détecte les produits automatiquement.</p>
              </div>
            ) : scannedProducts.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  {scannedProducts.length} produit(s) détecté(s). Vérifiez et cliquez sur "Importer".
                </p>
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {scannedProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">
                          Qté: {p.quantity} • Prix achat: {(p.purchasePrice || 0).toLocaleString()} CFA
                        </p>
                      </div>
                      <Badge className="bg-orange-50 text-primary">
                        Prix vente: {Math.round((p.purchasePrice || 0) * 1.3).toLocaleString()} CFA
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => { setScanDialogOpen(false); setScannedProducts([]) }}
                    className="flex-1 h-12 rounded-xl font-bold"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={importScannedProducts}
                    className="flex-1 h-12 sena-gradient text-white rounded-xl font-bold"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Importer ({scannedProducts.length})
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-400">Aucun produit détecté.</p>
                <Button
                  variant="outline"
                  onClick={() => scanFileRef.current?.click()}
                  className="mt-4 h-12 rounded-xl font-bold"
                >
                  <ScanLine className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 📊 Dialogue import CSV */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              Importer des produits (CSV)
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {csvLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-gray-500 font-medium">Lecture du fichier CSV...</p>
              </div>
            ) : csvPreview.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  {csvPreview.length} produit(s) à importer. Vérifiez et cliquez sur "Importer".
                </p>
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {csvPreview.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">
                          {p.category} • Qté: {p.stock} • Prix: {p.price.toLocaleString()} CFA
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                  💡 Format CSV attendu : colonnes <code>name</code>, <code>price</code>, <code>stock</code>, <code>category</code> (optionnel), <code>cost_price</code> (optionnel)
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => { setImportDialogOpen(false); setCsvPreview([]) }}
                    className="flex-1 h-12 rounded-xl font-bold"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={importCsvProducts}
                    className="flex-1 h-12 sena-gradient text-white rounded-xl font-bold"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Importer ({csvPreview.length})
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 space-y-4">
                <FileSpreadsheet className="h-12 w-12 text-gray-300 mx-auto" />
                <div>
                  <p className="font-bold text-gray-900 mb-2">Importez vos produits en masse</p>
                  <p className="text-sm text-gray-500">Sélectionnez un fichier CSV avec vos produits.</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-left text-xs text-gray-600">
                  <p className="font-bold mb-2">Format attendu (en-tête) :</p>
                  <code className="block">name,price,stock,category,cost_price</code>
                  <code className="block mt-1">Coca-Cola,500,24,Boissons,300</code>
                  <code className="block mt-1">Riz 5kg,2500,10,Alimentation,2000</code>
                </div>
                <Button
                  variant="outline"
                  onClick={() => csvInputRef.current?.click()}
                  className="h-12 rounded-xl font-bold"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Choisir un fichier CSV
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
