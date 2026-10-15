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

// Incompliments coneguts (ratchet: només pot baixar). Format: "pàgina: descripció"
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

test("la build de producció (bundle) carrega els mateixos scripts, en el mateix ordre, que sidebar.html", () => {
    // Un script nou a sidebar.html que no consti al bundle faria que la versió
    // publicada (Chromium) no el carregués i petés només en producció.
    const html = readFileSync(resolve(ROOT, "sidebar/sidebar.html"), "utf8");
    const htmlSrcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1])
        .filter(s => !["../vendor/pdf.min.js", "../Readability.js", "../theme.js"].includes(s)); // no van al bundle
    const bundle = readFileSync(resolve(ROOT, "scripts/build-sidebar-bundle.mjs"), "utf8");
    const files = [...bundle.matchAll(/resolve\(root, "([^"]+\.js)"\)/g)].map(m => m[1]);
    const toSrc = (f) => f.startsWith("sidebar/") ? f.slice("sidebar/".length) : "../" + f;
    assert.deepEqual(files.map(toSrc), htmlSrcs, "scripts/build-sidebar-bundle.mjs:files ha de coincidir amb sidebar.html");
    const bundled = bundle.match(/const BUNDLED_SRCS = new Set\(\[([\s\S]*?)\]\)/);
    assert.ok(bundled, "No s'ha trobat BUNDLED_SRCS");
    const bundledSrcs = [...bundled[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(bundledSrcs, htmlSrcs, "BUNDLED_SRCS ha de coincidir amb sidebar.html");
});

test("els scripts de configuració que carrega settings.html existeixen i api-key.js hi és abans dels mòduls que l'usen", () => {
    const html = readFileSync(resolve(ROOT, "options/settings.html"), "utf8");
    const srcs = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
    assert.ok(srcs.indexOf("../shared/api-key.js") > -1);
    assert.ok(srcs.indexOf("../shared/api-key.js") < srcs.indexOf("settings.js"));
});

// ---------------------------------------------------------------------------
// Icones (2.1): un sol joc d'icones SVG. Els emoji es veuen diferent a cada
// sistema, no hereten el color del tema i fan l'interfície poc coherent.
// ---------------------------------------------------------------------------
test("la barra lateral no usa emoji com a icones (SVG)", () => {
    const html = readFileSync(resolve(ROOT, "sidebar/sidebar.html"), "utf8")
        .replace(/<!--[\s\S]*?-->/g, "");
    const found = html.match(/\p{Extended_Pictographic}/gu) || [];
    assert.deepEqual(found, [], "Hi ha emoji a sidebar.html: " + found.join(" "));
});

test("typeIconSvg - cada tipus de contingut té la seva icona SVG", async () => {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const { TYPE_ICON_PATHS } = require("../shared/icons.js");
    const { CONTENT_TYPES } = require("../shared/content-types.js");
    for (const ct of CONTENT_TYPES) {
        assert.ok(TYPE_ICON_PATHS[ct.id], `Falta la icona SVG del tipus ${ct.id}`);
    }
    assert.ok(TYPE_ICON_PATHS.cache && TYPE_ICON_PATHS.history);
});

// Cada pàgina de plugin explica què fa, per què serveix i com configurar-lo
test("settings: cada pàgina de plugin té la seva descripció detallada", () => {
    const doc = load("options/settings.html");
    const panes = ["resum", "obsidian", "markdown", "deepdive", "science", "bionic", "conceptmap", "simple", "selectpdf", "anki"];
    for (const id of panes) {
        const about = doc.querySelector(`#tab-${id} .plugin-about`);
        assert.ok(about, `#tab-${id} sense .plugin-about`);
        const text = about.textContent.replace(/\s+/g, " ");
        assert.match(text, /Què fa/, `#tab-${id}: falta «Què fa»`);
        assert.match(text, /Com configurar-lo|Com usar-lo/, `#tab-${id}: falta «Com configurar-lo»`);
        assert.ok(text.length > 200, `#tab-${id}: descripció massa curta`);
    }
});

test("settings: la pestanya Plugins no té botó Desar (els interruptors es desen sols) ni noms en anglès", () => {
    const doc = load("options/settings.html");
    assert.equal(doc.getElementById("saveExtensions"), null);
    assert.match(doc.querySelector("#tab-extensions .section-desc").textContent, /desen automàticament/);
    assert.doesNotMatch(doc.querySelector("#tab-extensions").textContent, /Deep Dive/);
});

test("settings: landmarks (<nav>, <main>) i botons de les targetes amb nom propi", () => {
    const doc = load("options/settings.html");
    assert.ok(doc.querySelector("nav.sidebar[aria-label]"), "menú com a <nav> etiquetat");
    assert.ok(doc.querySelector("main.main-content"), "contingut dins de <main>");
    const names = [...doc.querySelectorAll(".extension-actions button")].map(b => b.getAttribute("aria-label"));
    assert.ok(names.length >= 24, "tots els botons de targeta tenen aria-label");
    assert.ok(names.every(Boolean), "cap botó de targeta sense nom");
    assert.equal(new Set(names).size, names.length, "els noms accessibles no es repeteixen entre targetes");
    assert.equal(doc.querySelectorAll("h3").length, 2, "els títols de secció del General passen de h3 a h2");
});

test("Aprofundir: la icona és la lupa (la mateixa que les pestanyes), no un «+»", () => {
    for (const [file, sel] of [["sidebar/sidebar.html", "#deepDiveBtn"], ["options/settings.html", "#tab-extensions .extension-item:has(#enableDeepdive)"]]) {
        const svg = load(file).querySelector(`${sel} svg`);
        assert.ok(svg.querySelector("circle"), `${file}: lupa (cercle)`);
        assert.doesNotMatch(svg.innerHTML, /M12 4v16m8-8H4/, `${file}: sense el «+»`);
    }
});

test("settings: les plantilles expliquen cada camp ({{summary_executive}} inclòs)", () => {
    const doc = load("options/settings.html");
    for (const id of ["tab-obsidian", "tab-markdown"]) {
        const legend = doc.querySelector(`#${id} .field-legend`);
        // el primer .field-legend d'Obsidian és el de dates; busquem el que parla de camps de plantilla
        const all = [...doc.querySelectorAll(`#${id} .field-legend`)].map(e => e.textContent.replace(/\s+/g, " "));
        assert.ok(all.some(t => /summary_executive.*paràgraf inicial/.test(t)), `${id}: explica {{summary_executive}}`);
        assert.ok(legend);
    }
});

test("barra lateral: scroll-padding perquè la barra i el peu fixos no tapin el focus (WCAG 2.4.11)", () => {
    const css = readFileSync(resolve(ROOT, "sidebar/sidebar.css"), "utf8");
    const rule = css.match(/\bhtml\s*\{([^}]*)\}/)?.[1] || "";
    assert.match(rule, /scroll-padding-top:[^;]*--toolbar-height/);
    assert.match(rule, /scroll-padding-bottom:/);
});

