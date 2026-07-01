export type PlanId = 'Basic' | 'Pro'

export const TRIAL_DAYS = 14

/** Feature flags scope : toutes les features que le code peut activer */
export type FeatureKey =
  | 'wholesale'
  | 'credit'
  | 'customers'
  | 'units'
  | 'chinaImport'
  | 'advancedReports'
  | 'multiCart'
  | 'stockIncrement'
  | 'historicalMoves'
  | 'supplierInvoiceScan'

export const ALL_FEATURES: Record<FeatureKey, string> = {
  wholesale: 'Vente en Gros',
  credit: 'Ventes à Crédit',
  customers: 'Gestion Clients',
  units: 'Unités de mesure',
  chinaImport: 'Import Chine',
  advancedReports: 'Rapports avancés',
  multiCart: 'Multi-panier',
  stockIncrement: 'Incrément manuel',
  historicalMoves: 'Mouvements historiques',
  supplierInvoiceScan: 'Scan facture fournisseurs',
}

export const MAX_GERANTS: Record<string, number> = {
  Essai: 1,
  Basic: 1,
  Pro: 20,
}

/** Features activées pour chaque plan */
export const PLAN_FEATURES: Record<string, Record<FeatureKey, boolean>> = {
  Essai: {
    wholesale: false,
    credit: false,
    customers: true,
    units: false,
    chinaImport: false,
    advancedReports: false,
    multiCart: false,
    stockIncrement: true,
    historicalMoves: false,
    supplierInvoiceScan: false,
  },
  Basic: {
    wholesale: false,
    credit: false,
    customers: true,
    units: false,
    chinaImport: false,
    advancedReports: false,
    multiCart: false,
    stockIncrement: true,
    historicalMoves: false,
    supplierInvoiceScan: false,
  },
  Pro: {
    wholesale: true,
    credit: true,
    customers: true,
    units: true,
    chinaImport: false,
    advancedReports: true,
    multiCart: true,
    stockIncrement: true,
    historicalMoves: true,
    supplierInvoiceScan: true,
  },
}

export const PLAN_PRICES: Record<PlanId, number> = {
  Basic: 10000,
  Pro: 25000,
}

export const PAID_PLANS: PlanId[] = ['Basic', 'Pro']

export function getFeaturesForPlan(plan: string): Record<string, boolean> {
  const base = PLAN_FEATURES[plan]
  if (base) return { ...base }
  return { ...PLAN_FEATURES.Basic }
}

export function isValidPlan(plan: string): plan is PlanId {
  return PAID_PLANS.includes(plan as PlanId)
}

// ---------------------------------------------------------------------------
// Modules Premium (add-ons vendus indépendamment du plan)
// ---------------------------------------------------------------------------
export interface PremiumModule {
  id: string
  label: string
  description: string
  price: number // FCFA/mois
  /** Feature flag à activer si le module est souscrit */
  featureFlag?: FeatureKey
  /** Le module est-il déjà implémenté dans le code ? */
  implemented: boolean
}

export const PREMIUM_MODULES: PremiumModule[] = [
  { id: 'importChina', label: 'Import Chine', description: 'Calculez vos coûts de revient internationaux.', price: 2500, featureFlag: 'chinaImport', implemented: true },
  { id: 'units', label: 'Unités de mesure', description: 'kg, mètres, litres pour vos produits.', price: 2500, featureFlag: 'units', implemented: true },
  { id: 'historicalMoves', label: 'Mouvements historiques', description: 'Enregistrez des stocks anciens (inventaire initial).', price: 2500, featureFlag: 'historicalMoves', implemented: true },
  { id: 'multiCart', label: 'Multi-panier', description: 'Gérez plusieurs paniers d\'achat simultanés.', price: 2500, featureFlag: 'multiCart', implemented: true },
  { id: 'advancedReports', label: 'Rapports avancés', description: 'Tableaux de bord et analyses détaillées.', price: 2500, featureFlag: 'advancedReports', implemented: true },
  { id: 'fidelity', label: 'Fidélité', description: 'Programme de fidélité clients.', price: 2500, implemented: false },
  { id: 'restaurant', label: 'Restaurant', description: 'Modules salle, cuisine, take-away.', price: 5000, implemented: false },
  { id: 'pharmacy', label: 'Pharmacie', description: 'Gestion des lots, dates péremption.', price: 5000, implemented: false },
  { id: 'multishop', label: 'Multi-boutiques', description: 'Gérez plusieurs boutiques depuis un compte.', price: 10000, implemented: false },
  { id: 'whatsapp', label: 'WhatsApp Business', description: 'Notifications et relances via WhatsApp.', price: 2500, implemented: false },
  { id: 'sms', label: 'SMS', description: 'Campagnes SMS clients.', price: 2500, implemented: false },
  { id: 'barcode', label: 'Scanner code-barres', description: 'Scan rapide à la caisse.', price: 2500, implemented: false },
  { id: 'wave', label: 'Paiement Wave', description: 'Intégration Wave Mobile Money.', price: 2500, implemented: false },
  { id: 'orange', label: 'Orange Money', description: 'Intégration Orange Money.', price: 2500, implemented: false },
]

export function getModuleRevenue(activeModuleIds: string[]): number {
  return PREMIUM_MODULES
    .filter(m => activeModuleIds.includes(m.id))
    .reduce((sum, m) => sum + m.price, 0)
}

/** Renvoie les feature flags à activer en fonction du plan ET des modules souscrits */
export function computeEffectiveFeatures(plan: string, activeModuleIds: string[]): Record<string, boolean> {
  const features = getFeaturesForPlan(plan)
  for (const mod of PREMIUM_MODULES) {
    if (activeModuleIds.includes(mod.id) && mod.featureFlag) {
      features[mod.featureFlag] = true
    }
  }
  return features
}
