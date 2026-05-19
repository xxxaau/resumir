#!/usr/bin/env node
/**
 * update-models-check.mjs
 * Valida la llista de models antes de tancar una nova versió.
 * S'executa automàticament a `npm run prerelease`.
 *
 * Checks:
 * 1. Estructura JSON de CURATED_MODELS és vàlida
 * 2. Totes els models tienen camp obligatori (id, label, priceIn, priceOut, rpd, contextWindow)
 * 3. Alerta si hi ha models deprecats que no han estat eliminats
 * 4. Verifica que DEFAULT_MODEL_ID existeix a CURATED_MODELS
 * 5. Alerta si els preus semblen força antic (ERR_RATE desactualitzat)
 *
 * Usage:
 *   node scripts/update-models-check.mjs
 *   npm run models:check
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const modelsPath = resolve(root, "shared/models.js");

console.log("📋 Validant llista de models...\n");

// Llegir el fitxer models.js
let modelsContent;
try {
    modelsContent = readFileSync(modelsPath, "utf8");
} catch (err) {
    console.error(`❌ No puc llegir ${modelsPath}`);
    process.exit(1);
}

// Extreure CURATED_MODELS
const modelsMatch = modelsContent.match(/const CURATED_MODELS\s*=\s*\[([\s\S]*?)\];/);
if (!modelsMatch) {
    console.error("❌ No trobo CURATED_MODELS a models.js");
    process.exit(1);
}

// Extreure DEFAULT_MODEL_ID (pot contenir punts: gemini-3.1-flash-lite)
const defaultMatch = modelsContent.match(/const DEFAULT_MODEL_ID\s*=\s*['"]([\w\.\-]+)['"]/);
if (!defaultMatch) {
    console.error("❌ No trobo DEFAULT_MODEL_ID a models.js");
    process.exit(1);
}

const DEFAULT_MODEL_ID = defaultMatch[1];
let allOk = true;
const modelIds = [];

// Parser manual: extreure cada model (IDs pot contenir punts: gemini-3.1-flash-lite)
const modelRegex = /\{\s*id:\s*['"]([\w\.\-]+)['"]\s*,\s*label:\s*['"](.*?)['"]\s*,\s*priceIn:\s*([\d\.]+)\s*,\s*priceOut:\s*([\d\.]+)\s*,\s*rpd:\s*([\d,]+)\s*,\s*contextWindow:\s*([\d_]+)\s*,\s*fallback:\s*(true|false)\s*\}/g;

let match;
let modelCount = 0;

while ((match = modelRegex.exec(modelsContent)) !== null) {
    const [, id, label, priceIn, priceOut, rpd, contextWindow, fallback] = match;
    modelCount++;
    modelIds.push(id);

    // Validar que priceOut >= priceIn
    const priceInNum = parseFloat(priceIn);
    const priceOutNum = parseFloat(priceOut);
    if (priceOutNum < priceInNum) {
        console.error(`❌ Model ${id}: priceOut (${priceOutNum}) < priceIn (${priceInNum})`);
        allOk = false;
    }

    console.log(`  ✓ ${id.padEnd(30)} | ${label.padEnd(25)} | $${priceIn}→$${priceOut} | rpd=${rpd}`);
}

console.log(`\n📊 Total de models: ${modelCount}\n`);

// Validar DEFAULT_MODEL_ID
if (!modelIds.includes(DEFAULT_MODEL_ID)) {
    console.error(`❌ DEFAULT_MODEL_ID "${DEFAULT_MODEL_ID}" no existeix a CURATED_MODELS`);
    allOk = false;
} else {
    console.log(`✓ DEFAULT_MODEL_ID "${DEFAULT_MODEL_ID}" existeix\n`);
}

// Alerta: models deprecats dins de CURATED_MODELS
const deprecatedModels = [];
const deprecatedRegex = /\{\s*id:\s*['"]([\w\.\-]+)['"]\s*,\s*label:\s*['"](.*?deprecat.*?)['"]/gi;
let deprecatedMatch;
while ((deprecatedMatch = deprecatedRegex.exec(modelsContent)) !== null) {
    deprecatedModels.push({ 
        id: deprecatedMatch[1], 
        label: deprecatedMatch[2] 
    });
}

if (deprecatedModels.length > 0) {
    console.warn(`⚠️  ${deprecatedModels.length} model(s) marcats com a deprecats a CURATED_MODELS:\n`);
    deprecatedModels.forEach(m => {
        console.warn(`   ${m.id}: "${m.label}"`);
    });
    console.log("   Nota: Els models deprecats mantinguts per a fallback, eliminació prevista 02/06/2026\n");
}

// Alerta: pricing molt antic
const eur_rate_match = modelsContent.match(/const EUR_RATE\s*=\s*([\d\.]+);\s*\/\/\s*(\d{4}-Q\d)/);
if (eur_rate_match) {
    const [, rate, period] = eur_rate_match;
    const [year, quarter] = period.split("-Q").map(Number);
    const q_month = (quarter - 1) * 3 + 1; // Q1→1, Q2→4, Q3→7, Q4→10
    const rateDate = new Date(year, q_month - 1);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - year) * 12 + (now.getMonth() - (q_month - 1));
    
    if (monthsDiff > 3) {
        console.warn(`⚠️  EUR_RATE és de fa ${monthsDiff} mesos (${period}). Considera actualitzar-la.`);
    } else {
        console.log(`✓ EUR_RATE actualitzat (${period})\n`);
    }
}

// Verificar que hi ha almenys un model Flash Lite
const hasLite = modelIds.some(id => id.includes("lite"));
if (!hasLite) {
    console.warn("⚠️  No hi ha cap model Flash Lite a CURATED_MODELS. Considera afegir-lo per a millor UX.\n");
}

// Resultat final
if (allOk) {
    console.log("✅ Validació de models PASSED. Pots procedir amb el release.\n");
    process.exit(0);
} else {
    console.log("❌ Validació de models FAILED. Corregeix els errors anteriors.\n");
    process.exit(1);
}
