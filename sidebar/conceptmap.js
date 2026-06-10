/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// sidebar/conceptmap.js
// Parser and renderer for concept map trees using native <details>/<summary> elements.

/**
 * Parses indented Markdown list text into a hierarchical DOM tree.
 * Returns a DocumentFragment with the concept map structure.
 *
 * @param {string} text - Markdown indented list (lines starting with "- ")
 * @param {Object} options - Optional configuration { style, autoExpand }
 * @returns {DocumentFragment}
 */
function parseConceptTree(text, options = {}) {
    const { style = "tree", autoExpand = false } = options;
    const fragment = document.createDocumentFragment();

    if (!text || typeof text !== "string") {
        return fragment;
    }

    const lines = text.split("\n").filter(line => line.trimStart().startsWith("- "));

    if (lines.length === 0) {
        // Fallback: text doesn't match expected format, use formatTextToFragment
        if (typeof formatTextToFragment === "function") {
            return formatTextToFragment(text);
        }
        const p = document.createElement("p");
        p.textContent = text;
        fragment.appendChild(p);
        return fragment;
    }

    // Detect indent unit (2 or 4 spaces)
    let indentUnit = 2;
    for (const line of lines) {
        const leadingSpaces = line.length - line.trimStart().length;
        if (leadingSpaces > 0) {
            indentUnit = leadingSpaces <= 2 ? 2 : (leadingSpaces <= 4 ? leadingSpaces : 2);
            break;
        }
    }

    // Build tree structure
    const nodes = lines.map(line => {
        const leadingSpaces = line.length - line.trimStart().length;
        const level = Math.round(leadingSpaces / indentUnit);
        const content = line.trimStart().substring(2); // Remove "- "
        return { level, content };
    });

    // Parse node content: split "label: description"
    function parseNodeContent(content) {
        const colonIdx = content.indexOf(": ");
        if (colonIdx > 0 && colonIdx < content.length - 2) {
            return {
                label: content.substring(0, colonIdx),
                desc: content.substring(colonIdx + 2)
            };
        }
        return { label: content, desc: null };
    }

    // Find children of a node at a given index
    function getChildren(parentIdx, parentLevel) {
        const children = [];
        for (let i = parentIdx + 1; i < nodes.length; i++) {
            if (nodes[i].level <= parentLevel) break;
            if (nodes[i].level === parentLevel + 1) {
                children.push(i);
            }
        }
        return children;
    }

    // Recursively build DOM
    function buildNode(idx, isRoot) {
        const node = nodes[idx];
        const { label, desc } = parseNodeContent(node.content);
        const children = getChildren(idx, node.level);

        if (children.length === 0) {
            // Leaf node
            const li = document.createElement("li");
            li.textContent = label;
            if (desc) {
                const descSpan = document.createElement("span");
                descSpan.className = "concept-desc";
                descSpan.textContent = desc;
                li.appendChild(descSpan);
            }
            return li;
        }

        // Branch node with children
        const li = document.createElement("li");
        const details = document.createElement("details");
        if (isRoot) details.open = true;

        const summary = document.createElement("summary");
        summary.textContent = label;
        if (desc) {
            const descSpan = document.createElement("span");
            descSpan.className = "concept-desc";
            descSpan.textContent = " " + desc;
            summary.appendChild(descSpan);
        }
        details.appendChild(summary);

        const ul = document.createElement("ul");
        for (const childIdx of children) {
            ul.appendChild(buildNode(childIdx, false));
        }
        details.appendChild(ul);
        li.appendChild(details);
        return li;
    }

    // Build controls bar
    const controls = document.createElement("div");
    controls.className = "concept-map-controls";

    const expandBtn = document.createElement("button");
    expandBtn.textContent = "Desplega tot";
    expandBtn.type = "button";
    expandBtn.addEventListener("click", () => {
        const container = controls.parentElement;
        if (container) expandAll(container);
    });

    const collapseBtn = document.createElement("button");
    collapseBtn.textContent = "Replega tot";
    collapseBtn.type = "button";
    collapseBtn.addEventListener("click", () => {
        const container = controls.parentElement;
        if (container) collapseAll(container);
    });

    controls.appendChild(expandBtn);
    controls.appendChild(collapseBtn);
    fragment.appendChild(controls);

    // Build the tree starting from top-level nodes
    const rootUl = document.createElement("ul");
    rootUl.className = `concept-map concept-map-${style}`;

    const topLevel = nodes.reduce((min, n) => Math.min(min, n.level), Infinity);
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].level === topLevel) {
            rootUl.appendChild(buildNode(i, i === 0 || autoExpand));
        }
    }

    fragment.appendChild(rootUl);
    
    // Auto-expand all if configured
    if (autoExpand) {
        setTimeout(() => {
            const allDetails = rootUl.querySelectorAll("details");
            allDetails.forEach(d => { d.open = true; });
        }, 0);
    }
    
    return fragment;
}

/**
 * Collapse all <details> in the container except the root.
 * @param {HTMLElement} container
 */
function collapseAll(container) {
    if (!container) return;
    const allDetails = container.querySelectorAll("details");
    allDetails.forEach((d, idx) => {
        d.open = idx === 0; // Keep root open
    });
}

/**
 * Expand all <details> in the container.
 * @param {HTMLElement} container
 */
