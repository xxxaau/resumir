#!/usr/bin/env node
/**
 * build.mjs - Cross-platform build orchestrator
 * Replaces build.ps1 for cross-platform CI/CD compatibility
 * 
 * Usage:
 *   node scripts/build.mjs
 *   node scripts/build.mjs firefox
 *   node scripts/build.mjs chromium
 */

import { readFileSync, existsSync, rmSync, mkdirSync, copyFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync, spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const target = process.argv[2] || "all";

// Validate target
if (!["firefox", "chromium", "all"].includes(target)) {
  console.error(`Invalid target: ${target}. Use: firefox, chromium, or all`);
  process.exit(1);
}

// Read version from manifest.base.json
const manifestRaw = readFileSync(resolve(root, "manifest.base.json"), "utf8").replace(/^\uFEFF/, "");
const manifest = JSON.parse(manifestRaw);
const version = manifest.version;

// Guard: abort if in dev mode
if (manifest.name.includes("(DEV)")) {
  console.error(`ERROR: manifest.name is in DEV mode: "${manifest.name}"`);
  console.error("Run: node scripts/set-mode.mjs prod");
  process.exit(1);
}

console.log(`\nðŸ”¨ Building v${version} for target: ${target}`);

// Common files and directories
const commonFiles = [
  "Readability.js",
  "theme.js",
  "LICENSE",
  "docs/PRIVACY_POLICY.md"
];

const commonDirs = [
  "icons",
  "options",
  "shared",
  "sidebar",
  "vendor"
];

/**
 * Execute command and return exit code
 */
function exec(cmd, description) {
  try {
    console.log(`  â†’ ${description}`);
    execSync(cmd, { cwd: root, stdio: "pipe" });
    return 0;
  } catch (err) {
    console.error(`  âŒ ${description}: ${err.message}`);
    throw err;
  }
}

/**
 * Copy file with directory creation
 */
function copyFile(src, dest) {
  const srcPath = resolve(root, src);
  const destPath = resolve(root, dest);
  
  if (!existsSync(srcPath)) {
    console.warn(`  âš ï¸  File not found: ${src}`);
    return;
  }
  
  const destDir = dirname(destPath);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  
  try {
    const content = readFileSync(srcPath);
    writeFileSync(destPath, content);
  } catch (err) {
    console.error(`  âŒ Failed to copy ${src}: ${err.message}`);
    throw err;
  }
}

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  const srcPath = resolve(root, src);
  const destPath = resolve(root, dest);
  
  if (!existsSync(srcPath)) {
    console.warn(`  âš ï¸  Directory not found: ${src}`);
    return;
  }
  
  if (existsSync(destPath)) {
    rmSync(destPath, { recursive: true, force: true });
  }
  
  function copyRecursive(from, to) {
    mkdirSync(to, { recursive: true });
    for (const file of readdirSync(from)) {
      const srcFile = join(from, file);
      const destFile = join(to, file);
      if (statSync(srcFile).isDirectory()) {
        copyRecursive(srcFile, destFile);
      } else {
        copyFileSync(srcFile, destFile);
      }
    }
  }
  
  try {
    copyRecursive(srcPath, destPath);
  } catch (err) {
    console.error(`  âŒ Failed to copy directory ${src}: ${err.message}`);
    throw err;
  }
}

/**
 * Build ZIP for a target
 */
