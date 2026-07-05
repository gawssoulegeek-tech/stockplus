
import { useState, useEffect } from "react"
import {
  Package,
  Ship,
  Truck,
  Globe,
  DollarSign,
  Calendar,
  Plus,
  TrendingUp,
  X,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useBoutique } from "@/views/dashboard/layout"
import { getSupabaseClient } from "@/supabase/client"
import { chinaImportService } from "@/services/chinaImportService"
import { ImportStatus } from "@/types/supabase"

const statusConfig: Record<string, { label: string; class: string; icon: any }> = {
  ordered: { label: "Commandé", class: "bg-blue-50 text-blue-600 border-blue-200", icon: Package },
  shipped: { label: "Expédié", class: "bg-purple-50 text-purple-600 border-purple-200", icon: Ship },
  in_transit: { label: "En Transit", class: "bg-amber-50 text-amber-600 border-amber-200", icon: Truck },
  received: { label: "Reçu", class: "bg-green-50 text-green-600 border-green-200", icon: Check },
  cancelled: { label: "Annulé", class: "bg-red-50 text-red-500 border-red-200", icon: X },
}

export default function ChinaImportPage() {
  const { toast } = useToast()
  const { boutique, userProfile } = useBoutique()
  const supabase = getSupabaseClient()

  const [imports, setImports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [itemIdCounter, setItemIdCounter] = useState(1)

  const [formData, setFormData] = useState({
    supplier_name: "",
    supplier_contact: "",
    shipping_cost: 0,
    customs_fees: 0,
    other_fees: 0,
    order_date: new Date().toISOString().split("T")[0],
    expected_delivery_date: "",
    tracking_number: "",
    notes: "",
    items: [] as Array<{ id: number; product_name: string; sku: string; quantity: number; unit_price: number }>,
    markup: 2.0,
  })

  const loadImports = async () => {
    if (!boutique?.id) return
    setIsLoading(true)
    try {
      const res = await chinaImportService.list(supabase, boutique.id, { per_page: 100 })
      setImports(res.data)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadImports()
  }, [boutique?.id])

  const totalCost = formData.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0)
  const totalAmount = totalCost + (formData.shipping_cost || 0) + (formData.customs_fees || 0) + (formData.other_fees || 0)
  const totalQuantity = formData.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
  const suggestedRetail = totalQuantity > 0 ? (totalAmount / totalQuantity) * formData.markup : 0
  const estimatedProfit = suggestedRetail * totalQuantity - totalAmount

  const addItem = () => {
    setItemIdCounter((c) => c + 1)
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { id: itemIdCounter + 1, product_name: "", sku: "", quantity: 1, unit_price: 0 }],
    }))
  }

  const removeItem = (id: number) => {
    setFormData((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }))
  }

  const updateItem = (id: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    }))
  }

  const resetForm = () => {
    setFormData({
      supplier_name: "",
      supplier_contact: "",
      shipping_cost: 0,
      customs_fees: 0,
      other_fees: 0,
      order_date: new Date().toISOString().split("T")[0],
      expected_delivery_date: "",
      tracking_number: "",
      notes: "",
      items: [],
      markup: 2.0,
    })
    setItemIdCounter(1)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!boutique?.id) return
    if (!formData.supplier_name) {
      toast({ variant: "destructive", title: "Erreur", description: "Le nom du fournisseur est requis." })
      return
    }
    if (formData.items.length === 0) {
      toast({ variant: "destructive", title: "Erreur", description: "Ajoutez au moins un article." })
      return
    }

    setSubmitting(true)
    try {
      const items = formData.items.map((i) => ({
        product_name: i.product_name,
        sku: i.sku || undefined,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))

      await chinaImportService.create(supabase, boutique.id, {
        order_number: `CHN-${Date.now()}`,
        supplier_name: formData.supplier_name,
        supplier_contact: formData.supplier_contact || undefined,
        status: ImportStatus.ORDERED,
        items,
        total_cost: totalCost,
        shipping_cost: formData.shipping_cost,
        customs_fees: formData.customs_fees,
        total_amount: totalAmount,
        order_date: formData.order_date,
        expected_delivery_date: formData.expected_delivery_date || undefined,
        tracking_number: formData.tracking_number || undefined,
        notes: formData.notes || undefined,
        payment_status: "pending",
        amount_paid: 0,
      })

      toast({ title: "Import créé", description: "La commande a été enregistrée." })
      setFormOpen(false)
      resetForm()
      loadImports()
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (id: string, status: ImportStatus) => {
    try {
      if (status === ImportStatus.RECEIVED) {
        await chinaImportService.receive(supabase, id, new Date().toISOString().split("T")[0])
      } else {
        await chinaImportService.update(supabase, id, { status } as any)
      }
      toast({ title: "Statut mis à jour" })
      loadImports()
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
  }

  const nextStatus = (current: string): { status: ImportStatus; label: string; icon: any } | null => {
    switch (current) {
      case "ordered":
        return { status: ImportStatus.SHIPPED, label: "Marquer Expédié", icon: Ship }
      case "shipped":
        return { status: ImportStatus.IN_TRANSIT, label: "Marquer En Transit", icon: Truck }
      case "in_transit":
        return { status: ImportStatus.RECEIVED, label: "Marquer Reçu", icon: Check }
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-headline font-bold text-gray-900 tracking-tight">Import Chine</h1>
          <p className="text-gray-500 font-medium text-lg">Gérez vos commandes et coûts de revient internationaux.</p>
        </div>
        <Dialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="sena-gradient text-white border-none rounded-xl h-12 px-6 font-bold shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Nouvel Import
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline flex items-center gap-3">
                <Globe className="text-primary" />
                Nouvel Import Chine
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fournisseur *</Label>
                  <Input
                    value={formData.supplier_name}
                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                    className="h-12 rounded-xl" required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact fournisseur</Label>
                  <Input
                    value={formData.supplier_contact}
                    onChange={(e) => setFormData({ ...formData, supplier_contact: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-base">Articles</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="rounded-xl">
                    <Plus className="h-3 w-3 mr-1" /> Ajouter
                  </Button>
                </div>
                {formData.items.length === 0 && (
                  <p className="text-sm text-gray-400 italic">Aucun article. Cliquez sur "Ajouter".</p>
                )}
                {formData.items.map((item, idx) => (
                  <div key={item.id} className="flex gap-2 items-end bg-gray-50 p-3 rounded-2xl">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Produit</Label>
                      <Input
                        value={item.product_name}
                        onChange={(e) => updateItem(item.id, "product_name", e.target.value)}
                        className="h-10 rounded-lg text-sm" placeholder="Nom du produit"
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs">SKU</Label>
                      <Input
                        value={item.sku}
                        onChange={(e) => updateItem(item.id, "sku", e.target.value)}
                        className="h-10 rounded-lg text-sm" placeholder="SKU"
                      />
                    </div>
                    <div className="w-20 space-y-1">
                      <Label className="text-xs">Qté</Label>
                      <Input
                        type="number" min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                        className="h-10 rounded-lg text-sm"
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-xs">Prix unit.</Label>
                      <Input
                        type="number" min={0}
                        value={item.unit_price}
                        onChange={(e) => updateItem(item.id, "unit_price", parseInt(e.target.value) || 0)}
                        className="h-10 rounded-lg text-sm"
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-lg shrink-0 text-red-400" onClick={() => removeItem(item.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Fret (CFA)</Label>
                  <Input
                    type="number" min={0}
                    value={formData.shipping_cost}
                    onChange={(e) => setFormData({ ...formData, shipping_cost: parseInt(e.target.value) || 0 })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Douane (CFA)</Label>
                  <Input
                    type="number" min={0}
                    value={formData.customs_fees}
                    onChange={(e) => setFormData({ ...formData, customs_fees: parseInt(e.target.value) || 0 })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Autres frais (CFA)</Label>
                  <Input
                    type="number" min={0}
                    value={formData.other_fees}
                    onChange={(e) => setFormData({ ...formData, other_fees: parseInt(e.target.value) || 0 })}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date de commande</Label>
                  <Input
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Livraison prévue</Label>
                  <Input
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Numéro de suivi</Label>
                  <Input
                    value={formData.tracking_number}
                    onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Markup (coefficient)</Label>
                  <Input
                    type="number" min={1} step={0.1}
                    value={formData.markup}
                    onChange={(e) => setFormData({ ...formData, markup: parseFloat(e.target.value) || 2.0 })}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="rounded-xl" rows={3}
                />
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Coût total</p>
                  <p className="text-2xl font-headline font-bold text-gray-900">{totalCost.toLocaleString()} CFA</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Montant total</p>
                  <p className="text-2xl font-headline font-bold text-primary">{totalAmount.toLocaleString()} CFA</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Prix de vente suggéré</p>
                  <p className="text-2xl font-headline font-bold text-green-600">{Math.round(suggestedRetail).toLocaleString()} CFA</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bénéfice estimé</p>
                  <p className="text-2xl font-headline font-bold text-emerald-600">{Math.round(estimatedProfit).toLocaleString()} CFA</p>
                </div>
              </div>

              <Button type="submit" className="w-full sena-gradient text-white h-14 rounded-2xl font-bold text-lg shadow-xl shadow-orange-500/20" disabled={submitting}>
                {submitting ? "Création..." : "Créer l'Import"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : imports.length === 0 ? (
        <Card className="premium-card">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center">
            <Package className="h-16 w-16 text-gray-200 mb-6" />
            <h3 className="text-2xl font-headline font-bold text-gray-900 mb-2">Aucun import</h3>
            <p className="text-gray-500 max-w-md">Créez votre premier import Chine pour suivre vos commandes internationales.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="px-8 h-16 font-bold uppercase text-[10px] tracking-widest">Commande</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest">Fournisseur</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest">Statut</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest">Coût total</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest">Fret</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest">Douane</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest">Montant</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest">Date cmd.</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest">Livr. prévue</TableHead>
                  <TableHead className="text-right px-8 font-bold uppercase text-[10px] tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp: any) => {
                  const cfg = statusConfig[imp.status] || statusConfig.ordered
                  const StatusIcon = cfg.icon
                  const next = nextStatus(imp.status)
                  return (
                    <TableRow key={imp.id} className="hover:bg-orange-50/5 group transition-colors">
                      <TableCell className="px-8 py-5">
                        <span className="font-mono font-bold text-sm text-gray-800">{imp.order_number}</span>
                      </TableCell>
                      <TableCell className="font-bold text-gray-900">{imp.supplier_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`rounded-lg text-[9px] font-black ${cfg.class}`}>
                          <StatusIcon className="h-3 w-3 mr-1 inline" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold font-headline">{imp.total_cost?.toLocaleString()} CFA</TableCell>
                      <TableCell className="font-bold text-gray-600">{imp.shipping_cost?.toLocaleString()} CFA</TableCell>
                      <TableCell className="font-bold text-gray-600">{imp.customs_fees?.toLocaleString()} CFA</TableCell>
                      <TableCell className="font-headline font-bold text-primary">{imp.total_amount?.toLocaleString()} CFA</TableCell>
                      <TableCell className="text-sm text-gray-500">{new Date(imp.order_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {imp.expected_delivery_date ? new Date(imp.expected_delivery_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right px-8">
                        <div className="flex justify-end gap-2">
                          {next && imp.status !== "cancelled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl h-9 text-xs font-bold"
                              onClick={() => updateStatus(imp.id, next.status)}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {next.label}
                            </Button>
                          )}
                          {(imp.status === "ordered" || imp.status === "shipped" || imp.status === "in_transit") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-xl h-9 text-xs font-bold text-red-500 hover:bg-red-50"
                              onClick={() => updateStatus(imp.id, ImportStatus.CANCELLED)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Annuler
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}
