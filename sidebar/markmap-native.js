/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// sidebar/markmap-native.js
// Pure SVG mind-map renderer. Replaces markmap-lib + markmap-view + d3.
// No external dependencies, no innerHTML, no eval/Function constructor.
//
// ⚠️⚠️ DUPLICACIÓ DELIBERADA — LLEGEIX ABANS DE TOCAR EL RENDERER ⚠️⚠️
// La lògica de render/layout/fold/clic/colors d'aquest fitxer està DUPLICADA
// a `sidebar/conceptmap.js` dins de `fullscreenOverlayFunc` (la vista de
// pantalla completa). Aquella còpia s'injecta al món MAIN de la pàgina via
// executeScript i NO pot accedir a window.markmapNative, per això es duplica.
// REGLA: qualsevol canvi de renderer aquí (colors NODE/LEAF, arestes,
// profunditat de plegat, handler de clic a la pastilla, layout) s'HA D'APLICAR
// TAMBÉ a `fullscreenOverlayFunc` de conceptmap.js perquè les dues vistes no
// divergeixin. Vegeu docs/LEARNINGS.md.
//
// Public API (attached to window.markmapNative):
//   parseMarkdownTree(text)           -> root node {label, children, depth, fold}
//   createMindMap(svgElement, root, options) -> instance { fit, rescale, setFold, setData, getRoot }
//   serializeToSVG(svgElement)        -> XMLString
//   exportToPNG(svgElement, filename, options?) -> Promise<void>

