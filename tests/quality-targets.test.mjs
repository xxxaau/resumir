/**
 * tests/quality-targets.test.mjs
 * Control de qualitat: mida mínima dels objectius tàctils (WCAG 2.5.8, 24×24 px)
 * dels controls petits. jsdom no calcula maquetació, així que es comprova que
 * la regla CSS declara min-width/min-height >= 24px.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function ruleBody(css, selector) {
    const esc = selector.replace(/[.*+?^${}()|[\]\\#]/g, "\\$&");
    const m = css.match(new RegExp(`(?:^|\\n)${esc}\\s*\\{([^}]*)\\}`));
    return m ? m[1] : null;
}
function px(body, prop) {
    const m = body && body.match(new RegExp(`${prop}\\s*:\\s*(\\d+(?:\\.\\d+)?)px`));
    return m ? parseFloat(m[1]) : 0;
}

const CONTROLS = [
    ["sidebar/sidebar.css",  ".footer-btn",   ["min-width", "min-height"]],
    ["sidebar/sidebar.css",  "#model-select", ["min-height"]],
    ["options/settings.css", ".model-star",   ["min-width", "min-height"]],
];

for (const [file, selector, props] of CONTROLS) {
    const css = readFileSync(resolve(ROOT, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const prop of props) {
        test(`${file}: ${selector} declara ${prop} >= 24px`, () => {
            const body = ruleBody(css, selector);
            assert.ok(body, `No s'ha trobat la regla ${selector}`);
            assert.ok(px(body, prop) >= 24, `${selector} ${prop} = ${px(body, prop)}px (< 24px)`);
        });
    }
}

test("sidebar.css: la barra d'eines és fixa i baixa de línia (no surt de pantalla a amplades estretes)", () => {
    const css = readFileSync(resolve(ROOT, "sidebar/sidebar.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const body = ruleBody(css, ".toolbar");
    assert.ok(body, "No s'ha trobat .toolbar");
    assert.match(body, /flex-wrap:\s*wrap/);
    assert.match(body, /position:\s*sticky/);
    assert.match(body, /top:\s*0/);
});

// ---------------------------------------------------------------------------
// Configuració responsiva (2.5): per sota de 720 px la navegació passa a barra
// horitzontal i el contingut deixa de quedar en columnes d'una paraula.
// ---------------------------------------------------------------------------
test("settings.css: hi ha un breakpoint responsiu que converteix el menú lateral en barra horitzontal", () => {
    const css = readFileSync(resolve(ROOT, "options/settings.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const m = css.match(/@media\s*\(max-width:\s*720px\)\s*\{([\s\S]*)\}\s*$/);
    assert.ok(m, "Falta el @media (max-width: 720px) a la fi de settings.css");
    const media = m[1];
    assert.match(media, /body\s*\{[^}]*flex-direction:\s*column/);
    assert.match(media, /\.sidebar\s*\{[^}]*width:\s*100%[^}]*flex-direction:\s*row/s);
    assert.match(media, /\.sidebar\s*\{[^}]*overflow-x:\s*auto/s);
    assert.match(media, /\.extension-item\s*\{[^}]*flex-wrap:\s*wrap/s);
    assert.match(media, /\.main-content\s*\{[^}]*padding:\s*24px 16px/s);
});

test("settings.css: el desplegable de models mai és més ample que el seu contenidor", () => {
    const css = readFileSync(resolve(ROOT, "options/settings.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const body = ruleBody(css, "#modelsList");
    assert.match(body, /width:\s*min\(400px,\s*100%\)/);
});
