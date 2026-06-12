/**
 * tests/background.test.mjs
 * Tests unitaris per a background.js
 * Execució: node --test tests/background.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createStorageMock } from "./helpers/storage-mock.mjs";

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Mock d'ext que captura els listeners registrats
// ---------------------------------------------------------------------------

const storageMock = createStorageMock();

const listeners = {
    actionClicked:    null,
    onInstalled:      null,
    menusClicked:     null,
    storageChanged:   null,
};

const sidebarCalls = { toggle: [], open: [], setPanelBehavior: [] };
const menusCalls   = { removeAll: 0, create: [] };
const messageSent  = [];

global.ext = {
    action: {
        onClicked: { addListener: (fn) => { listeners.actionClicked = fn; } },
    },
    sidebar: {
        toggle:           async (wId) => { sidebarCalls.toggle.push(wId); },
        open:             async (wId) => { sidebarCalls.open.push(wId); return Promise.resolve(); },
        setPanelBehavior: async (opts) => { sidebarCalls.setPanelBehavior.push(opts); },
    },
    runtime: {
        onInstalled: { addListener: (fn) => { listeners.onInstalled = fn; } },
        sendMessage:  async (msg) => { messageSent.push(msg); },
        getBrowserInfo: null, // Firefox-only — null simula Chromium
    },
    menus: {
        onClicked:  { addListener: (fn) => { listeners.menusClicked = fn; } },
        removeAll:  async () => { menusCalls.removeAll++; },
        create:     (opts) => { menusCalls.create.push(opts); },
    },
    permissions: {
        request: async () => true,
    },
    storage: {
        local:     storageMock,
        onChanged: { addListener: (fn) => { listeners.storageChanged = fn; } },
    },
};

// (Re)carrega background.js simulant un navegador concret via ext.isFirefox
// (la detecció unificada que exposa ext.js).
function loadBackground({ firefox } = { firefox: false }) {
    listeners.actionClicked  = null;
    listeners.onInstalled    = null;
    listeners.menusClicked   = null;
    listeners.storageChanged = null;
    global.ext.isFirefox = firefox;
    delete require.cache[require.resolve("../background.js")];
    require("../background.js");
}

// Càrrega per defecte: Chromium
loadBackground({ firefox: false });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetCalls() {
    sidebarCalls.toggle.length = 0;
    sidebarCalls.open.length   = 0;
    sidebarCalls.setPanelBehavior.length = 0;
    menusCalls.removeAll = 0;
    menusCalls.create.length = 0;
    messageSent.length = 0;
    storageMock._clear();
}

// ---------------------------------------------------------------------------
// action.onClicked: Chromium obre natiu (sense listener); Firefox amb listener
// ---------------------------------------------------------------------------

test("background: a Chromium NO registra action.onClicked (l'obre el navegador)", () => {
    loadBackground({ firefox: false });
    assert.equal(listeners.actionClicked, null,
        "A Chromium el listener és mútuament excloent amb el toggle natiu — no s'ha de registrar");
});

test("background: a Chromium activa openPanelOnActionClick en carregar", () => {
    resetCalls();
    loadBackground({ firefox: false });
    assert.ok(sidebarCalls.setPanelBehavior.length >= 1,
        "setPanelBehavior s'ha de cridar en carregar");
    assert.deepEqual(sidebarCalls.setPanelBehavior.at(-1), { openPanelOnActionClick: true },
        "openPanelOnActionClick ha de ser true perquè el navegador obri el panell amb el clic");
});

test("background: a Firefox action.onClicked crida ext.sidebar.toggle", async () => {
    loadBackground({ firefox: true });
    resetCalls();
    assert.ok(listeners.actionClicked, "A Firefox el listener s'ha de registrar");
    await listeners.actionClicked({ windowId: 42 });
    assert.equal(sidebarCalls.toggle.length, 1, "sidebar.toggle ha de ser cridat una vegada");
    assert.equal(sidebarCalls.toggle[0], 42, "Ha de passar el windowId correcte");
    loadBackground({ firefox: false }); // restaura l'estat per defecte
});

// ---------------------------------------------------------------------------
// onInstalled (reason: install) → setPanelBehavior + removeAll + create menus
// ---------------------------------------------------------------------------

test("background: onInstalled (install) → setPanelBehavior + menus creats", async () => {
    resetCalls();
    assert.ok(listeners.onInstalled, "El listener onInstalled ha d'estar registrat");
    await listeners.onInstalled({ reason: "install" });

    assert.equal(sidebarCalls.setPanelBehavior.length, 1,
        "setPanelBehavior ha de ser cridat a onInstalled");
    assert.ok(menusCalls.removeAll >= 1, "removeAll ha de ser cridat");
    const ids = menusCalls.create.map(m => m.id);
    assert.ok(ids.includes("summarize-selection"), "Ha de crear el menú summarize-selection");
    assert.ok(ids.includes("summarize-page"),      "Ha de crear el menú summarize-page");
});

test("background: onInstalled (update) → menus recreats sense petició de permisos", async () => {
    resetCalls();
    await listeners.onInstalled({ reason: "update" });
    const ids = menusCalls.create.map(m => m.id);
    assert.ok(ids.includes("summarize-selection"), "Ha de recrear el menú summarize-selection");
    assert.ok(ids.includes("summarize-page"),      "Ha de recrear el menú summarize-page");
});

// ---------------------------------------------------------------------------
// menus.onClicked → summarize-selection
// ---------------------------------------------------------------------------

test("background: menú summarize-selection → desa pendingSummary i envia missatge", async () => {
    resetCalls();
    assert.ok(listeners.menusClicked, "El listener menusClicked ha d'estar registrat");

    await listeners.menusClicked(
        { menuItemId: "summarize-selection", selectionText: "Text seleccionat" },
        { windowId: 1, url: "https://example.com" }
    );

    // Ha d'haver obert la sidebar
    assert.equal(sidebarCalls.open.length, 1, "sidebar.open ha de ser cridat");

    // Ha de desar el pendingSummary
    const stored = await storageMock.get("pendingSummary");
    assert.deepEqual(stored.pendingSummary, {
        type: "selection",
        content: "Text seleccionat",
    });

    // Ha d'haver enviat el missatge
    assert.equal(messageSent.length, 1, "sendMessage ha de ser cridat");
    assert.equal(messageSent[0].action, "trigger_summary");
    assert.equal(messageSent[0].data.type, "selection");
    assert.equal(messageSent[0].data.content, "Text seleccionat");
});

test("background: menú summarize-selection sense text obre sidebar però no desa ni envia", async () => {
    resetCalls();
    await listeners.menusClicked(
        { menuItemId: "summarize-selection", selectionText: "" },
        { windowId: 1 }
    );
    // La sidebar s'obre igualment (preservar user gesture token) però no es desa res
    const stored = await storageMock.get("pendingSummary");
    assert.equal(stored.pendingSummary, undefined, "pendingSummary NO s'ha de desar sense text");
    assert.equal(messageSent.length, 0, "sendMessage NO s'ha d'enviar sense text");
});

// ---------------------------------------------------------------------------
// menus.onClicked → summarize-page
// ---------------------------------------------------------------------------

test("background: menú summarize-page → desa pendingSummary i envia missatge", async () => {
    resetCalls();
    await listeners.menusClicked(
        { menuItemId: "summarize-page" },
        { windowId: 2, url: "https://example.com/page" }
    );

    assert.equal(sidebarCalls.open.length, 1, "sidebar.open ha de ser cridat");

    const stored = await storageMock.get("pendingSummary");
    assert.deepEqual(stored.pendingSummary, {
        type: "page",
        url: "https://example.com/page",
    });

    assert.equal(messageSent[0].data.type, "page");
    assert.equal(messageSent[0].data.url,  "https://example.com/page");
});

// ---------------------------------------------------------------------------
// storage.onChanged → obre sidebar quan arriba pendingCacheLoad
// ---------------------------------------------------------------------------

test("background: storage.onChanged obre sidebar quan pendingCacheLoad canvia", async () => {
    resetCalls();
    assert.ok(listeners.storageChanged, "El listener storageChanged ha d'estar registrat");

    listeners.storageChanged(
        { pendingCacheLoad: { newValue: "https://example.com/cached" } },
        "local"
    );
    // open() és async; donem un tick perquè s'executi
    await new Promise(r => setTimeout(r, 10));

    assert.equal(sidebarCalls.open.length, 1, "sidebar.open ha de ser cridat amb pendingCacheLoad");
});

test("background: storage.onChanged ignora canvis que no són pendingCacheLoad", async () => {
    resetCalls();
    listeners.storageChanged(
        { apiKey: { newValue: "nova-clau" } },
        "local"
    );
    await new Promise(r => setTimeout(r, 10));
    assert.equal(sidebarCalls.open.length, 0, "sidebar.open NO s'ha de cridar");
});

test("background: storage.onChanged ignora area sync", async () => {
    resetCalls();
    listeners.storageChanged(
        { pendingCacheLoad: { newValue: "val" } },
        "sync"
    );
    await new Promise(r => setTimeout(r, 10));
    assert.equal(sidebarCalls.open.length, 0, "sidebar.open NO s'ha de cridar per area sync");
});
