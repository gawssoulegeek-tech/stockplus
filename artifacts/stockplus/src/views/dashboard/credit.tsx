import { useState, useEffect } from "react"
import {
  CreditCard,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useBoutique } from "@/views/dashboard/layout"
import { getSupabaseClient } from "@/supabase/client"
import { customerService } from "@/services/customerService"
import { paymentService } from "@/services/paymentService"
import { PaymentMethod } from "@/types/supabase"

const statusConfig: Record<string, { label: string; class: string }> = {
  active: { label: "IMPAYÉ", class: "bg-red-50 text-red-500" },
  partial: { label: "PARTIEL", class: "bg-orange-50 text-orange-600" },
  paid: { label: "PAYÉ", class: "bg-green-50 text-green-600" },
  cancelled: { label: "ANNULÉ", class: "bg-gray-100 text-gray-500" },
}

export default function CreditPage() {
  const { boutique, features, userProfile } = useBoutique()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [debts, setDebts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [recovered30j, setRecovered30j] = useState(0)

  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  // New credit dialog
  const [newCreditOpen, setNewCreditOpen] = useState(false)
  const [newCredit, setNewCredit] = useState({
    customer_id: "",
    customer_name: "",
    amount: "",
    reason: "",
    due_date: "",
  })
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [creditSubmitting, setCreditSubmitting] = useState(false)

  useEffect(() => {
    if (!boutique?.id) return
    setLoading(true)
    const supabase = getSupabaseClient()

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString()

    Promise.all([
      supabase
        .from('debts')
        .select(`
          *,
          customers:customer_id (full_name, phone_number)
        `)
        .eq('boutique_id', boutique.id)
        .order('created_at', { ascending: false }),
      customerService.listCustomers(supabase, boutique.id, { per_page: 200 }),
      supabase
        .from('payments')
        .select('amount')
        .eq('boutique_id', boutique.id)
        .gte('created_at', thirtyDaysAgoStr),
    ])
    .then(([debtsRes, customersRes, paymentsRes]) => {
      setDebts(debtsRes.data || [])
      setCustomers(customersRes.data)
      setRecovered30j(
        (paymentsRes.data || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
      )
    })
    .catch(() => {})
    .finally(() => setLoading(false))
  }, [boutique?.id])

  if (!features.credit) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-8">
        <div className="h-24 w-24 rounded-[2rem] bg-orange-50 flex items-center justify-center shadow-inner">
          <CreditCard className="h-10 w-10 text-primary" />
        </div>
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-headline font-bold text-gray-900">Module Crédit Désactivé</h2>
          <p className="text-gray-500 max-w-sm mx-auto">Activez le suivi des créances dans les réglages de votre boutique.</p>
          <Button variant="outline" className="rounded-xl" onClick={() => window.location.href='/settings'}>Aller aux réglages</Button>
        </div>
      </div>
    )
  }

  const filtered = debts.filter(d =>
    d.customers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalCreances = filtered.reduce((a, b) => a + (b.remaining_amount || 0), 0)
  const dossiersActifs = filtered.filter(d => d.status !== 'paid').length

  const handleRecordPayment = async () => {
    if (!selectedDebt || !paymentAmount || !boutique) return
    const amount = parseInt(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Montant invalide", description: "Entrez un montant valide." })
      return
    }

    setPaymentSubmitting(true)
    const supabase = getSupabaseClient()
    try {
      const updated = await customerService.recordDebtPayment(supabase, selectedDebt.id, amount)
      await paymentService.create(supabase, boutique.id, {
        debt_id: selectedDebt.id,
        customer_id: selectedDebt.customer_id,
        amount,
        payment_method: PaymentMethod.CASH,
        status: 'completed',
        recorded_by: userProfile?.name,
      })
      setDebts(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated, customers: d.customers } : d))
      toast({ title: "Paiement enregistré", description: `${amount.toLocaleString()} CFA reçus.` })
      setPaymentDialogOpen(false)
      setPaymentAmount("")
      setSelectedDebt(null)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const handleCreateCredit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!boutique) return
    const amount = parseInt(newCredit.amount)
    if (isNaN(amount) || amount <= 0 || (!newCredit.customer_id && !newCredit.customer_name)) {
      toast({ variant: "destructive", title: "Données invalides", description: "Remplissez tous les champs." })
      return
    }

    setCreditSubmitting(true)
    const supabase = getSupabaseClient()
    try {
      let customerId = newCredit.customer_id

      if (isNewCustomer && newCredit.customer_name) {
        const customer = await customerService.createCustomer(supabase, boutique.id, {
          full_name: newCredit.customer_name,
        })
        customerId = customer.id
        setCustomers(prev => [customer, ...prev])
      }

      const debt = await customerService.createDebt(supabase, boutique.id, customerId, amount, newCredit.reason)
      if (newCredit.due_date) {
        // @ts-ignore
        await supabase.from('debts').update({ due_date: newCredit.due_date }).eq('id', debt.id)
      }

      const { data: debtWithCustomer } = await supabase
        .from('debts')
        .select(`*, customers:customer_id (full_name, phone_number)`)
        .eq('id', debt.id)
        .single()

      if (debtWithCustomer) setDebts(prev => [debtWithCustomer, ...prev])

      toast({ title: "Crédit créé", description: `Nouvelle créance de ${amount.toLocaleString()} CFA.` })
      setNewCreditOpen(false)
      setNewCredit({ customer_id: "", customer_name: "", amount: "", reason: "", due_date: "" })
      setIsNewCustomer(false)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    } finally {
      setCreditSubmitting(false)
    }
  }

  const openPaymentDialog = (debt: any) => {
    setSelectedDebt(debt)
    setPaymentAmount("")
    setPaymentDialogOpen(true)
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-headline font-bold text-gray-900 tracking-tight">Gestion des Créances</h1>
          <p className="text-gray-400 text-lg font-medium">Suivez les dettes de vos clients en temps réel.</p>
        </div>
        <Dialog open={newCreditOpen} onOpenChange={setNewCreditOpen}>
          <DialogTrigger asChild>
            <Button className="sena-gradient text-white border-none rounded-2xl h-14 px-8 font-bold shadow-xl shadow-orange-500/20 text-lg">
              <Plus className="h-5 w-5 mr-2" />
              Nouveau crédit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] rounded-[2.5rem] p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline">Nouveau crédit</DialogTitle>
              <DialogDescription>Enregistrez une nouvelle créance pour un client.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCredit} className="space-y-5 py-4">
              <div className="flex items-center gap-3 mb-2">
                <Button
                  type="button"
                  variant={isNewCustomer ? "outline" : "default"}
                  className={`rounded-xl ${!isNewCustomer ? 'sena-gradient text-white border-none' : ''}`}
                  onClick={() => setIsNewCustomer(false)}
                >
                  Client existant
                </Button>
                <Button
                  type="button"
                  variant={isNewCustomer ? "default" : "outline"}
                  className={`rounded-xl ${isNewCustomer ? 'sena-gradient text-white border-none' : ''}`}
                  onClick={() => setIsNewCustomer(true)}
                >
                  Nouveau client
                </Button>
              </div>

              {isNewCustomer ? (
                <div className="space-y-2">
                  <Label>Nom du client</Label>
                  <Input
                    value={newCredit.customer_name}
                    onChange={e => setNewCredit(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="h-12 rounded-xl"
                    placeholder="Nom complet"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Sélectionner un client</Label>
                  <Select
                    value={newCredit.customer_id}
                    onValueChange={v => setNewCredit(prev => ({ ...prev, customer_id: v }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Choisir un client" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Montant (CFA)</Label>
                <Input
                  type="number"
                  value={newCredit.amount}
                  onChange={e => setNewCredit(prev => ({ ...prev, amount: e.target.value }))}
                  className="h-12 rounded-xl"
                  placeholder="50000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Motif (optionnel)</Label>
                <Input
                  value={newCredit.reason}
                  onChange={e => setNewCredit(prev => ({ ...prev, reason: e.target.value }))}
                  className="h-12 rounded-xl"
                  placeholder="Achat de marchandises"
                />
              </div>

              <div className="space-y-2">
                <Label>Date d'échéance (optionnelle)</Label>
                <Input
                  type="date"
                  value={newCredit.due_date}
                  onChange={e => setNewCredit(prev => ({ ...prev, due_date: e.target.value }))}
                  className="h-12 rounded-xl"
                />
              </div>

              <Button
                type="submit"
                disabled={creditSubmitting}
                className="w-full sena-gradient text-white h-14 rounded-2xl font-bold text-lg shadow-xl shadow-orange-500/20"
              >
                {creditSubmitting ? "Création..." : "Créer la créance"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-8 md:grid-cols-3">
        {[
          { title: "Total Créances", value: `${totalCreances.toLocaleString()} CFA`, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
          { title: "Dossiers Actifs", value: dossiersActifs, icon: Clock, color: "text-primary", bg: "bg-orange-50" },
          { title: "Recouvrement (30j)", value: `${recovered30j.toLocaleString()} CFA`, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
        ].map((stat, i) => (
          <Card key={i} className="premium-card">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                  <stat.icon />
                </div>
              </div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.title}</div>
              <h3 className="text-3xl font-headline font-bold text-gray-900">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Debts Table */}
      <Card className="premium-card overflow-hidden">
        <CardHeader className="p-8 border-b bg-gray-50/30">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Chercher un client..."
              className="pl-11 h-12 rounded-xl bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="px-8 h-16 font-bold uppercase text-[10px] tracking-widest">Client</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Montant Initial</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Reste à payer</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Échéance</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Statut</TableHead>
                <TableHead className="text-right px-8 font-bold uppercase text-[10px] tracking-widest">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-gray-400 font-medium">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-gray-400 font-medium">
                    Aucune créance trouvée.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((debt) => {
                  const status = statusConfig[debt.status] || statusConfig.active
                  return (
                    <TableRow key={debt.id} className="hover:bg-orange-50/5 transition-colors">
                      <TableCell className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                            {debt.customers?.full_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{debt.customers?.full_name || 'Client'}</div>
                            {debt.customers?.phone_number && (
                              <div className="text-xs text-gray-400 font-medium">{debt.customers.phone_number}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-headline font-bold">{debt.original_amount?.toLocaleString()} CFA</TableCell>
                      <TableCell className="font-headline font-bold text-red-500">{debt.remaining_amount?.toLocaleString()} CFA</TableCell>
                      <TableCell>
                        {debt.due_date ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-500">
                              {new Date(debt.due_date).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-300">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`rounded-lg text-[9px] font-black border-none ${status.class}`}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-8">
                        {debt.status !== 'paid' && debt.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 rounded-xl font-bold text-green-600 hover:bg-green-50 hover:text-green-700"
                            onClick={() => openPaymentDialog(debt)}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Paiement
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline">Enregistrer un paiement</DialogTitle>
            <DialogDescription>
              Client : <strong>{selectedDebt?.customers?.full_name || '—'}</strong>
              &nbsp;| Restant : <strong>{selectedDebt?.remaining_amount?.toLocaleString()} CFA</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>Montant reçu (CFA)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="h-14 rounded-xl text-xl font-bold"
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-14 rounded-xl font-bold"
                onClick={() => setPaymentDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={handleRecordPayment}
                disabled={paymentSubmitting || !paymentAmount}
                className="flex-1 sena-gradient text-white h-14 rounded-2xl font-bold text-lg shadow-lg shadow-orange-500/20"
              >
                {paymentSubmitting ? "Enregistrement..." : "Confirmer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
