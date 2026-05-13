#!/usr/bin/env node
/**
 * merge-manifest.mjs
 * Merges manifest.base.json + manifest.<target>.patch.json.
 *
 * Arrays of strings (e.g. permissions, host_permissions, optional_permissions)
 * are concatenated and deduplicated, preserving first-seen order.
 * Arrays of non-strings are concatenated without dedup.
 * Objects are deep-merged (patch overrides base).
 *
 * Usage:
 *   node scripts/merge-manifest.mjs firefox            # stdout
 *   node scripts/merge-manifest.mjs chromium           # stdout
 *   node scripts/merge-manifest.mjs firefox out.json   # write to file
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function readJson(file) {
    const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
}

function mergeArrays(a, b) {
    const allStrings = [...a, ...b].every(v => typeof v === "string");
    if (allStrings) {
        return [...new Set([...a, ...b])];
    }
    return [...a, ...b];
}

function deepMerge(base, patch) {
    const result = { ...base };
    for (const key of Object.keys(patch)) {
        if (Array.isArray(patch[key]) && Array.isArray(result[key])) {
            result[key] = mergeArrays(result[key], patch[key]);
        } else if (
            patch[key] !== null && typeof patch[key] === "object" && !Array.isArray(patch[key]) &&
            result[key] !== null && typeof result[key] === "object" && !Array.isArray(result[key])
        ) {
            result[key] = deepMerge(result[key], patch[key]);
        } else {
            result[key] = patch[key];
        }
    }
    return result;
}

const [,, target, outFile] = process.argv;

if (!target || !["firefox", "chromium"].includes(target)) {
    console.error("Usage: node scripts/merge-manifest.mjs <firefox|chromium> [outFile]");
    process.exit(1);
}

const base  = readJson(resolve(root, "manifest.base.json"));
const patch = readJson(resolve(root, `manifest.${target}.patch.json`));
const merged = deepMerge(base, patch);
const output = JSON.stringify(merged, null, 4) + "\n";

if (outFile) {
    writeFileSync(resolve(root, outFile), output, "utf8");
} else {
    process.stdout.write(output);
}
