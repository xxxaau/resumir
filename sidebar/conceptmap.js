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

    // Check if markmap libraries are loaded
    if (typeof window.markmap === "undefined") {
        console.error("Markmap libraries not loaded");
        const errorP = document.createElement("p");
        errorP.textContent = "Error: No s'han pogut carregar les llibreries de visualització.";
        errorP.style.color = "var(--error-color, #d32f2f)";
        fragment.appendChild(errorP);
        return fragment;
    }

    // Create container
    const container = document.createElement("div");
    container.className = "markmap-container";
    
    // Create SVG element
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.border = "1px solid var(--border-color)";
    svg.style.borderRadius = "8px";
    svg.style.background = "var(--bg-color)";
    
    container.appendChild(svg);
    
    // Create floating controls (positioned on the right side)
    const controls = document.createElement("div");
    controls.className = "markmap-controls";
    
    const fitBtn = document.createElement("button");
    fitBtn.className = "markmap-control-btn";
    fitBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
    </svg>`;
    fitBtn.title = "Ajustar a la vista";
    fitBtn.setAttribute("aria-label", "Ajustar a la vista");
    fitBtn.type = "button";
    
    const zoomInBtn = document.createElement("button");
    zoomInBtn.className = "markmap-control-btn";
    zoomInBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>`;
    zoomInBtn.title = "Ampliar";
    zoomInBtn.setAttribute("aria-label", "Ampliar");
    zoomInBtn.type = "button";
    
    const zoomOutBtn = document.createElement("button");
    zoomOutBtn.className = "markmap-control-btn";
    zoomOutBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>`;
    zoomOutBtn.title = "Reduir";
    zoomOutBtn.setAttribute("aria-label", "Reduir");
    zoomOutBtn.type = "button";
    
    const expandAllBtn = document.createElement("button");
    expandAllBtn.className = "markmap-control-btn";
    expandAllBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="7 13 12 18 17 13" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="7 6 12 11 17 6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    expandAllBtn.title = "Expandir tot";
    expandAllBtn.setAttribute("aria-label", "Expandir tot");
    expandAllBtn.type = "button";

    const collapseAllBtn = document.createElement("button");
    collapseAllBtn.className = "markmap-control-btn";
    collapseAllBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="7 11 12 6 17 11" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="7 18 12 13 17 18" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    collapseAllBtn.title = "Col·lapsar tot";
    collapseAllBtn.setAttribute("aria-label", "Col·lapsar tot");
    collapseAllBtn.type = "button";

    const downloadPngBtn = document.createElement("button");
    downloadPngBtn.className = "markmap-control-btn";
    downloadPngBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
    </svg>`;
    downloadPngBtn.title = "Descarregar com a PNG";
    downloadPngBtn.setAttribute("aria-label", "Descarregar com a PNG");
    downloadPngBtn.type = "button";
    
    const fullPageBtn = document.createElement("button");
    fullPageBtn.className = "markmap-control-btn";
    fullPageBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke-linecap="round"/>
        <polyline points="15 3 21 3 21 9" stroke-linecap="round"/>
        <polyline points="9 21 3 21 3 15" stroke-linecap="round"/>
        <line x1="21" y1="3" x2="14" y2="10" stroke-linecap="round"/>
        <line x1="3" y1="21" x2="10" y2="14" stroke-linecap="round"/>
    </svg>`;
    fullPageBtn.title = "Vista de pantalla completa";
    fullPageBtn.setAttribute("aria-label", "Vista de pantalla completa");
    fullPageBtn.type = "button";
    
    controls.appendChild(fitBtn);
    controls.appendChild(zoomInBtn);
    controls.appendChild(zoomOutBtn);
    controls.appendChild(expandAllBtn);
    controls.appendChild(collapseAllBtn);
    controls.appendChild(downloadPngBtn);
    controls.appendChild(fullPageBtn);
    
    container.appendChild(controls);
    
    fragment.appendChild(container);

    // Render markmap asynchronously
    setTimeout(() => {
        try {
            // Transform Markdown to markmap data structure
            const { Transformer } = window.markmap;
            const transformer = new Transformer();
            const { root } = transformer.transform(text);
            
            // Collapse all nodes except first level by default
            const collapseFromLevel = (node, currentDepth, targetDepth) => {
                if (currentDepth >= targetDepth && node.children) {
                    node.payload = node.payload || {};
                    node.payload.fold = 1; // Collapsed
                    node.children.forEach(child => collapseFromLevel(child, currentDepth + 1, targetDepth));
                } else if (node.children) {
                    node.children.forEach(child => collapseFromLevel(child, currentDepth + 1, targetDepth));
                }
            };
            collapseFromLevel(root, 0, 2); // Collapse from depth 2 onwards
            
            // Create markmap
            const { Markmap, loadCSS } = window.markmap;
            
            // Load default styles only (skip scripts to avoid external CDN blocked by CSP)
            const { styles } = transformer.getAssets();
            if (styles) loadCSS(styles);
            
            // Initialize markmap
            const mm = Markmap.create(svg, {
                duration: 500,
                maxWidth: 300,
                color: (node) => {
                    // Color by depth
                    const colors = [
                        'var(--primary-color, #205ea6)',
                        'var(--secondary-color, #5e409d)', 
                        '#16a34a',
                        '#dc2626',
                        '#ea580c',
                        '#0891b2'
                    ];
                    return colors[node.depth % colors.length];
                },
                paddingX: 8,
                paddingY: 4,
                nodeMinHeight: 16,
                spacingVertical: 8,
                spacingHorizontal: 80,
                autoFit: true,
                zoom: true,
                pan: true
            }, root);
            
            
            // Zoom controls using markmap's API (keeps d3-zoom in sync)
            zoomInBtn.addEventListener("click", () => {
                mm.rescale(1.25);
            });
            
            zoomOutBtn.addEventListener("click", () => {
                mm.rescale(0.8);
            });
            
            fitBtn.addEventListener("click", () => {
                mm.fit();
            });

            // Walk the tree and set fold value on every node that has children.
            const setFoldAll = (node, fold) => {
                if (node.children && node.children.length > 0) {
                    node.payload = node.payload || {};
                    if (fold) node.payload.fold = 1;
                    else delete node.payload.fold;
                    node.children.forEach(child => setFoldAll(child, fold));
                }
            };

            expandAllBtn.addEventListener("click", () => {
                setFoldAll(root, false);
                mm.setData(root);
                requestAnimationFrame(() => mm.fit());
            });

            collapseAllBtn.addEventListener("click", () => {
                setFoldAll(root, true);
                // Keep root expanded so the user sees the top level
                if (root.payload) delete root.payload.fold;
                mm.setData(root);
                requestAnimationFrame(() => mm.fit());
            });
            
            // Auto-fit after render when SVG has layout dimensions
            requestAnimationFrame(() => {
                mm.fit();
            });
            
            downloadPngBtn.addEventListener("click", async () => {
                try {
                    const filename = buildConceptMapFilename(pageTitle);
                    await exportMarkmapToPNG(svg, filename);
                } catch (error) {
                    console.error('Error exporting PNG:', error);
                    alert('Error exportant a PNG.');
                }
            });
            
            fullPageBtn.addEventListener("click", () => {
                openFullPageView(text);
            });
            
        } catch (error) {
            console.error("Markmap rendering error:", error);
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
 * Exports markmap SVG to PNG - simplified version.
 * @param {SVGElement} svgElement - SVG element to export
 * @param {string} filename - Output filename
 */
async function exportMarkmapToPNG(svgElement, filename) {
    return new Promise((resolve, reject) => {
        try {
            // Clone SVG and inline all computed styles
            const clone = svgElement.cloneNode(true);
            
            // Copy computed styles for all elements
            const allOriginal = svgElement.querySelectorAll('*');
            const allCloned = clone.querySelectorAll('*');
            for (let i = 0; i < allOriginal.length; i++) {
                const computed = window.getComputedStyle(allOriginal[i]);
                const important = ['fill', 'stroke', 'stroke-width', 'stroke-opacity', 
                    'fill-opacity', 'font-family', 'font-size', 'font-weight', 
                    'opacity', 'rx', 'ry', 'transform', 'display', 'visibility'];
                for (const prop of important) {
                    const val = computed.getPropertyValue(prop);
                    if (val) allCloned[i].style.setProperty(prop, val);
                }
            }
            
            // Set explicit dimensions
            const bbox = svgElement.getBBox();
            const padding = 50;
            const width = Math.max(bbox.width + bbox.x + padding * 2, 1200);
            const height = Math.max(bbox.height + bbox.y + padding * 2, 800);
            clone.setAttribute('width', width);
            clone.setAttribute('height', height);
            clone.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`);
            
            // Serialize
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(clone);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            const img = new Image();
            const canvas = document.createElement('canvas');
            
            // 2x for retina quality
            canvas.width = width * 2;
            canvas.height = height * 2;
            
            img.onload = () => {
                const ctx = canvas.getContext('2d');
                ctx.scale(2, 2);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url);
                    if (blob) {
                        const pngUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = pngUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(() => {
                            document.body.removeChild(a);
                            URL.revokeObjectURL(pngUrl);
                            resolve();
                        }, 100);
                    } else {
                        reject(new Error('Failed to create PNG blob'));
                    }
                }, 'image/png');
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load SVG as image'));
            };
            
            img.src = url;
        } catch (err) {
            reject(err);
        }
    });
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
 * Opens a full-page overlay of the markmap in the active tab.
 *
 * Strategy: load libraries via injected <script src="moz-extension://..."> tags
 * (where this===window, matching how the sidebar loads them). This avoids the
 * UMD `this.markmap` bug in markmap-view.js when run via executeScript files:[]
 * with a wrapper that rebinds `this`. Falls back to fetch+Function for pages
 * with strict script-src CSP.
 *
 * @param {string} text - Original markdown text
 */
