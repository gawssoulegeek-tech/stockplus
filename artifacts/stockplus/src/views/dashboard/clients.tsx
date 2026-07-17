import { useEffect, useMemo, useState } from "react"
import { Search, Plus, UserPlus, Loader2, Edit3, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useBoutique } from "@/views/dashboard/layout"
import { getSupabaseClient } from "@/supabase/client"
import { customerService } from "@/services/customerService"
import { Customer } from "@/types/supabase"

const emptyForm = {
  full_name: "",
  phone_number: "",
  email: "",
  street_address: "",
  city: "",
  postal_code: "",
  customer_type: "retail",
  credit_limit: 0,
  notes: "",
}

export default function ClientsPage() {
  const { boutique, features } = useBoutique()
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<typeof emptyForm>(emptyForm)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!boutique?.id) return
      setLoading(true)
      try {
        const { data } = await customerService.listCustomers(getSupabaseClient(), boutique.id, { per_page: 200, search: searchTerm || undefined })
        setCustomers(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchCustomers()
  }, [boutique?.id, searchTerm])

  const filteredCustomers = useMemo(
    () => customers.filter(customer =>
      (customer.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [customers, searchTerm]
  )

  const openNewCustomerDialog = () => {
    setEditingCustomer(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEditCustomerDialog = (customer: Customer) => {
    setEditingCustomer(customer)
    setForm({
      full_name: customer.full_name,
      phone_number: customer.phone_number || "",
      email: customer.email || "",
      street_address: customer.street_address || "",
      city: customer.city || "",
      postal_code: customer.postal_code || "",
      customer_type: customer.customer_type,
      credit_limit: customer.credit_limit,
      notes: customer.notes || "",
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!boutique?.id) return
    if (!form.full_name.trim()) {
      toast({ variant: "destructive", title: "Nom client requis" })
      return
    }

    setSubmitting(true)
    try {
      if (editingCustomer) {
        const updated = await customerService.updateCustomer(getSupabaseClient(), editingCustomer.id, {
          ...form,
          credit_limit: Number(form.credit_limit),
        })
        setCustomers(prev => prev.map(item => item.id === updated.id ? updated : item))
        toast({ title: "Client mis à jour" })
      } else {
        const created = await customerService.createCustomer(getSupabaseClient(), boutique.id, {
          ...form,
          credit_limit: Number(form.credit_limit),
        })
        setCustomers(prev => [created, ...prev])
        toast({ title: "Client créé" })
      }
      setDialogOpen(false)
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer le client." })
    } finally {
      setSubmitting(false)
    }
  }

  if (!features.customers) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="text-3xl font-bold">Gestion Clients désactivée</div>
        <div className="text-gray-500 max-w-lg">Cette fonctionnalité est disponible dans votre plan. Activez-la dans les réglages ou passez en plan supérieur.</div>
        <Button className="mt-4 rounded-xl" onClick={() => window.location.href = '/settings'}>Voir les réglages</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold">Clients</h1>
          <p className="text-sm text-gray-500">Gérez vos clients et retrouvez facilement les informations de facturation.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row items-stretch sm:items-center">
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher un client..."
            className="h-12 min-w-[260px]"
            icon={<Search className="h-4 w-4 text-gray-400" />}
          />
          <Button className="h-12 rounded-xl" onClick={openNewCustomerDialog}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau client
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="px-6 py-5 bg-gray-50">
          <CardTitle className="text-lg font-bold">Liste des clients</CardTitle>
          <CardDescription>{filteredCustomers.length} client{filteredCustomers.length > 1 ? 's' : ''} trouvé{filteredCustomers.length > 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Crédit</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map(customer => (
                  <TableRow key={customer.id}>
                    <TableCell>{customer.full_name}</TableCell>
                    <TableCell>{customer.phone_number || '—'}</TableCell>
                    <TableCell>{customer.email || '—'}</TableCell>
                    <TableCell>{customer.city || '—'}</TableCell>
                    <TableCell>{(customer.credit_limit / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</TableCell>
                    <TableCell>{new Date(customer.created_at).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" className="px-3" onClick={() => openEditCustomerDialog(customer)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="px-3 text-red-500" onClick={async () => {
                        if (!window.confirm(`Supprimer ${customer.full_name} ?`)) return
                        try {
                          await customerService.deleteCustomer(getSupabaseClient(), customer.id)
                          setCustomers(prev => prev.filter(item => item.id !== customer.id))
                          toast({ title: "Client supprimé" })
                        } catch {
                          toast({ variant: "destructive", title: "Erreur de suppression" })
                        }
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Modifier le client" : "Nouveau client"}</DialogTitle>
            <DialogDescription>Ajoutez ou mettez à jour les informations du client.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nom complet</Label>
                <Input value={form.full_name} onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={form.phone_number} onChange={e => setForm(prev => ({ ...prev, phone_number: e.target.value }))} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              <div>
                <Label>Crédit disponible</Label>
                <Input type="number" value={form.credit_limit} onChange={e => setForm(prev => ({ ...prev, credit_limit: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Adresse</Label>
                <Input value={form.street_address} onChange={e => setForm(prev => ({ ...prev, street_address: e.target.value }))} />
              </div>
              <div>
                <Label>Ville</Label>
                <Input value={form.city} onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))} />
              </div>
              <div>
                <Label>Code postal</Label>
                <Input value={form.postal_code} onChange={e => setForm(prev => ({ ...prev, postal_code: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingCustomer ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
