import { Router, type IRouter, type Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../lib/supabase";

const router: IRouter = Router();

async function checkSuperadmin(
  authHeader: string | undefined,
  adminClient: SupabaseClient,
  res: Response,
): Promise<boolean> {
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentification requise" });
    return false;
  }
  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
  if (authError || !user) {
    res.status(401).json({ error: "Session invalide" });
    return false;
  }
  const { data: profile } = await adminClient.from("users").select("role").eq("uid", user.id).single();
  if (!profile || (profile as { role: string }).role !== "superadmin") {
    res.status(403).json({ error: "Accès superadmin requis" });
    return false;
  }
  return true;
}

router.patch("/saas/boutiques", async (req, res) => {
  try {
    let adminClient;
    try {
      adminClient = getSupabaseAdminClient();
    } catch {
      return res.status(500).json({ error: "Configuration serveur manquante" });
    }

    const ok = await checkSuperadmin(req.headers.authorization, adminClient, res);
    if (!ok) return;

    const { id, action, ...data } = req.body ?? {};
    if (!id || !action) {
      return res.status(400).json({ error: "id et action requis" });
    }

    switch (action) {
      case "approve": {
        const { data: bout } = await adminClient.from("boutiques").select("plan").eq("id", id).single();
        if (!bout) return res.status(404).json({ error: "Boutique introuvable" });
        await adminClient.from("boutiques").update({
          status: "Essai",
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          team_members_count: 1,
          is_active: true,
        }).eq("id", id);
        return res.json({ ok: true });
      }
      case "toggle-status": {
        const { data: boutique } = await adminClient.from("boutiques").select("status").eq("id", id).single();
        if (!boutique) return res.status(404).json({ error: "Boutique introuvable" });
        const newStatus = (boutique as { status: string }).status === "Actif" ? "Suspendu" : "Actif";
        await adminClient.from("boutiques").update({ status: newStatus }).eq("id", id);
        return res.json({ ok: true, status: newStatus });
      }
      case "delete": {
        await adminClient.from("boutiques").delete().eq("id", id);
        return res.json({ ok: true });
      }
      case "refuse": {
        await adminClient.from("boutiques").update({ status: "refuse" }).eq("id", id);
        return res.json({ ok: true });
      }
      case "cycle-plan": {
        const { data: bout } = await adminClient.from("boutiques").select("plan, status").eq("id", id).single();
        if (!bout) return res.status(404).json({ error: "Boutique introuvable" });
        const b = bout as { plan: string; status: string };
        const PAID_PLANS = ["Basic", "Pro", "Premium"];
        const currentIndex = PAID_PLANS.indexOf(b.plan);
        const newPlan = currentIndex === -1 ? "Basic" : PAID_PLANS[(currentIndex + 1) % PAID_PLANS.length];
        await adminClient.from("boutiques").update({
          plan: newPlan,
          status: b.status === "Essai" ? "Actif" : b.status,
        }).eq("id", id);
        return res.json({ ok: true, plan: newPlan });
      }
      case "activate-payment": {
        const { shopName, paymentId, planToSet } = data as { shopName?: string; paymentId?: string; planToSet?: string };
        if (!shopName || !paymentId) {
          return res.status(400).json({ error: "shopName et paymentId requis" });
        }
        const { data: shops } = await adminClient.from("boutiques").select("id, plan").eq("name", shopName);
        if (!shops || shops.length === 0) {
          return res.status(404).json({ error: "Boutique introuvable" });
        }
        const finalPlan = planToSet || (shops as { plan: string }[])[0].plan;
        await adminClient.from("boutiques").update({ status: "Actif", plan: finalPlan }).eq("name", shopName);
        await adminClient.from("payments").update({ status: "completed" }).eq("id", paymentId);
        return res.json({ ok: true });
      }
      default:
        return res.status(400).json({ error: "Action inconnue" });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur interne";
    return res.status(500).json({ error: msg });
  }
});

router.delete("/saas/boutiques", async (req, res) => {
  try {
    let adminClient;
    try {
      adminClient = getSupabaseAdminClient();
    } catch {
      return res.status(500).json({ error: "Configuration serveur manquante" });
    }

    const ok = await checkSuperadmin(req.headers.authorization, adminClient, res);
    if (!ok) return;

    const table = req.query.table as string | undefined;
    if (table === "audit_logs") {
      const { error } = await adminClient.from("audit_logs").delete().neq("id", "none");
      if (error) throw error;
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: "Table non prise en charge" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur interne";
    return res.status(500).json({ error: msg });
  }
});

export default router;
