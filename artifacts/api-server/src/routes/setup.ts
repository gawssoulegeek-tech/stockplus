import { Router, type IRouter } from "express";
import { getSupabaseAdminClient } from "../lib/supabase";

const router: IRouter = Router();

const REQUIRED_TABLES = [
  "users", "boutiques", "products", "sales", "sale_items",
  "stock_moves", "customers", "debts", "payments", "china_imports",
  "invitations", "audit_logs",
];

interface DiagnosticReport {
  timestamp: string;
  supabase_url: string;
  tables: Record<string, boolean>;
  environment: { status: string; message: string };
  database: { status: string; message: string; details?: unknown };
  summary: { total: number; existing: number; missing: number; errors: number };
  needs_migration: boolean;
  setup_steps: { step: string; done: boolean; action: string }[];
}

router.get("/setup/diagnostic", async (_req, res) => {
  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    supabase_url: process.env.SUPABASE_URL || "",
    tables: {},
    environment: { status: "ok", message: "OK" },
    database: { status: "ok", message: "Connexion établie" },
    summary: { total: 0, existing: 0, missing: 0, errors: 0 },
    needs_migration: false,
    setup_steps: [
      { step: "Variables d'environnement", done: false, action: "Vérifier les secrets" },
      { step: "Migration SQL", done: false, action: "Exécuter 000_complete_schema.sql" },
      { step: "Auth Email activé", done: false, action: "Dashboard → Authentication → Providers → Email" },
      { step: "Superadmin créé", done: false, action: "UPDATE users SET role='superadmin'" },
    ],
  };

  const envErrors: string[] = [];
  if (!process.env.SUPABASE_URL) envErrors.push("SUPABASE_URL manquante");
  if (!process.env.SUPABASE_ANON_KEY) envErrors.push("SUPABASE_ANON_KEY manquante");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) envErrors.push("SUPABASE_SERVICE_ROLE_KEY manquante");

  if (envErrors.length > 0) {
    report.environment = { status: "error", message: envErrors.join(", ") };
  } else {
    report.setup_steps[0].done = true;
  }

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = getSupabaseAdminClient();

      let existingCount = 0;
      for (const table of REQUIRED_TABLES) {
        try {
          const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
          report.tables[table] = !error;
          if (!error) existingCount++;
        } catch {
          report.tables[table] = false;
        }
      }

      report.summary = {
        total: REQUIRED_TABLES.length,
        existing: existingCount,
        missing: REQUIRED_TABLES.length - existingCount,
        errors: 0,
      };
      report.needs_migration = existingCount < REQUIRED_TABLES.length;

      if (existingCount === REQUIRED_TABLES.length) {
        report.database = { status: "ok", message: `${existingCount}/${REQUIRED_TABLES.length} tables` };
        report.setup_steps[1].done = true;
      } else {
        report.database = {
          status: "warning",
          message: `${existingCount}/${REQUIRED_TABLES.length} tables — migration nécessaire`,
          details: { missing: REQUIRED_TABLES.filter((t) => !report.tables[t]) },
        };
      }

      const { data: adminUsers } = await supabase.from("users").select("role").eq("role", "superadmin").limit(1);
      if (adminUsers && adminUsers.length > 0) {
        report.setup_steps[3].done = true;
      }

      report.summary.errors = [report.environment, report.database].filter((r) => r.status === "error").length;
    } catch (err: unknown) {
      report.database = { status: "error", message: err instanceof Error ? err.message : "Erreur inconnue" };
    }
  }

  res.json(report);
});

export default router;
