import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const REQUIRED_TABLES = [
  'users', 'boutiques', 'products', 'sales', 'sale_items',
  'stock_moves', 'customers', 'debts', 'payments', 'china_imports',
  'invitations', 'audit_logs',
]

interface DiagnosticReport {
  timestamp: string
  supabase_url: string
  tables: Record<string, boolean>
  environment: { status: string; message: string }
  database: { status: string; message: string; details?: any }
  summary: { total: number; existing: number; missing: number; errors: number }
  needs_migration: boolean
  setup_steps: { step: string; done: boolean; action: string }[]
}

export async function GET() {
  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    tables: {},
    environment: { status: 'ok', message: 'OK' },
    database: { status: 'ok', message: 'Connexion établie' },
    summary: { total: 0, existing: 0, missing: 0, errors: 0 },
    needs_migration: false,
    setup_steps: [
      { step: 'Variables d\'environnement', done: false, action: 'Vérifier .env.local' },
      { step: 'Migration SQL', done: false, action: 'Exécuter 000_complete_schema.sql' },
      { step: 'Auth Email activé', done: false, action: 'Dashboard → Authentication → Providers → Email' },
      { step: 'Superadmin créé', done: false, action: 'UPDATE users SET role=\'superadmin\'' },
    ],
  }

  // 1. Env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const envErrors: string[] = []
  if (!supabaseUrl) envErrors.push('NEXT_PUBLIC_SUPABASE_URL manquante')
  if (!anonKey) envErrors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY manquante')
  if (!serviceKey) envErrors.push('SUPABASE_SERVICE_ROLE_KEY manquante')

  if (envErrors.length > 0) {
    report.environment = { status: 'error', message: envErrors.join(', ') }
  } else {
    report.setup_steps[0].done = true
  }

  // 2. Check tables
  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      let existingCount = 0
      for (const table of REQUIRED_TABLES) {
        try {
          const { error } = await supabase.from(table).select('*', { count: 'exact', head: true })
          report.tables[table] = !error
          if (!error) existingCount++
        } catch {
          report.tables[table] = false
        }
      }

      report.summary = { total: REQUIRED_TABLES.length, existing: existingCount, missing: REQUIRED_TABLES.length - existingCount, errors: 0 }
      report.needs_migration = existingCount < REQUIRED_TABLES.length

      if (existingCount === REQUIRED_TABLES.length) {
        report.database = { status: 'ok', message: `${existingCount}/${REQUIRED_TABLES.length} tables` }
        report.setup_steps[1].done = true
      } else {
        report.database = {
          status: 'warning',
          message: `${existingCount}/${REQUIRED_TABLES.length} tables — migration nécessaire`,
          details: { missing: REQUIRED_TABLES.filter((t) => !report.tables[t]) },
        }
      }

      // Check if there's at least one user with superadmin role
      const { data: adminUsers } = await supabase.from('users').select('role').eq('role', 'superadmin').limit(1)
      if (adminUsers && adminUsers.length > 0) {
        report.setup_steps[3].done = true
      }

      report.summary.errors = [report.environment, report.database].filter((r) => r.status === 'error').length
    } catch (err: any) {
      report.database = { status: 'error', message: err.message }
    }
  }

  return NextResponse.json(report)
}