function expandAll(container) {
    if (!container) return;
    const allDetails = container.querySelectorAll("details");
    allDetails.forEach(d => { d.open = true; });
}

/**
 * Renders an interactive markmap visualization from Markdown text.
 * Uses markmap-lib and markmap-view for a visual mind map.
 * 
 * @param {string} text - Markdown indented list text
 * @param {string} pageTitle - Page title for the exported filename
 * @returns {DocumentFragment}
 */

// NOTA: el nom de fitxer PNG el construeix window.buildConceptMapFilename
// (sidebar/conceptmap-filename.js, carregat abans). NO declarar aquí cap
// wrapper top-level amb el mateix nom: en script clàssic la declaració
// sobreescriu window.buildConceptMapFilename i es crida a si mateixa
// (recursió infinita en mode dev amb scripts separats).

function renderMarkmapInteractive(text, pageTitle = "") {
    const fragment = document.createDocumentFragment();

    if (!text || typeof text !== "string") {
        return fragment;
    }

    if (typeof window.markmapNative === "undefined") {
        console.error("markmapNative not loaded");
        const errorP = document.createElement("p");
        errorP.textContent = "Error: el renderitzador del mapa no s'ha pogut carregar.";
        errorP.style.color = "var(--error-color, #d32f2f)";
        fragment.appendChild(errorP);
        return fragment;
    }

    // Container
    const container = document.createElement("div");
    container.className = "markmap-container";

    // SVG
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.border = "1px solid var(--border-color)";
    svg.style.borderRadius = "8px";
    svg.style.background = "var(--bg-color)";
    container.appendChild(svg);

    // Floating controls
    const controls = document.createElement("div");
    controls.className = "markmap-controls";

    const makeBtn = (svgInner, title) => {
        const b = document.createElement("button");
        b.className = "markmap-control-btn";
        b.type = "button";
        b.title = title;
        b.setAttribute("aria-label", title);
        // Build the inner SVG via DOM nodes (no innerHTML)
        const parser = new DOMParser();
        const doc = parser.parseFromString(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgInner}</svg>`,
            "image/svg+xml"
        );
        const importedSvg = document.importNode(doc.documentElement, true);
        b.appendChild(importedSvg);
        return b;
    };

    // Controls estil NotebookLM: columna a baix-dreta amb 4 botons.
    let allExpanded = false;  // estat del toggle desplegar/plegar-tot
    const toggleAllBtn = makeBtn(MARKMAP_ICONS.toggleAll, "Desplegar / plegar tot");
    const zoomInBtn = makeBtn(MARKMAP_ICONS.zoomIn, "Ampliar");
    const zoomOutBtn = makeBtn(MARKMAP_ICONS.zoomOut, "Reduir");
    const downloadBtn = makeBtn(MARKMAP_ICONS.download, "Descarregar com a PNG");

    controls.appendChild(toggleAllBtn);
    controls.appendChild(zoomInBtn);
    controls.appendChild(zoomOutBtn);
    controls.appendChild(downloadBtn);
    container.appendChild(controls);

    // Botó de pantalla completa, separat i posicionat a dalt-dreta (com NotebookLM).
    const fullPageBtn = makeBtn(MARKMAP_ICONS.expand, "Vista de pantalla completa");
    fullPageBtn.classList.add("markmap-fullscreen-btn");
    container.appendChild(fullPageBtn);

    fragment.appendChild(container);

    // Initialize renderer after element is in DOM
    setTimeout(() => {
        try {
            const root = window.markmapNative.parseMarkdownTree(text);
            // Per defecte només es veuen els nivells 0 i 1: plega a partir de profunditat 1
            // (els nodes de nivell 1 queden plegats, amagant el nivell 2+).
            const collapseFromLevel = (node, currentDepth, targetDepth) => {
                if (currentDepth >= targetDepth && node.children && node.children.length > 0) {
                    node.fold = true;
                }
                if (node.children) node.children.forEach(c => collapseFromLevel(c, currentDepth + 1, targetDepth));
            };
            collapseFromLevel(root, 0, 1);

            const mm = window.markmapNative.createMindMap(svg, root, {});

            zoomInBtn.addEventListener("click", () => mm.rescale(1.25));
            zoomOutBtn.addEventListener("click", () => mm.rescale(0.8));
            toggleAllBtn.addEventListener("click", () => {
                allExpanded = !allExpanded;
                mm.setFoldAll(!allExpanded);  // expandit → fold=false a tots
                mm.rerender();
                requestAnimationFrame(() => mm.fit());
            });
            downloadBtn.addEventListener("click", async () => {
                try {
                    // Shared filename builder (conceptmap-filename.js) seeded
                    // with the root label; date-only fallback if it's missing.
                    const builder = typeof window.buildConceptMapFilename === "function"
                        ? window.buildConceptMapFilename
                        : () => "mapa-conceptual.png";
                    const filename = builder(root.label || pageTitle);
                    await window.markmapNative.exportToPNG(svg, filename, { backgroundColor: "#ffffff" });
                } catch (error) {
                    console.error("Error exporting PNG:", error);
                    alert("Error exportant a PNG.");
                }
            });
            fullPageBtn.addEventListener("click", () => {
                openFullPageView(text, pageTitle);
            });
        } catch (error) {
            console.error("Map rendering error:", error);
            const errorP = document.createElement("p");
            errorP.textContent = `Error renderitzant mapa: ${error.message}`;
            errorP.style.color = "var(--error-color, #d32f2f)";
            errorP.style.padding = "1em";
            container.appendChild(errorP);
        }
    }, 0);

    return fragment;
}

/**
 * Returns true only for URLs we are CERTAIN cannot host an injected overlay.
 * For unknown/empty URLs we return true (let executeScript try and fail cleanly).
 * @param {string} url
 * @returns {boolean}
 */
function isInjectableUrl(url) {
    if (!url) return true; // unknown -> let it try; executeScript will surface the real error
    const blockedPrefixes = [
        'about:', 'chrome:', 'moz-extension:', 'chrome-extension:',
        'view-source:', 'javascript:',
        'https://addons.mozilla.org', 'https://chromewebstore.google.com', 'https://chrome.google.com'
    ];
    return !blockedPrefixes.some(p => url.startsWith(p));
}

/**
 * Opens a full-page overlay of the mind map in the active tab.
 *
 * Strategy: inject a self-contained function into the page's MAIN world that
 * re-renders the map from scratch (parser + layout + SVG render + pan/zoom +
 * controls + PNG export). This keeps all the code under the extension's
 * own bundle (no <script src> to web-accessible vendors) while restoring
 * full interactivity inside the host page.
 *
 * @param {string} text - Original markdown text
 * @param {string} pageTitle - Page title (used for the PNG filename)
 */
async function openFullPageView(text, pageTitle = "") {
    try {
        const tabs = await ext.tabs.query({ active: true, currentWindow: true });
        if (!tabs.length) { alert('No hi ha cap pestanya activa.'); return; }
        const tabId = tabs[0].id;
        const tabUrl = tabs[0].url;

        if (!isInjectableUrl(tabUrl)) {
            alert(`Aquesta pàgina és interna del navegador i no admet overlays d'extensions (${tabUrl}).\n\nCanvia a una pestanya web normal (http/https) i torna-ho a provar.`);
            return;
        }

        const result = await executeScriptSafe({
            target: { tabId },
            world: "MAIN",
            func: fullscreenOverlayFunc,
            args: [text, pageTitle, MARKMAP_ICONS]
        });

        if (!result || !result.length) {
            alert("No s'ha pogut crear l'overlay a la pàgina.");
            return;
        }
        const overlayRes = result[0]?.result;
        if (typeof overlayRes === 'string' && overlayRes.startsWith('error')) {
            alert('Error al mapa: ' + overlayRes);
        }
    } catch (error) {
        console.error('Error opening fullscreen view:', error);
        alert('Error obrint vista completa: ' + error.message);
    }
}

