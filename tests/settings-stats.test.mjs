/**
 * tests/settings-stats.test.mjs
 * Tests unitaris per a options/settings-stats.js:
 *   getMondayOfWeek, countDailyStatsByPeriod, filterHistoryByPeriod
 * Execució: node --test tests/settings-stats.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// settings-stats.js usa `document` i `ext` però les funcions exportades no
// les necessiten — les definim com a no-ops per evitar errors de càrrega.
global.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
global.ext = { storage: { local: { get: async () => ({}) }, sync: { get: async () => ({}) } } };
global.CURATED_MODELS = [];

const { getMondayOfWeek, countDailyStatsByPeriod, filterHistoryByPeriod } =
    require("../options/settings-stats.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retorna una data ISO relativa a avui (offset en dies). */
function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// getMondayOfWeek
// ---------------------------------------------------------------------------

test("getMondayOfWeek - retorna dilluns de la mateixa setmana", () => {
    // Dimecres 2025-05-07 → dilluns 2025-05-05
    const wed = new Date("2025-05-07T12:00:00");
    const mon = getMondayOfWeek(wed);
    assert.equal(mon.toISOString().slice(0, 10), "2025-05-05");
});

test("getMondayOfWeek - dilluns retorna el mateix dia", () => {
    const monday = new Date("2025-05-05T12:00:00");
    const result = getMondayOfWeek(monday);
    assert.equal(result.toISOString().slice(0, 10), "2025-05-05");
});

test("getMondayOfWeek - diumenge retorna el dilluns d'abans", () => {
    // Diumenge 2025-05-11 → dilluns 2025-05-05
    const sunday = new Date("2025-05-11T12:00:00");
    const result = getMondayOfWeek(sunday);
    assert.equal(result.toISOString().slice(0, 10), "2025-05-05");
});

test("getMondayOfWeek - dissabte retorna el dilluns d'abans", () => {
    // Dissabte 2025-05-10 → dilluns 2025-05-05
    const saturday = new Date("2025-05-10T12:00:00");
    const result = getMondayOfWeek(saturday);
    assert.equal(result.toISOString().slice(0, 10), "2025-05-05");
});

// ---------------------------------------------------------------------------
// countDailyStatsByPeriod
// ---------------------------------------------------------------------------

test("countDailyStatsByPeriod - 7d: suma entrades dels últims 7 dies", () => {
    const stats = {
        [daysAgo(0)]: 3,
        [daysAgo(3)]: 2,
        [daysAgo(6)]: 1,
        [daysAgo(8)]: 99, // fora del periode
    };
    const total = countDailyStatsByPeriod(stats, "7d");
    assert.equal(total, 6, "Ha de sumar 3+2+1=6 (els últims 7 dies)");
});

test("countDailyStatsByPeriod - 30d: inclou entrades fins a 29 dies enrere", () => {
    const stats = {
        [daysAgo(0)]:  1,
        [daysAgo(15)]: 4,
        [daysAgo(29)]: 2,
        [daysAgo(31)]: 99, // fora
    };
    const total = countDailyStatsByPeriod(stats, "30d");
    assert.equal(total, 7);
});

test("countDailyStatsByPeriod - retorna 0 si no hi ha dades dins el període", () => {
    const stats = { [daysAgo(10)]: 5 };
    assert.equal(countDailyStatsByPeriod(stats, "7d"), 0);
});

test("countDailyStatsByPeriod - ignora claus amb data invàlida", () => {
    const stats = { "not-a-date": 100, [daysAgo(1)]: 3 };
    assert.equal(countDailyStatsByPeriod(stats, "7d"), 3);
});

test("countDailyStatsByPeriod - stats buit retorna 0", () => {
    assert.equal(countDailyStatsByPeriod({}, "7d"), 0);
});

// ---------------------------------------------------------------------------
// filterHistoryByPeriod
// ---------------------------------------------------------------------------

function makeEntry(daysBack) {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    return { date: d.toISOString(), model: "m", inputTokens: 10, outputTokens: 5 };
}

test("filterHistoryByPeriod - 7d: filtra entrades fora dels 7 dies", () => {
    const history = [
        makeEntry(0),
        makeEntry(3),
        makeEntry(6),
        makeEntry(8),  // fora
        makeEntry(30), // fora
    ];
    const result = filterHistoryByPeriod(history, "7d");
    assert.equal(result.length, 3);
});

test("filterHistoryByPeriod - 30d: inclou entrades fins a 29 dies enrere", () => {
    const history = [makeEntry(0), makeEntry(15), makeEntry(29), makeEntry(31)];
    assert.equal(filterHistoryByPeriod(history, "30d").length, 3);
});

test("filterHistoryByPeriod - 1a: inclou entrades de l'últim any", () => {
    const history = [makeEntry(0), makeEntry(180), makeEntry(364), makeEntry(400)];
    assert.equal(filterHistoryByPeriod(history, "1a").length, 3);
});

test("filterHistoryByPeriod - descarta entrades amb data invàlida", () => {
    const history = [
        { date: "invalid-date", model: "m" },
        makeEntry(1),
    ];
    const result = filterHistoryByPeriod(history, "7d");
    assert.equal(result.length, 1);
});

test("filterHistoryByPeriod - historial buit retorna array buit", () => {
    assert.deepEqual(filterHistoryByPeriod([], "7d"), []);
});
