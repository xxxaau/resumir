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
                    await window.markmapNative.exportToPNG(svg, filename);
                } catch (error) {
                    console.error("Error exporting PNG:", error);
                    alert("Error exportant a PNG.");
                }
            });
            fullPageBtn.addEventListener("click", () => {
                openFullPageView(text);
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
 * Strategy: serialize the SVG to a string in the sidebar context, then inject
 * the overlay into the page's MAIN world with the SVG markup as a string.
 * No external libraries needed in the page — we render fully here and pass HTML.
 *
 * @param {string} text - Original markdown text
 */
async function openFullPageView(text) {
    try {
        const tabs = await ext.tabs.query({ active: true, currentWindow: true });
        if (!tabs.length) { alert('No hi ha cap pestanya activa.'); return; }
        const tabId = tabs[0].id;
        const tabUrl = tabs[0].url;

        if (!isInjectableUrl(tabUrl)) {
            alert(`Aquesta pàgina és interna del navegador i no admet overlays d'extensions (${tabUrl}).\n\nCanvia a una pestanya web normal (http/https) i torna-ho a provar.`);
            return;
        }

        if (typeof window.markmapNative === "undefined") {
            alert("Error intern: el renderitzador del mapa no està disponible.");
            return;
        }

        // Render the map off-screen, serialize to SVG string with all nodes expanded.
        const offSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        offSvg.setAttribute("width", "1600");
        offSvg.setAttribute("height", "1000");
        // Must be in DOM (with size) for getBBox/measure to work
        offSvg.style.cssText = "position:absolute;left:-99999px;top:0;width:1600px;height:1000px;";
        document.body.appendChild(offSvg);

        try {
            const root = window.markmapNative.parseMarkdownTree(text);
            window.markmapNative.createMindMap(offSvg, root, {});
            // Force layout
            await new Promise(r => requestAnimationFrame(r));
            const svgString = window.markmapNative.serializeToSVG(offSvg, { padding: 40, backgroundColor: "#ffffff" });

            const result = await executeScriptSafe({
                target: { tabId },
                world: "MAIN",
                func: (svgMarkup) => {
                    // Remove existing overlay
                    const existing = document.getElementById('markmap-fullscreen-overlay');
                    if (existing) existing.remove();

                    // Backdrop
                    const overlay = document.createElement('div');
                    overlay.id = 'markmap-fullscreen-overlay';
                    overlay.style.cssText = [
                        'position:fixed', 'inset:0', 'width:100vw', 'height:100vh',
                        'background:rgba(0,0,0,0.55)', 'z-index:2147483647',
                        'display:flex', 'align-items:center', 'justify-content:center',
                        'font-family:system-ui,sans-serif'
                    ].join('!important;') + '!important';

                    // Modal
                    const modal = document.createElement('div');
                    modal.style.cssText = [
                        'width:95vw', 'height:95vh', 'background:#fff',
                        'border-radius:12px',
                        'box-shadow:0 20px 60px rgba(0,0,0,0.35)',
                        'display:flex', 'flex-direction:column', 'overflow:hidden'
                    ].join('!important;') + '!important';

                    // Header
                    const header = document.createElement('div');
                    header.style.cssText = [
                        'display:flex', 'justify-content:space-between', 'align-items:center',
                        'padding:0.75em 1.25em', 'border-bottom:1px solid #e0e0e0',
                        'background:#f9f9fb', 'flex-shrink:0'
                    ].join('!important;') + '!important';

                    const title = document.createElement('span');
                    title.textContent = 'Mapa Conceptual';
                    title.style.cssText = 'font-weight:600!important;font-size:1em!important;color:#100f0f!important';

                    const closeBtn = document.createElement('button');
                    closeBtn.textContent = '✕ Tancar';
                    closeBtn.type = 'button';
                    closeBtn.style.cssText = [
                        'padding:0.4em 0.9em', 'border:1px solid #ccc',
                        'border-radius:4px', 'background:#fff', 'color:#100f0f',
                        'cursor:pointer', 'font-size:0.9em', 'font-family:inherit'
                    ].join('!important;') + '!important';

                    header.appendChild(title);
                    header.appendChild(closeBtn);

                    // Content area with SVG (parse the markup safely with DOMParser)
                    const content = document.createElement('div');
                    content.style.cssText = [
                        'flex:1', 'position:relative', 'overflow:auto',
                        'display:flex', 'align-items:center', 'justify-content:center',
                        'padding:1em'
                    ].join('!important;') + '!important';

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
                    const svgEl = doc.documentElement;
                    svgEl.style.cssText = 'max-width:100%!important;max-height:100%!important;height:auto!important;width:auto!important';
                    content.appendChild(svgEl);

                    modal.appendChild(header);
                    modal.appendChild(content);
                    overlay.appendChild(modal);
                    document.body.appendChild(overlay);

                    const closeOverlay = () => overlay.remove();
                    closeBtn.onclick = closeOverlay;
                    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
                    document.addEventListener('keydown', function escHandler(e) {
                        if (e.key === 'Escape') { closeOverlay(); document.removeEventListener('keydown', escHandler); }
                    });

                    return 'ok';
                },
                args: [svgString]
            });

            if (!result || !result.length) {
                alert("No s'ha pogut crear l'overlay a la pàgina.");
                return;
            }
            const overlayRes = result[0]?.result;
            if (typeof overlayRes === 'string' && overlayRes.startsWith('error')) {
                alert('Error al mapa: ' + overlayRes);
            }
        } finally {
            if (offSvg.parentNode) offSvg.parentNode.removeChild(offSvg);
        }

    } catch (error) {
        console.error('Error opening fullscreen view:', error);
        alert('Error obrint vista completa: ' + error.message);
    }
}
