import { useState, useRef, useEffect } from "react"
import Lottie from "lottie-react"
import {
  Sparkles,
  Camera,
  FileText,
  TrendingUp,
  Upload,
  ArrowRight,
  Package,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Star,
  Cpu,
  Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useBoutique } from "@/views/dashboard/layout"
import { getSupabaseClient } from "@/supabase/client"
import { saleService } from "@/services/saleService"
import { productService } from "@/services/productService"

const DAILY_TRIAL_LIMIT = 5
const AWA_AVATAR_URL = "/awa-avatar.json"
const LOADING_CUBE_URL = "/loading-cube.json"

// Local types for AI outputs
type SenaProductPhotoScanOutput = {
  productName: string
  suggestedCategory: string
  recommendedSellingPrice: number
}

type SenaInvoiceDataExtractorOutput = {
  products: Array<{
    name: string
    quantity: number
    purchasePrice: number
  }>
}

type SenaBusinessInsightsOutput = {
  salesSummary: string
  lowStockAlerts: Array<{
    productName: string
    currentStock: number
  }>
}

export default function AIAssistantPage() {
  const { toast } = useToast()
  const { boutique } = useBoutique() || {}

  // Plan & status are derived from the current boutique (loaded via Supabase in the layout)
  const plan = boutique?.plan || "Basic"
  const status = boutique?.status || "Actif"

  const [isProcessing, setIsProcessing] = useState(false)
  const [scanResult, setScanResult] = useState<SenaProductPhotoScanOutput | null>(null)
  const [invoiceResult, setInvoiceResult] = useState<SenaInvoiceDataExtractorOutput | null>(null)
  const [insights, setInsights] = useState<SenaBusinessInsightsOutput | null>(null)
  const [aiUsage, setAiUsage] = useState(0) // In-memory only (no localStorage persistence)
  const [isMounted, setIsMounted] = useState(false)
  const [awaData, setAwaData] = useState<any>(null)
  const [loadingData, setLoadingData] = useState<any>(null)
  const [dbProducts, setDbProducts] = useState<any[]>([])
  const [dbSales, setDbSales] = useState<any[]>([])
  const [dbSaleItems, setDbSaleItems] = useState<any[]>([])
  const [session, setSession] = useState<any>(null)

  const productInputRef = useRef<HTMLInputElement>(null)
  const invoiceInputRef = useRef<HTMLInputElement>(null)

  // Helper: build authenticated headers for AI API calls (/api/ai/* require auth)
  const getAuthHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
    return headers
  }

  useEffect(() => {
    setIsMounted(true)
    const supabase = getSupabaseClient()

    const loadData = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        setSession(currentSession)

        if (boutique?.id) {
          // Load products & sales from Supabase in parallel
          const [productsRes, salesRes] = await Promise.all([
            productService.listProducts(supabase, boutique.id, { per_page: 1000 }),
            saleService.listSales(supabase, boutique.id, { per_page: 1000 }),
          ])
          setDbProducts(productsRes.data || [])
          setDbSales(salesRes.data || [])

          // Fetch sale_items linked to these sales (used for AI insights)
          const saleIds = (salesRes.data || []).map((s: any) => s.id).filter(Boolean)
          if (saleIds.length > 0) {
            const { data: items } = await supabase
              .from('sale_items')
              .select('product_id, product_name, quantity, unit_price, created_at, sale_id')
              .in('sale_id', saleIds)
            setDbSaleItems(items || [])
          }
        }
      } catch (err) {
        console.warn('Failed to load AI data from Supabase:', err)
      }
    }

    loadData()

    // Safer Lottie loading
    const loadLottie = async (url: string, setter: (data: any) => void) => {
      try {
        const res = await fetch(url)
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json()
          setter(data)
        }
      } catch (e) {
        console.warn("Lottie loading failed", url, e)
      }
    }

    loadLottie(AWA_AVATAR_URL, setAwaData)
    loadLottie(LOADING_CUBE_URL, setLoadingData)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boutique?.id])

  const incrementAiUsage = () => {
    // In-memory only (no localStorage persistence)
    setAiUsage(prev => prev + 1)
  }

  const checkQuota = () => {
    if (status === "Essai" && aiUsage >= DAILY_TRIAL_LIMIT) {
      toast({
        variant: "destructive",
        title: "Quota quotidien IA épuisé",
        description: `Votre période d'essai est limitée à ${DAILY_TRIAL_LIMIT} opérations par jour. Revenez demain ou abonnez-vous.`,
      })
      return false
    }
    return true
  }

  // Seul le plan Pro (25K) ou l'Essai ont accès aux fonctions avancées
  const hasProAccess = plan === "Pro" || status === "Essai"

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'invoice') => {
    const file = e.target.files?.[0]
    if (!file || !checkQuota()) return

    setIsProcessing(true)
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = reader.result as string
      try {
        if (type === 'product') {
          const res = await fetch('/api/ai/product-photo-scan', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ photoDataUri: base64 })
          });
          if (!res.ok) throw new Error(await res.text());
          const result = await res.json() as SenaProductPhotoScanOutput;
          
          setScanResult(result)
          incrementAiUsage()
          toast({ title: "Identification réussie", description: `Awa a reconnu : ${result.productName}` })
        } else {
          const res = await fetch('/api/ai/invoice-extract', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ invoiceDataUri: base64 })
          });
          if (!res.ok) throw new Error(await res.text());
          const result = await res.json() as SenaInvoiceDataExtractorOutput;

          setInvoiceResult(result)
          incrementAiUsage()
          toast({ title: "Facture traitée", description: `${result.products.length} produits extraits.` })
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Erreur", description: "Awa n'a pas pu traiter le fichier." })
      } finally {
        setIsProcessing(false)
        if (e.target) e.target.value = ""
      }
    }
    reader.readAsDataURL(file)
  }

  const handleGenerateInsights = async () => {
    if (!checkQuota()) return
    setIsProcessing(true)
    try {
      // Map DB products (from Supabase) to the AI input shape
      const inputProducts = dbProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category || 'Autre',
        currentStock: p.quantity_in_stock ?? 0,
        purchasePrice: p.cost_price ?? Math.round((p.price_retail || 0) * 0.7),
        sellingPrice: p.price_retail ?? 0,
      }))

      // Build sale_id → sale_date lookup so we can date each sale_item
      const saleDateById = new Map<string, string>()
      dbSales.forEach((s: any) => {
        if (s.id) saleDateById.set(s.id, s.sale_date || s.created_at || new Date().toISOString())
      })

      // Map sale_items (from Supabase) to the salesRecords shape expected by the AI
      const inputSales = dbSaleItems.map((item: any) => ({
        productId: item.product_id || 'unknown',
        quantity: item.quantity || 0,
        salePrice: (item.unit_price || 0) * (item.quantity || 0),
        date: saleDateById.get(item.sale_id) || item.created_at || new Date().toISOString(),
      }))

      const res = await fetch('/api/ai/business-insights', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          products: inputProducts,
          salesRecords: inputSales,
          lowStockThreshold: 10,
          analysisPeriod: "30 derniers jours"
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json() as SenaBusinessInsightsOutput;

      setInsights(result)
      incrementAiUsage()
      toast({ title: "Analyses prêtes", description: "Awa a terminé l'analyse de votre business." })
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de générer les analyses." })
    } finally {
      setIsProcessing(false)
    }
  }

  const UpgradeBanner = ({ feature, requiredPlan }: { feature: string, requiredPlan: string }) => (
    <div className="premium-card p-12 text-center bg-orange-50/30 border-dashed border-2 border-orange-200">
      <div className="h-20 w-20 rounded-[1.5rem] bg-orange-100 flex items-center justify-center mx-auto mb-8">
        <Lock className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-3xl font-headline font-bold text-gray-900 mb-4">{feature} est réservé au plan {requiredPlan}</h2>
      <Button className="sena-gradient text-white h-14 px-12 rounded-full font-bold text-lg shadow-xl shadow-orange-500/20">
        <Star className="h-5 w-5 mr-2 fill-white" /> Passer au Plan {requiredPlan} (25K)
      </Button>
    </div>
  )

  if (!isMounted) return null

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      <input type="file" ref={productInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'product')} />
      <input type="file" ref={invoiceInputRef} className="hidden" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'invoice')} />

      <div className="text-center space-y-4">
        <div className="inline-flex h-40 w-40 rounded-[2.5rem] bg-orange-50/50 items-center justify-center mb-4 overflow-hidden relative">
          {isProcessing && loadingData ? (
             <Lottie animationData={loadingData} loop={true} className="w-full h-full" />
          ) : awaData ? (
             <Lottie animationData={awaData} loop={true} className="w-full h-full" />
          ) : (
            <div className="h-10 w-10 animate-pulse bg-orange-100 rounded-full" />
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-[2px]">
               <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
          )}
        </div>
        <h1 className="text-5xl font-headline font-bold text-gray-900 tracking-tight">Bonjour, je suis Awa</h1>
        <div className="text-gray-400 text-lg font-medium flex items-center justify-center gap-2">
          <span>Forfait actuel :</span> 
          <Badge variant="outline" className="font-bold border-primary text-primary">
            {status === "Essai" ? "Essai 7 jours" : plan}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="scanner" className="space-y-12">
        <TabsList className="flex w-full max-w-md mx-auto h-14 p-1.5 rounded-2xl bg-gray-100">
          <TabsTrigger value="scanner" className="flex-1 rounded-xl h-full font-bold">Scan Produit</TabsTrigger>
          <TabsTrigger value="invoices" className="flex-1 rounded-xl h-full font-bold">Factures</TabsTrigger>
          <TabsTrigger value="insights" className="flex-1 rounded-xl h-full font-bold">Analyses</TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="mt-0 outline-none">
          <div className="grid gap-8 md:grid-cols-2 items-start">
            <Card className="premium-card bg-white p-4">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-8 text-center">
                <div className="h-24 w-24 rounded-[2rem] bg-orange-50 flex items-center justify-center overflow-hidden">
                  {isProcessing && loadingData ? (
                    <Lottie animationData={loadingData} loop={true} className="w-full h-full" />
                  ) : (
                    <Camera className="h-8 w-8 text-orange-600" />
                  )}
                </div>
                <Button 
                  disabled={isProcessing}
                  onClick={() => productInputRef.current?.click()}
                  className="sena-gradient text-white h-14 px-10 rounded-full font-bold text-lg shadow-lg"
                >
                  {isProcessing ? "Analyse..." : "Prendre une photo"}
                </Button>
              </CardContent>
            </Card>

            {scanResult && (
              <Card className="premium-card border-orange-100 bg-white">
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="font-headline text-2xl">Résultat Awa</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-orange-50 flex items-center justify-center">
                      <Package className="h-8 w-8 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xl">{scanResult.productName}</h4>
                      <Badge className="bg-green-50 text-green-600 border-none font-bold">Identifié</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-gray-50">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Catégorie</div>
                      <div className="font-bold">{scanResult.suggestedCategory}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Prix suggéré</div>
                      <div className="font-bold text-orange-600">{scanResult.recommendedSellingPrice.toLocaleString()} CFA</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="mt-0">
          {hasProAccess ? (
            <div className="grid gap-8 md:grid-cols-2 items-start">
              <Card className="premium-card p-12 text-center space-y-8">
                <div className="h-24 w-24 rounded-[2.5rem] bg-gray-50 flex items-center justify-center mx-auto overflow-hidden">
                  {isProcessing && loadingData ? <Lottie animationData={loadingData} loop={true} className="w-full h-full" /> : <FileText className="h-10 w-10 text-gray-300" />}
                </div>
                <Button variant="outline" className="h-14 px-12 rounded-full" onClick={() => invoiceInputRef.current?.click()} disabled={isProcessing}>
                  {isProcessing ? "Extraction..." : "Choisir un fichier"} <Upload className="ml-2 h-5 w-5" />
                </Button>
              </Card>
              {invoiceResult && (
                <Card className="premium-card bg-white overflow-hidden">
                  <CardHeader className="p-8 border-b">
                    <CardTitle className="font-headline text-2xl">Produits extraits</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[300px]">
                      <div className="p-8 space-y-4">
                        {invoiceResult.products.map((p, i) => (
                          <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-gray-50">
                            <div><div className="font-bold">{p.name}</div><div className="text-xs text-gray-400">Qté: {p.quantity}</div></div>
                            <div className="font-headline font-bold text-orange-600">{p.purchasePrice.toLocaleString()} CFA</div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : <UpgradeBanner feature="L'extraction de factures" requiredPlan="Pro" />}
        </TabsContent>

        <TabsContent value="insights" className="mt-0 space-y-8">
          {hasProAccess ? (
            <>
              <div className="text-center space-y-6">
                <Button onClick={handleGenerateInsights} disabled={isProcessing} className="sena-gradient text-white h-16 px-12 rounded-full font-bold text-xl shadow-xl">
                  {isProcessing ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <TrendingUp className="mr-2 h-6 w-6" />}
                  Générer des analyses personnalisées
                </Button>
              </div>
              {insights && (
                <div className="grid gap-8 md:grid-cols-2">
                  <Card className="premium-card p-8 space-y-6">
                    <CheckCircle2 className="h-6 w-6 text-orange-600" />
                    <div><h3 className="text-2xl font-headline font-bold mb-2">Résumé des ventes</h3><div className="text-gray-500 font-medium">{insights.salesSummary}</div></div>
                  </Card>
                  <Card className="premium-card p-8 space-y-6">
                    <AlertCircle className="h-6 w-6 text-orange-600" />
                    <div><h3 className="text-2xl font-headline font-bold mb-2">Alertes Stock Bas</h3><div className="space-y-3">
                      {insights.lowStockAlerts.map((alert, i) => (
                        <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-orange-100">
                          <span className="font-bold">{alert.productName}</span>
                          <Badge variant="destructive">{alert.currentStock} restants</Badge>
                        </div>
                      ))}
                    </div></div>
                  </Card>
                </div>
              )}
            </>
          ) : <UpgradeBanner feature="L'analyse métier avancée" requiredPlan="Pro" />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
