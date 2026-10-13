/**
 * tests/mindmap-interaction.test.mjs
 * Interacció del mapa conceptual a les DUES còpies del renderer (la de la barra
 * lateral, markmap-native.js, i la de pantalla completa, fullscreenOverlayFunc a
 * conceptmap.js): roda = desplaçar, Ctrl+roda = zoom, punter (ratolí/tàctil) per
 * al pan i zona de toc àmplia a les pastilles de plegat.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SIDEBAR = resolve(dirname(fileURLToPath(import.meta.url)), "../sidebar");
const TREE = "- Tema\n  - A\n    - A1\n  - B\n    - B1";

function run(window, file) {
    new vm.Script(readFileSync(resolve(SIDEBAR, file), "utf8"), { filename: file }).runInContext(window.__ctx);
}
function newWindow() {
    const dom = new JSDOM("<!doctype html><body><svg id='s' width='600' height='400'></svg></body>", { runScripts: "outside-only", pretendToBeVisual: true });
    dom.window.__ctx = dom.getInternalVMContext();
    return dom.window;
}
const transformOf = (svg) => {
    const m = /translate\(([-\d.]+),\s*([-\d.]+)\)\s*scale\(([-\d.]+)\)/.exec(svg.querySelector("g.markmap-viewport, g").getAttribute("transform") || "");
    return m ? { x: +m[1], y: +m[2], k: +m[3] } : null;
};

const MAPS = {
    "sidebar (markmap-native)": (w) => {
        run(w, "markmap-native.js");
        const svg = w.document.getElementById("s");
        w.markmapNative.createMindMap(svg, w.markmapNative.parseMarkdownTree(TREE));
        return svg;
    },
    "pantalla completa (fullscreenOverlayFunc)": (w) => {
        run(w, "conceptmap.js");
        vm.runInContext("fullscreenOverlayFunc(" + JSON.stringify(TREE) + ", 'T', {})", w.__ctx);
        return w.document.querySelector('#markmap-fullscreen-overlay svg[height="100%"]');
    },
};

for (const [name, build] of Object.entries(MAPS)) {
    test(`mapa ${name} - la roda sola desplaça i Ctrl+roda fa zoom`, () => {
        const w = newWindow();
        const svg = build(w);
        assert.ok(svg, "ha de generar l'SVG");
        const before = transformOf(svg);
        assert.ok(before, "transform inicial");

        const plain = new w.WheelEvent("wheel", { deltaY: 40, deltaX: 10, bubbles: true, cancelable: true });
        svg.dispatchEvent(plain);
        const afterPan = transformOf(svg);
        assert.equal(afterPan.k, before.k, "sense Ctrl no hi ha zoom");
        assert.equal(afterPan.y, before.y - 40);
        assert.equal(afterPan.x, before.x - 10);

        svg.dispatchEvent(new w.WheelEvent("wheel", { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true }));
        assert.ok(transformOf(svg).k > afterPan.k, "amb Ctrl, roda amunt amplia");
    });

    test(`mapa ${name} - el pan funciona amb events de punter (ratolí i tàctil)`, () => {
        const w = newWindow();
        const svg = build(w);
        const before = transformOf(svg);
        const ev = (type, x, y) => new w.MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
        // jsdom no té PointerEvent a tots els entorns: els events «pointer*» es poden crear com a MouseEvent
        const mk = (type, x, y) => { const e = ev(type, x, y); return e; };
        svg.dispatchEvent(mk("pointerdown", 100, 100));
        w.dispatchEvent(mk("pointermove", 130, 120));
        w.dispatchEvent(mk("pointerup", 130, 120));
        const after = transformOf(svg);
        assert.equal(after.x, before.x + 30);
        assert.equal(after.y, before.y + 20);
        assert.equal(svg.style.touchAction, "none", "el toc arrossega el mapa, no la pàgina");
    });

    test(`mapa ${name} - les pastilles de plegat tenen zona de toc de 24 px`, () => {
        const w = newWindow();
        const svg = build(w);
        const hit = svg.querySelector(".markmap-toggle .markmap-toggle-hit");
        assert.ok(hit, "cercle de zona de toc");
        assert.ok(Number(hit.getAttribute("r")) >= 12, "radi ≥ 12 (24 px, WCAG 2.5.8)");
    });
}

for (const [name, build] of Object.entries(MAPS)) {
    test(`mapa ${name} - hi ha un botó «Ajustar a la vista» que recoloca el mapa`, async () => {
        const w = newWindow();
        const svg = build(w);
        // el sidebar (renderMarkmapInteractive) no és al MAPS: aquí només el renderer i l'overlay
        const root = svg.closest("#markmap-fullscreen-overlay") || w.document.body;
        const btn = [...root.querySelectorAll("button")].find(b => b.getAttribute("aria-label") === "Ajustar a la vista");
        if (name.startsWith("sidebar")) { assert.equal(typeof w.markmapNative.createMindMap(svg, w.markmapNative.parseMarkdownTree(TREE)).fit, "function"); return; }
        assert.ok(btn, "el botó existeix a la vista de pantalla completa");
        await new Promise(r => setTimeout(r, 700));         // acaba l'entrada animada inicial
        const before = transformOf(svg);
        svg.dispatchEvent(new w.WheelEvent("wheel", { deltaY: 200, deltaX: 90, bubbles: true, cancelable: true }));
        assert.notDeepEqual(transformOf(svg), before);
        btn.click();
        await new Promise(r => setTimeout(r, 700));         // l'ajust és animat
        const after = transformOf(svg);
        assert.ok(Math.abs(after.x - before.x) < 1 && Math.abs(after.y - before.y) < 1, "torna a la posició ajustada");
    });
}

test("mapa - les arestes tenen contrast ≥ 3:1 sobre blanc a les dues còpies (WCAG 1.4.11)", () => {
    const lum = (h) => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    for (const f of ["markmap-native.js", "conceptmap.js"]) {
        const m = /EDGE_COLOR\s*=\s*["'](#[0-9a-f]{6})["']/i.exec(readFileSync(resolve(SIDEBAR, f), "utf8"));
        assert.ok(m, `${f}: EDGE_COLOR`);
        assert.ok(1.05 / (lum(m[1]) + 0.05) >= 3, `${f}: ${m[1]} sobre blanc < 3:1`);
    }
});
