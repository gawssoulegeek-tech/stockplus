import { Router, type IRouter, type Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../lib/supabase";
import { logger } from "../lib/logger";
import { getFeaturesForPlan, isValidPlan, MAX_GERANTS } from "../lib/plan-features";
import { sendBoutiqueApprovedEmail, sendBoutiqueRefusedEmail, sendBoutiqueStatusChangedEmail } from "../lib/email";

async function getOwnerEmail(adminClient: SupabaseClient, ownerId: string | null | undefined): Promise<string | null> {
  if (!ownerId) return null;
  const { data: owner } = await adminClient.from("users").select("email").eq("uid", ownerId).single();
  return (owner as { email?: string } | null)?.email || null;
}

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
    if (!action) {
      return res.status(400).json({ error: "action requise" });
    }
    // L'action "create" n'a pas d'id (la boutique n'existe pas encore)
    if (action !== "create" && !id) {
      return res.status(400).json({ error: "id et action requis" });
    }

    const LOG = (step: string, info?: unknown) => logger.info({ data: info }, `[SAAS:${action}] ${step}`);

    switch (action) {
      case "create": {
        const { name, ownerName, ownerEmail, plan } = data as {
          name?: string;
          ownerName?: string;
          ownerEmail?: string;
          plan?: string;
        };

        LOG("Début création boutique", { name, ownerName, ownerEmail, plan });

        // 1. Validation des champs
        if (!name || !ownerName || !ownerEmail) {
          LOG("ÉCHEC: champs manquants", { name: !!name, ownerName: !!ownerName, ownerEmail: !!ownerEmail });
          return res.status(400).json({ error: "name, ownerName et ownerEmail sont requis" });
        }

        const normalizedEmail = String(ownerEmail).trim().toLowerCase();
        LOG("Email normalisé", { normalizedEmail });

        // 2. Vérifier si l'utilisateur existe déjà
        const { data: existingUser } = await adminClient
          .from("users")
          .select("uid, email")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (existingUser) {
          LOG("ÉCHEC: utilisateur déjà existant", { email: normalizedEmail });
          return res.status(409).json({
            error: `Un utilisateur avec l'email ${normalizedEmail} existe déjà`,
          });
        }

        // 3. Créer l'utilisateur dans auth.users via admin.createUser()
        //    On utilise admin.createUser() (et non signUp()) pour éviter que
        //    le client ne change de session (voir commentaire dans auth.ts).
        LOG("Création Auth user...", { email: normalizedEmail });
        const tempPassword = `SP${Date.now()}!${Math.random().toString(36).slice(2, 8)}`;
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { name: ownerName },
        });

        if (authError) {
          LOG("ÉCHEC Auth.createUser", {
            message: authError.message,
            code: (authError as { code?: string }).code,
          });
          const status = (authError as { status?: number }).status ?? 400;
          return res.status(status).json({
            error: `Erreur création utilisateur Auth: ${authError.message}`,
          });
        }

        if (!authData.user) {
          LOG("ÉCHEC: authData.user est null");
          return res.status(500).json({ error: "Échec de création du compte utilisateur" });
        }

        const uid = authData.user.id;
        LOG("Auth user créé", { uid });

        // 4. Déterminer le plan et le statut
        const selectedPlan = plan && isValidPlan(plan) ? plan : "Essai";
        const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const boutiqueId = `boutique_${Date.now()}`;
        const permissions = {
          canManageUsers: true,
          canDeleteSales: true,
          canManageFeatures: true,
          canViewReports: true,
          canUseAdvancedIA: true,
          canExportData: true,
          canManageProducts: true,
          canManageInventory: true,
        };

        // 5. Insérer le profil dans public.users (boutique_id = null pour l'instant)
        LOG("Insertion dans public.users...", { uid, role: "owner" });
        const { error: userInsertError } = await adminClient.from("users").insert({
          uid,
          email: normalizedEmail,
          name: ownerName,
          role: "owner",
          boutique_id: null,
          permissions,
          created_at: new Date().toISOString(),
        });

        if (userInsertError) {
          LOG("ÉCHEC insertion users", {
            message: userInsertError.message,
            code: userInsertError.code,
            details: userInsertError.details,
          });
          // Cleanup: supprimer l'utilisateur Auth qu'on vient de créer
          LOG("Cleanup: suppression Auth user", { uid });
          await adminClient.auth.admin.deleteUser(uid);
          return res.status(500).json({
            error: `Erreur création profil utilisateur: ${userInsertError.message}`,
          });
        }

        LOG("Profil utilisateur créé", { uid });

        // 6. Insérer la boutique dans public.boutiques
        LOG("Insertion dans public.boutiques...", { boutiqueId, name, ownerId: uid });
        const { error: boutiqueInsertError } = await adminClient.from("boutiques").insert({
          id: boutiqueId,
          name,
          owner_id: uid,
          plan: selectedPlan,
          status: "en_attente",
          trial_ends_at: trialEndsAt,
          features: getFeaturesForPlan(selectedPlan),
          team_members_count: MAX_GERANTS[selectedPlan] || 1,
          is_active: true,
          created_at: new Date().toISOString(),
        });

        if (boutiqueInsertError) {
          LOG("ÉCHEC insertion boutiques", {
            message: boutiqueInsertError.message,
            code: boutiqueInsertError.code,
            details: boutiqueInsertError.details,
          });
          // Cleanup: supprimer le profil ET l'utilisateur Auth
          LOG("Cleanup: suppression profil + Auth user", { uid });
          await adminClient.from("users").delete().eq("uid", uid);
          await adminClient.auth.admin.deleteUser(uid);
          return res.status(500).json({
            error: `Erreur création boutique: ${boutiqueInsertError.message}`,
          });
        }

        LOG("Boutique créée", { boutiqueId });

        // 7. Lier l'utilisateur à la boutique (update boutique_id)
        LOG("Liaison user -> boutique...", { uid, boutiqueId });
        const { error: linkError } = await adminClient
          .from("users")
          .update({ boutique_id: boutiqueId })
          .eq("uid", uid);

        if (linkError) {
          LOG("ÉCHEC liaison user-boutique", {
            message: linkError.message,
            code: linkError.code,
          });
          // La boutique et l'utilisateur existent mais ne sont pas liés.
          // On ne supprime pas car les deux entités existent, on signale juste l'erreur.
          return res.status(500).json({
            error: `Boutique créée mais erreur de liaison: ${linkError.message}. Contactez le support.`,
            boutiqueId,
            uid,
          });
        }

        LOG("Création terminée avec succès", { uid, boutiqueId, name });

        // 8. Envoyer un email de réinitialisation de mot de passe au propriétaire
        try {
          LOG("Envoi email réinitialisation mot de passe...", { email: normalizedEmail });
          await adminClient.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ""}/auth/reset-password`,
          });
          LOG("Email envoyé", { email: normalizedEmail });
        } catch (emailErr) {
          // Non bloquant — la boutique est créée
          LOG("WARNING: échec envoi email (non bloquant)", emailErr);
        }

        return res.status(201).json({
          ok: true,
          boutiqueId,
          uid,
          message: `Boutique "${name}" créée. Un email de réinitialisation de mot de passe a été envoyé à ${normalizedEmail}.`,
        });
      }
      case "approve": {
        const { data: bout } = await adminClient.from("boutiques").select("plan, name, owner_id").eq("id", id).single();
        if (!bout) return res.status(404).json({ error: "Boutique introuvable" });
        const b = bout as { plan: string; name: string; owner_id: string | null };
        const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        await adminClient.from("boutiques").update({
          status: "Essai",
          trial_ends_at: trialEndsAt,
          team_members_count: 1,
          is_active: true,
        }).eq("id", id);

        const ownerEmail = await getOwnerEmail(adminClient, b.owner_id);
        if (ownerEmail) void sendBoutiqueApprovedEmail(ownerEmail, b.name, trialEndsAt);

        return res.json({ ok: true });
      }
      case "toggle-status": {
        const { data: boutique } = await adminClient.from("boutiques").select("status, name, owner_id").eq("id", id).single();
        if (!boutique) return res.status(404).json({ error: "Boutique introuvable" });
        const b = boutique as { status: string; name: string; owner_id: string | null };
        const newStatus = b.status === "Actif" ? "Suspendu" : "Actif";
        await adminClient.from("boutiques").update({ status: newStatus }).eq("id", id);

        const ownerEmail = await getOwnerEmail(adminClient, b.owner_id);
        if (ownerEmail) void sendBoutiqueStatusChangedEmail(ownerEmail, b.name, newStatus);

        return res.json({ ok: true, status: newStatus });
      }
      case "delete": {
        await adminClient.from("boutiques").delete().eq("id", id);
        return res.json({ ok: true });
      }
      case "refuse": {
        const { data: bout } = await adminClient.from("boutiques").select("name, owner_id").eq("id", id).single();
        await adminClient.from("boutiques").update({ status: "refuse" }).eq("id", id);

        if (bout) {
          const b = bout as { name: string; owner_id: string | null };
          const ownerEmail = await getOwnerEmail(adminClient, b.owner_id);
          if (ownerEmail) void sendBoutiqueRefusedEmail(ownerEmail, b.name);
        }

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
    logger.error({ error: e }, "[SAAS] Exception non rattrapée");
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