import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const env = { ...process.env };

if (!env.DATABASE_URL) {
  env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/reelforge";
  console.warn("[prisma:generate] DATABASE_URL was missing. Using a local placeholder for client generation.");
}

function resolvePrismaMajor() {
  try {
    const pkgRaw = readFileSync(new URL("../package.json", import.meta.url), "utf8");
    const pkg = JSON.parse(pkgRaw);
    const versionRange = pkg.dependencies?.prisma ?? pkg.devDependencies?.prisma ?? "6";
    const major = String(versionRange).match(/(\d+)/)?.[1] ?? "6";
    return major;
  } catch {
    return "6";
  }
}

const prismaMajor = resolvePrismaMajor();
const prismaSpec = `prisma@${prismaMajor}`;

const result =
  process.platform === "win32"
    ? spawnSync("cmd", ["/c", `npx ${prismaSpec} generate`], { stdio: "inherit", env })
    : spawnSync("npx", [prismaSpec, "generate"], { stdio: "inherit", env });

if (typeof result.status === "number") {
  process.exit(result.status);
}

if (result.error) {
  console.error("[prisma:generate] Failed:", result.error.message);
}

process.exit(1);