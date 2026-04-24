/**
 * tests/ext.test.mjs
 * Tests unitaris per a ext.js (cross-browser wrapper)
 * Execució: node --test tests/ext.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// ext.js llegeix `browser`/`chrome` en temps de càrrega → cal netejar la caché
// entre tests que necessitin globals diferents.
function loadExt() {
    const path = require.resolve("../ext.js");
    delete require.cache[path];
    return require("../ext.js");
}

// ---------------------------------------------------------------------------
// Chromium: ext.sidebar.open sense windowId → getCurrent → sidePanel.open
// ---------------------------------------------------------------------------
test("ext.sidebar.open (Chromium) - getCurrent èxit → sidePanel.open rep windowId", async () => {
    const openCalls = [];
    global.chrome = {
        windows:    { getCurrent: async () => ({ id: 42 }) },
        sidePanel:  { open: async opts => openCalls.push(opts) },
        storage:    { sync: {}, local: {}, onChanged: { addListener: () => {} } },
        runtime:    {},
        tabs:       {},
        contextMenus: {}
    };
    delete global.browser;

    const ext = loadExt();
    await ext.sidebar.open();

    assert.equal(openCalls.length, 1);
    assert.equal(openCalls[0].windowId, 42);
});

// ---------------------------------------------------------------------------
// Chromium: windows.getCurrent rebutja → sidePanel.open amb {} (objecte buit)
// ---------------------------------------------------------------------------
test("ext.sidebar.open (Chromium) - getCurrent rebutja → sidePanel.open amb objecte buit", async () => {
    const openCalls = [];
    global.chrome = {
        windows:    { getCurrent: async () => { throw new Error("permission denied"); } },
        sidePanel:  { open: async opts => openCalls.push(opts) },
        storage:    { sync: {}, local: {}, onChanged: { addListener: () => {} } },
        runtime:    {},
        tabs:       {},
        contextMenus: {}
    };
    delete global.browser;

    const ext = loadExt();
    await ext.sidebar.open();

    assert.equal(openCalls.length, 1, "sidePanel.open s'ha de cridar igualment");
    assert.deepEqual(openCalls[0], {}, "opts ha de ser {} quan getCurrent falla");
});

// ---------------------------------------------------------------------------
// Chromium: windowId explícit → no crida getCurrent
// ---------------------------------------------------------------------------
test("ext.sidebar.open (Chromium) - windowId explícit passa directament sense getCurrent", async () => {
    let getCalledCount = 0;
    const openCalls = [];
    global.chrome = {
        windows:    { getCurrent: async () => { getCalledCount++; return { id: 99 }; } },
        sidePanel:  { open: async opts => openCalls.push(opts) },
        storage:    { sync: {}, local: {}, onChanged: { addListener: () => {} } },
        runtime:    {},
        tabs:       {},
        contextMenus: {}
    };
    delete global.browser;

    const ext = loadExt();
    await ext.sidebar.open(7);

    assert.equal(getCalledCount, 0, "getCurrent no s'ha de cridar si windowId és explícit");
    assert.equal(openCalls[0].windowId, 7);
});

// ---------------------------------------------------------------------------
// Firefox: ext.sidebar.open delega a sidebarAction.open
// ---------------------------------------------------------------------------
test("ext.sidebar.open (Firefox) - delega a sidebarAction.open", async () => {
    let called = false;
    global.browser = {
        sidebarAction: { open: async () => { called = true; } },
        storage:       { sync: {}, local: {}, onChanged: { addListener: () => {} } },
        runtime:       {},
        tabs:          {},
        menus:         {}
    };
    delete global.chrome;

    const ext = loadExt();
    await ext.sidebar.open();

    assert.ok(called, "sidebarAction.open ha de ser cridat en Firefox");
});

// ---------------------------------------------------------------------------
// ext.menus apunta a contextMenus a Chromium, menus a Firefox
// ---------------------------------------------------------------------------
test("ext.menus (Chromium) - apunta a chrome.contextMenus", () => {
    const contextMenus = { create: () => {} };
    global.chrome = {
        contextMenus,
        storage:    { sync: {}, local: {}, onChanged: { addListener: () => {} } },
        runtime:    {},
        tabs:       {},
        sidePanel:  {}
    };
    delete global.browser;

    const ext = loadExt();
    assert.strictEqual(ext.menus, contextMenus);
});

test("ext.menus (Firefox) - apunta a browser.menus", () => {
    const menus = { create: () => {} };
    global.browser = {
        menus,
        storage:       { sync: {}, local: {}, onChanged: { addListener: () => {} } },
        runtime:       {},
        tabs:          {},
        sidebarAction: {}
    };
    delete global.chrome;

    const ext = loadExt();
    assert.strictEqual(ext.menus, menus);
});
