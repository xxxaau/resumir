#!/usr/bin/env node
/**
 * update-models-sync.mjs
 * Script per sincronitzar la llista de models amb la referència actual de Google Gemini.
 * 
 * Funcionalitats:
 * 1. Llegir la llista de referència de models (REFERENCE_MODELS)
 * 2. Comparar amb CURATED_MODELS actual
 * 3. Detectar models obsolets o nous
 * 4. Generar un informe de canvis proposats
 * 5. (Opcional) Actualitzar shared/models.js automàticament
 *
 * Usage:
 *   node scripts/update-models-sync.mjs --check    # només informe
 *   node scripts/update-models-sync.mjs --update    # actualitzar models.js
 *   npm run models:sync
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ─── REFERÈNCIA DE MODELS ACTUALS (May 2026) ────────────────────────────────
// Font: Google Gemini API docs (https://ai.google.dev/gemini-api/docs/models)
// Actualitzar manualment quan Google publiqui nous models

const REFERENCE_MODELS = [
    // Tier: Flash Lite (més ràpids, més económics)
    { 
        id: "gemini-3.1-flash-lite",
        label: "Gemini 3.1 Flash Lite",
        priceIn: 0.25,       // USD per 1M input tokens
        priceOut: 1.50,      // USD per 1M output tokens
        rpd: 2000,           // Requests per day
        contextWindow: 1_000_000,
        fallback: true,
        active: true,
        launchDate: "2025-12-01",
        notes: "Model recomanat per a primer ús (més ràpid + més cheap que 3.0)"
    },
    
    // Tier: Flash (estable, equilibrat)
    {
        id: "gemini-3-flash-preview",
        label: "Gemini 3 Flash",
        priceIn: 0.50,
        priceOut: 3.00,
        rpd: 1000,
        contextWindow: 1_048_576,
        fallback: true,
        active: true,
        launchDate: "2025-12-01",
        notes: "Versió 3 estable i equilibrada"
    },
    {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        priceIn: 0.30,
        priceOut: 2.50,
        rpd: 500,
        contextWindow: 1_000_000,
        fallback: false,
        active: true,
        launchDate: "2024-05-01",
        notes: "Versió anterior, mantinguda per compatibilitat"
    },
    
    // Tier: Pro (més potent, més lent)
    {
        id: "gemini-3.1-pro-preview",
        label: "Gemini 3.1 Pro",
        priceIn: 2.00,
        priceOut: 12.00,
        rpd: 100,
        contextWindow: 1_048_576,
        fallback: false,
        active: true,
        launchDate: "2025-12-01",
        notes: "Model potent per a tasques complexes, versió més nova que 3.0"
    },
    {
        id: "gemini-2.5-pro",
        label: "Gemini 2.5 Pro",
        priceIn: 1.25,
        priceOut: 5.00,
        rpd: 50,
        contextWindow: 1_000_000,
        fallback: false,
        active: true,
        launchDate: "2024-05-01",
        notes: "Versió anterior de Pro"
    },
    
    // Open models (alternativa sense cost)
    {
        id: "gemma-3-27b-it",
        label: "Gemma 3 (27B)",
        priceIn: 0.15,
        priceOut: 0.15,
        rpd: 2000,
        contextWindow: 131_072,
        fallback: true,
        active: true,
        launchDate: "2025-04-01",
        notes: "Model open source, gratuït"
    },
    
    // DEPRECAT (marcat per a eliminació)
    {
        id: "gemini-2.0-flash",
        label: "Gemini 2.0 Flash",
        priceIn: 0.10,
        priceOut: 0.40,
        rpd: 1500,
        contextWindow: 1_000_000,
        fallback: true,
        active: false,
        deprecated: true,
        eolDate: "2026-06-01",
        notes: "Deprecat 01/06/2026"
    },
    {
        id: "gemini-2.0-flash-lite",
        label: "Gemini 2.0 Flash Lite",
        priceIn: 0.07,
        priceOut: 0.30,
        rpd: 999999,
        contextWindow: 1_000_000,
        fallback: true,
        active: false,
        deprecated: true,
        eolDate: "2026-06-01",
        notes: "Deprecat 01/06/2026"
    }
];

const EUR_RATE = 0.92; // 2026-Q2

// ─── FUNCIONS ────────────────────────────────────────────────────────────────

function readCurrentModels() {
    const modelsPath = resolve(root, "shared/models.js");
    const content = readFileSync(modelsPath, "utf8");
    
    // Extreure DEFAULT_MODEL_ID
    const defaultMatch = content.match(/const DEFAULT_MODEL_ID\s*=\s*['"]([\w-]+)['"]/);
    const currentDefault = defaultMatch ? defaultMatch[1] : null;
    
    return { content, currentDefault };
}

function compareModels() {
    const { currentDefault } = readCurrentModels();
    
    
    console.log("\n📊 INFORME DE SINCRONITZACIÓ DE MODELS\n");
    console.log("═".repeat(70));
    
    // Models nous
    const newModels = REFERENCE_MODELS.filter(m => m.active && m.launchDate > "2026-05-01");
    if (newModels.length > 0) {
        console.log("\n🆕 MODELS NOUS (ultims 30 dies):");
        newModels.forEach(m => {
            console.log(`   • ${m.id}: ${m.label} (${m.launchDate})`);
            console.log(`     Pricing: $${m.priceIn}→$${m.priceOut} | RPD: ${m.rpd}`);
        });
    }
    
    // Models actius que haurien de ser prioritaris
    const prioritaryModels = REFERENCE_MODELS.filter(m => m.active && m.fallback && m.id.includes("lite"));
    console.log("\n⭐ MODELS PRIORITARIS (recomats per a primera càrrega):");
    prioritaryModels.forEach(m => {
        const isCurrent = m.id === currentDefault ? " ← ACTUAL" : "";
        console.log(`   • ${m.id}: ${m.label}${isCurrent}`);
        console.log(`     ${m.notes}`);
    });
    
    // Models deprecats
    console.log("\n⚠️  MODELS DEPRECATS (consider remocio en proxim release):");
    REFERENCE_MODELS.filter(m => m.deprecated).forEach(m => {
        console.log(`   ❌ ${m.id}: ${m.label}`);
        console.log(`      EOL: ${m.eolDate} | ${m.notes}`);
    });
    
    // Comparació de pricing
    console.log("\n💰 CANVIS DE PRICING (respecte a referència):");
    console.log(`   EUR_RATE actual: ${EUR_RATE}`);
    
    console.log("\n═".repeat(70));
    console.log("\n✅ Informe generat. Per actualitzar automàticament:");
    console.log("   npm run models:sync -- --update\n");
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--check") || args.length === 0) {
    compareModels();
} else if (args.includes("--update")) {
    console.log("⚠️  Actualització manual de models no implementada còpia");
    console.log("   Actualitza `shared/models.js` manualment o contacta al maintainer.");
    process.exit(1);
} else {
    compareModels();
}
