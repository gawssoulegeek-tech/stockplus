---
name: Supabase admin client session pollution from auth.signUp()
description: Why using the service-role client's auth.signUp() to create users breaks subsequent service-role DB writes
---

Calling `adminClient.auth.signUp()` on a server-side Supabase client that is also used as the shared service-role singleton for DB writes causes that client to persist the new user's session internally. Any subsequent `.from(...).insert()` calls on that same client instance then run under the new user's RLS permissions instead of service-role, not under an explicit session swap you'd notice in code.

**Why:** This bug is silent for roles whose RLS insert policies happen to allow self-insert (e.g. "owner" during signup), and only surfaces as a hard failure (Postgres 42501) for stricter roles (e.g. "superadmin") — making it easy to think signup "works" when it only worked by coincidence for one role.

**How to apply:** For server-side user creation, use `adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata })` instead of `auth.signUp()`. The admin `createUser` call never touches the client's session, keeping the shared service-role client clean for subsequent RLS-bypassing writes. The client (browser) must still call `signInWithPassword` itself afterward to establish its own session — the admin action doesn't propagate one to the browser.
