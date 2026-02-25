import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "web", "dist");
const target = resolve(root, "dist");

if (!existsSync(source)) {
  console.error(`[sync-dist] Source not found: ${source}`);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });

console.log("[sync-dist] Copied web/dist -> dist");