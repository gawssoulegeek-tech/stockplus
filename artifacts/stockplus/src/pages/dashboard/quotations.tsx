import { useState } from "react"
import {
  FileText,
  Plus,
  Search,
  Download,
  MoreVertical,
  Calendar as CalendarIcon,
  Printer,
  ChevronRight,
  Send
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const quotations = [
  { id: "#QT-0045", customer: "Hotel Savannah", date: "25 Mai 2024", total: "1.2M CFA", status: "Envoyé", validity: "7 jours restant" },
  { id: "#QT-0044", customer: "Restaurant Le Relais", date: "24 Mai 2024", total: "245,000 CFA", status: "Accepté", validity: "Validé le 25/05" },
  { id: "#QT-0043", customer: "Clinique de l'Espoir", date: "23 Mai 2024", total: "850,000 CFA", status: "Brouillon", validity: "-" },
  { id: "#QT-0042", customer: "Samba Ndiaye", date: "22 Mai 2024", total: "45,000 CFA", status: "Expiré", validity: "Expiré hier" },
]

export default function QuotationsPage() {
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-headline font-bold text-gray-900 tracking-tight">Devis</h1>
          <p className="text-gray-500 font-medium text-lg">Gérez vos propositions commerciales et transformez-les en ventes.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-12 px-6 rounded-xl border-gray-200 font-bold shadow-sm">
            <Download className="h-4 w-4 mr-2 text-primary" />
            Historique
          </Button>
          <Button className="sena-gradient text-white border-none rounded-xl shadow-lg shadow-orange-500/20 h-12 px-8 font-bold">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Devis
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { title: "Devis Actifs", value: "12", sub: "3.4M CFA potentiel", color: "text-primary" },
          { title: "Taux Conversion", value: "68%", sub: "+5% ce mois", color: "text-green-500" },
          { title: "En attente", value: "5", sub: "Relance nécessaire", color: "text-orange-400" },
          { title: "Montant Moyen", value: "240k CFA", sub: "Par devis", color: "text-blue-500" },
        ].map((stat, i) => (
          <Card key={i} className="border-gray-100 shadow-xl rounded-3xl bg-white group hover:border-primary/20 transition-all">
            <CardContent className="p-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.title}</p>
              <h3 className={`text-3xl font-headline font-bold ${stat.color} tracking-tight`}>{stat.value}</h3>
              <p className="text-xs text-gray-400 font-medium mt-2">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-gray-100 shadow-xl rounded-3xl bg-white overflow-hidden">
        <CardHeader className="p-8 border-b border-gray-50">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <CardTitle className="font-headline text-2xl text-gray-900">Liste des Devis</CardTitle>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Chercher par numéro ou client..."
                className="pl-12 h-12 rounded-xl border-gray-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="border-gray-100 hover:bg-transparent">
                <TableHead className="font-bold text-gray-600 px-8 h-16 uppercase text-[10px] tracking-widest">N° Devis</TableHead>
                <TableHead className="font-bold text-gray-600 h-16 uppercase text-[10px] tracking-widest">Client</TableHead>
                <TableHead className="font-bold text-gray-600 h-16 uppercase text-[10px] tracking-widest">Date</TableHead>
                <TableHead className="font-bold text-gray-600 h-16 uppercase text-[10px] tracking-widest">Validité</TableHead>
                <TableHead className="font-bold text-gray-600 h-16 uppercase text-[10px] tracking-widest text-right">Montant</TableHead>
                <TableHead className="font-bold text-gray-600 h-16 uppercase text-[10px] tracking-widest">Statut</TableHead>
                <TableHead className="text-right font-bold text-gray-600 px-8 h-16 uppercase text-[10px] tracking-widest">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((qt) => (
                <TableRow key={qt.id} className="border-gray-50 group hover:bg-orange-50/10">
                  <TableCell className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <FileText className="h-5 w-5 text-gray-400 group-hover:text-primary" />
                      </div>
                      <span className="font-bold text-gray-900">{qt.id}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-gray-800">{qt.customer}</TableCell>
                  <TableCell className="font-medium text-gray-500 text-sm">{qt.date}</TableCell>
                  <TableCell className="text-xs text-gray-400 font-bold uppercase tracking-tight">{qt.validity}</TableCell>
                  <TableCell className="text-right font-headline font-bold text-gray-900 text-lg">{qt.total}</TableCell>
                  <TableCell>
                    <Badge className={`rounded-lg font-bold px-3 py-1 ${
                      qt.status === "Accepté" ? "bg-green-50 text-green-600 border-green-100" :
                      qt.status === "Envoyé" ? "bg-orange-50 text-primary border-orange-100" :
                      qt.status === "Expiré" ? "bg-red-50 text-red-500 border-red-100" :
                      "bg-gray-50 text-gray-400 border-gray-100"
                    }`}>
                      {qt.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <div className="flex justify-end gap-2">
                       <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary">
                        <Send className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-gray-100">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl p-2 border-gray-100 shadow-2xl min-w-[200px]">
                          <DropdownMenuItem className="rounded-xl gap-3 py-3 font-bold cursor-pointer">
                            <Printer className="h-4 w-4 text-gray-400" /> Imprimer
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl gap-3 py-3 font-bold cursor-pointer">
                            <ChevronRight className="h-4 w-4 text-gray-400" /> Convertir en Vente
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl gap-3 py-3 font-bold cursor-pointer text-red-500 focus:text-red-600">
                            <FileText className="h-4 w-4" /> Annuler
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
