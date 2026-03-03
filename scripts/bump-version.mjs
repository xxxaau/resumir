#!/usr/bin/env node
/**
 * bump-version.mjs
 * Syncs the version from package.json to manifest.base.json, then regenerates
 * manifest.json and manifest.chromium.json via merge-manifest.mjs.
 * Run after `npm version <patch|minor|major>`.
 *
 * Usage:
 *   node scripts/bump-version.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function readJson(file) {
    // Strip UTF-8 BOM written by PowerShell's Set-Content
    const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
}

function writeJson(file, obj) {
    writeFileSync(file, JSON.stringify(obj, null, 4) + "\n", "utf8");
}

const pkgPath  = resolve(root, "package.json");
const basePath = resolve(root, "manifest.base.json");
const merge    = resolve(__dirname, "merge-manifest.mjs");

const { version } = readJson(pkgPath);

const base = readJson(basePath);
base.version = version;
writeJson(basePath, base);

// Regenerate manifest.json and manifest.chromium.json from updated base
execSync(`node "${merge}" firefox  "${resolve(root, "manifest.json")}"`,          { stdio: "inherit" });
execSync(`node "${merge}" chromium "${resolve(root, "manifest.chromium.json")}"`, { stdio: "inherit" });

console.log(`Version bumped to ${version} in manifest.base.json, manifest.json and manifest.chromium.json`);
