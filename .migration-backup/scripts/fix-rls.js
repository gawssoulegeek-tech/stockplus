const { Client } = require('pg');
const client = new Client({
  host: 'db.dpjhzxcjubkjngqogbft.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});
(async () => {
  await client.connect();

  // Drop all existing policies on users and boutiques to start fresh
  await client.query("DROP POLICY IF EXISTS users_select ON public.users");
  await client.query("DROP POLICY IF EXISTS users_select_own ON public.users");
  await client.query("DROP POLICY IF EXISTS users_select_superadmin ON public.users");
  await client.query("DROP POLICY IF EXISTS users_update ON public.users");
  await client.query("DROP POLICY IF EXISTS users_update_own ON public.users");
  await client.query("DROP POLICY IF EXISTS boutiques_select ON public.boutiques");
  await client.query("DROP POLICY IF EXISTS boutiques_select_owner ON public.boutiques");
  await client.query("DROP POLICY IF EXISTS boutiques_select_member ON public.boutiques");
  await client.query("DROP POLICY IF EXISTS boutiques_insert ON public.boutiques");
  await client.query("DROP POLICY IF EXISTS boutiques_insert_owner ON public.boutiques");
  await client.query("DROP POLICY IF EXISTS boutiques_update ON public.boutiques");
  await client.query("DROP POLICY IF EXISTS boutiques_update_owner ON public.boutiques");
  await client.query("DROP POLICY IF EXISTS boutiques_delete ON public.boutiques");

  // Check column types
  const cols = await client.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='users' AND column_name IN('uid','boutique_id','id','role')");
  cols.rows.forEach(r => console.log(r.column_name, r.data_type, r.udt_name));
  console.log('---');

  // Create a security definer function to get the current user's boutique_id (bypasses RLS)
  // boutique_id is TEXT type, return TEXT
  await client.query(`
    CREATE OR REPLACE FUNCTION public.get_my_boutique_id()
    RETURNS TEXT
    LANGUAGE sql
    STABLE SECURITY DEFINER
    AS $$
      SELECT boutique_id::TEXT FROM public.users WHERE uid = auth.uid() LIMIT 1;
    $$;
  `);

  // Create a security definer function to check if current user is superadmin (bypasses RLS)
  await client.query(`
    CREATE OR REPLACE FUNCTION public.is_current_user_superadmin()
    RETURNS BOOLEAN
    LANGUAGE sql
    STABLE SECURITY DEFINER
    AS $$
      SELECT EXISTS(SELECT 1 FROM public.users WHERE uid = auth.uid() AND role = 'superadmin');
    $$;
  `);

  // --- USERS TABLE POLICIES ---

  // SELECT: own row OR superadmin OR same boutique member
  await client.query(`
    CREATE POLICY users_select ON public.users
    FOR SELECT USING (
      auth.uid() = uid
      OR public.is_current_user_superadmin()
      OR boutique_id = public.get_my_boutique_id()
    );
  `);

  // UPDATE: own row OR superadmin
  await client.query(`
    CREATE POLICY users_update ON public.users
    FOR UPDATE USING (
      auth.uid() = uid
      OR public.is_current_user_superadmin()
    );
  `);

  // INSERT: authenticated users can insert
  await client.query(`
    CREATE POLICY users_insert ON public.users
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  `);

  // DELETE: only superadmin
  await client.query(`
    CREATE POLICY users_delete ON public.users
    FOR DELETE USING (public.is_current_user_superadmin());
  `);

  // --- BOUTIQUES TABLE POLICIES ---

  // SELECT: owner OR superadmin OR member
  await client.query(`
    CREATE POLICY boutiques_select ON public.boutiques
    FOR SELECT USING (
      owner_id = auth.uid()
      OR public.is_current_user_superadmin()
      OR id = public.get_my_boutique_id()
    );
  `);

  // INSERT: authenticated users
  await client.query(`
    CREATE POLICY boutiques_insert ON public.boutiques
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  `);

  // UPDATE: owner OR superadmin
  await client.query(`
    CREATE POLICY boutiques_update ON public.boutiques
    FOR UPDATE USING (
      owner_id = auth.uid()
      OR public.is_current_user_superadmin()
    );
  `);

  // DELETE: only superadmin
  await client.query(`
    CREATE POLICY boutiques_delete ON public.boutiques
    FOR DELETE USING (public.is_current_user_superadmin());
  `);

  console.log('RLS policies rewritten successfully!');

  // Verify
  const pols = await client.query("SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('users','boutiques') ORDER BY tablename, cmd");
  console.log('Active policies:', JSON.stringify(pols.rows, null, 2));

  await client.end();
})();
