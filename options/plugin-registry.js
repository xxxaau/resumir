/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// options/plugin-registry.js
// Registre únic dels plugins a la pàgina de configuració: id de la pàgina,
// nom (el MATEIX que veu l'usuari al sidebar), interruptor que el governa i
// icona del menú lateral i grup de la barra d'eines (Generar | Exportar | Vista:
// els mateixos grups, en el mateix ordre, que TOOLBAR_GROUPS de sidebar/ui.js). Les targetes de `settings.html` hi han de coincidir
// (ho vigila tests/plugin-registry.test.mjs).

const PLUGIN_GROUPS = ["Generar", "Exportar", "Vista"];

const PLUGIN_REGISTRY = [
    { id: "resum", group: "Generar", label: "Resum", enableId: "enableResum", icon: null },
    { id: "selectpdf", group: "Generar", label: "PDF", enableId: "enablePdf", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
    { id: "obsidian", group: "Exportar", label: "Desar a Obsidian", enableId: "enableObsidian", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 13V7"/><path d="m15 10-3 3-3-3"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/></svg>' },
    { id: "markdown", group: "Exportar", label: "Copiar Markdown", enableId: "enableMarkdown", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17V7l4 5 4-5v10"/><path d="M15 7h2a5 5 0 0 1 0 10h-2V7z"/></svg>' },
    { id: "deepdive", group: "Generar", label: "Aprofundiment", enableId: "enableDeepdive", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' },
    { id: "bionic", group: "Vista", label: "Lectura biònica", enableId: "enableBionic", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>' },
    { id: "science", group: "Generar", label: "Validació científica", enableId: "enableScience", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v2.789a4 4 0 0 1-.672 2.219l-4.734 7.1A4 4 0 0 0 7 20h10a4 4 0 0 0 3.406-6.102l-4.734-7.1A4 4 0 0 1 15 4.789V2"/><path d="M9 2h6"/><path d="M14 15h-4"/><path d="M16 11h-4"/></svg>' },
    { id: "conceptmap", group: "Generar", label: "Mapa conceptual", enableId: "enableConceptMap", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>' },
    { id: "simple", group: "Generar", label: "Explica-ho fàcil", enableId: "enableSimple", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>' },
    { id: "anki", group: "Generar", label: "Targetes Anki", enableId: "enableAnki", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 6V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-1"/><rect x="3" y="8" width="15" height="13" rx="2"/><path d="M7 13h7"/><path d="M7 17h4"/></svg>' },
];

if (typeof module !== "undefined" && module.exports) {
    module.exports = { PLUGIN_REGISTRY, PLUGIN_GROUPS };
}
