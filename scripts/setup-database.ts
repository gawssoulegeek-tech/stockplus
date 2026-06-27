import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function checkTables(): Promise<Record<string, boolean>> {
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const tables = [
    'users', 'boutiques', 'products', 'sales', 'sale_items',
    'stock_moves', 'customers', 'debts', 'payments', 'china_imports',
    'invitations', 'audit_logs', 'profiles',
  ]
  const result: Record<string, boolean> = {}

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*', { count: 'exact', head: true })
      result[table] = !error
    } catch {
      result[table] = false
    }
  }
  return result
}

async function runSetup() {
  console.log('═'.repeat(60))
  console.log('  STOCKPLUS — Database Setup')
  console.log('═'.repeat(60))

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Erreur : Variables SUPABASE manquantes dans .env.local')
    process.exit(1)
  }

  console.log(`\n🔗 Supabase: ${supabaseUrl}\n`)

  // 1. Check current state
  console.log('📊 Vérification des tables existantes...')
  const tableStatus = await checkTables()
  const existing = Object.entries(tableStatus).filter(([, v]) => v).map(([k]) => k)
  const missing = Object.entries(tableStatus).filter(([, v]) => !v).map(([k]) => k)

  if (existing.length > 0) {
    console.log(`  ✅ Tables existantes (${existing.length}): ${existing.join(', ')}`)
  }
  if (missing.length > 0) {
    console.log(`  ❌ Tables manquantes (${missing.length}): ${missing.join(', ')}`)
  }

  // 2. Try direct PostgreSQL connection
  console.log('\n🔌 Tentative de connexion PostgreSQL directe...')
  try {
    const { Pool } = await import('pg')
    const pool = new Pool({
      connectionString: `postgresql://postgres:${serviceKey}@db.${supabaseUrl.replace('https://', '').replace('.supabase.co', '')}.supabase.co:5432/postgres`,
      connectionTimeoutMillis: 5000,
    })
    const client = await pool.connect()
    console.log('  ✅ Connexion PostgreSQL réussie!')

    // Read and execute SQL
    const sqlPath = path.join(__dirname, '..', 'SUPABASE_QUICK_SETUP.sql')
    if (fs.existsSync(sqlPath)) {
      console.log('  📄 Exécution du fichier SUPABASE_QUICK_SETUP.sql...')
      const sql = fs.readFileSync(sqlPath, 'utf-8')
      await client.query(sql)
      console.log('  ✅ Schéma créé avec succès!')
    } else {
      console.log('  ⚠️  Fichier SUPABASE_QUICK_SETUP.sql introuvable')
    }

    client.release()
    await pool.end()
  } catch (err: any) {
    console.log(`  ⚠️  Connexion directe impossible: ${err.message}`)
    console.log('  📝 Utilisez le Supabase Dashboard → SQL Editor pour exécuter le SQL')
  }

  // 3. Verify after setup
  console.log('\n🔍 Vérification finale...')
  const finalStatus = await checkTables()
  const finalMissing = Object.entries(finalStatus).filter(([, v]) => !v).map(([k]) => k)

  if (finalMissing.length === 0) {
    console.log('\n✅ Toutes les tables sont créées!')
  } else {
    console.log(`\n⚠️  Tables restantes à créer (${finalMissing.length}): ${finalMissing.join(', ')}`)
  }

  console.log('\n═'.repeat(60))
}

runSetup().catch(console.error)
