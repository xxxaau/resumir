/**
 * tests/quality-contrast.test.mjs
 * Control de qualitat: contrast WCAG AA dels parells de color dels temes.
 *
 * És un RATCHET: els parells que avui fallen consten a KNOWN_FAILURES (amb el
 * seu ratio) i el test exigeix que SEGUEIXIN fallant; així, quan s'arregli un
 * token, el test avisa que cal treure'l de la llista, i cap parell nou pot
 * empitjorar sense fer fallar la suite. Objectiu: llista buida (Fase C del pla).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { contrast, readThemes } from "./helpers/contrast.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// [text, background, mínim]: 4.5 text normal, 3 components d'UI/text gran
const SIDEBAR_PAIRS = [
    ["--text-color",   "--bg-color",     4.5],
    ["--text-muted",   "--bg-color",     4.5],
    ["--footer-text",  "--footer-bg",    4.5],
    ["--primary-color","--bg-color",     4.5],
    ["--primary-text", "--primary-color",4.5],
    ["--error-text",   "--error-bg",     4.5],
];
const SETTINGS_PAIRS = [
    ["--text-color", "--bg-color",     4.5],
    ["--text-muted", "--bg-color",     4.5],
    ["--text-muted", "--sidebar-bg",   4.5],
    ["--text-muted", "--input-bg",     4.5],
    ["--text-color", "--input-bg",     4.5],
];

const SURFACES = [
    { name: "sidebar",  css: "sidebar/sidebar.css",   pairs: SIDEBAR_PAIRS },
    { name: "settings", css: "options/settings.css",  pairs: SETTINGS_PAIRS },
];

// Fallades conegudes (mesurades; vegeu docs/PLA-UI-UX.md, Nivell 1). Clau: superfície/tema/text/fons
const KNOWN_FAILURES = new Set([
    "sidebar/solarized/--text-muted/--bg-color",
    "sidebar/solarized/--footer-text/--footer-bg",
    "sidebar/solarized/--primary-color/--bg-color",
    "sidebar/solarized/--primary-text/--primary-color",
    "sidebar/light/--footer-text/--footer-bg",
    "sidebar/soft-gray/--footer-text/--footer-bg",
    "sidebar/dark/--error-text/--error-bg",
    "settings/solarized/--text-muted/--bg-color",
    "settings/solarized/--text-muted/--sidebar-bg",
    "settings/solarized/--text-muted/--input-bg",
    "settings/solarized/--text-color/--input-bg",
    "settings/soft-gray/--text-muted/--sidebar-bg",
    "settings/soft-gray/--text-muted/--input-bg",
]);

for (const { name, css, pairs } of SURFACES) {
    const themes = readThemes(resolve(ROOT, css));
    test(`${name}: es llegeixen els 4 temes`, () => {
        assert.deepEqual(Object.keys(themes).sort(), ["dark", "light", "soft-gray", "solarized"]);
    });
    for (const [theme, tokens] of Object.entries(themes)) {
        for (const [fg, bg, min] of pairs) {
            const key = `${name}/${theme}/${fg}/${bg}`;
            const a = tokens[fg], b = tokens[bg];
            test(`contrast ${key}`, () => {
                assert.ok(/^#[0-9a-f]{3,6}$/i.test(a || "") && /^#[0-9a-f]{3,6}$/i.test(b || ""),
                    `tokens no hexadecimals: ${fg}=${a} ${bg}=${b}`);
                const ratio = contrast(a, b);
                if (KNOWN_FAILURES.has(key)) {
                    assert.ok(ratio < min, `${key} ja passa (${ratio.toFixed(2)}:1): treu-lo de KNOWN_FAILURES`);
                } else {
                    assert.ok(ratio >= min, `${key} = ${ratio.toFixed(2)}:1 < ${min}:1 (${a} sobre ${b})`);
                }
            });
        }
    }
}
