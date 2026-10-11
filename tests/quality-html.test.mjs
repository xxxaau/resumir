/**
 * tests/quality-html.test.mjs
 * Control de qualitat estàtic de les pàgines HTML de l'extensió (sidebar,
 * configuració, visor PDF): ids únics, noms accessibles, scripts existents,
 * sense handlers inline (CSP) i idioma declarat.
 *
 * Els incompliments ja coneguts consten a KNOWN_* i el test exigeix que
 * continuïn existint (ratchet): si en corregeixes un, treu-lo de la llista.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = [
    { name: "sidebar",    file: "sidebar/sidebar.html" },
    { name: "settings",   file: "options/settings.html" },
    { name: "pdf-viewer", file: "sidebar/pdf-viewer.html" },
];

function load(file) {
    return new JSDOM(readFileSync(resolve(ROOT, file), "utf8")).window.document;
}

// Nom accessible aproximat: aria-label, aria-labelledby, text visible o title
function accessibleName(el, doc) {
    const al = el.getAttribute("aria-label");
    if (al && al.trim()) return al.trim();
    const lb = el.getAttribute("aria-labelledby");
    if (lb) {
        const t = lb.split(/\s+/).map(id => doc.getElementById(id)?.textContent || "").join(" ").trim();
        if (t) return t;
    }
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (text) return text;
    return (el.getAttribute("title") || "").trim();
}

// Incompliments coneguts (vegeu docs/PLA-UI-UX.md). Format: "pàgina: descripció"
const KNOWN_UNNAMED_BUTTONS = new Set([
    // (cap de moment: tots tenen aria-label o title)
]);

for (const { name, file } of PAGES) {
    const doc = load(file);

    test(`${name}: <html lang> declarat`, () => {
        assert.ok(doc.documentElement.getAttribute("lang"), "Falta l'atribut lang a <html>");
    });

    test(`${name}: ids únics`, () => {
        const seen = new Map();
        for (const el of doc.querySelectorAll("[id]")) {
            seen.set(el.id, (seen.get(el.id) || 0) + 1);
        }
        const dups = [...seen].filter(([, n]) => n > 1).map(([id]) => id);
        assert.deepEqual(dups, [], `ids duplicats: ${dups.join(", ")}`);
    });

    test(`${name}: tots els <button> tenen nom accessible`, () => {
        const unnamed = [...doc.querySelectorAll("button")]
            .filter(b => !accessibleName(b, doc))
            .map(b => b.id || b.className || b.outerHTML.slice(0, 60))
            .filter(d => !KNOWN_UNNAMED_BUTTONS.has(`${name}: ${d}`));
        assert.deepEqual(unnamed, [], `botons sense nom accessible: ${unnamed.join(" | ")}`);
    });

    test(`${name}: <input>/<select>/<textarea> tenen etiqueta`, () => {
        const missing = [];
        for (const el of doc.querySelectorAll("input, select, textarea")) {
            if (["hidden", "button", "submit"].includes(el.getAttribute("type"))) continue;
            if (el.hasAttribute("hidden")) continue; // no exposat a les tecnologies de suport (p. ex. el <input type=file> amagat)
            const hasLabel = el.id && doc.querySelector(`label[for="${el.id}"]`);
            const wrapped = el.closest("label");
            if (!hasLabel && !wrapped && !accessibleName(el, doc) && !el.getAttribute("placeholder")) {
                missing.push(el.id || el.name || el.outerHTML.slice(0, 60));
            }
        }
        assert.deepEqual(missing, [], `camps sense etiqueta: ${missing.join(" | ")}`);
    });

    test(`${name}: sense handlers inline (onclick…) ni javascript: (CSP)`, () => {
        const html = readFileSync(resolve(ROOT, file), "utf8");
        assert.doesNotMatch(html, /\son[a-z]+\s*=\s*["']/i, "handler inline trobat");
        assert.doesNotMatch(html, /href\s*=\s*["']javascript:/i, "href javascript: trobat");
    });

    test(`${name}: tots els <script src> i <link href> locals existeixen`, () => {
        const base = dirname(resolve(ROOT, file));
        const refs = [
            ...[...doc.querySelectorAll("script[src]")].map(s => s.getAttribute("src")),
            ...[...doc.querySelectorAll('link[rel="stylesheet"][href]')].map(l => l.getAttribute("href")),
        ].filter(r => !/^(https?:)?\/\//.test(r));
        const missing = refs.filter(r => !existsSync(resolve(base, r)));
        assert.deepEqual(missing, [], `recursos que no existeixen: ${missing.join(", ")}`);
    });

    test(`${name}: les imatges tenen alt i els SVG decoratius, aria-hidden`, () => {
        const noAlt = [...doc.querySelectorAll("img")].filter(i => !i.hasAttribute("alt")).map(i => i.src);
        assert.deepEqual(noAlt, [], `<img> sense alt: ${noAlt.join(", ")}`);
    });
}

test("sidebar: els scripts de sidebar.html cobreixen tots els fitxers carregats per la build", () => {
    // build.mjs enumera sidebarFiles; sidebar.html ha de carregar els mateixos
    // (més els d'ext/shared/vendor) perquè dev i build no divergeixin.
    const html = readFileSync(resolve(ROOT, "sidebar/sidebar.html"), "utf8");
    const inHtml = [...html.matchAll(/<script src="([a-z-]+\.js)"><\/script>/g)].map(m => m[1]);
    const build = readFileSync(resolve(ROOT, "scripts/build.mjs"), "utf8");
    const m = build.match(/const sidebarFiles = \[([^\]]+)\]/);
    assert.ok(m, "No s'ha trobat sidebarFiles a build.mjs");
    const inBuild = [...m[1].matchAll(/"([\w-]+\.js)"/g)].map(x => x[1]);
    assert.deepEqual(inBuild, inHtml, "L'ordre/llista de scripts de la build ha de coincidir amb sidebar.html");
});
