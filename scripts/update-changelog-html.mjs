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

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const MONTHS_CA = [
    "Gener", "Febrer", "Març", "Abril", "Maig", "Juny",
    "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre",
];

function isoToMonthYear(isoDate) {
    const [year, month] = isoDate.split("-");
    return `${MONTHS_CA[parseInt(month, 10) - 1]} ${year}`;
}

function mdInlineToHtml(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code>$1</code>")
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

function parseChangelog(md) {
    const versions = [];
    let current = null;
    let currentSection = null;

    for (const line of md.split("\n")) {
        const versionMatch = line.match(/^## \[(.+?)\] - (\d{4}-\d{2}-\d{2})/);
        if (versionMatch) {
            if (current) versions.push(current);
            current = { version: versionMatch[1], date: versionMatch[2], milestone: null, sections: [] };
            currentSection = null;
            continue;
        }

        if (!current) continue;

        const sectionMatch = line.match(/^### (.+)/);
        if (sectionMatch) {
            currentSection = { name: sectionMatch[1], items: [] };
            current.sections.push(currentSection);
            continue;
        }

        const itemMatch = line.match(/^- (.+)/);
        if (itemMatch && currentSection) {
            currentSection.items.push(mdInlineToHtml(itemMatch[1]));
            continue;
        }

        // Línies de text lliure entre la capçalera de versió i la primera secció
        if (!currentSection && line.trim() && !line.startsWith("#")) {
            current.milestone = mdInlineToHtml(line.trim());
        }
    }

    if (current) versions.push(current);
    return versions;
}

function generateHtml(versions) {
    const ind = "            "; // 12 espais — indentació dins <div class="changelog">
    return versions.map(v => {
        const dateStr = isoToMonthYear(v.date);
        const lines = [];

        lines.push(`${ind}<div class="version-entry" style="margin-bottom: 25px; position: relative">`);
        lines.push(`${ind}  <div class="version-title" style="font-weight: bold; margin-bottom: 5px">`);
        lines.push(`${ind}    v${v.version}`);
        lines.push(`${ind}    <span class="version-date" style="font-weight: normal; color: #666; font-size: 13px; margin-left: 8px">${dateStr}</span>`);
        lines.push(`${ind}  </div>`);

        if (v.milestone) {
            lines.push(`${ind}  <p style="margin: 4px 0 6px; color: #555; font-size: 0.9em">${v.milestone}</p>`);
        }

        const allItems = v.sections.flatMap(s => s.items);
        if (allItems.length > 0) {
            lines.push(`${ind}  <ul class="version-list" style="margin: 5px 0; padding-left: 20px; color: #444">`);
            for (const item of allItems) {
                lines.push(`${ind}    <li>${item}</li>`);
            }
            lines.push(`${ind}  </ul>`);
        }

        lines.push(`${ind}</div>`);
        return lines.join("\n");
    }).join("\n");
}

// --- Main ---
const changelogPath    = resolve(root, "CHANGELOG.md");
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
