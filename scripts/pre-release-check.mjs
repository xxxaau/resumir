#!/usr/bin/env node
/**
 * pre-release-check.mjs
 * Automatitza les comprovacions trivials de l'auditoria pre-release.
 * Cobreix: manifests, codi estàtic, seguretat i tests.
 *
 * Usage:
 *   node scripts/pre-release-check.mjs
 *   npm run prerelease
 *
 * Exit code 0 → tot OK | Exit code 1 → hi ha errors
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, dirname, relative, extname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ─── Helpers ────────────────────────────────────────────────────────────────

function readJson(file) {
    const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
}

function readText(file) {
    return readFileSync(file, "utf8");
}

/** Recull recursivament fitxers que compleixen el predicat */
function collectFiles(dir, predicate, files = []) {
    for (const entry of readdirSync(dir)) {
        const full = resolve(dir, entry);
        const rel  = relative(root, full);
        if (statSync(full).isDirectory()) {
            if (entry === "node_modules" || entry === ".git") continue;
            collectFiles(full, predicate, files);
        } else if (predicate(full, rel)) {
            files.push(full);
        }
    }
    return files;
}

/** Fitxers JS de producció (exclou vendor i bundles generats) */
const JS_FILES = collectFiles(root, (full, rel) =>
    extname(full) === ".js" &&
    !rel.includes("Readability") &&
    !rel.includes("defuddle") &&
    !full.endsWith(".bundle.js") &&
    !rel.startsWith("node_modules")
);

/** Fitxers HTML propis */
const HTML_FILES = collectFiles(root, (full, rel) =>
    extname(full) === ".html" &&
    !rel.startsWith("node_modules")
);

// ─── Sistema de resultats ────────────────────────────────────────────────────

const results = [];

function pass(label)               { results.push({ ok: true,  label }); }
function fail(label, details = []) { results.push({ ok: false, label, details }); }

function check(label, fn) {
    try { fn(); }
    catch (err) { fail(label, [err.message]); }
}

// ─── CHECKS ─────────────────────────────────────────────────────────────────

// 1. Manifests: versió sincronitzada i name sense "(DEV)"
check("Manifests: name sense '(DEV)'", () => {
    const base   = readJson(resolve(root, "manifest.base.json"));
    if (base.name.includes("(DEV)")) throw new Error(`manifest.base.json name conté '(DEV)': "${base.name}"`);
    pass("Manifests: name sense '(DEV)'");
});

check("Manifests: versió sincronitzada (package.json = manifest.json = manifest.chromium.json)", () => {
    const pkg  = readJson(resolve(root, "package.json")).version;
    const ff   = readJson(resolve(root, "manifest.json")).version;
    const cr   = readJson(resolve(root, "manifest.chromium.json")).version;
    const errs = [];
    if (pkg !== ff)  errs.push(`package.json (${pkg}) ≠ manifest.json (${ff})`);
    if (pkg !== cr)  errs.push(`package.json (${pkg}) ≠ manifest.chromium.json (${cr})`);
    if (errs.length) throw new Error(errs.join(" | "));
    pass("Manifests: versió sincronitzada (package.json = manifest.json = manifest.chromium.json)");
});

check("Manifests: Firefox té 'sidebar_action' i 'menus'", () => {
    const ff = readJson(resolve(root, "manifest.json"));
    const errs = [];
    if (!ff.sidebar_action)                         errs.push("falta 'sidebar_action'");
    if (!ff.permissions?.includes("menus"))         errs.push("falta permís 'menus'");
    if (errs.length) throw new Error(errs.join(", "));
    pass("Manifests: Firefox té 'sidebar_action' i 'menus'");
});

check("Manifests: Chromium té 'side_panel' i 'contextMenus'", () => {
    const cr = readJson(resolve(root, "manifest.chromium.json"));
    const errs = [];
    if (!cr.side_panel)                                      errs.push("falta 'side_panel'");
    if (!cr.permissions?.includes("contextMenus"))           errs.push("falta permís 'contextMenus'");
    if (cr.permissions?.includes("menus"))                   errs.push("conté 'menus' (hauria de ser 'contextMenus')");
    if (errs.length) throw new Error(errs.join(", "));
    pass("Manifests: Chromium té 'side_panel' i 'contextMenus'");
});