/**
 * Self-contained function injected into the host page's MAIN world.
 * Receives (text, pageTitle, icons) and builds an interactive full-screen overlay
 * with the mind map. No external dependencies — all logic inlined.
 *
 * @param {Object} icons - Icon SVG paths from MARKMAP_ICONS
 *
 * IMPORTANT: this function is serialised to a string by executeScript and
 * executed in the host page context. It cannot reference any outer scope.
 */
// ⚠️⚠️ DUPLICACIÓ DELIBERADA — CÒPIA INLINE DE sidebar/markmap-native.js ⚠️⚠️
// Aquesta funció se serialitza a string i s'injecta al món MAIN de la pàgina
// via executeScript, on NO pot accedir a window.markmapNative. Per això tota la
// lògica de render/layout/fold/clic/colors està DUPLICADA aquí.
// REGLA: qualsevol canvi al renderer (colors branca/fulla, arestes, profunditat
// de plegat per defecte, clic a la pastilla, layout) s'HA D'APLICAR TAMBÉ a
// sidebar/markmap-native.js perquè la sidebar i la pantalla completa no
// divergeixin. Vegeu docs/LEARNINGS.md.
function fullscreenOverlayFunc(text, _pageTitle, icons) {
    try {
        // Remove existing overlay if any (re-open behaviour). Si la instància
        // anterior va exposar el seu close(), usem-lo: també desregistra els
        // listeners de window/document (mousemove, mouseup, keydown, pagehide),
        // que un simple .remove() deixaria penjats per sempre a la pàgina.
        const existing = document.getElementById('markmap-fullscreen-overlay');
        if (existing) {
            if (typeof existing.__mmClose === 'function') existing.__mmClose();
            else existing.remove();
        }

        const SVG_NS = 'http://www.w3.org/2000/svg';
        // Paleta NotebookLM per PROFUNDITAT: cada nivell té un color distint.
        // Índex = min(depth, 3). 0 lavanda · 1 blau · 2 verd · 3+ verd clar.
        const DEPTH_SOLID = ['#b1a8e6', '#a7c6ef', '#93d4b4', '#c2ebd3'];
        const DEPTH_GRAD  = [['#c6c0f2', '#a59ce0'], ['#c1d6f6', '#97b8e8'], ['#b9ebcd', '#87cda8'], ['#d6f2e0', '#b0e0c4']];
        const EDGE_COLOR  = '#c7cbe0';  // arestes uniformes clares
        const TEXT_COLOR  = '#1a1a1a';

        // ─── Parser ─────────────────────────────────────────────────────────
        function parseMarkdownTree(src) {
            if (!src || typeof src !== 'string') return { label: '(buit)', children: [], depth: 0 };
            const rawLines = src.split('\n');
            const lines = [];
            for (const line of rawLines) {
                const trimmed = line.trimStart();
                if (!trimmed.startsWith('- ') && !trimmed.startsWith('* ')) continue;
                lines.push({ indent: line.length - trimmed.length, content: trimmed.substring(2) });
            }
            if (lines.length === 0) return { label: src.split('\n')[0] || '(sense contingut)', children: [], depth: 0 };
            let unit = 2;
            for (const l of lines) {
                if (l.indent > 0) { unit = l.indent <= 2 ? 2 : (l.indent <= 4 ? l.indent : 2); break; }
            }
            const minIndent = lines.reduce((m, l) => Math.min(m, l.indent), Infinity);
            const nodes = lines.map(l => ({ level: Math.max(0, Math.round((l.indent - minIndent) / unit)), content: l.content }));
            const root = { label: '', children: [], depth: 0 };
            const stack = [{ node: root, level: -1 }];
            for (const n of nodes) {
                while (stack.length > 1 && stack[stack.length - 1].level >= n.level) stack.pop();
                const parent = stack[stack.length - 1].node;
                const child = { label: n.content, children: [], depth: parent.depth + 1 };
                parent.children.push(child);
                stack.push({ node: child, level: n.level });
            }
            if (root.children.length === 1) {
                const promoted = root.children[0];
                const fixDepth = (node, d) => { node.depth = d; node.children.forEach(c => fixDepth(c, d + 1)); };
                fixDepth(promoted, 0);
                return promoted;
            }
            root.label = 'Mapa';
            return root;
        }

        // ─── Layout ────────────────────────────────────────────────────────
        const FONT_SIZE = 14, LINE_H = 1.3, PAD_X = 14, PAD_Y = 8;
        const MAX_LABEL_W = 280, SPACING_X = 50, SPACING_Y = 14;

        // Canvas singleton for precise text measurement. Replaces the previous
        // `length * avgChar` estimate that caused baseline/edge misalignment.
        let _ctx = null;
        function measureCtx() {
            if (!_ctx) {
                try {
                    const canvas = document.createElement('canvas');
                    _ctx = canvas.getContext('2d');
                } catch { _ctx = null; }
            }
            if (_ctx) {
                _ctx.font = `400 ${FONT_SIZE}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
            }
            return _ctx;
        }

        function measureLabel(textStr) {
            const ctx = measureCtx();
            const measure = (s) => ctx ? ctx.measureText(s).width : s.length * FONT_SIZE * 0.55;
            const natural = measure(textStr);
            if (natural <= MAX_LABEL_W) return { width: natural, lines: [textStr] };
            const words = textStr.split(/\s+/);
            const out = [];
            let cur = '';
            for (const w of words) {
                const cand = cur ? cur + ' ' + w : w;
                if (measure(cand) <= MAX_LABEL_W) cur = cand;
                else { if (cur) out.push(cur); cur = w; }
            }
            if (cur) out.push(cur);
            const longest = out.reduce((m, l) => Math.max(m, measure(l)), 0);
            return { width: longest, lines: out };
        }

        function computeLayout(root) {
            function measure(node) {
                const m = measureLabel(node.label);
                node._lines = m.lines;
                node._width = m.width + PAD_X * 2;
                node._height = m.lines.length * FONT_SIZE * LINE_H + PAD_Y * 2;
                const visible = (!node.fold && node.children) ? node.children : [];
                for (const c of visible) measure(c);
            }
            measure(root);
            function subtreeHeight(node) {
                const visible = (!node.fold && node.children) ? node.children : [];
                if (visible.length === 0) { node._subtreeH = node._height; return node._subtreeH; }
                let total = 0;
                for (const c of visible) total += subtreeHeight(c);
                total += (visible.length - 1) * SPACING_Y;
                node._subtreeH = Math.max(node._height, total);
                return node._subtreeH;
            }
            subtreeHeight(root);
            function place(node, x, yCenter) {
                node._x = x;
                node._y = yCenter;
                const visible = (!node.fold && node.children) ? node.children : [];
                if (visible.length === 0) return;
                const childX = x + node._width + SPACING_X;
                const totalH = visible.reduce((s, c) => s + c._subtreeH, 0) + (visible.length - 1) * SPACING_Y;
                let cursorY = yCenter - totalH / 2;
                for (const c of visible) {
                    const cy = cursorY + c._subtreeH / 2;
                    place(c, childX, cy);
                    cursorY += c._subtreeH + SPACING_Y;
                }
            }
            place(root, 0, 0);
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            function walk(node) {
                minX = Math.min(minX, node._x);
                maxX = Math.max(maxX, node._x + node._width);
                minY = Math.min(minY, node._y - node._height / 2);
                maxY = Math.max(maxY, node._y + node._height / 2);
                const visible = (!node.fold && node.children) ? node.children : [];
                for (const c of visible) walk(c);
            }
            walk(root);
            return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
        }

        // ─── DOM scaffolding ───────────────────────────────────────────────
        const overlay = document.createElement('div');
        overlay.id = 'markmap-fullscreen-overlay';
        overlay.style.cssText = 'all:initial;position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;background:rgba(0,0,0,0.55)!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;font-family:system-ui,-apple-system,sans-serif!important;animation:mm-fs-backdrop-in 0.25s ease-out!important';

        const modal = document.createElement('div');
        modal.style.cssText = 'width:95vw!important;height:95vh!important;background:#ffffff!important;border-radius:12px!important;box-shadow:0 20px 60px rgba(0,0,0,0.35)!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;animation:mm-fs-modal-in 0.32s cubic-bezier(0.2,0,0,1)!important';

        const header = document.createElement('div');
        header.style.cssText = 'display:flex!important;justify-content:space-between!important;align-items:center!important;padding:0.6em 1em!important;border-bottom:1px solid #e0e0e0!important;background:#f9f9fb!important;flex-shrink:0!important';

        const title = document.createElement('span');
        title.textContent = 'Mapa Conceptual';
        title.style.cssText = 'font-weight:600!important;font-size:1em!important;color:#100f0f!important';

        // CSS dels botons, estil NotebookLM (circulars). !important per resistir
        // overrides de la pàgina amfitriona.
        const btnStyle = document.createElement('style');
        btnStyle.textContent = `
            .markmap-fs-btn{width:40px!important;height:40px!important;min-width:40px!important;padding:8px!important;border:1px solid #dadce0!important;border-radius:50%!important;background:#ffffff!important;color:#5f6368!important;cursor:pointer!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}
            .markmap-fs-btn:hover{background:#f1f3f4!important;color:#100f0f!important}
            .markmap-fs-btn svg{width:20px!important;height:20px!important;stroke:currentColor!important;background:transparent!important;border:none!important;border-radius:0!important}
            .markmap-fs-controls{position:absolute!important;right:16px!important;bottom:16px!important;display:flex!important;flex-direction:column!important;gap:8px!important;z-index:5!important}
            .markmap-fs-close{border:none!important;background:transparent!important;box-shadow:none!important;width:32px!important;height:32px!important;min-width:32px!important;color:#5f6368!important}
            .markmap-fs-close:hover{background:#f1f3f4!important;color:#d32f2f!important}
            .markmap-fs-close svg{width:22px!important;height:22px!important}
            @keyframes mm-fs-backdrop-in{from{opacity:0}to{opacity:1}}
            @keyframes mm-fs-modal-in{from{opacity:0;transform:scale(0.94) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
            @media (prefers-reduced-motion: reduce){#markmap-fullscreen-overlay,#markmap-fullscreen-overlay *{animation-duration:0.01ms!important}}
        `;
        overlay.appendChild(btnStyle);

        function mkBtn(svgInner, ttl, extraClass) {
            const b = document.createElement('button');
            b.className = 'markmap-fs-btn' + (extraClass ? ' ' + extraClass : '');
            b.title = ttl;
            b.setAttribute('aria-label', ttl);
            b.type = 'button';
            const parser = new DOMParser();
            const doc = parser.parseFromString(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + svgInner + '</svg>',
                'image/svg+xml'
            );
            b.appendChild(document.importNode(doc.documentElement, true));
            return b;
        }

        // Columna de controls flotant a baix-dreta (com NotebookLM): 4 botons.
        let allExpanded = false;  // estat del toggle desplegar/plegar-tot
        const controls = document.createElement('div');
        controls.className = 'markmap-fs-controls';
        const btnToggleAll = mkBtn(icons.toggleAll, 'Desplegar / plegar tot');
        const btnZoomIn    = mkBtn(icons.zoomIn, 'Ampliar');
        const btnZoomOut   = mkBtn(icons.zoomOut, 'Reduir');
        const btnPng       = mkBtn(icons.download, 'Descarregar com a PNG');
        [btnToggleAll, btnZoomIn, btnZoomOut, btnPng].forEach(b => controls.appendChild(b));

        // Botó de tancar a dalt-dreta (al header).
        const btnClose = mkBtn(icons.close, 'Tancar (Esc)', 'markmap-fs-close');
        header.appendChild(title);
        header.appendChild(btnClose);

        const content = document.createElement('div');
        content.style.cssText = 'flex:1!important;position:relative!important;overflow:hidden!important;background:#ffffff!important';

        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.cssText = 'display:block!important;width:100%!important;height:100%!important;cursor:grab!important';
        // Defensive: host page CSS may apply `svg text { fill: ... }` rules
        // (Tailwind reset, design systems...) that would override our attribute fills.
        // An intra-SVG <style> with !important wins over external CSS.
        const styleEl = document.createElementNS(SVG_NS, 'style');
        styleEl.textContent = `
            text { fill: #1a1a1a !important;
                   font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif !important;
                   font-weight: 400 !important; }
            .markmap-node { cursor: default; }
            .markmap-toggle { cursor: pointer; }
            rect { fill-opacity: 1 !important; stroke: none !important; }
            path { fill: none !important; }
        `;
        svg.appendChild(styleEl);
        content.appendChild(svg);
        content.appendChild(controls);

        modal.appendChild(header);
        modal.appendChild(content);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // ─── Render ────────────────────────────────────────────────────────
        const root = parseMarkdownTree(text);
        // Títol = text del primer node jeràrquic (arrel del mapa), com NotebookLM.
        if (root && root.label) title.textContent = root.label;
        // Per defecte només es veuen els nivells 0 i 1: plega a partir de profunditat 1.
        (function autoFold(node, d) {
            if (d >= 1 && node.children && node.children.length > 0) node.fold = true;
            if (node.children) node.children.forEach(c => autoFold(c, d + 1));
        })(root, 0);

        const state = { transform: { x: 0, y: 0, k: 1 }, bounds: null };
        const viewport = document.createElementNS(SVG_NS, 'g');
        viewport.setAttribute('class', 'markmap-viewport');
        svg.appendChild(viewport);

        // Degradats subtils per a les pastilles (com NotebookLM), sense innerHTML.
        const mkGrad = (id, top, bottom) => {
            const g = document.createElementNS(SVG_NS, 'linearGradient');
            g.setAttribute('id', id);
            g.setAttribute('x1', '0'); g.setAttribute('y1', '0');
            g.setAttribute('x2', '0'); g.setAttribute('y2', '1');
            const s1 = document.createElementNS(SVG_NS, 'stop');
            s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', top);
            const s2 = document.createElementNS(SVG_NS, 'stop');
            s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', bottom);
            g.appendChild(s1); g.appendChild(s2);
            return g;
        };
        const defs = document.createElementNS(SVG_NS, 'defs');
        DEPTH_GRAD.forEach((gr, i) => defs.appendChild(mkGrad('mm-grad-' + i, gr[0], gr[1])));
        svg.appendChild(defs);

        function nodeColorFor(node) { return DEPTH_SOLID[Math.min(node.depth, DEPTH_SOLID.length - 1)]; }
        function edgeColorFor() { return EDGE_COLOR; }
        function curve(x1, y1, x2, y2) {
            const dx = Math.max(20, (x2 - x1) * 0.4);
            return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
        }
        function applyTransform() {
            const { x, y, k } = state.transform;
            viewport.setAttribute('transform', `translate(${x}, ${y}) scale(${k})`);
        }
        function render() {
            state.bounds = computeLayout(root);
            while (viewport.firstChild) viewport.removeChild(viewport.firstChild);
            const linksG = document.createElementNS(SVG_NS, 'g');
            const nodesG = document.createElementNS(SVG_NS, 'g');
            viewport.appendChild(linksG);
            viewport.appendChild(nodesG);

            function walk(node) {
                const visible = (!node.fold && node.children) ? node.children : [];
                // Edges connect pill-to-pill laterally
                for (const c of visible) {
                    const path = document.createElementNS(SVG_NS, 'path');
                    // L'aresta surt de la dreta del cercle toggle (cx=width+10, r=8),
                    // com NotebookLM, no de la vora de la pastilla.
                    path.setAttribute('d', curve(node._x + node._width + 18, node._y, c._x, c._y));
                    path.setAttribute('fill', 'none');
                    path.setAttribute('stroke', edgeColorFor());
                    path.setAttribute('stroke-width', '1.5');
                    path.setAttribute('opacity', '1');
                    linksG.appendChild(path);
                }
                const g = document.createElementNS(SVG_NS, 'g');
                g.setAttribute('class', 'markmap-node');
                g.setAttribute('transform', `translate(${node._x}, ${node._y - node._height / 2})`);
                const fillColor = nodeColorFor(node);  // color sòlid (cercle toggle, glifo)
                const gradId = 'url(#mm-grad-' + Math.min(node.depth, DEPTH_GRAD.length - 1) + ')';

                // Pill background amb degradat subtil
                const rect = document.createElementNS(SVG_NS, 'rect');
                rect.setAttribute('x', '0');
                rect.setAttribute('y', '0');
                rect.setAttribute('width', String(node._width));
                rect.setAttribute('height', String(node._height));
                const radius = Math.min(12, node._height / 2);
                rect.setAttribute('rx', String(radius));
                rect.setAttribute('ry', String(radius));
                rect.setAttribute('fill', gradId);
                rect.setAttribute('stroke', 'none');
                g.appendChild(rect);

                // Text — centred vertically inside pill
                const textEl = document.createElementNS(SVG_NS, 'text');
                textEl.setAttribute('x', String(PAD_X));
                textEl.setAttribute('y', String(node._height / 2));
                textEl.setAttribute('dominant-baseline', 'central');
                textEl.setAttribute('text-anchor', 'start');
                textEl.setAttribute('font-size', String(FONT_SIZE));
                textEl.setAttribute('font-family', "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif");
                textEl.setAttribute('font-weight', '400');
                textEl.setAttribute('fill', TEXT_COLOR);
                textEl.style.userSelect = 'none';
                const lineH = FONT_SIZE * LINE_H;
                const N = node._lines.length;
                node._lines.forEach((line, i) => {
                    const ts = document.createElementNS(SVG_NS, 'tspan');
                    ts.setAttribute('x', String(PAD_X));
                    const dy = i === 0 ? -((N - 1) * lineH) / 2 : lineH;
                    ts.setAttribute('dy', String(dy));
                    ts.textContent = line;
                    textEl.appendChild(ts);
                });
                g.appendChild(textEl);

                // Toggle: white circle with < or > glyph
                if (node.children && node.children.length > 0) {
                    const tg = document.createElementNS(SVG_NS, 'g');
                    tg.setAttribute('class', 'markmap-toggle');
                    tg.style.cursor = 'pointer';
                    const cx = node._width + 10;
                    const cy = node._height / 2;

                    const toggle = document.createElementNS(SVG_NS, 'circle');
                    toggle.setAttribute('cx', String(cx));
                    toggle.setAttribute('cy', String(cy));
                    toggle.setAttribute('r', '8');
                    toggle.setAttribute('fill', '#ffffff');
                    toggle.setAttribute('stroke', fillColor);
                    toggle.setAttribute('stroke-width', '1.5');
                    tg.appendChild(toggle);

                    // Chevron SVG (no glyph de text) per a un símbol net i ben centrat.
                    const glyph = document.createElementNS(SVG_NS, 'polyline');
                    const pts = node.fold
                        ? `${cx - 2},${cy - 3.5} ${cx + 2},${cy} ${cx - 2},${cy + 3.5}`
                        : `${cx + 2},${cy - 3.5} ${cx - 2},${cy} ${cx + 2},${cy + 3.5}`;
                    glyph.setAttribute('points', pts);
                    glyph.setAttribute('fill', 'none');
                    glyph.setAttribute('stroke', fillColor);
                    glyph.setAttribute('stroke-width', '1.5');
                    glyph.setAttribute('stroke-linecap', 'round');
                    glyph.setAttribute('stroke-linejoin', 'round');
                    tg.appendChild(glyph);

                    tg.addEventListener('click', (e) => {
                        e.stopPropagation();
                        node.fold = !node.fold;
                        render();
                        if (!node.fold) requestAnimationFrame(fit);  // autofit en desplegar
                    });
                    g.appendChild(tg);

                    // Clic sobre tota la pastilla = desplega/plega UN nivell (com NotebookLM).
                    // S'ignora si s'estava arrossegant (pan).
                    g.style.cursor = 'pointer';
                    g.addEventListener('click', () => {
                        if (didPan) return;
                        node.fold = !node.fold;
                        render();
                        if (!node.fold) requestAnimationFrame(fit);  // autofit en desplegar
                    });
                }
                nodesG.appendChild(g);
                for (const c of visible) walk(c);
            }
            walk(root);
            applyTransform();
        }

        // ─── Transicions suaus del viewport (tween via rAF) ──────────────────
        // (Duplicat de sidebar/markmap-native.js — vegeu l'avís de dalt.) El
        // transform és un atribut SVG, que les CSS transitions no animen fiablement.
        let animFrame = null;
        function cancelAnim() {
            if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
        }
        function setTransform(t) {
            state.transform.x = t.x; state.transform.y = t.y; state.transform.k = t.k;
            applyTransform();
        }
        function animateTransform(target, duration) {
            cancelAnim();
            // Respecta prefers-reduced-motion: salta directament al destí.
            if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                setTransform(target);
                return;
            }
            const dur = duration == null ? 350 : duration;
            const s = { x: state.transform.x, y: state.transform.y, k: state.transform.k };
            const dx = target.x - s.x, dy = target.y - s.y, dk = target.k - s.k;
            if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(dk) < 0.002) {
                setTransform(target);
                return;
            }
            const t0 = performance.now();
            const ease = (t) => 1 - Math.pow(1 - t, 3);
            function stepFrame(now) {
                const t = Math.min(1, (now - t0) / dur);
                const e = ease(t);
                state.transform.x = s.x + dx * e;
                state.transform.y = s.y + dy * e;
                state.transform.k = s.k + dk * e;
                applyTransform();
                animFrame = t < 1 ? requestAnimationFrame(stepFrame) : null;
            }
            animFrame = requestAnimationFrame(stepFrame);
        }
        function computeFitTarget(scaleMul) {
            if (!state.bounds) return null;
            const rect = svg.getBoundingClientRect();
            const sw = rect.width || 1200;
            const sh = rect.height || 800;
            const bw = state.bounds.width;
            const bh = state.bounds.height;
            if (bw <= 0 || bh <= 0) return null;
            const margin = 40;
            const k = Math.min((sw - margin * 2) / bw, (sh - margin * 2) / bh, 2) * (scaleMul || 1);
            const cx = (state.bounds.minX + state.bounds.maxX) / 2;
            const cy = (state.bounds.minY + state.bounds.maxY) / 2;
            return { k, x: sw / 2 - cx * k, y: sh / 2 - cy * k };
        }
        function fit(animate) {
            const target = computeFitTarget(1);
            if (!target) return;
            if (animate === false) setTransform(target);
            else animateTransform(target);
        }
        function introFit() {
            const start = computeFitTarget(0.9);
            const target = computeFitTarget(1);
            if (!target) return;
            if (start) setTransform(start);
            animateTransform(target, 480);
        }
        function rescale(factor) {
            const rect = svg.getBoundingClientRect();
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const newK = Math.max(0.1, Math.min(10, state.transform.k * factor));
            const ratio = newK / state.transform.k;
            animateTransform({
                x: cx - (cx - state.transform.x) * ratio,
                y: cy - (cy - state.transform.y) * ratio,
                k: newK,
            }, 220);
        }
        function setFoldAll(fold) {
            (function walk(n) {
                if (n.children && n.children.length > 0) {
                    n.fold = fold;
                    n.children.forEach(walk);
                }
            })(root);
            root.fold = false;
        }

        // ─── Interactions ──────────────────────────────────────────────────
        let isPanning = false;
        let didPan = false;  // true si el ratolí s'ha mogut prou → no és un clic de pastilla
        const pan = { x: 0, y: 0, tx: 0, ty: 0 };
        svg.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'circle') return;
            cancelAnim();  // el pan és instantani: atura qualsevol tween en curs
            isPanning = true;
            didPan = false;
            pan.x = e.clientX; pan.y = e.clientY;
            pan.tx = state.transform.x; pan.ty = state.transform.y;
            svg.style.cursor = 'grabbing';
        });
        const moveHandler = (e) => {
            if (!isPanning) return;
            if (Math.abs(e.clientX - pan.x) > 4 || Math.abs(e.clientY - pan.y) > 4) didPan = true;
            state.transform.x = pan.tx + (e.clientX - pan.x);
            state.transform.y = pan.ty + (e.clientY - pan.y);
            applyTransform();
        };
        const upHandler = () => {
            if (isPanning) { isPanning = false; svg.style.cursor = 'grab'; }
        };
        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('mouseup', upHandler);

        svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            cancelAnim();  // zoom amb roda instantani: atura qualsevol tween
            const rect = svg.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
            const newK = Math.max(0.1, Math.min(10, state.transform.k * factor));
            const ratio = newK / state.transform.k;
            state.transform.x = mx - (mx - state.transform.x) * ratio;
            state.transform.y = my - (my - state.transform.y) * ratio;
            state.transform.k = newK;
            applyTransform();
        }, { passive: false });

        btnZoomIn.addEventListener('click', () => rescale(1.25));
        btnZoomOut.addEventListener('click', () => rescale(0.8));
        btnToggleAll.addEventListener('click', () => {
            allExpanded = !allExpanded;
            setFoldAll(!allExpanded);  // expandit → fold=false a tots
            render();
            requestAnimationFrame(fit);
        });

        // ─── PNG Export ────────────────────────────────────────────────────
        // Filename rule (mirrors sidebar/conceptmap-filename.js): YYYYMMDD_w1_w2.png
        // where w1/w2 come from the root label (not pageTitle), normalised to
        // ASCII lowercase, stop-words removed, ≤1-char tokens dropped, each
        // truncated to 20 chars. Fallback "_mapa" if no significant words.
        // Logic duplicated inline because this function is serialised to a
        // string by executeScript and cannot reference outer scope.
        function buildFilename() {
            const STOP = new Set([
                'a','al','als','amb','de','del','dels','el','els','en','es','i','la','les','lo',
                'o','per','que','un','una','uns','unes','com','si',
                'con','las','los','por','y',
                'an','and','at','by','for','in','of','on','or','the','to','with','is','it','as',
            ]);
            const d = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
            const norm = String(root.label || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, ' ')
                .trim();
            const tokens = norm.length === 0
                ? []
                : norm.split(/\s+/)
                    .filter(t => t.length > 1 && !STOP.has(t))
                    .map(t => t.slice(0, 20));
            const picked = tokens.slice(0, 2);
            if (picked.length === 0) return `${date}_mapa.png`;
            return `${date}_${picked.join('_')}.png`;
        }
        btnPng.addEventListener('click', async () => {
            try {
                const clone = svg.cloneNode(true);
                const vp = clone.querySelector('.markmap-viewport');
                if (vp) vp.setAttribute('transform', 'translate(0,0) scale(1)');
                // Compute bounds of viewport in original to size the export
                const vpOrig = svg.querySelector('.markmap-viewport');
                const bbox = vpOrig.getBBox();
                const pad = 40;
                const w = bbox.width + pad * 2;
                const h = bbox.height + pad * 2;
                clone.setAttribute('width', String(w));
                clone.setAttribute('height', String(h));
                clone.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${w} ${h}`);
                clone.setAttribute('xmlns', SVG_NS);
                const xml = new XMLSerializer().serializeToString(clone);
                // data: URL en lloc de blob: per coherència amb la sidebar i per
                // resistir CSP estrictes (img-src sense blob:) de la pàgina amfitriona.
                const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const scale = 2;
                    canvas.width = w * scale;
                    canvas.height = h * scale;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.scale(scale, scale);
                    ctx.drawImage(img, 0, 0, w, h);
                    canvas.toBlob((pngBlob) => {
                        URL.revokeObjectURL(url);
                        if (!pngBlob) return;
                        const pngUrl = URL.createObjectURL(pngBlob);
                        const a = document.createElement('a');
                        a.href = pngUrl;
                        a.download = buildFilename();
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(pngUrl); }, 100);
                    }, 'image/png');
                };
                img.onerror = () => { URL.revokeObjectURL(url); };
                img.src = url;
            } catch (err) {
                console.error('PNG export failed:', err);
            }
        });

        // ─── Close handlers ────────────────────────────────────────────────
        function close() {
            cancelAnim();
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('mouseup', upHandler);
            document.removeEventListener('keydown', escHandler);
            window.removeEventListener('pagehide', close);
            overlay.remove();
        }
        overlay.__mmClose = close;  // perquè una re-obertura pugui netejar aquesta instància
        function escHandler(e) { if (e.key === 'Escape') close(); }
        btnClose.addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        document.addEventListener('keydown', escHandler);
        window.addEventListener('pagehide', close, { once: true });

        // ─── Initial render + fit ──────────────────────────────────────────
        // Entrada suau (zoom-in centrat) que acompanya l'animació del modal.
        render();
        requestAnimationFrame(() => requestAnimationFrame(introFit));

        return 'ok';
    } catch (err) {
        return 'error:' + (err && err.message ? err.message : String(err));
    }
}
