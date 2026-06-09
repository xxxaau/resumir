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
import { resolve, dirname, relative, extname, posix } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { inflateRawSync } from "zlib";

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
    !rel.startsWith("node_modules") &&
    !rel.startsWith("coverage") &&
    !rel.startsWith("vendor")
);

/** Fitxers HTML propis */
const HTML_FILES = collectFiles(root, (full, rel) =>
    extname(full) === ".html" &&
    !rel.startsWith("node_modules") &&
    !rel.startsWith("coverage")
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

check("Manifests: gecko.id sense 'dev'", () => {
    const ffPatch = readJson(resolve(root, "manifest.firefox.patch.json"));
    const geckoId = ffPatch?.browser_specific_settings?.gecko?.id ?? "";
    if (geckoId.toLowerCase().includes("dev")) {
        throw new Error(`manifest.firefox.patch.json gecko.id conté 'dev': "${geckoId}". Actualitza-ho a l'id de producció abans de publicar.`);
    }
    pass("Manifests: gecko.id sense 'dev'");
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

check("CSP: 'img-src' i 'font-src' presents als manifests generats", () => {
    const errs = [];
    for (const m of ["manifest.json", "manifest.chromium.json"]) {
        const csp = readJson(resolve(root, m))?.content_security_policy?.extension_pages ?? "";
        if (!/\bimg-src\b/.test(csp))  errs.push(`${m}: falta 'img-src' a la CSP`);
        if (!/\bfont-src\b/.test(csp)) errs.push(`${m}: falta 'font-src' a la CSP`);
    }
    if (errs.length) throw new Error(errs.join(" | "));
    pass("CSP: 'img-src' i 'font-src' presents als manifests generats");
});

// 2. AMO: no eval() ni new Function()
check("AMO: no 'eval()' ni 'new Function('", () => {
    const hits = [];
    for (const f of JS_FILES) {
        const src = readText(f);
        const lines = src.split("\n");
        lines.forEach((line, i) => {
            // Elimina comentaris de línia per evitar falsos positius en comentaris
            const code = line.replace(/\/\/.*$/, "");
            // Allow indirect eval pattern (0, eval)(...) which is safe and AMO-accepted
            const hasDirectEval = /\beval\s*\(/.test(code) && !/\(\s*0\s*,\s*eval\s*\)/.test(code);
            const hasNewFunction = /new\s+Function\s*\(/.test(code);
            if (hasDirectEval || hasNewFunction) {
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
    const hits = [];
    for (const f of JS_FILES) {
        const src = readText(f);
        // Elimina tots els comentaris de línia per evitar falsos positius
        const noComments = src.replace(/\/\/[^\n]*/g, "");
        // Troba totes les assignacions innerHTML amb el seu valor complet (multiínia)
        const assignRE = /\.innerHTML\s*\+?=\s*/g;
        let m;
        while ((m = assignRE.exec(noComments)) !== null) {
            const rest = noComments.slice(m.index + m[0].length).trimStart();
            // Neteja segura: innerHTML = "" o ''
            if (/^["']\s*["']/.test(rest)) continue;
            // Template literal: llegeix fins al backtick de tancament
            if (rest[0] === "`") {
                // Extreu el contingut del template literal (pot ser multiínia)
                const endIdx = findTemplateEnd(rest, 1);
                const literal = rest.slice(0, endIdx + 1);
                // Acceptat si no té interpolació ${}
                if (!literal.includes("${")) continue;
            }
            // Qualsevol altra cosa és dinàmica → rebutjat
            const lineNum = noComments.slice(0, m.index).split("\n").length;
            const lineContent = src.split("\n")[lineNum - 1]?.trim() ?? "";
            hits.push(`${relative(root, f)}:${lineNum} → ${lineContent}`);
        }
    }
    if (hits.length) throw new Error(`\n  ${hits.join("\n  ")}`);
    pass("Seguretat: no 'innerHTML' amb concatenació dinàmica");
});

/** Troba l'índex del backtick de tancament d'un template literal, gestionant escapaments */
function findTemplateEnd(str, start) {
    for (let i = start; i < str.length; i++) {
        if (str[i] === "\\") { i++; continue; }
        if (str[i] === "`") return i;
    }
    return str.length - 1;
}

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

// 9. ZIPs: existeixen i mida < 4 MB
check("ZIPs: existeixen i mida < 4 MB", () => {
    const pkg = readJson(resolve(root, "package.json"));
    const ver = pkg.version;
    const targets = ["firefox", "chromium"];
    const MAX_BYTES = 4 * 1024 * 1024;
    const errs = [];
    for (const t of targets) {
        const zipPath = resolve(root, "build", `resumir-contingut-v${ver}-${t}.zip`);
        try {
            const { size } = statSync(zipPath);
            if (size > MAX_BYTES) errs.push(`${t} ZIP massa gran: ${(size / 1024 / 1024).toFixed(1)} MB`);
        } catch {
            errs.push(`ZIP no trobat: build/resumir-contingut-v${ver}-${t}.zip (executa npm run build primer)`);
        }
    }
    if (errs.length) throw new Error(errs.join(" | "));
    pass("ZIPs: existeixen i mida < 4 MB");
});

// 10. CHANGELOG: té una entrada per a la versió actual
check("CHANGELOG: conté entrada per a la versió actual", () => {
    const pkg  = readJson(resolve(root, "package.json"));
    const ver  = pkg.version;
    const changelog = readText(resolve(root, "docs/CHANGELOG.md"));
    if (!changelog.includes(`## [${ver}]`)) {
        throw new Error(`docs/CHANGELOG.md no té entrada '## [${ver}]'. Afegeix-la abans de publicar.`);
    }
    pass("CHANGELOG: conté entrada per a la versió actual");
});

// 11. npm audit: sense vulnerabilitats a dependències de producció
check("npm audit: sense vulnerabilitats de producció", () => {
    try {
        execSync("npm audit --omit=dev --audit-level=moderate", { cwd: root, stdio: "pipe" });
        pass("npm audit: sense vulnerabilitats de producció");
    } catch (err) {
        const output = err.stdout?.toString() || err.stderr?.toString() || "";
        const summary = output.split("\n").find(l => l.includes("vulnerabilit")) || output.slice(0, 200);
        throw new Error(summary || "npm audit ha detectat vulnerabilitats");
    }
});

// 12. Models: validació de la llista de models (estructura, pricing, deprecació)
check("Models: validació de CURATED_MODELS (estructura, pricing, deprecació)", () => {
    try {
        execSync("node scripts/update-models-check.mjs", { cwd: root, stdio: "pipe" });
        pass("Models: validació de CURATED_MODELS (estructura, pricing, deprecació)");
    } catch (err) {
        const output = err.stdout?.toString() || err.stderr?.toString() || "";
        const lines = output.split("\n").filter(l => l.includes("❌") || l.includes("⚠️"));
        throw new Error(lines.length > 0 ? lines.join(" | ") : "Models validation failed");
    }
});

// 13. ZIP smoke-test: tot <script src=...> als HTML del ZIP existeix dins el paquet
check("ZIP: tot <script src=\"...\"> referenciat existeix al paquet", () => {
    const pkg = readJson(resolve(root, "package.json"));
    const ver = pkg.version;
    const targets = ["firefox", "chromium"];
    const errs = [];

    for (const t of targets) {
        const zipPath = resolve(root, "build", `resumir-contingut-v${ver}-${t}.zip`);
        let zipMap;
        try {
            zipMap = readZipEntries(zipPath);
        } catch (e) {
            errs.push(`${t}: no s'ha pogut llegir el ZIP (${e.message})`);
            continue;
        }
        const names = new Set(zipMap.keys());

        // Per cada HTML al ZIP, verificar tots els <script src="X">
        for (const [name, getData] of zipMap.entries()) {
            if (!name.endsWith(".html")) continue;
            const html = getData().toString("utf8");
            const htmlDir = posix.dirname(name);
            const re = /<script\s+[^>]*src="([^"]+)"/g;
            let m;
            while ((m = re.exec(html)) !== null) {
                const src = m[1];
                if (/^(https?:)?\/\//i.test(src)) continue; // ignora URLs externes
                // Resol path relatiu dins el ZIP
                const resolved = posix.normalize(posix.join(htmlDir, src));
                if (!names.has(resolved)) {
                    errs.push(`${t}: ${name} referencia '${src}' (resolt: ${resolved}) — NO existeix al ZIP`);
                }
            }
        }
    }

    if (errs.length) throw new Error("\n  " + errs.join("\n  "));
    pass('ZIP: tot <script src="..."> referenciat existeix al paquet');
});

// ─── ZIP helpers (lectura sense dependències) ────────────────────────────────

/**
 * Llegeix les entrades d'un ZIP i retorna un Map<name, () => Buffer>
 * que descomprimeix on-demand. Suporta STORE (0) i DEFLATE (8).
 */
function readZipEntries(zipPath) {
    const buf = readFileSync(zipPath);
    // Localitza End of Central Directory (EOCD). Cerca des del final.
    let eocd = -1;
    const sig = 0x06054b50;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
        if (buf.readUInt32LE(i) === sig) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("EOCD no trobat");
    const totalEntries = buf.readUInt16LE(eocd + 10);
    const cdSize       = buf.readUInt32LE(eocd + 12);
    const cdOffset     = buf.readUInt32LE(eocd + 16);

    const entries = new Map();
    let p = cdOffset;
    for (let i = 0; i < totalEntries; i++) {
        if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Central dir signature invàlida");
        const method     = buf.readUInt16LE(p + 10);
        const compSize   = buf.readUInt32LE(p + 20);
        const uncompSize = buf.readUInt32LE(p + 24);
        const nameLen    = buf.readUInt16LE(p + 28);
        const extraLen   = buf.readUInt16LE(p + 30);
        const commentLen = buf.readUInt16LE(p + 32);
        const localOff   = buf.readUInt32LE(p + 42);
        const name       = buf.slice(p + 46, p + 46 + nameLen).toString("utf8");

        // Salta si és directori
        if (!name.endsWith("/")) {
            entries.set(name, () => {
                // Llegeix local file header per saber l'offset real de les dades
                if (buf.readUInt32LE(localOff) !== 0x04034b50) throw new Error("Local header invàlid per " + name);
                const lNameLen  = buf.readUInt16LE(localOff + 26);
                const lExtraLen = buf.readUInt16LE(localOff + 28);
                const dataStart = localOff + 30 + lNameLen + lExtraLen;
                const data = buf.slice(dataStart, dataStart + compSize);
                if (method === 0) return data;
                if (method === 8) return inflateRawSync(data);
                throw new Error("Mètode de compressió no suportat: " + method);
            });
        }
        p += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
}

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
