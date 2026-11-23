#!/usr/bin/env node
/**
 * update-changelog-html.mjs
 * Parseja CHANGELOG.md i injecta les entrades de versió a settings.html
 * entre els marcadors CHANGELOG_START / CHANGELOG_END.
 *
 * S'executa automàticament via el hook `version` de npm (dins del commit taggejat).
 * Ús manual: node scripts/update-changelog-html.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parseChangelog, generateHtml, injectChangelog } from "./changelog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// --- Main ---
const changelogPath    = resolve(root, "docs", "CHANGELOG.md");
const settingsHtmlPath = resolve(root, "options", "settings.html");

const changelog    = readFileSync(changelogPath, "utf8");
const settingsHtml = readFileSync(settingsHtmlPath, "utf8");

const versions = parseChangelog(changelog);
const newHtml  = generateHtml(versions);

const updated = injectChangelog(settingsHtml, newHtml);
if (updated === null) {
    console.error("Error: marcadors CHANGELOG_START / CHANGELOG_END no trobats a settings.html");
    process.exit(1);
}

writeFileSync(settingsHtmlPath, updated, "utf8");
console.log(`Changelog sincronitzat: ${versions.length} versions injectades a settings.html`);
