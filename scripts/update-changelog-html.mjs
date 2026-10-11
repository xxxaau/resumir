#!/usr/bin/env node
/**
 * update-changelog-html.mjs
 * Parseja CHANGELOG.md i injecta les entrades de versió a settings.html
 * entre els marcadors CHANGELOG_START / CHANGELOG_END.
 *
 * S'executa automàticament via el hook `postversion` de npm.
 * Ús manual: node scripts/update-changelog-html.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parseChangelog, generateHtml } from "./changelog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// --- Main ---
const changelogPath    = resolve(root, "docs", "CHANGELOG.md");
const settingsHtmlPath = resolve(root, "options", "settings.html");

const changelog    = readFileSync(changelogPath, "utf8");
const settingsHtml = readFileSync(settingsHtmlPath, "utf8");

const START = "<!-- CHANGELOG_START -->";
const END   = "<!-- CHANGELOG_END -->";

if (!settingsHtml.includes(START) || !settingsHtml.includes(END)) {
    console.error(`Error: marcadors ${START} / ${END} no trobats a settings.html`);
    process.exit(1);
}

const versions = parseChangelog(changelog);
const newHtml  = generateHtml(versions);

const updated = settingsHtml.replace(
    new RegExp(`${START}[\\s\\S]*?${END}`),
    `${START}\n${newHtml}\n            ${END}`
);

writeFileSync(settingsHtmlPath, updated, "utf8");
console.log(`Changelog sincronitzat: ${versions.length} versions injectades a settings.html`);
