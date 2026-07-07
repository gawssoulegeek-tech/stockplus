export type PlanId = "Basic" | "Pro";

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
  | "supplierInvoiceScan";

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
};

export const MAX_GERANTS: Record<string, number> = {
  Essai: 1,
  Basic: 1,
  Pro: 20,
};

export const PAID_PLANS: PlanId[] = ["Basic", "Pro"];

export function getFeaturesForPlan(plan: string): Record<string, boolean> {
  const base = PLAN_FEATURES[plan];
  if (base) return { ...base };
  return { ...PLAN_FEATURES.Basic };
}

export function isValidPlan(plan: string): plan is PlanId {
  return PAID_PLANS.includes(plan as PlanId);
}
