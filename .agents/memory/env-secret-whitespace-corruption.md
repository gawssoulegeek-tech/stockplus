---
name: Env secret with invisible leading/trailing whitespace breaks baked-in URLs
description: A secret value with a stray leading space can silently corrupt a URL baked into a frontend bundle at build time, causing indefinite hangs with no clear error
---

An environment secret (e.g. a Supabase project URL) can contain an invisible leading or trailing space. If that value is baked into a frontend bundle via a build-time `define` (e.g. Vite's `import.meta.env` replacement), every request built from it silently targets a malformed host/URL. Symptoms are misleading: no obvious error toast, requests may not even show up as failed network calls in some tooling, and the UI just hangs on a loading state forever (whatever code path awaits that request never resolves or rejects visibly).

**Why:** Silent whitespace corruption in secrets is easy to introduce (e.g. copy-pasting from a source with leading whitespace) and very hard to spot because the value "looks right" everywhere it's displayed/redacted — only length/char-code inspection reveals it.

**How to apply:** When a feature that depends on an external service (Supabase, other APIs) hangs indefinitely with no console error and backend-side test queries against the same table/data succeed fine, suspect a malformed base URL from an env var — check `value.length` and `value.charCodeAt(0)` for the relevant secret via a quick Node script before assuming a logic bug. Since agents cannot edit secret values directly, fix requires asking the user to re-enter the secret via `requestEnvVar`, then restart the dependent workflow.
