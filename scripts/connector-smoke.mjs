#!/usr/bin/env node
/**
 * connector-smoke.mjs — canari EN VIU dels connectors externs.
 * Navega a llocs reals amb Playwright i executa els MATEIXOS extractors que
 * producció (sidebar/extractors.js). Informatiu: SEMPRE exit 0 (el flakiness
 * de tercers no ha de bloquejar un release).
 *
 *   npm run smoke:connectors
 *
 * URLs editables al constant URLS. Twitter/LinkedIn poden retornar WARN
 * (DOM degradat a automatització — comportament esperat).
 */
import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const X = require("../sidebar/extractors.js");

// URLs de prova — editables. Públiques i sense login.
// Twitter/LinkedIn sovint retornen WARN (DOM degradat a bots) → és el comportament esperat.
const URLS = {
  hackernews: "https://news.ycombinator.com/item?id=48605561",
  youtube:    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  twitter:    "https://x.com/Interior/status/1606867392455024640",   // espera WARN (DOM degradat)
  linkedin:   "https://www.linkedin.com/posts/aifactory-catalunyaia2030-digitalcatalliance-share-7473650236285042690-lFJB/", // espera WARN (login requerit)
  article:    "https://lmao.center/blog/wiggle-accidents/",
};

const out = [];
const log = (name, status, detail) => out.push({ name, status, detail });

// Guard exterior: captura errors de llançament de Playwright (browsers no instal·lats, etc.)
let browser = null;
try {
  browser = await chromium.launch();
  const ctx = await browser.newContext();

  // Hacker News
  try {
    const page = await ctx.newPage();
    await page.goto(URLS.hackernews, { waitUntil: "domcontentloaded", timeout: 20000 });
    const r = await page.evaluate(X.extractHackerNewsFromDOM);
    const ncoms = (r.comments.match(/\n- |^- /g) || []).length;
    if (r.title && ncoms > 0) log("Hacker News", "PASS", `títol + ${ncoms} comentaris`);
    else log("Hacker News", "WARN", "selectors no han trobat títol/comentaris (rate-limit?)");
    await page.close();
  } catch (e) { log("Hacker News", "WARN", e.message); }

  // YouTube
  try {
    const page = await ctx.newPage();
    await page.goto(URLS.youtube, { waitUntil: "domcontentloaded", timeout: 20000 });
    const meta = await page.evaluate(X.readYoutubeCaptionMeta);
    if (meta.hasTracks || (meta.prerenderedText && meta.prerenderedText.length > 0))
      log("YouTube", "PASS", `tracks=${meta.tracks?.length ?? 0}`);
    else log("YouTube", "WARN", "cap pista ni transcripció pre-renderitzada");
    await page.close();
  } catch (e) { log("YouTube", "WARN", e.message); }

  // Twitter/X (best-effort: DOM degradat a bots → OG és l'esperat)
  try {
    const page = await ctx.newPage();
    await page.goto(URLS.twitter, { waitUntil: "domcontentloaded", timeout: 20000 });
    const scraped = await page.evaluate(X.scrapeTwitterTweets);
    const og = await page.evaluate(X.extractTwitterOG);
    if (scraped) log("Twitter/X", "PASS", "tweets via DOM");
    else if (og) log("Twitter/X", "WARN", "només OG (DOM degradat a automatització)");
    else log("Twitter/X", "WARN", "ni DOM ni OG");
    await page.close();
  } catch (e) { log("Twitter/X", "WARN", e.message); }

  // LinkedIn (links públics → nivell públic o OG)
  try {
    const page = await ctx.newPage();
    await page.goto(URLS.linkedin, { waitUntil: "domcontentloaded", timeout: 20000 });
    const text = await page.evaluate(X.extractLinkedInPost);
    if (text && text.length > 30) log("LinkedIn", "PASS", `${text.length} caràcters`);
    else log("LinkedIn", "WARN", "no s'ha extret el post públic");
    await page.close();
  } catch (e) { log("LinkedIn", "WARN", e.message); }

  // Article genèric (Readability)
  try {
    const page = await ctx.newPage();
    await page.goto(URLS.article, { waitUntil: "domcontentloaded", timeout: 20000 });
    const text = await page.evaluate(X.extractWithReadability);
    if (text && text.length > 100) log("Article", "PASS", `${text.length} caràcters`);
    else log("Article", "WARN", "Readability ha extret <100 caràcters");
    await page.close();
  } catch (e) { log("Article", "WARN", e.message); }

} catch (e) {
  // Error de llançament del navegador (browsers no instal·lats, xarxa, etc.)
  log("Playwright", "WARN", `no s'ha pogut arrencar el navegador: ${e.message}`);
} finally {
  // Tanca el browser si s'havia obert
  if (browser) {
    try { await browser.close(); } catch (_) { /* ignora errors de tancament */ }
  }
}

const icon = { PASS: "✅", WARN: "⚠️ ", SKIP: "⏭️ " };
console.log("\n══════════════════════════════════════════");
console.log("  Canari en viu — Connectors externs");
console.log("══════════════════════════════════════════\n");
for (const r of out) console.log(`  ${icon[r.status]} ${r.name.padEnd(14)} ${r.detail}`);
console.log("\n  (informatiu — NO bloqueja el release)\n");
process.exit(0);
