import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);
const { PLUGIN_REGISTRY } = require("../options/plugin-registry.js");
const settings = new JSDOM(readFileSync(new URL("../options/settings.html", import.meta.url), "utf8")).window.document;
const sidebar = new JSDOM(readFileSync(new URL("../sidebar/sidebar.html", import.meta.url), "utf8")).window.document;

// Botó del sidebar que correspon a cada plugin (només els que en tenen)
const SIDEBAR_BUTTON = { obsidian: "obsidianBtn", markdown: "copyBtn", deepdive: "deepDiveBtn", bionic: "bionicBtn", science: "scienceBtn", conceptmap: "conceptMapBtn", simple: "explainSimpleBtn", anki: "ankiBtn" };

test("registre: cada plugin té targeta, pàgina i interruptor a settings.html", () => {
    for (const p of PLUGIN_REGISTRY) {
        assert.ok(settings.getElementById(`tab-${p.id}`), `falta la pàgina tab-${p.id}`);
        assert.ok(settings.getElementById(p.enableId), `falta l'interruptor ${p.enableId}`);
        assert.ok(settings.querySelector(`.extension-actions[data-extension-id="${p.id}"]`), `falta la targeta de ${p.id}`);
    }
});

test("registre: el nom de la targeta i de la pàgina és el del registre", () => {
    for (const p of PLUGIN_REGISTRY) {
        const card = settings.querySelector(`.extension-actions[data-extension-id="${p.id}"]`).closest(".extension-item");
        const name = card.querySelector(".extension-name").firstChild.textContent.trim();
        assert.equal(name, p.label, `targeta de ${p.id}`);
        const title = settings.querySelector(`#tab-${p.id} .page-title`).textContent;
        assert.ok(title.includes(p.label), `títol de la pàgina ${p.id}: «${title}»`);
    }
});

test("registre: el nom és el mateix que el títol del botó del sidebar", () => {
    for (const [id, btnId] of Object.entries(SIDEBAR_BUTTON)) {
        const p = PLUGIN_REGISTRY.find(x => x.id === id);
        const btn = sidebar.getElementById(btnId);
        assert.ok(btn, `falta el botó ${btnId}`);
        const expected = id === "markdown" ? "Copiar Markdown" : p.label;
        assert.equal(btn.getAttribute("aria-label"), expected, `aria-label de ${btnId}`);
        assert.equal(btn.getAttribute("title"), expected, `title de ${btnId}`);
    }
});

test("registre: cap plugin és a la pàgina sense ser al registre", () => {
    const inHtml = [...settings.querySelectorAll(".extension-actions[data-extension-id]")].map(e => e.dataset.extensionId).sort();
    assert.deepEqual(inHtml, PLUGIN_REGISTRY.map(p => p.id).sort());
});
