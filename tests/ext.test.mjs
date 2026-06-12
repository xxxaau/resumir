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

// ---------------------------------------------------------------------------
// REGRESSIÓ: el Chromium/Edge modern (Chrome ≥ ~140) TAMBÉ exposa un global
// `browser` (SENSE sidebarAction). Amb la detecció antiga
// `typeof browser !== 'undefined'`, isFirefox era true a Chromium → tot
// ext.sidebar agafava la branca de Firefox: open()/toggle() cridaven
// sidebarAction (inexistent) i setPanelBehavior quedava en no-op → el side
// panel no s'obria mai. Aquest test bloqueja qualsevol reintroducció del bug.
// ---------------------------------------------------------------------------
test("REGRESSIÓ Chromium amb global `browser` present → usa sidePanel, no sidebarAction", async () => {
    const openCalls = [];
    const behaviorCalls = [];
    global.chrome = {
        windows:    { getCurrent: async () => ({ id: 9 }) },
        sidePanel:  {
            open:             async opts => openCalls.push(opts),
            setPanelBehavior: async o => behaviorCalls.push(o),
        },
        storage:      { sync: {}, local: {}, onChanged: { addListener: () => {} } },
        runtime:      {},
        tabs:         {},
        contextMenus: {},
    };
    // Chromium/Edge real: `browser` existeix però NO té sidebarAction.
    global.browser = { runtime: {}, storage: {}, tabs: {} };

    const ext = loadExt();
    await ext.sidebar.open(9);
    await ext.sidebar.setPanelBehavior({ openPanelOnActionClick: true });

    assert.equal(openCalls.length, 1, "ext.sidebar.open ha d'usar chrome.sidePanel.open (branca Chromium)");
    assert.deepEqual(openCalls[0], { windowId: 9 });
    assert.equal(behaviorCalls.length, 1, "setPanelBehavior NO ha de ser no-op a Chromium");
    assert.deepEqual(behaviorCalls[0], { openPanelOnActionClick: true });

    delete global.browser;
});

// Contrapartida: Firefox real (browser AMB sidebarAction) → branca Firefox.
test("REGRESSIÓ Firefox (browser amb sidebarAction) → usa sidebarAction", async () => {
    let sidebarOpened = false;
    const behaviorCalls = [];
    global.browser = {
        sidebarAction: { open: async () => { sidebarOpened = true; } },
        sidePanel:     { setPanelBehavior: async o => behaviorCalls.push(o) },
        storage:       { sync: {}, local: {}, onChanged: { addListener: () => {} } },
        runtime:       {},
        tabs:          {},
    };
    delete global.chrome;

    const ext = loadExt();
    await ext.sidebar.open();
    await ext.sidebar.setPanelBehavior({ openPanelOnActionClick: true });

    assert.ok(sidebarOpened, "ext.sidebar.open ha d'usar sidebarAction.open a Firefox");
    assert.equal(behaviorCalls.length, 0, "setPanelBehavior ha de ser no-op a Firefox (no hi ha openPanelOnActionClick)");

    delete global.browser;
});