async function openFullPageView(text) {
    try {
        console.debug('[conceptmap] fullscreen: start');

        // 1) Get active tab and validate URL FIRST (preserves user-gesture for
        //    permissions.request() inside executeScriptSafe).
        const tabs = await ext.tabs.query({ active: true, currentWindow: true });
        if (!tabs.length) { alert('No hi ha cap pestanya activa.'); return; }
        const tabId = tabs[0].id;
        const tabUrl = tabs[0].url;

        if (!isInjectableUrl(tabUrl)) {
            alert(`Aquesta pàgina és interna del navegador i no admet overlays d'extensions (${tabUrl}).\n\nCanvia a una pestanya web normal (http/https) i torna-ho a provar.`);
            return;
        }

        console.debug('[conceptmap] fullscreen: tab ok', tabId, tabUrl);

        // 2) Transform markdown to rootData in the sidebar context.
        const { Transformer } = window.markmap;
        const transformer = new Transformer();
        const { root: rootData } = transformer.transform(text);

        // 3) Build URLs to library files (declared in web_accessible_resources).
        const libFiles = ["d3.min.js", "markmap-lib.js", "markmap-view.js"];
        const libUrls = libFiles.map(f => ext.runtime.getURL(f));

        // 4) Load libraries into the page's MAIN world by appending <script src="moz-extension://..."> tags.
        //    This is the most reliable way to make UMD libs assign to window correctly.
        const loadResult = await executeScriptSafe({
            target: { tabId },
            world: "MAIN",
            func: async (urls) => {
                const loadOne = (src) => new Promise((resolve, reject) => {
                    // Skip if already present
                    if (document.querySelector(`script[data-markmap-lib="${src}"]`)) {
                        return resolve('cached');
                    }
                    const s = document.createElement('script');
                    s.src = src;
                    s.setAttribute('data-markmap-lib', src);
                    s.onload = () => resolve('ok');
                    s.onerror = (_e) => reject(new Error('script load failed: ' + src));
                    (document.head || document.documentElement).appendChild(s);
                });
                try {
                    for (const u of urls) await loadOne(u);
                    return {
                        ok: true,
                        hasMarkmap: typeof window.markmap !== 'undefined',
                        hasMarkmapClass: !!(window.markmap && window.markmap.Markmap),
                        hasTransformer: !!(window.markmap && window.markmap.Transformer),
                        hasD3: typeof window.d3 !== 'undefined'
                    };
                } catch (e) {
                    return { ok: false, error: e.message };
                }
            },
            args: [libUrls]
        });

        const probe = loadResult && loadResult[0] && loadResult[0].result;
        console.debug('[conceptmap] fullscreen: lib load probe', probe);

        if (!loadResult || !loadResult.length) {
            alert("No s'ha pogut injectar a la pàgina activa. És possible que la pàgina sigui privilegiada o que falti el permís d'accés. Comprova els permisos de l'extensió per a aquest lloc.");
            return;
        }

        if (!probe || !probe.ok || !probe.hasMarkmapClass) {
            // CSP fallback: fetch the lib code and eval it in MAIN world via Function.
            console.debug('[conceptmap] fullscreen: <script> tag path failed, trying fetch fallback');
            const libCodes = [];
            for (const u of libUrls) {
                try {
                    const r = await fetch(u);
                    libCodes.push(await r.text());
                } catch (e) {
                    alert(`No s'ha pogut llegir la llibreria ${u}: ${e.message}`);
                    return;
                }
            }
            const fallbackResult = await executeScriptSafe({
                target: { tabId },
                world: "MAIN",
                func: (codes) => {
                    try {
                        for (const code of codes) {
                            // Indirect eval at global scope (avoids Function constructor).
                            (0, eval)(code);
                        }
                        return {
                            ok: true,
                            hasMarkmapClass: !!(window.markmap && window.markmap.Markmap),
                            hasTransformer: !!(window.markmap && window.markmap.Transformer)
                        };
                    } catch (e) {
                        return { ok: false, error: e.message };
                    }
                },
                args: [libCodes]
            });
            const fb = fallbackResult && fallbackResult[0] && fallbackResult[0].result;
            console.debug('[conceptmap] fullscreen: fallback probe', fb);
            if (!fb || !fb.ok || !fb.hasMarkmapClass) {
                const detail = probe && probe.error ? probe.error : (fb && fb.error ? fb.error : 'desconegut');
                alert(`No s'han pogut carregar les llibreries del mapa a la pàgina. La CSP del lloc pot estar bloquejant la injecció.\n\nDetall: ${detail}`);
                return;
            }
        }

        // 5) Inject the overlay into MAIN world.
        const result = await executeScriptSafe({
            target: { tabId },
            world: "MAIN",
            func: (rootData) => {
                // Remove existing overlay
                const existing = document.getElementById('markmap-fullscreen-overlay');
                if (existing) existing.remove();

                if (typeof window.markmap === 'undefined' || !window.markmap.Markmap) {
                    return 'error: markmap not loaded (missing Markmap class)';
                }

                // Overlay backdrop
                const overlay = document.createElement('div');
                overlay.id = 'markmap-fullscreen-overlay';
                overlay.style.cssText = [
                    'position:fixed', 'inset:0', 'width:100vw', 'height:100vh',
                    'background:rgba(0,0,0,0.55)', 'z-index:2147483647',
                    'display:flex', 'align-items:center', 'justify-content:center',
                    'font-family:system-ui,sans-serif'
                ].join('!important;') + '!important';

                // Modal box 95%
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

                // Controls group (expand / collapse / close)
                const actions = document.createElement('div');
                actions.style.cssText = 'display:flex!important;gap:0.5em!important;align-items:center!important';

                const mkBtn = (label, titleText) => {
                    const b = document.createElement('button');
                    b.textContent = label;
                    b.title = titleText;
                    b.style.cssText = [
                        'padding:0.4em 0.9em', 'border:1px solid #ccc',
                        'border-radius:4px', 'background:#fff', 'color:#100f0f',
                        'cursor:pointer', 'font-size:0.9em', 'font-family:inherit'
                    ].join('!important;') + '!important';
                    return b;
                };

                const expandAllBtn = mkBtn('⊕ Expandir tot', 'Expandir tot');
                const collapseAllBtn = mkBtn('⊖ Col·lapsar tot', 'Col·lapsar tot');
                const closeBtn = mkBtn('✕ Tancar', 'Tancar');

                actions.appendChild(expandAllBtn);
                actions.appendChild(collapseAllBtn);
                actions.appendChild(closeBtn);

                header.appendChild(title);
                header.appendChild(actions);

                // Content area
                const content = document.createElement('div');
                content.style.cssText = [
                    'flex:1', 'position:relative', 'overflow:hidden'
                ].join('!important;') + '!important';

                // SVG
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('width', '100%');
                svg.setAttribute('height', '100%');
                svg.style.cssText = 'width:100%!important;height:100%!important;display:block!important';
                content.appendChild(svg);

                modal.appendChild(header);
                modal.appendChild(content);
                overlay.appendChild(modal);
                document.body.appendChild(overlay);

                // Close handlers
                const closeOverlay = () => overlay.remove();
                closeBtn.onclick = closeOverlay;
                overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
                document.addEventListener('keydown', function escHandler(e) {
                    if (e.key === 'Escape') { closeOverlay(); document.removeEventListener('keydown', escHandler); }
                });

                // Render markmap
                try {
                    const { Markmap } = window.markmap;
                    const mm = Markmap.create(svg, {
                        duration: 500,
                        maxWidth: 400,
                        color: (node) => {
                            const colors = ['#205ea6', '#5e409d', '#16a34a', '#dc2626', '#ea580c', '#0891b2'];
                            return colors[node.depth % colors.length];
                        },
                        paddingX: 10,
                        paddingY: 5,
                        spacingVertical: 10,
                        spacingHorizontal: 100,
                        autoFit: true,
                        zoom: true,
                        pan: true
                    }, rootData);
                    setTimeout(() => mm.fit(), 100);

                    // Expand / collapse all handlers (operate on rootData tree, re-render via setData)
                    const setFoldAll = (node, fold) => {
                        if (node.children && node.children.length > 0) {
                            node.payload = node.payload || {};
                            if (fold) node.payload.fold = 1;
                            else delete node.payload.fold;
                            node.children.forEach(child => setFoldAll(child, fold));
                        }
                    };
                    expandAllBtn.onclick = () => {
                        setFoldAll(rootData, false);
                        mm.setData(rootData);
                        setTimeout(() => mm.fit(), 50);
                    };
                    collapseAllBtn.onclick = () => {
                        setFoldAll(rootData, true);
                        if (rootData.payload) delete rootData.payload.fold;
                        mm.setData(rootData);
                        setTimeout(() => mm.fit(), 50);
                    };

                    return 'ok';
                } catch (e) {
                    return 'error: ' + e.message;
                }
            },
            args: [rootData]
        });

        console.debug('[conceptmap] fullscreen: overlay result', result);

        if (!result || !result.length) {
            alert("No s'ha pogut crear l'overlay a la pàgina.");
            return;
        }
        const overlayRes = result[0]?.result;
        if (typeof overlayRes === 'string' && overlayRes.startsWith('error')) {
            alert('Error al mapa: ' + overlayRes);
            return;
        }
        console.debug('[conceptmap] fullscreen: done');

    } catch (error) {
        console.error('Error opening fullscreen view:', error);
        alert('Error obrint vista completa: ' + error.message);
    }
}
