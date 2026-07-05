---
name: Supabase RLS self-referencing policy recursion
description: RLS policies that subquery their own table directly cause Postgres 42P17 infinite recursion; use SECURITY DEFINER helper functions instead.
---

A Postgres RLS `USING`/`WITH CHECK` clause that contains a raw `EXISTS (SELECT 1 FROM <same_table> ...)` against the table the policy is attached to will recurse: evaluating the subquery re-triggers the same RLS policy, which re-evaluates the subquery, forever. Postgres surfaces this as error code `42P17` ("infinite recursion detected in policy for relation ...").

**Why:** Discovered in a StockPlus (Supabase-backed) migration — the `users_select` policy had `EXISTS (SELECT 1 FROM public.users u WHERE ...)` inside its own policy, breaking every profile lookup once a second user shared a boutique_id and the boutique-membership clause was hit.

**How to apply:** Any RLS clause that needs to look up a value from the *same* protected table (e.g. "does the caller share a group/org with this row?") must go through a `SECURITY DEFINER` SQL function (which runs as the function owner and bypasses RLS) rather than an inline subquery. Reuse existing SECURITY DEFINER helpers (e.g. a `get_current_boutique_id()`-style function) instead of inlining the same logic as a raw subquery.