(function (global) {
    "use strict";

    const SVG_NS = "http://www.w3.org/2000/svg";

    // ─── Parser ──────────────────────────────────────────────────────────────
    // Accepts indented Markdown lists (lines starting with "- " or "* ").
    // Returns root {label, children: [...], depth, fold, payload}.

    function parseMarkdownTree(text) {
        if (!text || typeof text !== "string") {
            return { label: "(buit)", children: [], depth: 0 };
        }

        const rawLines = text.split("\n");
        const lines = [];
        for (const line of rawLines) {
            const trimmed = line.trimStart();
            if (!trimmed.startsWith("- ") && !trimmed.startsWith("* ")) continue;
            const indent = line.length - trimmed.length;
            const content = trimmed.substring(2);
            lines.push({ indent, content });
        }

        if (lines.length === 0) {
            return { label: text.split("\n")[0] || "(sense contingut)", children: [], depth: 0 };
        }

        // Detect indent unit
        let unit = 2;
        for (const l of lines) {
            if (l.indent > 0) { unit = l.indent <= 2 ? 2 : (l.indent <= 4 ? l.indent : 2); break; }
        }

        const minIndent = lines.reduce((m, l) => Math.min(m, l.indent), Infinity);
        const nodes = lines.map(l => ({
            level: Math.max(0, Math.round((l.indent - minIndent) / unit)),
            content: l.content
        }));

        // Build tree
        const root = { label: "", children: [], depth: 0 };
        const stack = [{ node: root, level: -1 }];

        for (const n of nodes) {
            // Pop until parent level < n.level
            while (stack.length > 1 && stack[stack.length - 1].level >= n.level) stack.pop();
            const parent = stack[stack.length - 1].node;
            const child = { label: n.content, children: [], depth: parent.depth + 1 };
            parent.children.push(child);
            stack.push({ node: child, level: n.level });
        }

        // If exactly one top-level child, promote it as root for cleaner visualization.
        if (root.children.length === 1) {
            const promoted = root.children[0];
            promoted.depth = 0;
            const fixDepth = (node, d) => {
                node.depth = d;
                node.children.forEach(c => fixDepth(c, d + 1));
            };
            fixDepth(promoted, 0);
            return promoted;
        }

        root.label = "Mapa";
        return root;
    }

    // ─── Layout (tidy tree, horizontal) ──────────────────────────────────────
    // Calculates x/y for each node. Root at left, children flow right.
    // y is the vertical center of each node. x is horizontal column.

    // Canvas singleton for precise text measurement. Cheaper and far more accurate
    // than char-count estimation; eliminates the edge/text desencaix observed when
    // baseline width was estimated as `text.length * avgChar`.
    let _measureCtx = null;
    function getMeasureCtx(fontSize) {
        if (!_measureCtx) {
            try {
                const canvas = (typeof document !== "undefined")
                    ? document.createElement("canvas") : null;
                _measureCtx = canvas ? canvas.getContext("2d") : null;
            } catch { _measureCtx = null; }
        }
        if (_measureCtx) {
            _measureCtx.font = `400 ${fontSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
        }
        return _measureCtx;
    }

    function measureLabel(text, fontSize, maxWidth) {
        const ctx = getMeasureCtx(fontSize);
        const measure = (s) => ctx
            ? ctx.measureText(s).width
            : s.length * fontSize * 0.55; // fallback estimation if canvas unavailable

        const naturalWidth = measure(text);
        if (naturalWidth <= maxWidth) {
            return { width: naturalWidth, lines: [text] };
        }
        // Wrap by words, measuring each candidate line precisely.
        const words = text.split(/\s+/);
        const lines = [];
        let current = "";
        for (const w of words) {
            const candidate = current ? current + " " + w : w;
            if (measure(candidate) <= maxWidth) {
                current = candidate;
            } else {
                if (current) lines.push(current);
                current = w;
            }
        }
        if (current) lines.push(current);
        const longest = lines.reduce((m, l) => Math.max(m, measure(l)), 0);
        return { width: longest, lines };
    }

    function computeLayout(root, options) {
        const {
            fontSize = 14,
            lineHeight = 1.3,
            paddingX = 10,
            paddingY = 6,
            maxLabelWidth = 280,
            spacingX = 60,
            spacingY = 10,
        } = options;

        // First pass: measure all nodes
        function measure(node) {
            const m = measureLabel(node.label, fontSize, maxLabelWidth);
            node._lines = m.lines;
            node._textWidth = m.width;
            node._width = m.width + paddingX * 2;
            node._height = m.lines.length * fontSize * lineHeight + paddingY * 2;
            const visibleChildren = (!node.fold && node.children) ? node.children : [];
            for (const c of visibleChildren) measure(c);
        }
        measure(root);

        // Second pass: assign y (vertical) using subtree height
        function subtreeHeight(node) {
            const visible = (!node.fold && node.children) ? node.children : [];
            if (visible.length === 0) {
                node._subtreeH = node._height;
                return node._subtreeH;
            }
            let total = 0;
            for (const c of visible) total += subtreeHeight(c);
            total += (visible.length - 1) * spacingY;
            node._subtreeH = Math.max(node._height, total);
            return node._subtreeH;
        }
        subtreeHeight(root);

        // Third pass: assign x (column) and y (center)
        function place(node, x, yCenter) {
            node._x = x;
            node._y = yCenter;
            const visible = (!node.fold && node.children) ? node.children : [];
            if (visible.length === 0) return;
            const childX = x + node._width + spacingX;
            const totalH = visible.reduce((s, c) => s + c._subtreeH, 0) + (visible.length - 1) * spacingY;
            let cursorY = yCenter - totalH / 2;
            for (const c of visible) {
                const cy = cursorY + c._subtreeH / 2;
                place(c, childX, cy);
                cursorY += c._subtreeH + spacingY;
            }
        }
        place(root, 0, 0);

        // Compute bounds
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

    // ─── Renderer ────────────────────────────────────────────────────────────

    // Paleta NotebookLM per PROFUNDITAT: cada nivell té un color distint.
    // Índex = min(depth, 3). 0 lavanda · 1 blau · 2 verd · 3+ verd clar.
    const DEPTH_SOLID = ["#b1a8e6", "#a7c6ef", "#93d4b4", "#c2ebd3"];  // sòlid (cercle toggle)
    const DEPTH_GRAD  = [["#c6c0f2", "#a59ce0"], ["#c1d6f6", "#97b8e8"], ["#b9ebcd", "#87cda8"], ["#d6f2e0", "#b0e0c4"]];
    const EDGE_COLOR  = "#c7cbe0";
    const TEXT_COLOR  = "#1a1a1a";

    // Crea un <linearGradient> vertical (top→bottom) sense innerHTML.
    function makeGradient(id, topColor, bottomColor) {
        const g = document.createElementNS(SVG_NS, "linearGradient");
        g.setAttribute("id", id);
        g.setAttribute("x1", "0"); g.setAttribute("y1", "0");
        g.setAttribute("x2", "0"); g.setAttribute("y2", "1");
        const s1 = document.createElementNS(SVG_NS, "stop");
        s1.setAttribute("offset", "0%"); s1.setAttribute("stop-color", topColor);
        const s2 = document.createElementNS(SVG_NS, "stop");
        s2.setAttribute("offset", "100%"); s2.setAttribute("stop-color", bottomColor);
        g.appendChild(s1); g.appendChild(s2);
        return g;
    }

    function createMindMap(svgElement, root, userOptions) {
        const options = Object.assign({
            fontSize: 14,
            lineHeight: 1.3,
            paddingX: 14,
            paddingY: 8,
            maxLabelWidth: 280,
            spacingX: 50,
            spacingY: 14,
            depthColors: DEPTH_SOLID,
            edgeColor: EDGE_COLOR,
            backgroundColor: null, // null = transparent
            textColor: TEXT_COLOR,
        }, userOptions || {});

        // Ensure svg has a viewport <g> for zoom/pan transforms
        while (svgElement.firstChild) svgElement.removeChild(svgElement.firstChild);

        // Degradats verticals subtils per a les pastilles (com NotebookLM).
        // Construïts via createElementNS (sense innerHTML, AMO-friendly).
        const defs = document.createElementNS(SVG_NS, "defs");
        DEPTH_GRAD.forEach((gr, i) => defs.appendChild(makeGradient("mm-grad-" + i, gr[0], gr[1])));
        svgElement.appendChild(defs);

        const viewport = document.createElementNS(SVG_NS, "g");
        viewport.setAttribute("class", "markmap-viewport");
        svgElement.appendChild(viewport);

        // State
        const state = {
            root,
            options,
            transform: { x: 0, y: 0, k: 1 },
            bounds: null,
        };

        function nodeColorFor(node) {
            return options.depthColors[Math.min(node.depth, options.depthColors.length - 1)];
        }
        function edgeColorFor() {
            return options.edgeColor;
        }

        function curve(x1, y1, x2, y2) {
            const dx = Math.max(20, (x2 - x1) * 0.4);
            return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
        }

        function render() {
            state.bounds = computeLayout(state.root, options);
            // Clear viewport
            while (viewport.firstChild) viewport.removeChild(viewport.firstChild);

            // Render links first (so nodes overlap them)
            const linksGroup = document.createElementNS(SVG_NS, "g");
            linksGroup.setAttribute("class", "markmap-links");
            viewport.appendChild(linksGroup);

            const nodesGroup = document.createElementNS(SVG_NS, "g");
            nodesGroup.setAttribute("class", "markmap-nodes");
            viewport.appendChild(nodesGroup);

            function walk(node) {
                const visible = (!node.fold && node.children) ? node.children : [];
                // Links to children — connect pill-to-pill laterally
                for (const c of visible) {
                    const path = document.createElementNS(SVG_NS, "path");
                    // L'aresta surt de la dreta del cercle toggle (cx=width+10, r=8),
                    // com NotebookLM, no de la vora de la pastilla.
                    const x1 = node._x + node._width + 18;
                    const y1 = node._y;
                    const x2 = c._x;
                    const y2 = c._y;
                    path.setAttribute("d", curve(x1, y1, x2, y2));
                    path.setAttribute("fill", "none");
                    path.setAttribute("stroke", edgeColorFor());
                    path.setAttribute("stroke-width", "1.5");
                    path.setAttribute("opacity", "1");
                    linksGroup.appendChild(path);
                }

                // Node group (translated so internal coords are 0..width/height)
                const g = document.createElementNS(SVG_NS, "g");
                g.setAttribute("class", "markmap-node");
                g.setAttribute("transform", `translate(${node._x}, ${node._y - node._height / 2})`);

                const fillColor = nodeColorFor(node);  // color sòlid (cercle toggle, glifo)
                const gradId = "url(#mm-grad-" + Math.min(node.depth, DEPTH_GRAD.length - 1) + ")";

                // Pill background (NotebookLM-style rounded rectangle) amb degradat subtil.
                const rect = document.createElementNS(SVG_NS, "rect");
                rect.setAttribute("x", "0");
                rect.setAttribute("y", "0");
                rect.setAttribute("width", String(node._width));
                rect.setAttribute("height", String(node._height));
                const radius = Math.min(12, node._height / 2);
                rect.setAttribute("rx", String(radius));
                rect.setAttribute("ry", String(radius));
                rect.setAttribute("fill", gradId);
                rect.setAttribute("stroke", "none");
                g.appendChild(rect);

                // Text — vertically centred inside the pill
                const text = document.createElementNS(SVG_NS, "text");
                text.setAttribute("x", String(options.paddingX));
                text.setAttribute("y", String(node._height / 2));
                text.setAttribute("dominant-baseline", "central");
                text.setAttribute("text-anchor", "start");
                text.setAttribute("font-size", String(options.fontSize));
                text.setAttribute("font-family", "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif");
                text.setAttribute("font-weight", "400");
                text.setAttribute("fill", options.textColor || TEXT_COLOR);
                text.style.userSelect = "none";

                // Multi-line: shift first tspan up by (N-1)/2 * lineHeight so the block centres.
                const lineH = options.fontSize * options.lineHeight;
                const N = node._lines.length;
                node._lines.forEach((line, i) => {
                    const tspan = document.createElementNS(SVG_NS, "tspan");
                    tspan.setAttribute("x", String(options.paddingX));
                    const dy = i === 0 ? -((N - 1) * lineH) / 2 : lineH;
                    tspan.setAttribute("dy", String(dy));
                    tspan.textContent = line;
                    text.appendChild(tspan);
                });
                g.appendChild(text);

                // Fold toggle: small circle with < or > glyph
                if (node.children && node.children.length > 0) {
                    const tg = document.createElementNS(SVG_NS, "g");
                    tg.setAttribute("class", "markmap-toggle");
                    tg.style.cursor = "pointer";

                    const cx = node._width + 10;
                    const cy = node._height / 2;
                    const toggleStroke = fillColor;

                    const toggle = document.createElementNS(SVG_NS, "circle");
                    toggle.setAttribute("cx", String(cx));
                    toggle.setAttribute("cy", String(cy));
                    toggle.setAttribute("r", "8");
                    toggle.setAttribute("fill", "#ffffff");
                    toggle.setAttribute("stroke", toggleStroke);
                    toggle.setAttribute("stroke-width", "1.5");
                    tg.appendChild(toggle);

                    // Chevron SVG (no glyph de text) per a un símbol net i ben centrat,
                    // com NotebookLM. fold → ">" (expandir), desplegat → "<" (plegar).
                    const glyph = document.createElementNS(SVG_NS, "polyline");
                    const pts = node.fold
                        ? `${cx - 2},${cy - 3.5} ${cx + 2},${cy} ${cx - 2},${cy + 3.5}`
                        : `${cx + 2},${cy - 3.5} ${cx - 2},${cy} ${cx + 2},${cy + 3.5}`;
                    glyph.setAttribute("points", pts);
                    glyph.setAttribute("fill", "none");
                    glyph.setAttribute("stroke", toggleStroke);
                    glyph.setAttribute("stroke-width", "1.5");
                    glyph.setAttribute("stroke-linecap", "round");
                    glyph.setAttribute("stroke-linejoin", "round");
                    tg.appendChild(glyph);

                    tg.addEventListener("click", (e) => {
                        e.stopPropagation();
                        node.fold = !node.fold;
                        render();
                        if (!node.fold) requestAnimationFrame(() => fit());  // autofit en desplegar
                    });
                    g.appendChild(tg);

                    // Clic sobre tota la pastilla = desplega/plega UN nivell (com NotebookLM).
                    // S'ignora si s'estava arrossegant (pan), per no disparar-ho en fer pan.
                    g.style.cursor = "pointer";
                    g.addEventListener("click", () => {
                        if (didPan) return;
                        node.fold = !node.fold;
                        render();
                        if (!node.fold) requestAnimationFrame(() => fit());  // autofit en desplegar
                    });
                }

                nodesGroup.appendChild(g);

                for (const c of visible) walk(c);
            }
            walk(state.root);

            applyTransform();
        }

        function applyTransform() {
            const { x, y, k } = state.transform;
            viewport.setAttribute("transform", `translate(${x}, ${y}) scale(${k})`);
        }

        // ─── Transicions suaus del viewport (tween via rAF) ──────────────────
        // El transform és un ATRIBUT SVG, que les CSS transitions no animen de
        // forma fiable; per això animem amb requestAnimationFrame. El pan i el
        // zoom amb roda es mantenen instantanis (cancel·len qualsevol tween).
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
            if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
            const ease = (t) => 1 - Math.pow(1 - t, 3);  // easeOutCubic
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

        // Calcula el transform que enquadra el mapa (amb un multiplicador d'escala
        // opcional per a l'efecte d'entrada). Retorna null si encara no hi ha bounds.
        function computeFitTarget(scaleMul) {
            if (!state.bounds) return null;
            const svgRect = svgElement.getBoundingClientRect();
            const sw = svgRect.width || 800;
            const sh = svgRect.height || 600;
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

        // Entrada suau: comença lleugerament allunyat i centrat, i s'assenta.
        function introFit() {
            const start = computeFitTarget(0.9);
            const target = computeFitTarget(1);
            if (!target) return;
            if (start) setTransform(start);
            animateTransform(target, 480);
        }

        function rescale(factor) {
            const svgRect = svgElement.getBoundingClientRect();
            const cx = svgRect.width / 2;
            const cy = svgRect.height / 2;
            // Zoom centered on viewport center
            const newK = Math.max(0.1, Math.min(10, state.transform.k * factor));
            const ratio = newK / state.transform.k;
            animateTransform({
                x: cx - (cx - state.transform.x) * ratio,
                y: cy - (cy - state.transform.y) * ratio,
                k: newK,
            }, 220);
        }

        function setFoldAll(fold) {
            function walk(node) {
                if (node.children && node.children.length > 0) {
                    node.fold = fold;
                    node.children.forEach(walk);
                }
            }
            walk(state.root);
            // Keep root always visible
            state.root.fold = false;
        }

        function setData(newRoot) {
            state.root = newRoot;
            render();
        }

        // ─── Pan & Zoom interactions ─────────────────────────────────────────

        let isPanning = false;
        let didPan = false;  // true si el ratolí s'ha mogut prou → no és un clic de pastilla
        let panStart = { x: 0, y: 0, tx: 0, ty: 0 };

        svgElement.addEventListener("mousedown", (e) => {
            // Don't start pan on toggle clicks
            if (e.target.tagName === "circle") return;
            cancelAnim();  // el pan és instantani: atura qualsevol tween en curs
            isPanning = true;
            didPan = false;
            panStart.x = e.clientX;
            panStart.y = e.clientY;
            panStart.tx = state.transform.x;
            panStart.ty = state.transform.y;
            svgElement.style.cursor = "grabbing";
        });
        window.addEventListener("mousemove", (e) => {
            if (!isPanning) return;
            if (Math.abs(e.clientX - panStart.x) > 4 || Math.abs(e.clientY - panStart.y) > 4) didPan = true;
            state.transform.x = panStart.tx + (e.clientX - panStart.x);
            state.transform.y = panStart.ty + (e.clientY - panStart.y);
            applyTransform();
        });
        window.addEventListener("mouseup", () => {
            if (isPanning) {
                isPanning = false;
                svgElement.style.cursor = "grab";
            }
        });

        svgElement.style.cursor = "grab";

        svgElement.addEventListener("wheel", (e) => {
            e.preventDefault();
            cancelAnim();  // zoom amb roda instantani: atura qualsevol tween
            const rect = svgElement.getBoundingClientRect();
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

        // Initial render
        render();
        // Fit after DOM has dimensions — amb entrada suau (zoom-in centrat).
        requestAnimationFrame(() => introFit());

        return {
            fit,
            rescale,
            setFoldAll,
            setData,
            getRoot: () => state.root,
            rerender: render,
        };
    }

    // ─── Serialization & PNG export ──────────────────────────────────────────

    function serializeToSVG(svgElement, options) {
        const opts = Object.assign({ padding: 50, backgroundColor: "#ffffff" }, options || {});
        // Clone and inline computed styles
        const clone = svgElement.cloneNode(true);

        // Inline essential computed styles (so the SVG renders correctly outside
        // of the extension context — PNG export, fullscreen overlay on host page).
        const orig = svgElement.querySelectorAll("*");
        const cloned = clone.querySelectorAll("*");
        const props = ["fill", "stroke", "stroke-width", "stroke-opacity", "fill-opacity",
                       "font-family", "font-size", "font-weight", "opacity"];
        for (let i = 0; i < orig.length; i++) {
            const cs = window.getComputedStyle(orig[i]);
            for (const p of props) {
                const v = cs.getPropertyValue(p);
                if (v) cloned[i].style.setProperty(p, v);
            }
        }

        // Resolve any remaining var(--bg-color) attribute values on cloned circles
        // (toggle dots used var(--bg-color) for theme support; outside the sidebar
        // context the variable is undefined and would render as black).
        const bgFallback = opts.backgroundColor || "#ffffff";
        cloned.forEach(el => {
            const fill = el.getAttribute && el.getAttribute("fill");
            if (fill && fill.includes("var(")) {
                el.setAttribute("fill", bgFallback);
            }
        });

        // Use the viewport bounds, not the SVG element rect (which may be clipped/zoomed)
        const viewport = svgElement.querySelector(".markmap-viewport");
        const bbox = viewport ? viewport.getBBox() : svgElement.getBBox();
        const pad = opts.padding;
        const w = bbox.width + pad * 2;
        const h = bbox.height + pad * 2;

        // Replace viewport transform with identity, since we're using viewBox for the bbox
        const clonedViewport = clone.querySelector(".markmap-viewport");
        if (clonedViewport) clonedViewport.setAttribute("transform", "translate(0, 0) scale(1)");

        clone.setAttribute("width", String(w));
        clone.setAttribute("height", String(h));
        clone.setAttribute("viewBox", `${bbox.x - pad} ${bbox.y - pad} ${w} ${h}`);
        clone.setAttribute("xmlns", SVG_NS);

        return new XMLSerializer().serializeToString(clone);
    }

    function exportToPNG(svgElement, filename, options) {
        const opts = Object.assign({ scale: 2, backgroundColor: "#ffffff", padding: 50 }, options || {});
        return new Promise((resolve, reject) => {
            try {
                const svgString = serializeToSVG(svgElement, opts);
                // data: URL en lloc de blob: — la CSP de la pàgina d'extensió
                // (img-src 'self' data:) bloqueja blob:, i això feia fallar
                // l'export a la sidebar (a pantalla completa funcionava perquè
                // corre al context de la pàgina amfitriona). data: és permès.
                const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);

                // Parse out width/height from svg string
                const wMatch = svgString.match(/width="([\d.]+)"/);
                const hMatch = svgString.match(/height="([\d.]+)"/);
                const w = wMatch ? parseFloat(wMatch[1]) : 1200;
                const h = hMatch ? parseFloat(hMatch[1]) : 800;

                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = w * opts.scale;
                    canvas.height = h * opts.scale;
                    const ctx = canvas.getContext("2d");
                    ctx.scale(opts.scale, opts.scale);
                    if (opts.backgroundColor) {
                        ctx.fillStyle = opts.backgroundColor;
                        ctx.fillRect(0, 0, w, h);
                    }
                    ctx.drawImage(img, 0, 0, w, h);
                    canvas.toBlob((blob) => {
                        URL.revokeObjectURL(url);
                        if (!blob) { reject(new Error("Failed to create PNG blob")); return; }
                        const pngUrl = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = pngUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(() => {
                            document.body.removeChild(a);
                            URL.revokeObjectURL(pngUrl);
                            resolve();
                        }, 100);
                    }, "image/png");
                };
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error("Failed to load SVG as image"));
                };
                img.src = url;
            } catch (err) {
                reject(err);
            }
        });
    }

    // ─── Export to global ────────────────────────────────────────────────────
    global.markmapNative = {
        parseMarkdownTree,
        createMindMap,
        serializeToSVG,
        exportToPNG,
    };
})(typeof window !== "undefined" ? window : globalThis);
