export type PlanId = "Basic" | "Pro" | "Premium";

export type FeatureKey =
  | "wholesale"
  | "credit"
  | "customers"
  | "units"
  | "chinaImport"
  | "advancedReports"
  | "multiCart"
  | "stockIncrement"
  | "historicalMoves"
  | "supplierInvoiceScan"
  | "crm"
  | "autoRelance"
  | "comptabilite"
  | "exportComptable"
  | "ecommerce";

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
    crm: false,
    autoRelance: false,
    comptabilite: false,
    exportComptable: false,
    ecommerce: false,
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
    crm: false,
    autoRelance: false,
    comptabilite: false,
    exportComptable: false,
    ecommerce: false,
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
    crm: true,
    autoRelance: true,
    comptabilite: true,
    exportComptable: true,
    ecommerce: false,
  },
  Premium: {
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
    crm: true,
    autoRelance: true,
    comptabilite: true,
    exportComptable: true,
    ecommerce: false,
  },
};

export const MAX_GERANTS: Record<string, number> = {
  Essai: 2,
  Basic: 2,
  Pro: 20,
  Premium: 20,
};

export const PAID_PLANS: PlanId[] = ["Basic", "Pro", "Premium"];

export function getFeaturesForPlan(plan: string): Record<string, boolean> {
  const base = PLAN_FEATURES[plan];
  if (base) return { ...base };
  return { ...PLAN_FEATURES.Basic };
}

export function isValidPlan(plan: string): plan is PlanId {
  return PAID_PLANS.includes(plan as PlanId);
}