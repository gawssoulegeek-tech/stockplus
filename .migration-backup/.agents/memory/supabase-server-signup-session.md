---
name: Supabase client-side session after server-side signup
description: Server-side admin signup does not give the browser a session; client must sign in explicitly afterward.
---

When a signup/registration flow creates the Supabase Auth user via a server-side admin/service-role client (`supabase.auth.signUp` using the service role key), that only creates the account server-side — it does NOT establish a session in the user's browser. `adminClient.auth.setSession(...)` on the server only affects the server's own in-memory client instance, not the browser.

**Why:** Any page that reads auth state via the browser's own Supabase client (e.g. `supabase.auth.getSession()` in a guard/effect) will see no session and redirect to `/login`, even though the account was just created successfully. This manifested as: registration API returns 201 success, but navigating to the post-signup page immediately bounces back to `/login`.

**How to apply:** After a successful server-side signup response, call `supabase.auth.signInWithPassword({ email, password })` on the client before navigating to any page that has a client-side session guard.
