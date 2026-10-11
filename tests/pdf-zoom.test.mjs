/**
 * tests/pdf-zoom.test.mjs
 * computePdfScale: escala del visor PDF = ajust a pàgina × zoom de l'usuari.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { computePdfScale } = require("../sidebar/pdf-zoom.js");

// Pàgina A4 en punts (595×842) en un contenidor de 1000×800.
const PW = 595, PH = 842, AW = 1000, AH = 800;
const FIT = Math.min(AW / PW, AH / PH);

test("computePdfScale - zoom 1 = ajust a pàgina (hi cap sencera)", () => {
    const s = computePdfScale(PW, PH, AW, AH, 1);
    assert.ok(Math.abs(s - FIT) < 1e-9);
    assert.ok(PW * s <= AW && PH * s <= AH, "La pàgina ha de cabre al contenidor");
});

test("computePdfScale - apropar (zoom > 1) AMPLIA més enllà de l'ajust", () => {
    // Regressió (0.9): abans l'ajust es limitava amb l'escala de l'usuari i
    // apropar no feia mai res més que mantenir l'ajust a pàgina.
    const fit = computePdfScale(PW, PH, AW, AH, 1);
    const zoomed = computePdfScale(PW, PH, AW, AH, 2);
    assert.ok(Math.abs(zoomed - 2 * fit) < 1e-9);
    assert.ok(zoomed > fit);
});

test("computePdfScale - allunyar (zoom < 1) fa la pàgina més petita que l'ajust", () => {
    assert.ok(computePdfScale(PW, PH, AW, AH, 0.5) < computePdfScale(PW, PH, AW, AH, 1));
});

test("computePdfScale - una pàgina petita s'amplia fins a omplir (no es queda a escala 1)", () => {
    const s = computePdfScale(100, 100, 1000, 800, 1);
    assert.equal(s, 8);
});

test("computePdfScale - entrades degenerades no donen NaN/Infinity", () => {
    for (const args of [[0, 0, 100, 100, 1], [595, 842, 0, 0, 1], [595, 842, -5, -5, 1], [595, 842, 100, 100, 0]]) {
        const s = computePdfScale(...args);
        assert.ok(Number.isFinite(s) && s > 0, `escala invàlida per a ${args}: ${s}`);
    }
});

// Guarda de cablejat: el visor ha d'usar computePdfScale (no tornar a la
// fórmula antiga) i pdf-zoom.js s'ha de carregar abans de pdf-viewer.js.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const sidebarDir = resolve(dirname(fileURLToPath(import.meta.url)), "../sidebar");

test("pdf-viewer.js usa computePdfScale i el zoom d'usuari ja no és l'escala base", () => {
    const js = readFileSync(resolve(sidebarDir, "pdf-viewer.js"), "utf8");
    assert.match(js, /computePdfScale\(/);
    assert.doesNotMatch(js, /let scale = /, "L'escala base fixa (2.0) limitava l'apropar");
});

test("pdf-viewer.html carrega pdf-zoom.js abans de pdf-viewer.js", () => {
    const html = readFileSync(resolve(sidebarDir, "pdf-viewer.html"), "utf8");
    const zoomAt = html.indexOf('src="pdf-zoom.js"');
    const viewerAt = html.indexOf('src="pdf-viewer.js"');
    assert.ok(zoomAt > -1, "Falta pdf-zoom.js");
    assert.ok(zoomAt < viewerAt, "pdf-zoom.js s'ha de carregar abans");
});