async function buildZip(targetName, manifestTarget, extraFiles = [], excludeFiles = []) {
  const zipName = `resumir-contingut-v${version}-${targetName}.zip`;
  
  console.log(`\nðŸ“¦ Building ${targetName}...`);
  
  // Remove old ZIP
  const zipPath = resolve(root, "build", zipName);
  if (existsSync(zipPath)) {
    rmSync(zipPath, { force: true });
  }
  
  // Create temp build dir
  const buildDir = `build_${targetName}`;
  const buildPath = resolve(root, buildDir);
  
  if (existsSync(buildPath)) {
    rmSync(buildPath, { recursive: true, force: true });
  }
  mkdirSync(buildPath, { recursive: true });
  
  // Generate manifest
  exec(
    `node scripts/merge-manifest.mjs ${manifestTarget} "${buildDir}/manifest.json"`,
    "Generated manifest.json"
  );
  
  // Copy common files
  for (const file of commonFiles) {
    const srcPath = resolve(root, file);
    if (existsSync(srcPath)) {
      const destPath = resolve(buildPath, file);
      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
    } else {
      console.warn(`  âš ï¸  ${file} not found`);
    }
  }
  
  // Copy extra files
  for (const file of extraFiles) {
    const srcPath = resolve(root, file);
    if (existsSync(srcPath)) {
      const destPath = resolve(buildPath, file);
      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
    } else {
      console.warn(`  âš ï¸  ${file} not found`);
    }
  }
  
  // Copy directories
  for (const dir of commonDirs) {
    const srcPath = resolve(root, dir);
    if (existsSync(srcPath)) {
      const destPath = resolve(buildPath, dir);
      copyDir(srcPath, destPath);
    } else {
      console.warn(`  ⚠️  ${dir}/ not found`);
    }
  }

  // Remove internal icon source subdirs from the build (dev/ and prod/ are not needed in the ZIP)
  for (const sub of ["dev", "prod"]) {
    const subPath = resolve(buildPath, "icons", sub);
    if (existsSync(subPath)) rmSync(subPath, { recursive: true, force: true });
  }
  
  // Build sidebar bundle
  if (targetName === "firefox" || targetName === "chromium") {
    const sidebarBundleOut = join(buildDir, "sidebar", "sidebar.bundle.js");
    const sidebarHtml = join(buildDir, "sidebar", "sidebar.html");
    
    exec(
      `node scripts/build-sidebar-bundle.mjs --minify --out="${sidebarBundleOut}" --html="${sidebarHtml}"`,
      "Generated sidebar bundle"
    );
    
    // Remove individual sidebar JS files (now in bundle)
    const sidebarFiles = ["utils.js", "api.js", "youtube-track-select.js", "pdf-extract.js", "extractors.js", "content.js", "cache.js", "stats.js", "ui.js", "markmap-native.js", "conceptmap-filename.js", "conceptmap.js", "summary.js", "history.js", "anki.js", "sidebar.js"];
    for (const f of sidebarFiles) {
      const filePath = resolve(buildPath, "sidebar", f);
      if (existsSync(filePath)) {
        rmSync(filePath, { force: true });
      }
    }
  }
  
  // Build Chromium bundle if needed
  if (targetName === "chromium") {
    exec(
      `node scripts/build-chromium-bundle.mjs --minify`,
      "Generated background.bundle.js"
    );
    
    // Copy the bundle to build dir
    const bundleSource = resolve(root, "background.bundle.js");
    if (existsSync(bundleSource)) {
      const bundleDest = resolve(buildPath, "background.bundle.js");
      copyFileSync(bundleSource, bundleDest);
    }
  }
  
  // Create build directory if it doesn't exist
  const buildOutputDir = resolve(root, "build");
  if (!existsSync(buildOutputDir)) {
    mkdirSync(buildOutputDir, { recursive: true });
  }
  
  // Create ZIP
  exec(
    `node scripts/make-zip.mjs "${buildDir}" "${zipPath}"`,
    `Created ${zipName}`
  );
  
  // Cleanup
  rmSync(buildPath, { recursive: true, force: true });
  
  console.log(`  âœ… ${zipName} ready`);
}

/**
 * Main build process
 */
async function main() {
  try {
    if (target === "firefox" || target === "all") {
      await buildZip("firefox", "firefox", ["ext.js", "background.js"], []);
    }
    
    if (target === "chromium" || target === "all") {
      await buildZip("chromium", "chromium", ["ext.js", "background.bundle.js"], []);
    }
    
    console.log(`\nâœ¨ Build complete! v${version}\n`);
  } catch (err) {
    console.error(`\nâŒ Build failed: ${err.message}\n`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