// 2. AMO: no eval() ni new Function()
check("AMO: no 'eval()' ni 'new Function('", () => {
    const hits = [];
    for (const f of JS_FILES) {
        const src = readText(f);
        const lines = src.split("\n");
        lines.forEach((line, i) => {
            if (/\beval\s*\(/.test(line) || /new\s+Function\s*\(/.test(line)) {
                hits.push(`${relative(root, f)}:${i + 1} → ${line.trim()}`);
            }
        });
    }
    if (hits.length) throw new Error(`\n  ${hits.join("\n  ")}`);
    pass("AMO: no 'eval()' ni 'new Function('");
});

// 3. Qualitat: no console.log en producció
check("Qualitat: no 'console.log(' en JS de producció", () => {
    const hits = [];
    for (const f of JS_FILES) {
        const src = readText(f);
        const lines = src.split("\n");
        lines.forEach((line, i) => {
            if (/console\.log\s*\(/.test(line) && !/^\s*\/\//.test(line)) {
                hits.push(`${relative(root, f)}:${i + 1} → ${line.trim()}`);
            }
        });
    }
    if (hits.length) throw new Error(`\n  ${hits.join("\n  ")}`);
    pass("Qualitat: no 'console.log(' en JS de producció");
});

// 4. Seguretat: no secrets (patrons de claus API de Google)
check("Seguretat: no secrets al codi font (patró AIza...)", () => {
    const SECRET_RE = /AIza[A-Za-z0-9_-]{35}/;
    const hits = [];
    for (const f of JS_FILES) {
        const src = readText(f);
        if (SECRET_RE.test(src)) hits.push(relative(root, f));
    }
    if (hits.length) throw new Error(`Possible clau API trobada a: ${hits.join(", ")}`);
    pass("Seguretat: no secrets al codi font (patró AIza...)");
});

// 5. Seguretat: API key via header, no via query string
check("Seguretat: API key via header (no ?key= a URLs de fetch)", () => {
    const hits = [];
    for (const f of JS_FILES) {
        const src = readText(f);
        const lines = src.split("\n");
        lines.forEach((line, i) => {
            if (/fetch\s*\(.*[?&]key=/.test(line)) {
                hits.push(`${relative(root, f)}:${i + 1} → ${line.trim()}`);
            }
        });
    }
    if (hits.length) throw new Error(`\n  ${hits.join("\n  ")}`);
    pass("Seguretat: API key via header (no ?key= a URLs de fetch)");
});

// 6. Seguretat: innerHTML no usada amb expressions dinàmiques
check("Seguretat: no 'innerHTML' amb concatenació dinàmica", () => {
    // Acceptat: innerHTML = `<svg ...>` literals purs (sense ${})
    // Rebutjat: innerHTML = variable | innerHTML += expr | innerHTML = `...${var}...`
    const DYNAMIC_RE = /\.innerHTML\s*[+]?=\s*(?!`[^`]*`\s*;)(?!`(?:[^`$]|\$(?!\{))*`)/;
    const hits = [];
    for (const f of JS_FILES) {
        const src = readText(f);
        const lines = src.split("\n");
        lines.forEach((line, i) => {
            const trimmed = line.trimStart();
            if (DYNAMIC_RE.test(line) && !/^\s*\/\//.test(line)) {
                // Acceptar: assignació de template literal pur sense interpolació
                const assignMatch = line.match(/\.innerHTML\s*=\s*(`[^`]*`)\s*;?/);
                if (assignMatch && !assignMatch[1].includes("${")) return; // literal pur OK
                // Acceptar: innerHTML = "" o innerHTML = '' (neteja segura de contingut)
                if (/\.innerHTML\s*=\s*["']\s*["']/.test(line)) return;
                hits.push(`${relative(root, f)}:${i + 1} → ${trimmed}`);
            }
        });
    }
    if (hits.length) throw new Error(`\n  ${hits.join("\n  ")}`);
    pass("Seguretat: no 'innerHTML' amb concatenació dinàmica");
});

// 7. Accessibilitat: lang="ca" a tots els HTML
check("Accessibilitat: lang=\"ca\" a tots els <html>", () => {
    const hits = [];
    for (const f of HTML_FILES) {
        const src = readText(f);
        if (/<html/i.test(src) && !/lang\s*=\s*"ca"/i.test(src)) {
            hits.push(relative(root, f));
        }
    }
    if (hits.length) throw new Error(`Falta lang="ca": ${hits.join(", ")}`);
    pass('Accessibilitat: lang="ca" a tots els <html>');
});

// 8. Tests: npm test passa
check("Tests: npm test (0 failures)", () => {
    try {
        execSync("npm test", { cwd: root, stdio: "pipe" });
        pass("Tests: npm test (0 failures)");
    } catch (err) {
        const output = (err.stdout?.toString() || "") + (err.stderr?.toString() || "");
        // Extreu el resum de failures si existeix
        const summary = output.match(/# (fail .+)/im)?.[1] || "hi ha tests fallits";
        throw new Error(summary);
    }
});

// ─── Resum ───────────────────────────────────────────────────────────────────

console.log("\n══════════════════════════════════════════");
console.log("  Auditoria Pre-Release — Checks Automàtics");
console.log("══════════════════════════════════════════\n");

let allOk = true;
for (const r of results) {
    if (r.ok) {
        console.log(`  ✅  ${r.label}`);
    } else {
        console.log(`  ❌  ${r.label}`);
        if (r.details?.length) {
            for (const d of r.details) {
                console.log(`       ${d}`);
            }
        }
        allOk = false;
    }
}

const total  = results.length;
const passed = results.filter(r => r.ok).length;
const failed = total - passed;

console.log(`\n──────────────────────────────────────────`);
if (allOk) {
    console.log(`  ✅  Tots els checks passen (${passed}/${total})\n`);
    console.log("  Pots continuar amb el build i la publicació.\n");
} else {
    console.log(`  ❌  ${failed} check(s) han fallat (${passed}/${total} OK)\n`);
    console.log("  Corregeix els errors abans de generar el ZIP.\n");
}
console.log("══════════════════════════════════════════\n");

process.exit(allOk ? 0 : 1);
