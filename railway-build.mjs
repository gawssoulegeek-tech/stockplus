/**
 * Railway build script — builds frontend (Vite) then API server (esbuild),
 * then copies the frontend dist into the API server dist so Express can serve it.
 */

import { execSync } from "node:child_process";
import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

function run(cmd, opts = {}) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

// 1. Build the Vite frontend (BASE_PATH=/ for Railway, NODE_ENV=production)
run("pnpm --filter @workspace/stockplus build", {
  env: {
    ...process.env,
    NODE_ENV: "production",
    BASE_PATH: "/",
  },
  cwd: root,
});

// 2. Build the Express API server
run("pnpm --filter @workspace/api-server build", { cwd: root });

// 3. Copy frontend dist/public → api-server/dist/public so Express can serve it
const frontendDist = path.join(root, "artifacts/stockplus/dist/public");
const apiPublic = path.join(root, "artifacts/api-server/dist/public");

mkdirSync(apiPublic, { recursive: true });
cpSync(frontendDist, apiPublic, { recursive: true });

console.log("\n✅ Railway build complete — frontend copied into API server dist.");
