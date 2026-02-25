import { spawnSync } from "node:child_process";

const env = { ...process.env };

if (!env.DATABASE_URL) {
  env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/reelforge";
  console.warn("[prisma:generate] DATABASE_URL was missing. Using a local placeholder for client generation.");
}

const result =
  process.platform === "win32"
    ? spawnSync("cmd", ["/c", "npx prisma generate"], { stdio: "inherit", env })
    : spawnSync("npx", ["prisma", "generate"], { stdio: "inherit", env });

if (typeof result.status === "number") {
  process.exit(result.status);
}

if (result.error) {
  console.error("[prisma:generate] Failed:", result.error.message);
}

process.exit(1);