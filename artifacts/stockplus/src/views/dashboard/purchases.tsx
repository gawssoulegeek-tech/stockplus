import { useEffect, useState } from "react"
import { ShoppingCart, Plus, Truck, Package, Loader2, Search, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useBoutique } from "@/views/dashboard/layout"
import { getSupabaseClient } from "@/supabase/client"
import { purchaseService } from "@/services/purchaseService"
import { productService } from "@/services/productService"
import { Supplier, Purchase, Product } from "@/types/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PurchasesPage() {
  const { boutique, features } = useBoutique()
  const { toast } = useToast()
  const supabase = getSupabaseClient()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [tab, setTab] = useState("purchases")

  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [supplierForm, setSupplierForm] = useState({ name: "", contact_name: "", phone_number: "", email: "", city: "", notes: "" })
  const [purchaseForm, setPurchaseForm] = useState({ supplier_id: "", reference: "", notes: "" })
  const [purchaseItems, setPurchaseItems] = useState<Array<{ product_id: string; product_name: string; quantity: number; unit_price: number }>>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!boutique?.id) return
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [supRes, purRes, prodRes] = await Promise.all([
          purchaseService.listSuppliers(supabase, boutique.id).catch(() => []),
          purchaseService.listPurchases(supabase, boutique.id, { per_page: 200 }).catch(() => ({ data: [] })),
          productService.listProducts(supabase, boutique.id, { per_page: 500, is_active: true }).catch(() => ({ data: [] })),
        ])
        setSuppliers(supRes)
        setPurchases(purRes.data)
        setProducts(prodRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [boutique?.id])

  const filteredPurchases = purchases.filter(p =>
    (p.supplier_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.reference || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openNewSupplier = () => {
    setEditingSupplier(null)
    setSupplierForm({ name: "", contact_name: "", phone_number: "", email: "", city: "", notes: "" })
    setSupplierDialogOpen(true)
  }

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s)
    setSupplierForm({ name: s.name, contact_name: s.contact_name || "", phone_number: s.phone_number || "", email: s.email || "", city: s.city || "", notes: s.notes || "" })
    setSupplierDialogOpen(true)
  }

  const handleSaveSupplier = async () => {
    if (!boutique?.id || !supplierForm.name.trim()) return
    setSubmitting(true)
    try {
      if (editingSupplier) {
        const updated = await purchaseService.updateSupplier(supabase, editingSupplier.id, supplierForm)
        setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s))
        toast({ title: "Fournisseur mis à jour" })
      } else {
        const created = await purchaseService.createSupplier(supabase, boutique.id, supplierForm)
        setSuppliers(prev => [...prev, created])
        toast({ title: "Fournisseur créé" })
      }
      setSupplierDialogOpen(false)
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer le fournisseur." })
    } finally {
      setSubmitting(false)
    }
  }

  const addPurchaseItem = () => {
    setPurchaseItems(prev => [...prev, { product_id: "", product_name: "", quantity: 1, unit_price: 0 }])
  }

  const updatePurchaseItem = (index: number, field: string, value: any) => {
    setPurchaseItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const removePurchaseItem = (index: number) => {
    setPurchaseItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleCreatePurchase = async () => {
    if (!boutique?.id || purchaseItems.length === 0) return
    setSubmitting(true)
    try {
      const supplier = suppliers.find(s => s.id === purchaseForm.supplier_id)
      await purchaseService.createPurchase(supabase, boutique.id, {
        supplier_id: purchaseForm.supplier_id || undefined,
        supplier_name: supplier?.name,
        reference: purchaseForm.reference || undefined,
        notes: purchaseForm.notes || undefined,
        items: purchaseItems,
      })
      toast({ title: "Commande créée" })
      setPurchaseDialogOpen(false)
      setPurchaseForm({ supplier_id: "", reference: "", notes: "" })
      setPurchaseItems([])
      const refreshed = await purchaseService.listPurchases(supabase, boutique.id, { per_page: 200 })
      setPurchases(refreshed.data)
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de créer la commande." })
    } finally {
      setSubmitting(false)
    }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      ordered: 'bg-blue-100 text-blue-700',
      partial: 'bg-orange-100 text-orange-700',
      received: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    const labels: Record<string, string> = {
      draft: 'Brouillon', ordered: 'Commandé', partial: 'Partiel', received: 'Reçu', cancelled: 'Annulé',
    }
    return <Badge className={styles[status] || ''}>{labels[status] || status}</Badge>
  }

  if (!features.purchases) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="text-3xl font-bold">Achats fournisseurs désactivé</div>
        <div className="text-gray-500 max-w-lg">Cette fonctionnalité est disponible dans le plan Pro.</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold">Achats Fournisseurs</h1>
          <p className="text-gray-500 font-medium">Gérez vos commandes et vos fournisseurs.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher..."
            className="h-12 min-w-[260px] pl-10"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-xl">
          <TabsTrigger value="purchases" className="rounded-xl">
            <ShoppingCart className="h-4 w-4 mr-2" /> Commandes
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="rounded-xl">
            <Building2 className="h-4 w-4 mr-2" /> Fournisseurs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="mt-6 space-y-6">
          <div className="flex justify-end">
            <Button className="h-12 rounded-xl" onClick={() => { setPurchaseForm({ supplier_id: "", reference: "", notes: "" }); setPurchaseItems([]); setPurchaseDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" /> Nouvelle commande
            </Button>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="px-6 py-5 bg-gray-50 border-b">
              <CardTitle className="text-lg font-bold">Historique des commandes</CardTitle>
              <CardDescription>{filteredPurchases.length} commande{filteredPurchases.length > 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date commande</TableHead>
                    <TableHead>Réception</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="h-40 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : filteredPurchases.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-40 text-center text-gray-500">Aucune commande pour le moment</TableCell></TableRow>
                  ) : filteredPurchases.map(purchase => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium">{purchase.reference || '—'}</TableCell>
                      <TableCell>{purchase.supplier_name || '—'}</TableCell>
                      <TableCell className="font-bold">{(purchase.total_amount / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</TableCell>
                      <TableCell>{statusBadge(purchase.status)}</TableCell>
                      <TableCell>{new Date(purchase.order_date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{purchase.received_date ? new Date(purchase.received_date).toLocaleDateString('fr-FR') : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-6 space-y-6">
          <div className="flex justify-end">
            <Button className="h-12 rounded-xl" onClick={openNewSupplier}>
              <Plus className="mr-2 h-4 w-4" /> Nouveau fournisseur
            </Button>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="px-6 py-5 bg-gray-50 border-b">
              <CardTitle className="text-lg font-bold">Carnet fournisseurs</CardTitle>
              <CardDescription>{suppliers.length} fournisseur{suppliers.length > 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="h-40 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : suppliers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-40 text-center text-gray-500">Aucun fournisseur</TableCell></TableRow>
                  ) : suppliers.map(supplier => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-bold">{supplier.name}</TableCell>
                      <TableCell>{supplier.contact_name || '—'}</TableCell>
                      <TableCell>{supplier.phone_number || '—'}</TableCell>
                      <TableCell>{supplier.email || '—'}</TableCell>
                      <TableCell>{supplier.city || '—'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditSupplier(supplier)}>Modifier</Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={async () => {
                          if (!window.confirm(`Supprimer ${supplier.name} ?`)) return
                          try { await purchaseService.deleteSupplier(supabase, supplier.id); setSuppliers(prev => prev.filter(s => s.id !== supplier.id)); toast({ title: "Fournisseur supprimé" }) }
                          catch { toast({ variant: "destructive", title: "Erreur de suppression" }) }
                        }}>Supprimer</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}</DialogTitle>
            <DialogDescription>Ajoutez les coordonnées du fournisseur.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nom *</Label>
                <Input value={supplierForm.name} onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label>Contact</Label>
                <Input value={supplierForm.contact_name} onChange={e => setSupplierForm(p => ({ ...p, contact_name: e.target.value }))} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={supplierForm.phone_number} onChange={e => setSupplierForm(p => ({ ...p, phone_number: e.target.value }))} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={supplierForm.email} onChange={e => setSupplierForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <Label>Ville</Label>
                <Input value={supplierForm.city} onChange={e => setSupplierForm(p => ({ ...p, city: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={supplierForm.notes} onChange={e => setSupplierForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveSupplier} disabled={submitting || !supplierForm.name.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingSupplier ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle commande fournisseur</DialogTitle>
            <DialogDescription>Créez une commande d'achat auprès d'un fournisseur.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fournisseur</Label>
                <select
                  className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
                  value={purchaseForm.supplier_id}
                  onChange={e => setPurchaseForm(p => ({ ...p, supplier_id: e.target.value }))}
                >
                  <option value="">Sélectionner...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Référence</Label>
                <Input value={purchaseForm.reference} onChange={e => setPurchaseForm(p => ({ ...p, reference: e.target.value }))} placeholder="Ex: CMD-001" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-bold">Articles</Label>
                <Button size="sm" variant="outline" onClick={addPurchaseItem}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter un article
                </Button>
              </div>
              {purchaseItems.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">Aucun article. Cliquez sur "Ajouter un article".</p>
              ) : (
                <div className="space-y-3">
                  {purchaseItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="flex-1">
                        <select
                          className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                          value={item.product_id}
                          onChange={e => {
                            const prod = products.find(p => p.id === e.target.value)
                            updatePurchaseItem(i, 'product_id', e.target.value)
                            updatePurchaseItem(i, 'product_name', prod?.name || '')
                            updatePurchaseItem(i, 'unit_price', prod?.cost_price || 0)
                          }}
                        >
                          <option value="">Produit existant...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Nom du produit"
                          value={item.product_name}
                          onChange={e => updatePurchaseItem(i, 'product_name', e.target.value)}
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          placeholder="Qté"
                          value={item.quantity}
                          onChange={e => updatePurchaseItem(i, 'quantity', Math.max(1, Number(e.target.value)))}
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          type="number"
                          placeholder="Prix unitaire"
                          value={item.unit_price}
                          onChange={e => updatePurchaseItem(i, 'unit_price', Math.max(0, Number(e.target.value)))}
                        />
                      </div>
                      <div className="text-sm font-bold w-24 text-right">
                        {((item.quantity * item.unit_price) / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removePurchaseItem(i)}>✕</Button>
                    </div>
                  ))}
                </div>
              )}
              {purchaseItems.length > 0 && (
                <div className="text-right mt-4 text-lg font-bold">
                  Total : {(purchaseItems.reduce((s, item) => s + (item.quantity * item.unit_price), 0) / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                </div>
              )}
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={purchaseForm.notes} onChange={e => setPurchaseForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreatePurchase} disabled={submitting || purchaseItems.length === 0}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer la commande'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
