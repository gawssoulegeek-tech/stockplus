# ══════════════════════════════════════════════════════════════════════════════
# STOCKPLUS — Script d'installation complet (Windows PowerShell)
# ══════════════════════════════════════════════════════════════════════════════
# Exécution : .\setup.ps1
# ══════════════════════════════════════════════════════════════════════════════

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        STOCKPLUS — Configuration Production-Ready         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── ÉTAPE 1 : Vérifier Node.js ─────────────────────────────────────────────────
Write-Host "▸ ÉTAPE 1/6 : Vérification des prérequis..." -ForegroundColor Yellow
$nodeVersion = node -v 2>$null
if (-not $nodeVersion) {
    Write-Host "  ✗ Node.js introuvable. Installez-le depuis https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Node.js $nodeVersion" -ForegroundColor Green
$npmVersion = npm -v 2>$null
Write-Host "  ✓ npm $npmVersion" -ForegroundColor Green

# ── ÉTAPE 2 : Installer les dépendances ────────────────────────────────────────
Write-Host "`n▸ ÉTAPE 2/6 : Installation des dépendances npm..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Échec de l'installation des dépendances" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Dépendances installées" -ForegroundColor Green

# ── ÉTAPE 3 : Configurer Supabase ──────────────────────────────────────────────
Write-Host "`n▸ ÉTAPE 3/6 : Configuration Supabase..." -ForegroundColor Yellow
Write-Host "  ┌─────────────────────────────────────────────────────────┐" -ForegroundColor Gray
Write-Host "  │  1. Allez sur https://supabase.com/dashboard             │" -ForegroundColor White
Write-Host "  │  2. Cliquez 'New project'                                │" -ForegroundColor White
Write-Host "  │  3. Nommez-le 'stockplus'                                │" -ForegroundColor White
Write-Host "  │  4. Choisissez une région proche (ex: West US)          │" -ForegroundColor White
Write-Host "  │  5. Définissez un mot de passe base de données           │" -ForegroundColor White
Write-Host "  │  6. Cliquez 'Create new project' (1-2 min)              │" -ForegroundColor White
Write-Host "  └─────────────────────────────────────────────────────────┘" -ForegroundColor Gray

Write-Host "  ┌─────────────────────────────────────────────────────────┐" -ForegroundColor Gray
Write-Host "  │  Récupérez les clés depuis Settings → API :             │" -ForegroundColor White
Write-Host "  │  - Project URL (ex: https://xxx.supabase.co)           │" -ForegroundColor White
Write-Host "  │  - anon public key                                      │" -ForegroundColor White
Write-Host "  │  - service_role key (secret)                            │" -ForegroundColor White
Write-Host "  └─────────────────────────────────────────────────────────┘" -ForegroundColor Gray

$supabaseUrl = Read-Host "`n  NEXT_PUBLIC_SUPABASE_URL"
$anonKey = Read-Host "  NEXT_PUBLIC_SUPABASE_ANON_KEY"
$serviceKey = Read-Host "  SUPABASE_SERVICE_ROLE_KEY"

# Écrire dans .env
@"
# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey
SUPABASE_SERVICE_ROLE_KEY=$serviceKey

# IA AWA
GEMINI_API_KEY=$(if (Test-Path .env) { (Get-Content .env | Where-Object { $_ -match '^GEMINI_API_KEY=' }) -replace '^GEMINI_API_KEY=' } else { '' })

# APP
NEXT_PUBLIC_APP_URL=http://localhost:9002
"@ | Set-Content -Path .env -Encoding UTF8
Write-Host "  ✓ Fichier .env configuré" -ForegroundColor Green

# ── ÉTAPE 4 : Exécuter les migrations ──────────────────────────────────────────
Write-Host "`n▸ ÉTAPE 4/6 : Exécution des migrations SQL..." -ForegroundColor Yellow
Write-Host "  ┌─────────────────────────────────────────────────────────┐" -ForegroundColor Gray
Write-Host "  │  Allez dans votre projet Supabase → SQL Editor          │" -ForegroundColor White
Write-Host "  │  Exécutez DANS L'ORDRE :                                │" -ForegroundColor White
Write-Host "  │                                                         │" -ForegroundColor White
Write-Host "  │  1. supabase/migrations/001_core_schema.sql            │" -ForegroundColor Cyan
Write-Host "  │  2. supabase/migrations/002_business_schema.sql        │" -ForegroundColor Cyan
Write-Host "  │  3. supabase/migrations/003_security_triggers.sql      │" -ForegroundColor Cyan
Write-Host "  │  4. supabase/migrations/004_permissions_features.sql   │" -ForegroundColor Cyan
Write-Host "  │                                                         │" -ForegroundColor White
Write-Host "  │  Pour chaque fichier :                                   │" -ForegroundColor White
Write-Host "  │  1. Ouvrir le fichier .sql                              │" -ForegroundColor White
Write-Host "  │  2. Copier tout le contenu (Ctrl+A → Ctrl+C)           │" -ForegroundColor White
Write-Host "  │  3. Coller dans SQL Editor (Ctrl+V)                    │" -ForegroundColor White
Write-Host "  │  4. Cliquer 'Run'                                       │" -ForegroundColor White
Write-Host "  └─────────────────────────────────────────────────────────┘" -ForegroundColor Gray

$confirmMigrations = Read-Host "  Les migrations ont-elles été exécutées ? (oui/non)"
if ($confirmMigrations -ne "oui") {
    Write-Host "  ⚠ Exécutez les migrations avant de continuer" -ForegroundColor Yellow
}

# ── ÉTAPE 5 : Configurer Auth Supabase ─────────────────────────────────────────
Write-Host "`n▸ ÉTAPE 5/6 : Configuration Authentication..." -ForegroundColor Yellow
Write-Host "  ┌─────────────────────────────────────────────────────────┐" -ForegroundColor Gray
Write-Host "  │  Dans Supabase Dashboard → Authentication → Settings    │" -ForegroundColor White
Write-Host "  │                                                         │" -ForegroundColor White
Write-Host "  │  1. DISABLE 'Confirm email' si inscription directe     │" -ForegroundColor White
Write-Host "  │  2. SITE URL: http://localhost:9002                    │" -ForegroundColor White
Write-Host "  │  3. Redirect URLs: http://localhost:9002/**            │" -ForegroundColor White
Write-Host "  │  4. Disable 'Enable email confirmations' pour dev      │" -ForegroundColor White
Write-Host "  │  5. Save                                           │" -ForegroundColor White
Write-Host "  └─────────────────────────────────────────────────────────┘" -ForegroundColor Gray

# ── ÉTAPE 6 : Lancer l'application ─────────────────────────────────────────────
Write-Host "`n▸ ÉTAPE 6/6 : Démarrage de l'application..." -ForegroundColor Yellow
Write-Host "  Lancement du serveur de développement sur http://localhost:9002" -ForegroundColor White
Write-Host ""

npm run dev
