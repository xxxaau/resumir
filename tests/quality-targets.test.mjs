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
