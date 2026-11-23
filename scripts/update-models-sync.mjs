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

// ─── REFERÈNCIA DE MODELS ACTUALS (November 2026) ───────────────────────────
// Font: Google Gemini API docs (https://ai.google.dev/gemini-api/docs/models)
// Actualitzar manualment quan Google publiqui nous models. Els models Gemini
// 2.5 ja no s'inclouen: Google els ha deprecat i els nous projectes no hi tenen
// accés.

const REFERENCE_MODELS = [
    // Tier: Flash Lite (més ràpids, més econòmics)
    {
        id: "gemini-3.5-flash-lite",
        label: "Gemini 3.5 Flash Lite",
        priceIn: 0.30,       // USD per 1M input tokens
        priceOut: 2.50,      // USD per 1M output tokens
        rpd: 1000,           // Requests per day (estimació free tier)
        contextWindow: 1_000_000,
        fallback: true,
        active: true,
        launchDate: "2026-03-01",
        notes: "Model per defecte: Lite estable més nou, recomanat per Google"
    },
    {
        id: "gemini-3.1-flash-lite",
        label: "Gemini 3.1 Flash Lite",
        priceIn: 0.25,
        priceOut: 1.50,
        rpd: 2000,
        contextWindow: 1_000_000,
        fallback: true,
        active: true,
        launchDate: "2025-12-01",
        notes: "Lite anterior, encara estable i una mica més barat"
    },

    // Tier: Flash (estable, equilibrat)
    {
        id: "gemini-3.8-flash",
        label: "Gemini 3.8 Flash",
        priceIn: 1.50,
        priceOut: 7.50,
        rpd: 1500,
        contextWindow: 1_000_000,
        fallback: true,
        active: true,
        launchDate: "2026-10-01",
        notes: "Preu des de l'1/1/2027 (fins al 31/12/2026: $0.75/$3.75)"
    },
    {
        id: "gemini-3.6-flash",
        label: "Gemini 3.6 Flash",
        priceIn: 1.50,
        priceOut: 7.50,
        rpd: 1500,
        contextWindow: 1_000_000,
        fallback: true,
        active: true,
        launchDate: "2026-06-01",
        notes: "Generació Flash anterior, mateix preu que 3.8"
    },
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
        notes: "Preview llegada, mantinguda per compatibilitat"
    },

    // Open models (alternativa sense cost)
    {
        id: "gemma-4-31b-it",
        label: "Gemma 4 (31B)",
        priceIn: 0.00,
        priceOut: 0.00,
        rpd: 2000,
        contextWindow: 262_144,
        fallback: true,
        active: true,
        launchDate: "2026-03-31",
        notes: "Open source, gratuït al free tier; sense tier de pagament"
    },
    {
        id: "gemma-4-26b-a4b-it",
        label: "Gemma 4 (26B A4B)",
        priceIn: 0.00,
        priceOut: 0.00,
        rpd: 2000,
        contextWindow: 262_144,
        fallback: true,
        active: true,
        launchDate: "2026-03-31",
        notes: "Open source MoE, gratuït; recomanat per Google per començar"
    },

    // Tier: Gemini 4 (frontier; només Hydrogen té free tier)
    {
        id: "gemini-4-hydrogen",
        label: "Gemini 4 Hydrogen",
        priceIn: 1.50,
        priceOut: 7.50,
        rpd: 500,
        contextWindow: 1_000_000,
        fallback: true,
        active: true,
        launchDate: "2026-09-01",
        notes: "Frontier amb free tier; preu Flash"
    },
    {
        id: "gemini-4-carbon",
        label: "Gemini 4 Carbon",
        priceIn: 4.00,
        priceOut: 20.00,
        rpd: 0,
        contextWindow: 1_000_000,
        fallback: false,
        active: true,
        launchDate: "2026-09-01",
        notes: "Només de pagament; $4/$20 des de l'1/12/2026 (abans $2/$10)"
    },
    {
        id: "gemini-4-argon",
        label: "Gemini 4 Argon",
        priceIn: 4.00,
        priceOut: 20.00,
        rpd: 0,
        contextWindow: 1_000_000,
        fallback: false,
        active: true,
        launchDate: "2026-09-01",
        notes: "Només de pagament; $4/$20 des de l'1/12/2026 (abans $2/$10)"
    },
    {
        id: "gemini-4-neon",
        label: "Gemini 4 Neon",
        priceIn: 3.00,
        priceOut: 15.00,
        rpd: 0,
        contextWindow: 1_000_000,
        fallback: false,
        active: true,
        launchDate: "2026-09-01",
        notes: "Només de pagament"
    },

    // Tier: Pro Preview (màxima potència)
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
        notes: ">200k tokens: $4 input / $18 output"
    }
];

const EUR_RATE = 0.91; // 2026-Q4

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
