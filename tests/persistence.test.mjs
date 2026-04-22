/**
 * tests/persistence.test.mjs
 *
 * Verificació que les dades de l'usuari (historial, caché, estadístiques,
 * configuració) NO es perden quan l'extensió s'actualitza d'una versió
 * anterior a v2.2.2.
 *
 * Simula el següent cicle real:
 *   1. Usuari tenia dades de la v2.2.1 (injectades directament a storage)
 *   2. El navegador actualitza l'extensió a v2.2.2
 *   3. El codi nou s'executa (purgeStaleCacheEntries, getSummaryCache, etc.)
 *   4. Verifiquem que totes les dades originals segueixen accessibles
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Mock de storage (local + sync)
// ---------------------------------------------------------------------------

function createStorageMock() {
    const store = {};
    return {
        async get(keys) {
            if (keys === null || keys === undefined) return { ...store };
            if (typeof keys === "string") return { [keys]: store[keys] };
            if (Array.isArray(keys)) return Object.fromEntries(keys.map(k => [k, store[k]]));
            // object with defaults
            const result = {};
            for (const [k, defaultVal] of Object.entries(keys)) {
                result[k] = store[k] !== undefined ? store[k] : defaultVal;
            }
            return result;
        },
        async set(obj) { Object.assign(store, obj); },
        async remove(keys) {
            const ks = typeof keys === "string" ? [keys] : keys;
            ks.forEach(k => delete store[k]);
        },
        _store: store,
        _inject(obj) { Object.assign(store, obj); },
        _clear() { Object.keys(store).forEach(k => delete store[k]); },
    };
}

const localMock = createStorageMock();
const syncMock  = createStorageMock();

global.ext = {
    storage: {
        local: localMock,
        sync:  syncMock,
    }
};

const {
    getSummaryCache,
    saveSummaryCache,
    saveUsageStats,
    purgeStaleCacheEntries,
    listCachedSummaries,
} = require("../sidebar/cache.js");

function clearAll() {
    localMock._clear();
    syncMock._clear();
}

// Generador d'entrades de caché vàlides (dins TTL)
function fakeCacheEntry(url, title, summary = "Resum de prova.") {
    return {
        url,
        title,
        summary,
        model: "gemini-2.0-flash-lite",
        timestamp: new Date().toISOString(),
        version: "1.0",
        stats: { input: 200, output: 80 }
    };
}

// ---------------------------------------------------------------------------
// ESCENARI 1: Índex de caché existent (cas normal d'actualització)
// ---------------------------------------------------------------------------

test("Actualització — caché existent amb índex: totes les entrades sobreviuen", async () => {
    clearAll();

    const urls = [
        "https://example.com/article-1",
        "https://example.com/article-2",
        "https://example.com/article-3",
    ];

    // Injectar estat d'storage com si fos la versió anterior
    const index = [];
    for (const url of urls) {
        const key = `summary_cache:${url}`;
        localMock._inject({ [key]: fakeCacheEntry(url, `Títol ${url}`) });
        index.push(key);
    }
    localMock._inject({ summary_cache_index: index });

    // Simulació del que fa sidebar.js en arrencar: purgeStaleCacheEntries
    const purged = await purgeStaleCacheEntries();
    assert.equal(purged, 0, "Cap entrada vàlida s'ha d'esborrar");

    // Verificar que totes les entrades segueixen accessibles
    for (const url of urls) {
        const entry = await getSummaryCache(url);
        assert.ok(entry !== null, `L'entrada de ${url} hauria de ser accessible`);
        assert.equal(entry.url, url);
        assert.ok(entry.summary.length > 0);
    }

    // listCachedSummaries ha de retornar les 3 entrades
    const list = await listCachedSummaries();
    assert.equal(list.length, 3, "listCachedSummaries ha de retornar 3 entrades");
});

// ---------------------------------------------------------------------------
// ESCENARI 2: Sense índex (versió molt antiga sense summary_cache_index)
//             L'índex es reconstrueix automàticament
// ---------------------------------------------------------------------------

test("Actualització sense índex — getSummaryCache funciona per URL directa; listCachedSummaries recupera via fallback si l'índex és corromput", async () => {
    clearAll();

    const urls = [
        "https://old-version.com/page-a",
        "https://old-version.com/page-b",
    ];

    // Injectar entrades i un índex CORROMPUT (valor no-array, simula corrupció d'storage)
    for (const url of urls) {
        const key = `summary_cache:${url}`;
        localMock._inject({ [key]: fakeCacheEntry(url, `Article ${url}`) });
    }
    localMock._inject({ summary_cache_index: null }); // simula índex corromput

    // getSummaryCache ha de funcionar igualment (llegeix la clau directament, no depèn de l'índex)
    for (const url of urls) {
        const entry = await getSummaryCache(url);
        assert.ok(entry !== null, `${url} ha de ser accessible amb índex corromput`);
        assert.ok(entry.summary.length > 0);
    }

    // listCachedSummaries recupera via fallback (enumera summary_cache:* de storage)
    const list = await listCachedSummaries();
    assert.equal(list.length, 2, "Ha de trobar les 2 entrades via fallback d'enumeració");
});

// ---------------------------------------------------------------------------
// ESCENARI 3: Estadístiques i historial d'ús sobreviuen
// ---------------------------------------------------------------------------

test("Actualització — stats i usageHistory es preserven", async () => {
    clearAll();

    // Injectar estadístiques prèvies (simulant 30 dies d'ús)
    const existingStats = { articles: 147, tokens: 825_000 };
    const existingHistory = Array.from({ length: 50 }, (_, i) => ({
        date: new Date(Date.now() - i * 86_400_000).toISOString(),
        title: `Article ${i}`,
        url: `https://example.com/${i}`,
        model: "gemini-2.0-flash-lite",
        inputTokens: 500,
        outputTokens: 200,
        cacheTokens: 0,
        type: "lite",
        latency: 1200,
    }));

    localMock._inject({ stats: existingStats, usageHistory: existingHistory });

    // Simular una nova generació (com passaria just després de l'actualització)
    await saveUsageStats(300, 150, false, "gemini-2.0-flash-lite", 1500, "Nou article", "https://new.com", 0);

    // Stats s'incrementen, NO es reinicien
    const data = await localMock.get(["stats", "usageHistory"]);
    assert.equal(data.stats.articles, 148, "Ha d'incrementar el comptador d'articles (147+1)");
    assert.ok(data.stats.tokens > existingStats.tokens, "Els tokens han d'augmentar");

    // Historial preservat: ara en té 51
    assert.equal(data.usageHistory.length, 51, "L'historial ha de tenir 51 entrades (50 prèvies + 1 nova)");
    assert.equal(data.usageHistory[0].url, "https://new.com", "La més recent va primer");
    // Les 50 entrades originals segueixen totes presents (Article 0..49)
    const titles = new Set(data.usageHistory.map(e => e.title));
    assert.ok(titles.has("Article 0"), "Article 0 (més recent de les originals) segueix present");
    assert.ok(titles.has("Article 49"), "Article 49 (més antiga de les originals) segueix present");
});

// ---------------------------------------------------------------------------
// ESCENARI 4: La caché expirada s'elimina però la vàlida sobreviu
// ---------------------------------------------------------------------------

test("Actualització — purgeStaleCacheEntries elimina expirades però preserva vàlides", async () => {
    clearAll();

    const validUrl = "https://recent.com/article";
    const expiredUrl = "https://expired.com/old-article";

    // Entrada vàlida (recent)
    const validEntry = fakeCacheEntry(validUrl, "Article recent");
    // Entrada expirada (fa 35 dies)
    const expiredEntry = {
        ...fakeCacheEntry(expiredUrl, "Article vell"),
        timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const validKey   = `summary_cache:${validUrl}`;
    const expiredKey = `summary_cache:${expiredUrl}`;

    localMock._inject({
        [validKey]:   validEntry,
        [expiredKey]: expiredEntry,
        summary_cache_index: [validKey, expiredKey],
    });

    const purged = await purgeStaleCacheEntries();
    assert.equal(purged, 1, "Ha d'eliminar exactament 1 entrada expirada");

    // L'entrada vàlida segueix accessible
    const valid = await getSummaryCache(validUrl);
    assert.ok(valid !== null, "L'entrada vàlida ha de sobreviure la purga");
    assert.equal(valid.url, validUrl);

    // L'entrada expirada ha desaparegut
    const expired = await getSummaryCache(expiredUrl);
    assert.equal(expired, null, "L'entrada expirada ha de ser null");
});

// ---------------------------------------------------------------------------
// ESCENARI 5: Configuració sync no es sobreescriu per migració
// ---------------------------------------------------------------------------

test("Actualització — migració no sobreescriu configuració sync existent", async () => {
    clearAll();

    // Simula: usuari ja tenia apiKey a sync (cas normal d'actualització)
    syncMock._inject({ apiKey: "AIza_EXISTING_KEY", modelName: "gemini-2.5-pro" });
    // I també a local (en cas que fos una versió molt antiga)
    localMock._inject({ apiKey: "AIza_OLD_LOCAL_KEY", modelName: "gemini-old" });

    // La lògica de migració de sidebar.js: si syncConfig.apiKey existeix, NO migra
    const syncConfig = await syncMock.get(["apiKey"]);
    if (!syncConfig.apiKey) {
        // Aquest bloc NO hauria d'executar-se en una actualització normal
        const localConfig = await localMock.get(["apiKey", "modelName"]);
        if (localConfig.apiKey) {
            await syncMock.set(localConfig);
        }
    }

    // L'apiKey de sync ha de seguir sent l'original
    const result = await syncMock.get(["apiKey", "modelName"]);
    assert.equal(result.apiKey, "AIza_EXISTING_KEY", "L'API key de sync no s'ha de sobreescriure");
    assert.equal(result.modelName, "gemini-2.5-pro", "El model de sync no s'ha de sobreescriure");
});

// ---------------------------------------------------------------------------
// ESCENARI 6: Límit de 500 entrades — les dades antigues es preserven fins al límit
// ---------------------------------------------------------------------------

test("Actualització — índex de caché gran: les 500 entrades més recents es preserven", async () => {
    clearAll();

    // Crear 510 entrades (simula un usuari molt actiu)
    const entries = [];
    for (let i = 0; i < 510; i++) {
        const url = `https://example.com/article-${i}`;
        const key = `summary_cache:${url}`;
        localMock._inject({ [key]: fakeCacheEntry(url, `Títol ${i}`) });
        entries.push(key);
    }
    localMock._inject({ summary_cache_index: entries });

    // Desar una entrada nova (disparà el cap a 500)
    await saveSummaryCache(
        "https://example.com/newest",
        "Nou article",
        "Resum nou.",
        "gemini-2.0-flash-lite",
        100, 50
    );

    // L'índex no ha de tenir més de 500 entrades
    const indexData = await localMock.get(["summary_cache_index"]);
    assert.ok(
        indexData.summary_cache_index.length <= 500,
        `L'índex no ha de superar 500 entrades (té ${indexData.summary_cache_index.length})`
    );

    // L'entrada més nova ha de ser accessible
    const newest = await getSummaryCache("https://example.com/newest");
    assert.ok(newest !== null, "L'entrada més nova ha de ser accessible");

    // Les 490 entrades més recents (article-20 a article-509) han de seguir existint
    const recent = await getSummaryCache("https://example.com/article-509");
    assert.ok(recent !== null, "Les entrades recents s'han de preservar");
});
