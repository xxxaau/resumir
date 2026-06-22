#!/usr/bin/env node
/**
 * verify-vendor.mjs
 * Verifica els hashes SHA-256 dels fitxers vendor + AMO-patched.
 * Els hashes esperats corresponen als fitxers ja pedaçats per
 * scripts/patch-vendor-amo.mjs.
 *
 * Usage:
 *   node scripts/verify-vendor.mjs
 *   npm run vendor:verify
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Hashes SHA-256 esperats (dels fitxers JA pedaçats per patch-vendor-amo.mjs).
// Actualitza després d'actualitzar manualment un vendor i executar
// node scripts/patch-vendor-amo.mjs. Consulta THIRD_PARTY.md per a versions i fonts.
const EXPECTED = {
    "Readability.js": "ea5ea61230d96011b5902414973e50511aa93edfc5ec982464c656f9e7326e7e",
    "vendor/pdf.min.js":        "e7104cd3620b7ac7189743605cfaa8ac8a3cb32035bf303bdee3d91379524001",
    "vendor/pdf.worker.min.js": "588195df59e44ad75b7bf895afe2c60b419d1d193053094821cc4c6239562581",
};

let allOk = true;

for (const [filename, expectedHash] of Object.entries(EXPECTED)) {
    const filePath = resolve(root, filename);
    let actualHash;
    try {
        const content = readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
        actualHash = createHash("sha256").update(content, "utf8").digest("hex");
    } catch {
        console.error(`✗ ${filename}: no trobat a ${filePath}`);
        allOk = false;
        continue;
    }

    if (actualHash === expectedHash) {
        console.log(`✓ ${filename}: hash OK`);
    } else {
        console.error(`✗ ${filename}: hash no coincideix`);
        console.error(`  esperat: ${expectedHash}`);
        console.error(`  obtingut: ${actualHash}`);
        console.error(`  Executa npm run vendor:patch && npm run vendor:verify si has actualitzat les dependències.`);
        allOk = false;
    }
}

if (!allOk) process.exit(1);
