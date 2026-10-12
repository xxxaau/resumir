/**
 * tests/quality-colors.test.mjs
 * Control de qualitat: colors fixos fora dels tokens del tema. Un color
 * hexadecimal o rgba(0,0,0,…) escrit a mà no s'adapta als 4 temes (i falla
 * contrast en algun). RATCHET: màxim de cops per fitxer = recompte actual;
 * no pot créixer, i quan baixa cal abaixar-lo aquí. Objectiu: 0.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Colors que NO s'han d'escriure a mà fora dels blocs de tema (tenen token)
const BANNED = [
    ["#28a745", "usa var(--success)"],
    ["#666",    "usa var(--text-muted)"],
    ["#0060df", "usa var(--button-color) / var(--primary-color)"],
    ["#ccc",    "usa var(--toggle-off)"],
    ["#f0c040", "usa var(--star-on)"],
];

// [fitxer, color] → màxim actual (el que encara no s'ha migrat)
const CEILING = {
    "options/settings.css|#666": 0,
    "options/settings.css|#0060df": 1,
    "options/settings.css|#ccc": 0,
};

const FILES = ["sidebar/sidebar.css", "sidebar/ui.js", "sidebar/summary.js", "sidebar/sidebar.js",
    "options/settings.css", "options/settings-models.js", "options/settings-options.js"];

function stripThemeBlocksAndComments(file, text) {
    let t = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    if (file.endsWith(".css")) {
        // Els blocs de tema (:root / [data-actual-theme="x"] amb tokens) SÍ poden tenir hex
        t = t.replace(/(^|\n)\s*(:root|\[data-actual-theme="[\w-]+"\])\s*\{[^}]*\}/g, "$1");
    }
    return t;
}

for (const file of FILES) {
    const text = stripThemeBlocksAndComments(file, readFileSync(resolve(ROOT, file), "utf8"));
    for (const [color, advice] of BANNED) {
        const n = text.split(color).length - 1;
        const max = CEILING[`${file}|${color}`] ?? 0;
        test(`${file}: «${color}» fora de tokens no augmenta (${advice})`, () => {
            assert.ok(n <= max, `${file} té ${n} cops ${color} (màxim ${max}): ${advice}`);
            assert.ok(n >= max, `${file}: «${color}» ha baixat a ${n}: abaixa el màxim a ${n} a tests/quality-colors.test.mjs`);
        });
    }
}

// Cada tema declara `color-scheme` (si no, selects, barres de desplaçament i
// caselles natives es queden en clar dins del tema fosc).
for (const [file, schemes] of [["sidebar/sidebar.css", null], ["options/settings.css", null]]) {
    const css = readFileSync(resolve(ROOT, file), "utf8");
    for (const [theme, expected] of [["light", "light"], ["dark", "dark"], ["solarized", "light"], ["soft-gray", "light"]]) {
        test(`${file}: el tema ${theme} declara color-scheme: ${expected}`, () => {
            const sel = theme === "light" ? ":root" : `[data-actual-theme="${theme}"]`;
            const m = css.match(new RegExp(`(?:^|\\n)${sel.replace(/[[\]"]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
            assert.ok(m, `No s'ha trobat el bloc ${sel}`);
            assert.match(m[1], new RegExp(`color-scheme:\\s*${expected}\\s*;`));
        });
    }
    void schemes;
}

test("sidebar.css: els CTA usen .btn-primary (estilat), no una classe sense regla", () => {
    const css = readFileSync(resolve(ROOT, "sidebar/sidebar.css"), "utf8");
    assert.match(css, /\n\.btn-primary\s*\{/);
    const ui = readFileSync(resolve(ROOT, "sidebar/ui.js"), "utf8");
    assert.match(ui, /className = "btn-primary api-key-btn-primary"/);
});
