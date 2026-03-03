#!/usr/bin/env node
/**
 * bump-version.js
 * Syncs the version from package.json to manifest.json and manifest.chromium.json.
 * Run after `npm version <patch|minor|major>`.
 *
 * Usage:
 *   node scripts/bump-version.js
 */

import { readFileSync, writeFileSync } from "fs";
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

const pkgPath      = resolve(root, "package.json");
const manifestPath = resolve(root, "manifest.json");
const chromiumPath = resolve(root, "manifest.chromium.json");

const { version } = readJson(pkgPath);

const manifest = readJson(manifestPath);
manifest.version = version;
writeJson(manifestPath, manifest);

const chromium = readJson(chromiumPath);
chromium.version = version;
writeJson(chromiumPath, chromium);

console.log(`Version bumped to ${version} in manifest.json and manifest.chromium.json`);
