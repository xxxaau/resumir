#!/usr/bin/env node
/**
 * release.mjs - Cross-platform release orchestrator.
 * Replaces release.ps1 for cross-platform CI/CD compatibility.
 *
 * Usage:
 *   node scripts/release.mjs                         # Build all, backup, restore
 *   node scripts/release.mjs --target firefox        # Firefox only
 *   node scripts/release.mjs --target chromium       # Chromium only
 *   node scripts/release.mjs --no-backup             # Skip DEV data backup
 *   node scripts/release.mjs --skip-dev-restore      # Keep PROD mode after build
 *   node scripts/release.mjs --help                  # Show help
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

let target = "all";
let noBackup = false;
let skipDevRestore = false;

for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === "--target" || arg === "-t") {
    target = process.argv[++i];
  } else if (arg === "--no-backup") {
    noBackup = true;
  } else if (arg === "--skip-dev-restore") {
    skipDevRestore = true;
  } else if (arg === "--help" || arg === "-h") {
    console.log("Usage: node scripts/release.mjs [options]");
    console.log("  --target, -t <all|firefox|chromium>  (default: all)");
    console.log("  --no-backup                          Skip DEV data backup");
    console.log("  --skip-dev-restore                   Keep PROD mode after build");
    process.exit(0);
  } else {
    console.error(`Unknown option: ${arg}`);
    process.exit(1);
  }
}

if (!["all", "firefox", "chromium"].includes(target)) {
  console.error(`Invalid target: ${target}. Use: all, firefox, or chromium`);
  process.exit(1);
}

const base = JSON.parse(readFileSync(join(root, "manifest.base.json"), "utf8"));
const originalMode = base.name && base.name.includes("(DEV)") ? "dev" : "prod";

console.log(`\n=== RELEASE BUILD ===`);
console.log(`Target: ${target}`);
console.log(`Original mode: ${originalMode}\n`);

if (!noBackup) {
  console.log("[1/4] Backing up DEV data...");
  for (const browser of ["firefox", "chromium"]) {
    try {
      execSync(
        `node "${join(root, "scripts/backup-extension-data.mjs")}" ${browser} dev`,
        { stdio: "pipe", cwd: root }
      );
      console.log(`  OK: ${browser} DEV data backed up`);
    } catch {
      console.warn(`  WARNING: Backup for ${browser} failed, continuing...`);
    }
  }
  console.log();
}

console.log("[2/5] Switching to PROD mode...");
execSync(`node "${join(root, "scripts/set-mode.mjs")}" prod`, { stdio: "inherit", cwd: root });
console.log();

console.log("[3/5] Building extension...");
execSync(`node "${join(root, "scripts/build.mjs")}" ${target}`, { stdio: "inherit", cwd: root });
console.log();

if (!skipDevRestore) {
  console.log(`[4/5] Restoring original mode (${originalMode})...`);
  execSync(`node "${join(root, "scripts/set-mode.mjs")}" ${originalMode}`, { stdio: "inherit", cwd: root });
  console.log();

  // Si tornem a DEV, regenera la carpeta unpacked de Chromium perquè quedi
  // al dia amb la versió actual (evita carregar codi/versió vells a Edge —
  // la confusió que va motivar el sufix «(DEV)» a dev-chromium.mjs).
  if (originalMode === "dev") {
    console.log("[5/5] Regenerating build_chromium_dev (Edge/Chrome unpacked)...");
    execSync(`node "${join(root, "scripts/dev-chromium.mjs")}"`, { stdio: "inherit", cwd: root });
    console.log();
  }
}

console.log("=== RELEASE BUILD COMPLETED ===");
const buildDir = join(root, "build");
if (existsSync(buildDir)) {
  const zips = readdirSync(buildDir).filter(
    f => f.startsWith("resumir-contingut-v") && f.endsWith(".zip")
  );
  if (zips.length) {
    console.log("Generated files:");
    for (const z of zips) console.log(`  - ${z}`);
  }
}
