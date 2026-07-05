import { Router, type IRouter } from "express";
import { getFeaturesForPlan, isValidPlan, MAX_GERANTS } from "../lib/plan-features";
import { getSupabaseAdminClient } from "../lib/supabase";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// POST /api/auth/signup
//
// 1. Valide les champs
// 2. Crée l'utilisateur Auth (supabase.auth.signUp)
// 3. Insère le profil dans public.users (service_role pour bypass RLS)
// 4. Insère la boutique dans public.boutiques
// 5. Met à jour public.users.boutique_id
// 6. Nettoie en cas d'échec
router.post("/auth/signup", async (req, res) => {
  const LOG = (step: string, data?: unknown) => logger.info({ data }, `[SIGNUP] ${step}`);

  try {
    const { email, password, ownerName, boutiqueName, plan } = req.body ?? {};
    LOG("Body reçu", { hasEmail: !!email, hasPassword: !!password, ownerName, boutiqueName });

    if (!email || !password || !ownerName || !boutiqueName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    let adminClient;
    try {
      adminClient = getSupabaseAdminClient();
    } catch {
      LOG("ÉCHEC : variables d'environnement manquantes");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // IMPORTANT: use the Admin API (auth.admin.createUser) rather than
    // auth.signUp() to create the account. adminClient is a shared singleton
    // scoped to the service-role key for all table access below. GoTrue's
    // signUp() automatically saves the newly-created session onto whatever
    // client instance made the call (even without an explicit setSession
    // call) — that silently swaps this client's Authorization header from
    // the service-role key to the new user's own JWT. Every subsequent
    // `.from(...)` call below then runs as that "authenticated" user and is
    // subject to RLS. This slipped by unnoticed for role="owner" because the
    // insert policy happens to allow `auth.uid() = uid AND role IN (owner,
    // manager, staff)`, but it hard-fails for role="superadmin" (42501).
    // auth.admin.createUser() creates the account without ever touching the
    // client's session, so the service-role bypass stays intact.
    LOG("Création Auth user...", { email: normalizedEmail });
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name: ownerName },
    });

    if (authError) {
      LOG("ÉCHEC Auth.createUser", { message: authError.message, code: (authError as { code?: string }).code });
      const status = (authError as { status?: number }).status ?? 400;
      const code =
        (authError as { code?: string }).code ??
        (/already.*registered|already.*exists/i.test(authError.message) ? "user_already_exists" : undefined);
      return res.status(status).json({ error: authError.message, code });
    }

    if (!authData.user) {
      return res.status(400).json({ error: "Failed to create user account" });
    }

    const uid = authData.user.id;
    LOG("Auth user créé", { uid });

    const boutiqueId = `boutique_${Date.now()}`;
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const superadminEmail = process.env.SUPERADMIN_EMAIL?.toLowerCase();
    const isRoot = superadminEmail ? normalizedEmail === superadminEmail : false;
    const selectedPlan = isValidPlan(plan) ? plan : "Basic";
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

    const role = isRoot ? "superadmin" : "owner";
    LOG("Insertion dans public.users...", { uid, role });
    const { error: userInsertError } = await adminClient.from("users").insert({
      uid,
      email: normalizedEmail,
      name: ownerName,
      role,
      boutique_id: null,
      permissions,
      created_at: new Date().toISOString(),
    });

    if (userInsertError) {
      LOG("ÉCHEC insertion users", userInsertError);
      return res.status(500).json({ error: `Failed to create user profile: ${userInsertError.message}` });
    }

    LOG("Insertion dans public.boutiques...", { boutiqueId, boutiqueName });
    const { error: boutiqueInsertError } = await adminClient.from("boutiques").insert({
      id: boutiqueId,
      name: boutiqueName,
      owner_id: uid,
      plan: selectedPlan,
      status: isRoot ? "Actif" : "Suspendu",
      trial_ends_at: isRoot ? null : trialEndsAt,
      features: getFeaturesForPlan(selectedPlan),
      team_members_count: MAX_GERANTS[selectedPlan] || 1,
      is_active: true,
      created_at: new Date().toISOString(),
    });

    if (boutiqueInsertError) {
      LOG("ÉCHEC insertion boutique", boutiqueInsertError);
      await adminClient.from("users").delete().eq("uid", uid);
      return res.status(500).json({ error: `Failed to create boutique: ${boutiqueInsertError.message}` });
    }

    await adminClient.from("users").update({ boutique_id: boutiqueId }).eq("uid", uid);

    LOG("Inscription terminée avec succès", { uid, boutiqueId });
    return res.status(201).json({
      success: true,
      message: "Inscription réussie",
      pending: !isRoot,
      user: { uid, email: normalizedEmail, boutiqueId },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur interne";
    logger.error({ error }, "[SIGNUP] Exception non rattrapée");
    return res.status(500).json({ error: msg });
  }
});

export default router;
