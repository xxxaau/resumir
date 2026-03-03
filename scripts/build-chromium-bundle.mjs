#!/usr/bin/env node
/**
 * build-chromium-bundle.mjs
 * Concatena ext.js + background.js i genera background.bundle.js per al
 * service worker de Chromium. Usa esbuild per validar la sintaxi.
 *
 * Usage:
 *   node scripts/build-chromium-bundle.mjs           # no minificat
 *   node scripts/build-chromium-bundle.mjs --minify  # minificat
 */

import { transformSync } from "esbuild";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const minify = process.argv.includes("--minify");

const header = [
    "// background.bundle.js - Auto-generated for Chromium service worker",
    "// DO NOT EDIT - edit ext.js and background.js instead",
    "",
].join("\n");

const ext = readFileSync(resolve(root, "ext.js"), "utf8");
const bg  = readFileSync(resolve(root, "background.js"), "utf8");
const combined = header + ext + "\n\n// --- background.js ---\n\n" + bg;

const result = transformSync(combined, {
    loader: "js",
    target: "chrome116",
    minify,
});

for (const w of result.warnings) {
    console.warn(`[esbuild] ${w.text}`);
}

writeFileSync(resolve(root, "background.bundle.js"), header + result.code, "utf8");
console.log(`Generated background.bundle.js${minify ? " (minified)" : ""}`);
