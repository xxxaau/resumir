/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// shared/icons.js
// Single source of truth for all SVG icon paths used across the extension.
// All icons follow Lucide style: 24x24 viewBox, stroke-width 2, fill none,
// stroke currentColor, round caps/joins (applied at the SVG wrapper level).

const MARKMAP_ICONS = {
    fit: `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>`,
    zoomIn: `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
    zoomOut: `<line x1="5" y1="12" x2="19" y2="12"/>`,
    expandAll: `<polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/>`,
    collapseAll: `<polyline points="7 11 12 6 17 11"/><polyline points="7 18 12 13 17 18"/>`,
    downloadPng: `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>`,
    fullPage: `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>`,
    close: `<path d="M18 6L6 18M6 6l12 12"/>`,
    // NotebookLM-style controls
    toggleAll: `<polyline points="7 9 12 4 17 9"/><polyline points="7 15 12 20 17 15"/>`,
    download: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,
    expand: `<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>`,
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = { MARKMAP_ICONS };
}
