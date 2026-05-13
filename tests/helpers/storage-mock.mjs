/**
 * tests/helpers/storage-mock.mjs
 * Mock in-memory de ext.storage.local i ext.storage.sync per als tests.
 *
 * Suporta les mateixes signatures que l'API real de WebExtensions:
 *   get(null)        → tot el store
 *   get("key")       → { key: value }
 *   get(["k1","k2"]) → { k1: v1, k2: v2 }
 *   get({ k: def })  → { k: value ?? def }
 *   set(obj)         → afegeix/sobreescriu
 *   remove("key")    → elimina una clau
 *   remove(["k1"])   → elimina diverses claus
 */
export function createStorageMock() {
    const store = {};
    return {
        async get(keys) {
            if (keys === null || keys === undefined) return { ...store };
            if (typeof keys === "string") return { [keys]: store[keys] };
            if (Array.isArray(keys)) return Object.fromEntries(keys.map(k => [k, store[k]]));
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
        /** Esborra tot el store (ús intern dels tests entre casos) */
        _clear() { Object.keys(store).forEach(k => delete store[k]); },
        /** Injecta dades directament al store (ús intern dels tests) */
        _set(obj) { Object.assign(store, obj); },
        /** Retorna una còpia del store per a assercions */
        _dump() { return { ...store }; },
    };
}
