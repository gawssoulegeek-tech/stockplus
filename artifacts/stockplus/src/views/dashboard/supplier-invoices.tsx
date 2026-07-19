import { FileText, Upload } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useBoutique } from "@/views/dashboard/layout"

export default function SupplierInvoicesPage() {
  const { features } = useBoutique()

  if (!features.supplierInvoiceScan) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="text-3xl font-bold">Scan fournisseur désactivé</div>
        <div className="text-gray-500 max-w-lg">Cette fonctionnalité est disponible dans le plan Pro.</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-headline font-bold">Scan Facture Fournisseur</h1>
        <p className="text-gray-500 font-medium">Scannez vos factures fournisseurs pour mettre à jour le stock automatiquement.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Upload className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Importer une facture</CardTitle>
            <CardDescription>Prenez en photo ou importez le PDF de votre facture fournisseur.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <FileText className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Historique</CardTitle>
            <CardDescription>Consultez les factures déjà scannées et les mises à jour de stock effectuées.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
