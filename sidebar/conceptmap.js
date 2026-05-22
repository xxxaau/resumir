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

/**
 * Builds the PNG export filename for a concept map.
 * Format: YYYYMMDD_<title truncated to 20 chars>.png
 * Title is sanitised (no special chars) and truncated.
 * @param {string} pageTitle
 * @returns {string}
 */
function buildConceptMapFilename(pageTitle = "") {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const sanitised = pageTitle
        .replace(/[/\\:*?"<>|]/g, "")   // strip chars invalid in filenames
        .replace(/\s+/g, " ")
        .trim();
    const short = sanitised.length > 20 ? sanitised.slice(0, 20).trimEnd() : sanitised;
    const suffix = short ? `_${short}` : "";
    return `${date}${suffix}.png`;
}

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
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${svgInner}</svg>`,
            "image/svg+xml"
        );
        const importedSvg = document.importNode(doc.documentElement, true);
        b.appendChild(importedSvg);
        return b;
    };

    const fitBtn = makeBtn(
        `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>`,
        "Ajustar a la vista"
    );
    const zoomInBtn = makeBtn(
        `<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>`,
        "Ampliar"
    );
    const zoomOutBtn = makeBtn(
        `<line x1="5" y1="12" x2="19" y2="12"></line>`,
        "Reduir"
    );
    const expandAllBtn = makeBtn(
        `<polyline points="7 13 12 18 17 13" stroke-linecap="round" stroke-linejoin="round"/><polyline points="7 6 12 11 17 6" stroke-linecap="round" stroke-linejoin="round"/>`,
        "Expandir tot"
    );
    const collapseAllBtn = makeBtn(
        `<polyline points="7 11 12 6 17 11" stroke-linecap="round" stroke-linejoin="round"/><polyline points="7 18 12 13 17 18" stroke-linecap="round" stroke-linejoin="round"/>`,
        "Col·lapsar tot"
    );
    const downloadPngBtn = makeBtn(
        `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>`,
        "Descarregar com a PNG"
    );
    const fullPageBtn = makeBtn(
        `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke-linecap="round"/><polyline points="15 3 21 3 21 9" stroke-linecap="round"/><polyline points="9 21 3 21 3 15" stroke-linecap="round"/><line x1="21" y1="3" x2="14" y2="10" stroke-linecap="round"/><line x1="3" y1="21" x2="10" y2="14" stroke-linecap="round"/>`,
        "Vista de pantalla completa"
    );

    controls.appendChild(fitBtn);
    controls.appendChild(zoomInBtn);
    controls.appendChild(zoomOutBtn);
    controls.appendChild(expandAllBtn);
    controls.appendChild(collapseAllBtn);
    controls.appendChild(downloadPngBtn);
    controls.appendChild(fullPageBtn);
    container.appendChild(controls);

    fragment.appendChild(container);

    // Initialize renderer after element is in DOM
    setTimeout(() => {
        try {
            const root = window.markmapNative.parseMarkdownTree(text);
            // Fold from depth 2 onwards by default
            const collapseFromLevel = (node, currentDepth, targetDepth) => {
                if (currentDepth >= targetDepth && node.children && node.children.length > 0) {
                    node.fold = true;
                }
                if (node.children) node.children.forEach(c => collapseFromLevel(c, currentDepth + 1, targetDepth));
            };
            collapseFromLevel(root, 0, 2);

            const mm = window.markmapNative.createMindMap(svg, root, {});

            zoomInBtn.addEventListener("click", () => mm.rescale(1.25));
            zoomOutBtn.addEventListener("click", () => mm.rescale(0.8));
            fitBtn.addEventListener("click", () => mm.fit());
            expandAllBtn.addEventListener("click", () => {
                mm.setFoldAll(false);
                mm.rerender();
                requestAnimationFrame(() => mm.fit());
            });
            collapseAllBtn.addEventListener("click", () => {
                mm.setFoldAll(true);
                mm.rerender();
                requestAnimationFrame(() => mm.fit());
            });
            downloadPngBtn.addEventListener("click", async () => {
                try {
                    const filename = buildConceptMapFilename(pageTitle);
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
            args: [text, pageTitle]
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
 * Receives (text, pageTitle) and builds an interactive full-screen overlay
 * with the mind map. No external dependencies — all logic inlined.
 *
 * IMPORTANT: this function is serialised to a string by executeScript and
 * executed in the host page context. It cannot reference any outer scope.
 */
function fullscreenOverlayFunc(text, pageTitle) {
    try {
        // Remove existing overlay if any (re-open behaviour)
        const existing = document.getElementById('markmap-fullscreen-overlay');
        if (existing) existing.remove();

        const SVG_NS = 'http://www.w3.org/2000/svg';
        const COLORS = ["#205ea6", "#5e409d", "#16a34a", "#dc2626", "#ea580c", "#0891b2"];

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
        const FONT_SIZE = 14, LINE_H = 1.3, PAD_X = 10, PAD_Y = 6;
        const MAX_LABEL_W = 320, SPACING_X = 70, SPACING_Y = 12;

        function measureLabel(textStr) {
            const avgChar = FONT_SIZE * 0.55;
            const natural = textStr.length * avgChar;
            if (natural <= MAX_LABEL_W) return { width: natural, lines: [textStr] };
            const words = textStr.split(/\s+/);
            const out = [];
            let cur = '';
            for (const w of words) {
                const cand = cur ? cur + ' ' + w : w;
                if (cand.length * avgChar <= MAX_LABEL_W) cur = cand;
                else { if (cur) out.push(cur); cur = w; }
            }
            if (cur) out.push(cur);
            const longest = out.reduce((m, l) => Math.max(m, l.length), 0);
            return { width: longest * avgChar, lines: out };
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
        overlay.style.cssText = 'all:initial;position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;background:rgba(0,0,0,0.55)!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;font-family:system-ui,-apple-system,sans-serif!important';

        const modal = document.createElement('div');
        modal.style.cssText = 'width:95vw!important;height:95vh!important;background:#ffffff!important;border-radius:12px!important;box-shadow:0 20px 60px rgba(0,0,0,0.35)!important;display:flex!important;flex-direction:column!important;overflow:hidden!important';

        const header = document.createElement('div');
        header.style.cssText = 'display:flex!important;justify-content:space-between!important;align-items:center!important;padding:0.6em 1em!important;border-bottom:1px solid #e0e0e0!important;background:#f9f9fb!important;flex-shrink:0!important';

        const title = document.createElement('span');
        title.textContent = 'Mapa Conceptual';
        title.style.cssText = 'font-weight:600!important;font-size:1em!important;color:#100f0f!important';

        const toolbar = document.createElement('div');
        toolbar.style.cssText = 'display:flex!important;gap:0.4em!important;align-items:center!important';

        function mkBtn(label, ttl) {
            const b = document.createElement('button');
            b.textContent = label;
            b.title = ttl;
            b.type = 'button';
            b.style.cssText = 'padding:0.35em 0.7em!important;border:1px solid #ccc!important;border-radius:5px!important;background:#fff!important;color:#100f0f!important;cursor:pointer!important;font-size:0.85em!important;font-family:inherit!important;line-height:1!important';
            return b;
        }

        const btnFit       = mkBtn('⛶', 'Ajustar a la vista');
        const btnZoomIn    = mkBtn('+', 'Ampliar');
        const btnZoomOut   = mkBtn('−', 'Reduir');
        const btnExpand    = mkBtn('▾▾', 'Expandir tot');
        const btnCollapse  = mkBtn('▴▴', 'Col·lapsar tot');
        const btnPng       = mkBtn('⬇ PNG', 'Descarregar com a PNG');
        const btnClose     = mkBtn('✕', 'Tancar (Esc)');
        btnClose.style.borderColor = '#d32f2f';
        btnClose.style.color = '#d32f2f';

        [btnFit, btnZoomIn, btnZoomOut, btnExpand, btnCollapse, btnPng, btnClose].forEach(b => toolbar.appendChild(b));
        header.appendChild(title);
        header.appendChild(toolbar);

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
            text { fill: #100f0f !important; font-family: system-ui, -apple-system, sans-serif !important; }
            .markmap-node text { fill: #100f0f !important; }
            line { stroke-opacity: 1 !important; }
        `;
        svg.appendChild(styleEl);
        content.appendChild(svg);

        modal.appendChild(header);
        modal.appendChild(content);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // ─── Render ────────────────────────────────────────────────────────
        const root = parseMarkdownTree(text);
        // Auto-fold from depth 2
        (function autoFold(node, d) {
            if (d >= 2 && node.children && node.children.length > 0) node.fold = true;
            if (node.children) node.children.forEach(c => autoFold(c, d + 1));
        })(root, 0);

        const state = { transform: { x: 0, y: 0, k: 1 }, bounds: null };
        const viewport = document.createElementNS(SVG_NS, 'g');
        viewport.setAttribute('class', 'markmap-viewport');
        svg.appendChild(viewport);

        function colorFor(depth) { return COLORS[depth % COLORS.length]; }
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
                for (const c of visible) {
                    const path = document.createElementNS(SVG_NS, 'path');
                    path.setAttribute('d', curve(node._x + node._width, node._y, c._x, c._y));
                    path.setAttribute('fill', 'none');
                    path.setAttribute('stroke', colorFor(c.depth));
                    path.setAttribute('stroke-width', '1.5');
                    path.setAttribute('opacity', '0.6');
                    linksG.appendChild(path);
                }
                const g = document.createElementNS(SVG_NS, 'g');
                g.setAttribute('transform', `translate(${node._x}, ${node._y - node._height / 2})`);
                const color = colorFor(node.depth);

                const baseline = document.createElementNS(SVG_NS, 'line');
                baseline.setAttribute('x1', '0');
                baseline.setAttribute('y1', String(node._height));
                baseline.setAttribute('x2', String(node._width));
                baseline.setAttribute('y2', String(node._height));
                baseline.setAttribute('stroke', color);
                baseline.setAttribute('stroke-width', '2');
                g.appendChild(baseline);

                const textEl = document.createElementNS(SVG_NS, 'text');
                textEl.setAttribute('x', String(PAD_X));
                textEl.setAttribute('y', String(PAD_Y));
                textEl.setAttribute('dominant-baseline', 'hanging');
                textEl.setAttribute('font-size', String(FONT_SIZE));
                textEl.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
                textEl.setAttribute('fill', '#100f0f');
                textEl.style.userSelect = 'none';
                node._lines.forEach((line, i) => {
                    const ts = document.createElementNS(SVG_NS, 'tspan');
                    ts.setAttribute('x', String(PAD_X));
                    ts.setAttribute('dy', i === 0 ? '0' : String(FONT_SIZE * LINE_H));
                    ts.textContent = line;
                    textEl.appendChild(ts);
                });
                g.appendChild(textEl);

                if (node.children && node.children.length > 0) {
                    const toggle = document.createElementNS(SVG_NS, 'circle');
                    toggle.setAttribute('cx', String(node._width + 6));
                    toggle.setAttribute('cy', String(node._height));
                    toggle.setAttribute('r', '5');
                    toggle.setAttribute('fill', node.fold ? color : '#ffffff');
                    toggle.setAttribute('stroke', color);
                    toggle.setAttribute('stroke-width', '1.5');
                    toggle.style.cursor = 'pointer';
                    toggle.addEventListener('click', (e) => {
                        e.stopPropagation();
                        node.fold = !node.fold;
                        render();
                    });
                    g.appendChild(toggle);
                }
                nodesG.appendChild(g);
                for (const c of visible) walk(c);
            }
            walk(root);
            applyTransform();
        }

        function fit() {
            if (!state.bounds) return;
            const rect = svg.getBoundingClientRect();
            const sw = rect.width || 1200;
            const sh = rect.height || 800;
            const bw = state.bounds.width;
            const bh = state.bounds.height;
            if (bw <= 0 || bh <= 0) return;
            const margin = 40;
            const k = Math.min((sw - margin * 2) / bw, (sh - margin * 2) / bh, 2);
            state.transform.k = k;
            const cx = (state.bounds.minX + state.bounds.maxX) / 2;
            const cy = (state.bounds.minY + state.bounds.maxY) / 2;
            state.transform.x = sw / 2 - cx * k;
            state.transform.y = sh / 2 - cy * k;
            applyTransform();
        }
        function rescale(factor) {
            const rect = svg.getBoundingClientRect();
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const newK = Math.max(0.1, Math.min(10, state.transform.k * factor));
            const ratio = newK / state.transform.k;
            state.transform.x = cx - (cx - state.transform.x) * ratio;
            state.transform.y = cy - (cy - state.transform.y) * ratio;
            state.transform.k = newK;
            applyTransform();
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
        const pan = { x: 0, y: 0, tx: 0, ty: 0 };
        svg.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'circle') return;
            isPanning = true;
            pan.x = e.clientX; pan.y = e.clientY;
            pan.tx = state.transform.x; pan.ty = state.transform.y;
            svg.style.cursor = 'grabbing';
        });
        const moveHandler = (e) => {
            if (!isPanning) return;
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

        btnFit.addEventListener('click', fit);
        btnZoomIn.addEventListener('click', () => rescale(1.25));
        btnZoomOut.addEventListener('click', () => rescale(0.8));
        btnExpand.addEventListener('click', () => { setFoldAll(false); render(); requestAnimationFrame(fit); });
        btnCollapse.addEventListener('click', () => { setFoldAll(true); render(); requestAnimationFrame(fit); });

        // ─── PNG Export ────────────────────────────────────────────────────
        function buildFilename() {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
            const sanit = String(pageTitle || '').replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
            const short = sanit.length > 20 ? sanit.slice(0, 20).trimEnd() : sanit;
            return `${date}${short ? '_' + short : ''}.png`;
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
                const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
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
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('mouseup', upHandler);
            document.removeEventListener('keydown', escHandler);
            overlay.remove();
        }
        function escHandler(e) { if (e.key === 'Escape') close(); }
        btnClose.addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        document.addEventListener('keydown', escHandler);

        // ─── Initial render + fit ──────────────────────────────────────────
        render();
        requestAnimationFrame(() => requestAnimationFrame(fit));

        return 'ok';
    } catch (err) {
        return 'error:' + (err && err.message ? err.message : String(err));
    }
}
