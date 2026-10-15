/**
 * scripts/web-hero-anim.mjs
 * Regenera web/src/shots/hero.webp ANIMAT: el cursor clica dues cites del resum i l'article les
 * ressalta. Grava fotogrames de l'article i de la barra lateral, els compon damunt la finestra
 * del hero actual (marc del navegador) i els codifica amb ffmpeg (libwebp_anim, 3 voltes).
 *
 * Ús:  npm run dev:chromium && npm run web:hero
 * Env: FFMPEG (executable de ffmpeg amb libwebp_anim; per defecte, el del PATH).
 * Recepta i trampes: docs/LEARNINGS.md, sessió 2026-10-15.
 */
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { SHOTS, SUMMARY, ARTICLE_HTML, startSession, withMetrics, canvasPage } from "./web-captures-lib.mjs";

const HERO = path.join(SHOTS, "hero.webp");
const FRAMES = fs.mkdtempSync(path.join(os.tmpdir(), "resumir-hero-"));
const baseB64 = fs.readFileSync(HERO).toString("base64"); // marc del navegador (1r fotograma)

const s = await startSession({
    articleHtml: ARTICLE_HTML,
    reply: () => SUMMARY,
    articleSize: { width: 1098, height: 1076 },
    sideSize: { width: 500, height: 1076 },
});
try {
    const { art, side, ctx } = s;
    await side.click("#summarizeBtn");
    await side.waitForSelector("#provenance:not(.hidden)", { timeout: 20000 });
    await side.mouse.move(470, 900);
    await side.waitForTimeout(800);
    await art.evaluate(() => window.scrollTo(0, 0));

    const cdpA = await withMetrics(art, ctx);
    const cdpS = await withMetrics(side, ctx);
    const grab = async (m) => (await m.shot("jpeg")).toString("base64");

    const frames = []; // {a, s, cx, cy, dur}
    let lastA = await grab(cdpA), lastS = await grab(cdpS);
    let mouse = { x: 470, y: 900 };
    const push = (dur) => frames.push({ a: lastA, s: lastS, cx: mouse.x, cy: mouse.y, dur });
    push(1000);

    async function moveTo(x, y, steps = 9) {
        const x0 = mouse.x, y0 = mouse.y;
        for (let i = 1; i <= steps; i++) {
            const k = i / steps, e = k * k * (3 - 2 * k);
            mouse = { x: x0 + (x - x0) * e, y: y0 + (y - y0) * e };
            await side.mouse.move(mouse.x, mouse.y);
            lastS = await grab(cdpS);
            push(55);
        }
    }
    async function clickCite(n) {
        const link = side.locator("#content a.quote-jump").nth(n);
        await link.scrollIntoViewIfNeeded();
        // Centre de l'ÚLTIMA línia de l'enllaç: si es parteix en dues, el centre del boundingBox cau al forat
        const r = await link.evaluate((el) => { const rs = el.getClientRects(); const q = rs[rs.length - 1]; return { x: q.x, y: q.y, w: q.width, h: q.height }; });
        await moveTo(r.x + Math.min(r.w - 4, 60), r.y + r.h / 2);
        await side.mouse.down(); await side.waitForTimeout(60); await side.mouse.up();
        lastS = await grab(cdpS);
        const t0 = Date.now();
        let t = t0, prevY = -1, still = 0;
        while (Date.now() - t0 < 2200) { // fotogrames mentre l'article fa scroll i ressalta
            lastA = await grab(cdpA);
            const now = Date.now();
            push(Math.max(40, now - t)); t = now;
            const y = await art.evaluate(() => Math.round(scrollY));
            still = y === prevY ? still + 1 : 0; prevY = y;
            if (still >= 3 && now - t0 > 800) break;
        }
        lastS = await grab(cdpS);
        push(1800);
    }

    await clickCite(1);
    await moveTo(470, 930, 6);
    await clickCite(4);
    await moveTo(470, 930, 6);
    push(900);

    // Composició al navegador: marc actual + article + barra lateral (només on el marc és opac) + cursor
    const cv = await canvasPage(ctx);
    await cv.evaluate(async (b) => { window.__base = await window.__load("data:image/webp;base64," + b); }, baseB64);
    const name = (i) => `f${String(i).padStart(4, "0")}.png`;
    for (let i = 0; i < frames.length; i++) {
        const f = frames[i];
        const png = await cv.evaluate(async ({ a, s: sd, cx, cy }) => {
            const c = document.getElementById("c");
            c.width = 1600; c.height = 1130;
            const g = c.getContext("2d");
            g.drawImage(window.__base, 0, 0);
            g.globalCompositeOperation = "source-atop";
            g.drawImage(await window.__load("data:image/jpeg;base64," + a), 0, 0, 1097, 1075, 1, 54, 1097, 1075);
            g.drawImage(await window.__load("data:image/jpeg;base64," + sd), 1098, 54, 501, 1075);
            g.globalCompositeOperation = "source-over";
            g.save(); g.translate(1098 + cx * 501 / 500, 54 + cy); g.scale(1.5, 1.5);
            g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 16); g.lineTo(4, 12); g.lineTo(7, 19); g.lineTo(10, 18); g.lineTo(7, 11); g.lineTo(12, 11); g.closePath();
            g.fillStyle = "#111"; g.fill(); g.lineWidth = 1.2; g.strokeStyle = "#fff"; g.stroke(); g.restore();
            return c.toDataURL("image/png").split(",")[1];
        }, { a: f.a, s: f.s, cx: f.cx, cy: f.cy });
        fs.writeFileSync(path.join(FRAMES, name(i)), Buffer.from(png, "base64"));
    }
    const last = name(frames.length - 1);
    fs.writeFileSync(path.join(FRAMES, "list.txt"),
        frames.map((f, i) => `file '${name(i)}'\nduration ${(f.dur / 1000).toFixed(3)}`).join("\n") + `\nfile '${last}'\n`);

    const out = path.join(FRAMES, "hero.webp");
    const ff = spawnSync(process.env.FFMPEG || "ffmpeg",
        ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "list.txt",
            "-fps_mode", "vfr", "-c:v", "libwebp_anim", "-quality", "70", "-compression_level", "6", "-loop", "3", out],
        { cwd: FRAMES, stdio: "inherit" });
    if (ff.status !== 0) throw new Error("ffmpeg ha fallat (cal libwebp_anim; defineix FFMPEG si no és al PATH)");
    fs.copyFileSync(out, HERO);
    console.log(`OK: hero.webp animat (${frames.length} fotogrames, ${(fs.statSync(HERO).size / 1024 / 1024).toFixed(1)} MB)`);
} finally {
    await s.close();
    fs.rmSync(FRAMES, { recursive: true, force: true });
}
