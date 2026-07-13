
import { useState, useEffect } from "react"
import Lottie from "lottie-react"
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  ChevronRight,
  Banknote,
  Smartphone,
  CreditCard,
  X,
  Printer,
  Store,
  User as UserIcon,
  LayoutGrid
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useBoutique } from "@/views/dashboard/layout"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSupabaseClient } from "@/supabase/client"
import { productService } from "@/services/productService"
import { saleService } from "@/services/saleService"
import { SaleType, PaymentMethod } from "@/types/supabase"

const LOADING_CUBE_URL = "/loading-cube.json"

interface CartItem {
  id: string
  name: string
  price: number
  wholesalePrice?: number
  quantity: number
  imageUrl: string
  stock: number
  unit: string
}

interface CartSession {
  id: string
  name: string
  items: CartItem[]
  customerName: string
  saleType: "Détail" | "Gros"
}

export default function POSPage() {
  const { toast } = useToast()
  const { boutique, features, userProfile } = useBoutique()

  const [products, setProducts] = useState<any[]>([])
  const [carts, setCarts] = useState<CartSession[]>([
    { id: "cart_1", name: "Client 1", items: [], customerName: "", saleType: "Détail" }
  ])
  const [activeCartId, setActiveCartId] = useState("cart_1")
  const activeCart = carts.find(c => c.id === activeCartId) || carts[0]

  const [searchTerm, setSearchTerm] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("Espèces")
  const [loadingData, setLoadingData] = useState<any>(null)
  const [lastSale, setLastSale] = useState<any>(null)
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("fixed")
  const [discountValue, setDiscountValue] = useState(0)
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  const isPro = boutique?.plan === "Pro" || boutique?.status === "Essai"

  useEffect(() => {
    fetch(LOADING_CUBE_URL).then(r => r.json()).then(setLoadingData)
  }, [])

  useEffect(() => {
    if (!boutique?.id) return
    const supabase = getSupabaseClient()
    productService.listProducts(supabase, boutique.id, { per_page: 100 })
      .then(res => setProducts(res.data))
      .catch(() => {})
  }, [boutique?.id])

  const updateActiveCart = (updates: Partial<CartSession>) => {
    setCarts(prev => prev.map(c => c.id === activeCartId ? { ...c, ...updates } : c))
  }

  const addNewCart = () => {
    if (!isPro && carts.length >= 1) {
      toast({ title: "Plan Pro Requis", description: "Le multi-panier est réservé au plan Pro (25K).", variant: "destructive" })
      return
    }
    const newId = `cart_${Date.now()}`
    const newCart: CartSession = { id: newId, name: `Client ${carts.length + 1}`, items: [], customerName: "", saleType: "Détail" }
    setCarts([...carts, newCart])
    setActiveCartId(newId)
  }

  const removeCart = (id: string) => {
    if (carts.length <= 1) return
    const newCarts = carts.filter(c => c.id !== id)
    setCarts(newCarts)
    if (activeCartId === id) setActiveCartId(newCarts[0].id)
  }

  const addToCart = (product: any) => {
    if (product.quantity_in_stock <= 0) {
      toast({ title: "Rupture de stock", variant: "destructive" })
      return
    }

    const existing = activeCart.items.find(item => item.id === product.id)
    let newItems: CartItem[]

    if (existing) {
      if (existing.quantity >= product.quantity_in_stock) return
      newItems = activeCart.items.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
    } else {
      newItems = [...activeCart.items, {
        id: product.id,
        name: product.name,
        price: product.price_retail,
        wholesalePrice: product.price_wholesale,
        quantity: 1,
        imageUrl: product.image_url,
        stock: product.quantity_in_stock,
        unit: product.unit_of_measure || 'pcs'
      }]
    }
    updateActiveCart({ items: newItems })
  }

  const updateQty = (id: string, delta: number) => {
    const newItems = activeCart.items.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta)
        if (newQty > item.stock) return item
        return { ...item, quantity: newQty }
      }
      return item
    }).filter(i => i.quantity > 0)
    updateActiveCart({ items: newItems })
  }

  const totalAmount = activeCart.items.reduce((sum, item) => {
    const price = (activeCart.saleType === "Gros" && item.wholesalePrice) ? item.wholesalePrice : item.price
    return sum + (price * item.quantity)
  }, 0)

  const discountAmount = discountType === "percentage"
    ? Math.round(totalAmount * Math.min(discountValue, 100) / 100)
    : Math.min(discountValue, totalAmount)

  const discountedTotal = totalAmount - discountAmount

  const searchCustomers = async (query: string) => {
    if (!boutique?.id) return
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('customers')
      .select('id, full_name, phone_number')
      .eq('boutique_id', boutique.id)
      .ilike('full_name', `%${query}%`)
      .limit(10)
    setCustomerSuggestions(data || [])
    setShowCustomerDropdown((data?.length || 0) > 0)
  }

  const handleCheckout = async () => {
    if (activeCart.items.length === 0 || !boutique) return
    setIsProcessing(true)

    const supabase = getSupabaseClient()

    try {
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
      const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
      const invoiceNumber = `INV-${dateStr}-${rand}`

      const pmMap: Record<string, PaymentMethod> = {
        "Espèces": PaymentMethod.CASH,
        "Orange Money": PaymentMethod.MOBILE,
        "Wave": PaymentMethod.MOBILE,
        "Crédit": PaymentMethod.CREDIT,
      }

      const { sale, items } = await saleService.createSale(supabase, boutique.id, {
        sale_type: features.wholesale ? (activeCart.saleType === "Gros" ? SaleType.WHOLESALE : SaleType.RETAIL) : SaleType.RETAIL,
        customer_name: features.customers ? activeCart.customerName || "Client Passager" : "Client Passager",
        invoice_number: invoiceNumber,
        items: activeCart.items.map(i => ({
          product_id: i.id,
          quantity: i.quantity,
          is_wholesale_price: activeCart.saleType === "Gros" && !!i.wholesalePrice,
        })),
        payment_method: pmMap[paymentMethod] || PaymentMethod.CASH,
        discount_amount: discountAmount || undefined,
        discount_reason: discountAmount > 0 ? "Remise manuelle" : undefined,
        notes: `Vente par ${userProfile?.name || 'caisse'}`,
      })

      setLastSale({ id: sale.id, invoiceNumber, total: sale.total_amount, discountAmount: sale.discount_amount, date: sale.created_at, products: items.map(i => ({ name: i.product_name, qty: i.quantity, price: i.unit_price })) })

      setDiscountValue(0)
      setDiscountType("fixed")

      if (carts.length > 1) {
        removeCart(activeCartId)
      } else {
        updateActiveCart({ items: [], customerName: "", saleType: "Détail" })
      }
      setIsInvoiceOpen(true)
      toast({ title: "Vente réussie", description: "Le stock a été déduit." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col h-full gap-6">
      {isProcessing && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <div className="h-32 w-32">
            {loadingData && <Lottie animationData={loadingData} loop={true} />}
          </div>
          <p className="mt-4 font-headline font-bold text-xl text-primary animate-pulse">Traitement...</p>
        </div>
      )}

      <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
        {carts.map((c) => (
          <div key={c.id} className="relative group shrink-0">
            <Button
              variant={activeCartId === c.id ? "default" : "outline"}
              className={cn(
                "h-12 px-6 rounded-2xl font-bold transition-all",
                activeCartId === c.id ? "sena-gradient text-white border-none shadow-lg" : "bg-white text-gray-500"
              )}
              onClick={() => setActiveCartId(c.id)}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {c.name} {c.items.length > 0 && `(${c.items.length})`}
            </Button>
            {carts.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); removeCart(c.id); }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        <Button
          variant="ghost"
          onClick={addNewCart}
          className="h-12 w-12 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary hover:text-primary"
        >
          <Plus />
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-8 h-full">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Chercher un article..."
                className="pl-11 h-12 rounded-2xl bg-white shadow-sm border-none font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {features.wholesale && (
              <div className="flex bg-gray-100 p-1 rounded-2xl shadow-inner border border-gray-200">
                <Button
                  variant="ghost"
                  className={cn("rounded-xl h-10 px-6 font-bold", activeCart.saleType === "Détail" && "bg-white shadow-sm text-primary")}
                  onClick={() => updateActiveCart({ saleType: "Détail" })}
                >Détail</Button>
                <Button
                  variant="ghost"
                  className={cn("rounded-xl h-10 px-6 font-bold", activeCart.saleType === "Gros" && "bg-white shadow-sm text-primary")}
                  onClick={() => updateActiveCart({ saleType: "Gros" })}
                >Gros</Button>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
              {products
                .filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer border-none bg-white hover:ring-2 hover:ring-primary transition-all rounded-[2rem] overflow-hidden group shadow-sm flex flex-col h-full"
                  onClick={() => addToCart(product)}
                >
                  <div className="h-32 bg-gray-50 relative overflow-hidden">
                    <img src={product.image_url || "https://picsum.photos/seed/placeholder/400/400"} alt={product.name} className="w-full h-full object-cover" />
                    <Badge className={cn("absolute top-3 right-3 text-[10px] font-black", product.quantity_in_stock <= 5 ? "bg-red-500" : "bg-primary")}>
                      {product.quantity_in_stock} {product.unit_of_measure || 'pcs'}
                    </Badge>
                  </div>
                  <CardContent className="p-4 flex-1">
                    <h3 className="font-bold text-gray-900 truncate mb-1">{product.name}</h3>
                    <p className="text-lg font-headline font-bold text-primary">
                      {(((activeCart.saleType === "Gros" && product.price_wholesale) ? product.price_wholesale : product.price_retail) || 0).toLocaleString()} CFA
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="col-span-12 lg:col-span-4 h-full bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-gray-100">
          <CardHeader className="p-8 border-b bg-gray-50/30">
            <CardTitle className="font-headline text-2xl flex items-center justify-between">
              Panier {activeCart.name}
              <Badge className="sena-gradient border-none">{activeCart.items.length}</Badge>
            </CardTitle>
          </CardHeader>

          <ScrollArea className="flex-1 px-8">
            <div className="space-y-6 py-8">
              {features.customers && (
                <div className="space-y-2 mb-4 bg-orange-50/50 p-4 rounded-2xl border border-orange-100 relative">
                   <label className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                     <UserIcon className="h-3 w-3" /> Client
                   </label>
                   <Input
                     placeholder="Chercher un client..."
                     value={activeCart.customerName}
                     onChange={e => {
                       updateActiveCart({ customerName: e.target.value })
                       if (e.target.value.length >= 1) searchCustomers(e.target.value)
                       else setShowCustomerDropdown(false)
                     }}
                     onFocus={() => { if (activeCart.customerName.length >= 1) searchCustomers(activeCart.customerName) }}
                     onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                     className="h-10 rounded-xl bg-white border-none shadow-sm"
                   />
                   {showCustomerDropdown && customerSuggestions.length > 0 && (
                     <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-orange-100 max-h-48 overflow-y-auto">
                       {customerSuggestions.map(c => (
                         <button
                           key={c.id}
                           type="button"
                           className="w-full px-4 py-3 text-left hover:bg-orange-50 font-medium text-sm border-b border-orange-50 last:border-b-0 transition-colors"
                           onMouseDown={() => {
                             updateActiveCart({ customerName: c.full_name })
                             setShowCustomerDropdown(false)
                           }}
                         >
                           {c.full_name}
                           {c.phone_number && <span className="text-xs text-gray-400 ml-2">{c.phone_number}</span>}
                         </button>
                       ))}
                     </div>
                   )}
                </div>
              )}

              {activeCart.items.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-gray-300 space-y-4">
                   <LayoutGrid className="h-12 w-12 opacity-20" />
                   <p className="font-bold text-sm">Panier vide</p>
                </div>
              ) : (
                activeCart.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center gap-4 group animate-in fade-in slide-in-from-right-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-gray-900">{item.name}</p>
                      <p className="text-xs font-bold text-primary">
                        {(((activeCart.saleType === "Gros" && item.wholesalePrice) ? item.wholesalePrice : item.price) || 0).toLocaleString()} CFA
                      </p>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{item.unit}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-full p-1 border">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQty(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQty(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="p-8 border-t bg-gray-50/50 space-y-6">
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-2">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest">Remise</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={discountValue || ''}
                  onChange={e => setDiscountValue(Math.max(0, Number(e.target.value)))}
                  className="h-10 rounded-xl bg-white border-none shadow-sm flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDiscountType(discountType === "percentage" ? "fixed" : "percentage")}
                  className="rounded-xl h-10 px-3 font-bold"
                >
                  {discountType === "percentage" ? "%" : "CFA"}
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-400">Total</span>
              <div className="text-right">
                {discountAmount > 0 && (
                  <span className="text-sm font-bold text-gray-300 line-through block">{totalAmount.toLocaleString()} CFA</span>
                )}
                <span className="text-4xl font-headline font-bold text-primary">{discountedTotal.toLocaleString()} CFA</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <Button
                variant={paymentMethod === "Espèces" ? "default" : "outline"}
                className={cn("h-16 flex flex-col gap-1 rounded-2xl border-2 transition-all", paymentMethod === "Espèces" && "border-primary bg-orange-50 text-primary")}
                onClick={() => setPaymentMethod("Espèces")}
              >
                <Banknote className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Espèces</span>
              </Button>

              <Button
                variant={paymentMethod === "Orange Money" ? "default" : "outline"}
                className={cn("h-16 flex flex-col gap-1 rounded-2xl border-2 transition-all", paymentMethod === "Orange Money" && "border-orange-500 bg-orange-50 text-orange-500")}
                onClick={() => setPaymentMethod("Orange Money")}
              >
                <Smartphone className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Orange</span>
              </Button>

              <Button
                variant={paymentMethod === "Wave" ? "default" : "outline"}
                className={cn("h-16 flex flex-col gap-1 rounded-2xl border-2 transition-all", paymentMethod === "Wave" && "border-blue-500 bg-blue-50 text-blue-500")}
                onClick={() => setPaymentMethod("Wave")}
              >
                <Smartphone className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Wave</span>
              </Button>

              <Button
                variant={paymentMethod === "Crédit" ? "default" : "outline"}
                className={cn("h-16 flex flex-col gap-1 rounded-2xl border-2 transition-all", paymentMethod === "Crédit" && "border-red-500 bg-red-50 text-red-500")}
                onClick={() => setPaymentMethod("Crédit")}
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Crédit</span>
              </Button>
            </div>

            <Button
              onClick={handleCheckout}
              disabled={activeCart.items.length === 0 || isProcessing}
              className="w-full h-20 sena-gradient text-white font-headline font-bold text-2xl rounded-[2rem] shadow-2xl shadow-orange-500/30 active:scale-[0.98] transition-all"
            >
              Valider la Vente
              <ChevronRight className="ml-2 h-8 w-8" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 rounded-[3rem] border-none">
          <div className="bg-white p-8 space-y-6 invoice-print">
            {/* En-tête facture */}
            <div className="text-center space-y-3 pb-4 border-b-2 border-dashed border-gray-200">
              <div className="h-14 w-14 rounded-2xl sena-gradient flex items-center justify-center shadow-lg mx-auto"><Store className="text-white h-7 w-7" /></div>
              <div>
                <h2 className="text-xl font-headline font-bold text-gray-900">{boutique?.name || 'Ma Boutique'}</h2>
                {boutique?.phone_number && <p className="text-xs text-gray-500">Tél : {boutique.phone_number}</p>}
                {boutique?.location && <p className="text-xs text-gray-500">{boutique.location}</p>}
              </div>
            </div>

            {/* Numéro facture + date */}
            <div className="flex justify-between items-center text-sm">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Facture</p>
                <p className="font-bold text-gray-900">{lastSale?.invoiceNumber || `#${lastSale?.id?.slice(-6)}`}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</p>
                <p className="font-bold text-gray-900">{lastSale?.date ? new Date(lastSale.date).toLocaleDateString('fr-FR') : '—'}</p>
                <p className="text-xs text-gray-500">{lastSale?.date ? new Date(lastSale.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
              </div>
            </div>

            {/* Articles */}
            <div className="border-y-2 border-dashed border-gray-200 py-3">
              <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest pb-2 border-b border-gray-100">
                <div className="col-span-6">Article</div>
                <div className="col-span-2 text-center">Qté</div>
                <div className="col-span-2 text-right">Prix</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              {lastSale?.products.map((p: any, i: number) => (
                <div key={i} className="grid grid-cols-12 gap-2 py-2 text-sm border-b border-gray-50">
                  <div className="col-span-6 font-medium text-gray-900">{p.name}</div>
                  <div className="col-span-2 text-center text-gray-600">{p.qty}</div>
                  <div className="col-span-2 text-right text-gray-600">{(p.price || 0).toLocaleString()}</div>
                  <div className="col-span-2 text-right font-bold text-gray-900">{(p.qty * p.price || 0).toLocaleString()}</div>
                </div>
              ))}
            </div>

            {/* Totaux */}
            <div className="space-y-2">
              {lastSale?.discountAmount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Remise</span>
                  <span className="font-bold text-red-500">-{(lastSale.discountAmount || 0).toLocaleString()} CFA</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="font-bold text-gray-900 uppercase tracking-widest text-xs">Total</span>
                <span className="text-2xl font-headline font-bold text-primary">{(lastSale?.total || 0).toLocaleString()} CFA</span>
              </div>
            </div>

            {/* Pied de facture */}
            <div className="text-center pt-4 border-t-2 border-dashed border-gray-200">
              <p className="text-xs text-gray-400 font-medium">Merci de votre confiance !</p>
              <p className="text-[10px] text-gray-300 mt-1">StockPlus — Keur'Geek Digital Technology</p>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-2 no-print">
              <Button className="flex-1 h-12 rounded-2xl font-bold gap-2" variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Imprimer
              </Button>
              <Button className="flex-1 h-12 sena-gradient text-white rounded-2xl font-bold" onClick={() => setIsInvoiceOpen(false)}>
                Nouvelle Vente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
