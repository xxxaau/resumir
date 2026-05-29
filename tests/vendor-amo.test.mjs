import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

/**
 * Escaneja un fitxer a la recerca de patrons que AMO (addons.mozilla.org)
 * detecta com a insegurs: crides directes a eval() i al constructor Function.
 *
 * Retorna array de {line, col, text} per a cada ocurrència trobada.
 */
function scanAmoWarnings(filePath) {
    const src = readFileSync(filePath, "utf8");
    const hits = [];

    // new Function(...) — el constructor Function
    const funcRe = /new\s+Function\s*\(/g;
    let m;
    while ((m = funcRe.exec(src)) !== null) {
        const line = src.slice(0, m.index).split("\n").length;
        const col = m.index - src.lastIndexOf("\n", m.index);
        const ctx = src.slice(m.index, m.index + 60).replace(/\n/g, " ");
        hits.push({ line, col, text: ctx });
    }

    // eval(...) — crida directa (no indirecta via (0, eval)(...))
    const evalRe = /[^.]\beval\s*\(/g;
    while ((m = evalRe.exec(src)) !== null) {
        const line = src.slice(0, m.index + 1).split("\n").length;
        const col = m.index + 1 - src.lastIndexOf("\n", m.index);
        const ctx = src.slice(m.index + 1, m.index + 61).replace(/\n/g, " ");
        hits.push({ line, col, text: ctx });
    }

    return hits;
}

const VENDOR_FILES = [
    "vendor/pdf.min.js",
    "vendor/pdf.worker.min.js",
];

describe("AMO — vendor files", () => {
    for (const rel of VENDOR_FILES) {
        it(`${rel} no conté eval() ni new Function()`, () => {
            const fullPath = resolve(root, rel);
            const warnings = scanAmoWarnings(fullPath);
            if (warnings.length > 0) {
                const details = warnings
                    .map(w => `  línia ${w.line}, col ${w.col}: ${w.text}`)
                    .join("\n");
                assert.fail(`Trobats ${warnings.length} patró(s) insegur(s) a ${rel}:\n${details}`);
            }
        });
    }
});
