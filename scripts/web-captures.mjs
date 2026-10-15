/**
 * scripts/web-captures.mjs
 * Regenera mapa.webp i og.jpg de web/src/shots/ amb l'extensió real. La barra lateral
 * es captura a 500px perquè la barra d'eines quedi en UNA sola fila (el script falla si no).
 * hero.webp (animat) el genera web-hero-anim.mjs.
 *
 * Ús:  npm run dev:chromium && npm run web:captures
 * Recepta i trampes: docs/LEARNINGS.md, sessió 2026-10-15.
 */
import path from "node:path";
import fs from "node:fs";
import { SHOTS, SUMMARY, ARTICLE_HTML, startSession, withMetrics, assertToolbarOneLine, canvasPage } from "./web-captures-lib.mjs";

const EXPLAIN = "Oblidem molt perquè el cervell només guarda el que sembla útil. Si vols recordar alguna cosa, no la rellegeixis: intenta dir-la de memòria i repassa-la uns quants dies després.";
const MAP = `- Per què oblidem el que llegim
  - La corba de l'oblit
    - Ebbinghaus, 1885
    - Pèrdua ràpida al principi
    - Després s'alenteix
  - Rellegir no és recordar
    - Falsa sensació de domini
    - Efecte del test
  - Repetició espaiada
    - Repassos en dies diferents
    - Anki automatitza el calendari
  - Tres hàbits
    - Explicar-ho amb paraules teves
    - Preguntes per tornar-hi
    - Connectar amb el que ja saps`;

let calls = 0;
const s = await startSession({
    articleHtml: ARTICLE_HTML,
    reply: (prompt) => (prompt.includes("MAPA CONCEPTUAL") ? MAP : (++calls === 1 ? SUMMARY : EXPLAIN)),
    articleSize: { width: 1098, height: 1076 },
    sideSize: { width: 500, height: 738 },
});
try {
    const { side, ctx } = s;
    const m = await withMetrics(side, ctx);
    await m.set(500, 738, 840 / 500); // el mapa es calcula ja a la mida final

    await side.click("#summarizeBtn");
    await side.waitForSelector("#provenance:not(.hidden)", { timeout: 20000 });
    await side.click("#explainSimpleBtn");
    await side.waitForFunction(() => document.querySelectorAll("#type-tabs .type-tab").length >= 2, null, { timeout: 20000 });
    await side.waitForTimeout(800);
    await side.click("#conceptMapBtn");
    await side.waitForSelector("#content svg g.markmap-viewport", { timeout: 20000 });
    await side.waitForFunction(() => document.querySelectorAll("#type-tabs .type-tab").length >= 3, null, { timeout: 20000 });
    await side.waitForTimeout(1200);

    // Desplega-ho tot, reajusta a la vista i allunya un pas perquè els controls no tapin cap node
    await side.locator('button[aria-label="Desplegar / plegar tot"]').click();
    await side.waitForTimeout(600);
    await side.locator('button[aria-label="Ajustar a la vista"]').click();
    await side.waitForTimeout(500);
    await side.locator('button[aria-label="Reduir"]').click();
    await side.waitForTimeout(900);
    await assertToolbarOneLine(side, "mapa");
    const mapPng = await m.shot();

    // Pestanya «Resum» per a la targeta d'og.jpg
    await side.locator("#type-tabs .type-tab").first().click();
    await side.waitForTimeout(800);
    await side.evaluate(() => window.scrollTo(0, 0));
    await m.set(500, 680, 2);
    await assertToolbarOneLine(side, "og");
    const ogPng = await m.shot();

    const cv = await canvasPage(ctx);
    const out = await cv.evaluate(async ({ map, og, oldOg }) => {
        const mk = (w, h) => { const c = document.getElementById("c"); c.width = w; c.height = h; return c.getContext("2d"); };
        const mi = await window.__load("data:image/png;base64," + map);
        let g = mk(mi.width, mi.height);
        g.drawImage(mi, 0, 0);
        const mapa = g.canvas.toDataURL("image/webp", 0.92);
        // og: es redibuixa només la targeta de la dreta damunt l'og actual
        const oo = await window.__load("data:image/jpeg;base64," + oldOg), oi = await window.__load("data:image/png;base64," + og);
        g = mk(oo.width, oo.height);
        g.drawImage(oo, 0, 0);
        g.save(); g.beginPath(); g.roundRect(721, 61, 418, 700, 19); g.clip();
        g.drawImage(oi, 721, 61, 418, 418 * oi.height / oi.width); g.restore();
        return { mapa, og: g.canvas.toDataURL("image/jpeg", 0.92) };
    }, { map: mapPng.toString("base64"), og: ogPng.toString("base64"), oldOg: fs.readFileSync(path.join(SHOTS, "og.jpg")).toString("base64") });

    const write = (name, data) => fs.writeFileSync(path.join(SHOTS, name), Buffer.from(data.split(",")[1], "base64"));
    write("mapa.webp", out.mapa);
    write("og.jpg", out.og);
    console.log("OK: mapa.webp i og.jpg regenerats a web/src/shots/");
} finally {
    await s.close();
}
