/**
 * El visor PDF té una paleta fosca fixa (com qualsevol visor de PDF) que no passa
 * per quality-contrast: aquí s'exigeix AA als seus parells text/fons.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { contrast } from "./helpers/contrast.mjs";

const css = readFileSync(new URL("../sidebar/pdf-viewer.html", import.meta.url), "utf8").match(/<style>([\s\S]*?)<\/style>/)[1];

function prop(selector, name) {
    const esc = selector.replace(/[.*+?^${}()|[\]\\#]/g, "\\$&");
    const rule = new RegExp(`(?:^|[\\s,}])${esc}\\s*\\{([^}]*)\\}`, "m").exec(css);
    assert.ok(rule, `no trobo la regla «${selector}»`);
    const m = new RegExp(`(?:^|[;\\s])${name}:\\s*(#[0-9a-fA-F]{3,6})`).exec(rule[1]);
    assert.ok(m, `«${selector}» no defineix ${name}`);
    const h = m[1].slice(1);
    return "#" + (h.length === 3 ? [...h].map(c => c + c).join("") : h);
}

const PAIRS = [
    ["html, body", "color", "html, body", "background"],
    ["#header .title", null, "#header", "background"],
    ["#header .close-btn", "color", "#header", "background"],
    ["#header .close-btn:hover", "color", "#header .close-btn:hover", "background"],
    ["#footer button", "color", "#footer button", "background"],
    ["#footer button:hover", null, "#footer button:hover", "background"],
    ["#footer .page-input", "color", "#footer .page-input", "background"],
    ["#loading", "color", "html, body", "background"],
    ["#error", "color", "html, body", "background"],
];

for (const [fgSel, fgProp, bgSel, bgProp] of PAIRS) {
    test(`visor PDF: contrast AA de «${fgSel}»`, () => {
        const fg = fgProp ? prop(fgSel, fgProp) : prop("html, body", "color");
        const bg = prop(bgSel, bgProp);
        const ratio = contrast(fg, bg);
        assert.ok(ratio >= 4.5, `${fg} sobre ${bg}: ${ratio.toFixed(2)} (<4.5)`);
    });
}
