/**
 * tests/stats-period.test.mjs
 * Tests unitaris per a getMondayOfWeek i filterHistoryByPeriod
 * Execució: node --test tests/stats-period.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// settings-stats.js usa DOM globals dins funcions, però les nostres funcions
// pures no necessiten cap global. Proporcionem un stub mínim per evitar errors
// si el fitxer fes accés a globals en el moment de la càrrega.
global.ext = { storage: { local: { get: async () => ({}) } } };

const { getMondayOfWeek, filterHistoryByPeriod } = require("../options/settings-stats.js");

// ---------------------------------------------------------------------------
// getMondayOfWeek
// ---------------------------------------------------------------------------

test("getMondayOfWeek - un dilluns retorna el mateix dia", () => {
    // 2026-03-23 és dilluns
    const monday = new Date("2026-03-23T12:00:00");
    const result = getMondayOfWeek(monday);
    assert.equal(result.toISOString().slice(0, 10), "2026-03-23");
});

test("getMondayOfWeek - un dimecres retorna el dilluns anterior", () => {
    // 2026-03-25 és dimecres → dilluns 2026-03-23
    const wednesday = new Date("2026-03-25T12:00:00");
    const result = getMondayOfWeek(wednesday);
    assert.equal(result.toISOString().slice(0, 10), "2026-03-23");
});

test("getMondayOfWeek - un diumenge retorna el dilluns anterior (no el següent)", () => {
    // 2026-03-29 és diumenge → dilluns 2026-03-23 (inici de la MATEIXA setmana ISO)
    const sunday = new Date("2026-03-29T12:00:00");
    const result = getMondayOfWeek(sunday);
    assert.equal(result.toISOString().slice(0, 10), "2026-03-23");
});

test("getMondayOfWeek - un dissabte retorna el dilluns anterior", () => {
    // 2026-03-28 és dissabte → dilluns 2026-03-23
    const saturday = new Date("2026-03-28T12:00:00");
    const result = getMondayOfWeek(saturday);
    assert.equal(result.toISOString().slice(0, 10), "2026-03-23");
});

// ---------------------------------------------------------------------------
// filterHistoryByPeriod
// ---------------------------------------------------------------------------

function makeEntry(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(12, 0, 0, 0); // migdia per evitar problemes de DST
    return { date: d.toISOString() };
}

test("filterHistoryByPeriod - 7d inclou avui i 6 dies enrere, exclou 7 dies enrere", () => {
    const history = [makeEntry(0), makeEntry(6), makeEntry(7)];
    const result = filterHistoryByPeriod(history, "7d");
    assert.equal(result.length, 2);
});

test("filterHistoryByPeriod - 30d inclou 29 dies enrere, exclou 30 dies enrere", () => {
    const history = [makeEntry(0), makeEntry(29), makeEntry(30)];
    const result = filterHistoryByPeriod(history, "30d");
    assert.equal(result.length, 2);
});

test("filterHistoryByPeriod - 6m inclou avui, exclou entrada de fa 7 mesos", () => {
    const old = new Date();
    old.setMonth(old.getMonth() - 7);
    old.setHours(12, 0, 0, 0);
    const history = [makeEntry(0), { date: old.toISOString() }];
    const result = filterHistoryByPeriod(history, "6m");
    assert.equal(result.length, 1);
});

test("filterHistoryByPeriod - 1a inclou avui, exclou entrada de fa 2 anys", () => {
    const old = new Date();
    old.setFullYear(old.getFullYear() - 2);
    old.setHours(12, 0, 0, 0);
    const history = [makeEntry(0), { date: old.toISOString() }];
    const result = filterHistoryByPeriod(history, "1a");
    assert.equal(result.length, 1);
});

test("filterHistoryByPeriod - descarta entrades amb data invàlida", () => {
    const history = [makeEntry(0), { date: "not-a-date" }, { date: null }];
    const result = filterHistoryByPeriod(history, "7d");
    assert.equal(result.length, 1);
});