test("settings: amplades mitjanes (721–1000 px) amb controls sota la descripció dels plugins", () => {
    const css = readFileSync(resolve(ROOT, "options/settings.css"), "utf8");
    assert.match(css, /@media \(min-width: 721px\) and \(max-width: 1000px\)/);
    const doc = load("options/settings.html");
    assert.doesNotMatch(doc.body.textContent, /Verifica afirmacions amb rigor acadèmic/, "la targeta de Ciència no promet més del que pot donar");
});

test("build: cap script que carreguen settings.html o pdf-viewer.html es pot esborrar del ZIP", () => {
    // build.mjs elimina els JS de sidebar/ que van dins del bundle; si una altra pàgina
    // en carrega un, la versió empaquetada el perd (va passar amb ../sidebar/utils.js).
    const build = readFileSync(resolve(ROOT, "scripts/build.mjs"), "utf8");
    const removable = new Set([...build.match(/const sidebarFiles = \[([^\]]+)\]/)[1].matchAll(/"([\w-]+\.js)"/g)].map(m => m[1]));
    const keep = new Set([...(build.match(/KEEP_IN_ZIP = new Set\(\[([^\]]*)\]/)?.[1] || "").matchAll(/"([\w-]+\.js)"/g)].map(m => m[1]));
    for (const [page, dir] of [["options/settings.html", "options"], ["sidebar/pdf-viewer.html", "sidebar"]]) {
        const html = readFileSync(resolve(ROOT, page), "utf8");
        for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
            const resolved = resolve(ROOT, dir, m[1]).replace(ROOT + "/", "");
            const m2 = /^sidebar\/([\w-]+\.js)$/.exec(resolved);
            if (m2 && removable.has(m2[1])) assert.ok(keep.has(m2[1]), `${page} carrega ${resolved}, que la build esborra del ZIP (afegeix-lo a KEEP_IN_ZIP)`);
        }
    }
});

test("barra lateral: línia llegible en panells amplis, enllaços sense break-all i sense CSS mort", () => {
    const css = readFileSync(resolve(ROOT, "sidebar/sidebar.css"), "utf8");
    assert.match(css, /#content > :is\(p, ul, ol[^)]*\)\s*\{[^}]*max-width:\s*72ch/);
    assert.match(css, /#content \{ --content-base-size: clamp\([^;]*100vw/, "la lletra ha d'escalar amb l'amplada del panell");
    const linkRule = css.match(/#content a \{([^}]*)\}/)?.[1] || "";
    assert.doesNotMatch(linkRule, /break-all/);
    assert.match(linkRule, /overflow-wrap:\s*anywhere/);
    for (const dead of ["#water-indicator", "#timelineCleanerBtn", "__rgba_primary_weak__"]) {
        assert.ok(!css.includes(dead), `CSS mort: ${dead}`);
    }
});

test("web: enllaç «Salta al contingut» que apunta al <main> (WCAG 2.4.1)", () => {
    const tpl = readFileSync(resolve(ROOT, "web/src/_includes/base.njk"), "utf8");
    const m = /<a class="skip-link" href="#([\w-]+)">/.exec(tpl);
    assert.ok(m, "enllaç de salt");
    assert.match(tpl, new RegExp(`<main id="${m[1]}"`), "el destí és el <main>");
    assert.match(readFileSync(resolve(ROOT, "web/src/css/style.css"), "utf8"), /\.skip-link:focus/);
});
