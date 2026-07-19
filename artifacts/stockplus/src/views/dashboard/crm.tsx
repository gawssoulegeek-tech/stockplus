import { useEffect, useState } from "react"
import { Search, Users, CreditCard, ShoppingCart, DollarSign, Phone, Mail, Loader2, Plus, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useBoutique } from "@/views/dashboard/layout"
import { getSupabaseClient } from "@/supabase/client"
import { customerService } from "@/services/customerService"
import { saleService } from "@/services/saleService"
import { Customer, Debt, DebtStatus, Sale, PaymentMethod } from "@/types/supabase"

export default function CRMPage() {
  const { boutique, features } = useBoutique()
  const { toast } = useToast()
  const supabase = getSupabaseClient()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerDebts, setCustomerDebts] = useState<Debt[]>([])
  const [customerSales, setCustomerSales] = useState<Sale[]>([])
  const [detailOpen, setDetailOpen] = useState(false)
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!boutique?.id) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const [custRes, debtRes, salesRes] = await Promise.all([
          customerService.listCustomers(supabase, boutique.id, { per_page: 500 }),
          supabase.from('debts').select('*').eq('boutique_id', boutique.id).neq('status', 'paid').order('created_at', { ascending: false }),
          saleService.listSales(supabase, boutique.id, { per_page: 200 }),
        ])
        setCustomers(custRes.data)
        setDebts(debtRes.data || [])
        setSales(salesRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [boutique?.id])

  const filteredCustomers = customers.filter(c =>
    (c.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalDebtAmount = debts.reduce((sum, d) => sum + (d.remaining_amount || 0), 0)
  const clientsWithDebts = new Set(debts.map(d => d.customer_id)).size
  const salesThisMonth = sales.filter(s => {
    const d = new Date(s.sale_date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const revenueThisMonth = salesThisMonth.reduce((sum, s) => sum + (s.total_amount || 0), 0)

  const openCustomerDetail = async (customer: Customer) => {
    setSelectedCustomer(customer)
    try {
      const [custDebts, custSales] = await Promise.all([
        customerService.getCustomerDebts(supabase, customer.id),
        saleService.listSales(supabase, boutique!.id, { customer_id: customer.id, per_page: 50 }),
      ])
      setCustomerDebts(custDebts)
      setCustomerSales(custSales.data)
    } catch (err) {
      console.error(err)
    }
    setDetailOpen(true)
  }

  const openRecordPayment = (debt: Debt) => {
    setSelectedDebt(debt)
    setPaymentAmount(debt.remaining_amount)
    setRecordPaymentOpen(true)
  }

  const handleRecordPayment = async () => {
    if (!selectedDebt || paymentAmount <= 0) return
    setSubmitting(true)
    try {
      const updated = await customerService.recordDebtPayment(supabase, selectedDebt.id, paymentAmount)
      setDebts(prev => prev.map(d => d.id === updated.id ? updated : d))
      setCustomerDebts(prev => prev.map(d => d.id === updated.id ? updated : d))
      toast({ title: "Paiement enregistré" })
      setRecordPaymentOpen(false)
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer le paiement." })
    } finally {
      setSubmitting(false)
    }
  }

  if (!features.crm) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="text-3xl font-bold">CRM désactivé</div>
        <div className="text-gray-500 max-w-lg">Cette fonctionnalité est disponible dans le plan Pro.</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-headline font-bold">CRM & Relance Client</h1>
          <p className="text-gray-500 font-medium">Suivez vos clients, gérez les dettes et relancez automatiquement.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher un client..."
            className="h-12 min-w-[260px] pl-10"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { title: "Clients", value: customers.length, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
          { title: "Avec dettes", value: clientsWithDebts, icon: CreditCard, color: "text-red-500", bg: "bg-red-50" },
          { title: "Total dû", value: totalDebtAmount, icon: DollarSign, color: "text-orange-500", bg: "bg-orange-50", currency: true },
          { title: "CA du mois", value: revenueThisMonth, icon: ShoppingCart, color: "text-green-500", bg: "bg-green-50", currency: true },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.title}</div>
              <h3 className="text-2xl font-headline font-bold text-gray-900">
                {stat.currency ? (stat.value / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' }) : stat.value}
              </h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="px-6 py-5 bg-gray-50 border-b">
          <CardTitle className="text-lg font-bold">Portefeuille clients</CardTitle>
          <CardDescription>{filteredCustomers.length} client{filteredCustomers.length > 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Dette</TableHead>
                <TableHead>Dernier achat</TableHead>
                <TableHead>Total achats</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-40 text-center text-gray-500">Aucun client trouvé</TableCell></TableRow>
              ) : filteredCustomers.map(customer => {
                const customerDebt = debts.filter(d => d.customer_id === customer.id)
                const totalDue = customerDebt.reduce((s, d) => s + d.remaining_amount, 0)
                return (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => openCustomerDetail(customer)}
                  >
                    <TableCell>
                      <div className="font-bold">{customer.full_name}</div>
                      <div className="text-xs text-gray-400">{customer.customer_type === 'business' ? 'Entreprise' : 'Particulier'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3 text-gray-400" />{customer.phone_number || '—'}</div>
                      <div className="flex items-center gap-1 text-sm"><Mail className="h-3 w-3 text-gray-400" />{customer.email || '—'}</div>
                    </TableCell>
                    <TableCell>
                      {totalDue > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {(totalDue / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                        </Badge>
                      ) : (
                        <span className="text-green-600 text-sm font-medium">Aucune</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {customer.last_purchase_at
                        ? new Date(customer.last_purchase_at).toLocaleDateString('fr-FR')
                        : 'Jamais'}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {((customer as any).total_purchases || 0) > 0
                        ? ((customer as any).total_purchases / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openCustomerDetail(customer) }}>
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline">{selectedCustomer?.full_name}</DialogTitle>
            <DialogDescription>
              {selectedCustomer?.phone_number && `📞 ${selectedCustomer?.phone_number}`}
              {selectedCustomer?.email && `  ✉️ ${selectedCustomer?.email}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-lg mb-3">Dettes</h3>
              {customerDebts.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucune dette active</p>
              ) : (
                <div className="space-y-2">
                  {customerDebts.map(debt => (
                    <div key={debt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <div className="font-bold">
                          {(debt.original_amount / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                        </div>
                        <div className="text-sm text-gray-500">
                          Restant : {(debt.remaining_amount / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                          {debt.due_date && ` — Échéance : ${new Date(debt.due_date).toLocaleDateString('fr-FR')}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          debt.status === 'paid' ? 'bg-green-100 text-green-700' :
                          debt.status === 'partial' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }>{debt.status}</Badge>
                        {debt.remaining_amount > 0 && (
                          <Button size="sm" onClick={() => openRecordPayment(debt)}>
                            Encaisser
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3">Historique d'achats</h3>
              {customerSales.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucun achat</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Paiement</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerSales.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell>{new Date(sale.sale_date).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell>{(sale.total_amount / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</TableCell>
                        <TableCell>{sale.payment_method}</TableCell>
                        <TableCell>
                          <Badge className={
                            sale.payment_status === 'complete' ? 'bg-green-100 text-green-700' :
                            sale.payment_status === 'partial' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }>{sale.payment_status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
            <DialogDescription>
              Dette de {(selectedDebt?.original_amount || 0) / 100} F CFA — Restant dû : {(selectedDebt?.remaining_amount || 0) / 100} F CFA
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Montant du paiement</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(Number(e.target.value))}
                max={selectedDebt?.remaining_amount || 0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordPaymentOpen(false)}>Annuler</Button>
            <Button onClick={handleRecordPayment} disabled={submitting || paymentAmount <= 0}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Valider le paiement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
