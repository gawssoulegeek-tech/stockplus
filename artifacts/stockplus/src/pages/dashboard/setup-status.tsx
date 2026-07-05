import { useState, useEffect } from "react"
import { CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw, Database, Shield, Key, Table2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface DiagnosticReport {
  timestamp: string
  supabase_url: string
  auth: { status: string; message: string; details?: any }
  database: { status: string; message: string; details?: any }
  tables: Record<string, boolean>
  environment: { status: string; message: string; details?: any }
  summary: { total: number; passed: number; warnings: number; errors: number }
}

export default function SetupStatusPage() {
  const { toast } = useToast()
  const [report, setReport] = useState<DiagnosticReport | null>(null)
  const [loading, setLoading] = useState(true)

  const runDiagnostic = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/setup/diagnostic')
      const data = await res.json()
      setReport(data)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message })
    }
    setLoading(false)
  }

  useEffect(() => { runDiagnostic() }, [])

  const statusIcon = (status: string) => {
    if (status === 'ok') return <CheckCircle2 className="h-5 w-5 text-green-500" />
    if (status === 'warning') return <AlertTriangle className="h-5 w-5 text-amber-500" />
    return <XCircle className="h-5 w-5 text-red-500" />
  }

  const tableCount = report ? Object.values(report.tables).filter(Boolean).length : 0
  const totalTables = report ? Object.keys(report.tables).length : 0

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold text-gray-900">État de la configuration</h1>
          <p className="text-gray-500 font-medium">Diagnostic complet de l'infrastructure Supabase</p>
        </div>
        <Button variant="outline" onClick={runDiagnostic} disabled={loading} className="rounded-xl h-12 font-bold">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Actualiser
        </Button>
      </div>

      {loading && !report && (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
      )}

      {report && (
        <>
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="premium-card">
              <CardContent className="p-6 text-center">
                <Badge className={`text-lg px-4 py-2 ${
                  report.environment.status === 'ok' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                  {statusIcon(report.environment.status)}
                  <span className="ml-2 font-bold">Environnement</span>
                </Badge>
                <p className="text-xs text-gray-400 mt-2">{report.environment.message}</p>
              </CardContent>
            </Card>
            <Card className="premium-card">
              <CardContent className="p-6 text-center">
                <Badge className={`text-lg px-4 py-2 ${
                  report.auth.status === 'ok' ? 'bg-green-50 text-green-600' :
                  report.auth.status === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                }`}>
                  {statusIcon(report.auth.status)}
                  <span className="ml-2 font-bold">Auth</span>
                </Badge>
                <p className="text-xs text-gray-400 mt-2">{report.auth.message}</p>
              </CardContent>
            </Card>
            <Card className="premium-card">
              <CardContent className="p-6 text-center">
                <Badge className={`text-lg px-4 py-2 ${
                  report.database.status === 'ok' ? 'bg-green-50 text-green-600' :
                  report.database.status === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                }`}>
                  {statusIcon(report.database.status)}
                  <span className="ml-2 font-bold">Base de données</span>
                </Badge>
                <p className="text-xs text-gray-400 mt-2">{report.database.message}</p>
              </CardContent>
            </Card>
            <Card className="premium-card">
              <CardContent className="p-6 text-center">
                <Badge className={`text-lg px-4 py-2 ${
                  tableCount === totalTables ? 'bg-green-50 text-green-600' :
                  tableCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                }`}>
                  <Table2 className="h-5 w-5 mr-2" />
                  <span className="font-bold">{tableCount}/{totalTables} Tables</span>
                </Badge>
                <p className="text-xs text-gray-400 mt-2">
                  {tableCount === totalTables ? 'Toutes les tables sont prêtes' : `${totalTables - tableCount} manquantes`}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="premium-card">
            <CardHeader className="p-6 border-b">
              <CardTitle className="font-headline flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" />
                Tables ({tableCount}/{totalTables})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {Object.entries(report.tables).map(([name, exists]) => (
                  <div key={name} className="flex items-center justify-between px-6 py-4">
                    <span className="font-bold text-gray-900">{name}</span>
                    {exists ? (
                      <Badge className="bg-green-50 text-green-600 border-none">Présente</Badge>
                    ) : (
                      <Badge className="bg-red-50 text-red-600 border-none">Manquante</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader className="p-6 border-b">
              <CardTitle className="font-headline flex items-center gap-3">
                <Key className="h-5 w-5 text-primary" />
                Prochaines étapes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {tableCount < totalTables && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <p className="font-bold text-amber-800">Exécutez les migrations SQL</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Allez dans Supabase Dashboard → SQL Editor, ouvrez et exécutez :
                    <code className="block mt-2 font-mono text-xs bg-amber-100 p-2 rounded-lg">
                      supabase/migrations/005_helpers_features.sql
                    </code>
                  </p>
                </div>
              )}
              <div className="p-4 rounded-2xl bg-green-50 border border-green-200">
                <p className="font-bold text-green-800">Activer l'authentification</p>
                <p className="text-sm text-green-700 mt-1">
                  Supabase Dashboard → Authentication → Providers → Email → Enable (désactivez "Confirm email" pour le développement)
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <p className="font-bold text-blue-800">Créer le superadmin</p>
                <p className="text-sm text-blue-700 mt-1">
                  Créez d'abord un utilisateur via l'inscription, puis dans Supabase SQL Editor :
                  <code className="block mt-2 font-mono text-xs bg-blue-100 p-2 rounded-lg">
                    UPDATE public.users SET role = 'superadmin' WHERE email = 'votre@email.com';
                  </code>
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
