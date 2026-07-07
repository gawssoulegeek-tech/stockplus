import { Router, type IRouter } from "express";
import { getSupabaseAdminClient, getSupabaseUserClient } from "../lib/supabase";

const router: IRouter = Router();

router.post("/boutique/notifications", async (req, res) => {
  try {
    const { boutiqueId, emailReports } = req.body ?? {};
    if (!boutiqueId) {
      return res.status(400).json({ error: "boutiqueId requis" });
    }

    let adminClient;
    try {
      adminClient = getSupabaseAdminClient();
    } catch {
      return res.status(500).json({ error: "Configuration serveur manquante" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentification requise" });
    }

    const token = authHeader.slice(7);
    const userClient = getSupabaseUserClient(token);
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Session invalide ou expirée" });
    }

    const { data: userProfile } = await adminClient
      .from("users")
      .select("role")
      .eq("uid", user.id)
      .single();

    if (!userProfile) {
      return res.status(403).json({ error: "Profil utilisateur introuvable" });
    }

    const { data: boutique } = await adminClient
      .from("boutiques")
      .select("owner_id")
      .eq("id", boutiqueId)
      .single();

    if (!boutique) {
      return res.status(404).json({ error: "Boutique introuvable" });
    }

    if ((userProfile as { role: string }).role !== "superadmin" && (boutique as { owner_id: string }).owner_id !== user.id) {
      return res.status(403).json({ error: "Accès non autorisé à cette boutique" });
    }

    const { data: currentBoutique } = await adminClient
      .from("boutiques")
      .select("notifications")
      .eq("id", boutiqueId)
      .single();

    const current = ((currentBoutique as { notifications?: Record<string, unknown> } | null)?.notifications || {}) as Record<string, unknown>;

    const { error } = await adminClient
      .from("boutiques")
      .update({ notifications: { ...current, emailReports } })
      .eq("id", boutiqueId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ ok: true, emailReports });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur interne";
    return res.status(500).json({ error: msg });
  }
});

export default router;
