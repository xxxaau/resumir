/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// shared/icons.js
// Single source of truth for all SVG icon paths used across the extension.
// All icons follow Lucide style: 24x24 viewBox, stroke-width 2, fill none,
// stroke currentColor, round caps/joins (applied at the SVG wrapper level).

const MARKMAP_ICONS = {
    zoomIn: `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
    zoomOut: `<line x1="5" y1="12" x2="19" y2="12"/>`,
    close: `<path d="M18 6L6 18M6 6l12 12"/>`,
    // NotebookLM-style controls
    toggleAll: `<polyline points="7 9 12 4 17 9"/><polyline points="7 15 12 20 17 15"/>`,
    download: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,
    fit: `<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>`,
    expand: `<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>`,
};

// Icones dels tipus de contingut (i del peu): un sol joc SVG en lloc d'emoji.
const TYPE_ICON_PATHS = {
    summary: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>`,
    deepdive: `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
    conceptmap: `<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>`,
    science: `<path d="M9 2v2.789a4 4 0 0 1-.672 2.219l-4.734 7.1A4 4 0 0 0 7 20h10a4 4 0 0 0 3.406-6.102l-4.734-7.1A4 4 0 0 1 15 4.789V2"/><path d="M9 2h6"/>`,
    simple: `<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>`,
    anki: `<path d="M7 6V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-1"/><rect x="3" y="8" width="15" height="13" rx="2"/><path d="M7 13h7"/><path d="M7 17h4"/>`,
    cache: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
    history: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
};

/** Element <svg> (decoratiu, color heretat) per a un tipus o una icona del peu. */
function typeIconSvg(id, size = 14) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "type-svg");
    const doc = new DOMParser().parseFromString(`<svg xmlns="${NS}">${TYPE_ICON_PATHS[id] || ""}</svg>`, "image/svg+xml");
    for (const child of [...doc.documentElement.children]) svg.appendChild(document.importNode(child, true));
    return svg;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { MARKMAP_ICONS, TYPE_ICON_PATHS };
}
