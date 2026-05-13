#!/usr/bin/env node
/**
 * verify-vendor.mjs
 * Verifica els hashes SHA-256 dels fitxers vendor (defuddle.js, Readability.js).
 * Si els hashes no coincideixen, el procés surt amb codi 1.
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

// Hashes SHA-256 esperats. Actualitza'ls amb `npm run vendor:update`.
// Consulta THIRD_PARTY.md per a versions i fonts.
const EXPECTED = {
    "defuddle.js":   "029548317ef8e1151e293a6511021d996ad3c042d178dbfc0b8bf44a5f829f58",
    "Readability.js": "ea5ea61230d96011b5902414973e50511aa93edfc5ec982464c656f9e7326e7e",
};

let allOk = true;

for (const [filename, expectedHash] of Object.entries(EXPECTED)) {
    const filePath = resolve(root, filename);
    let actualHash;
    try {
        const content = readFileSync(filePath);
        actualHash = createHash("sha256").update(content).digest("hex");
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
        console.error(`  Actualitza EXPECTED a scripts/verify-vendor.mjs i THIRD_PARTY.md si has actualitzat la dependència.`);
        allOk = false;
    }
}

if (!allOk) process.exit(1);
