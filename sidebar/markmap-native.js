/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// sidebar/markmap-native.js
// Pure SVG mind-map renderer. Replaces markmap-lib + markmap-view + d3.
// No external dependencies, no innerHTML, no eval/Function constructor.
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

    function measureLabel(text, fontSize, maxWidth) {
        // Approximation: characters * average width. We use a hidden SVG <text> for accuracy later.
        // For now, estimate. Real measurement happens in render pass.
        const avgChar = fontSize * 0.55;
        const naturalWidth = text.length * avgChar;
        if (naturalWidth <= maxWidth) {
            return { width: naturalWidth, lines: [text] };
        }
        // Wrap by words
        const words = text.split(/\s+/);
        const lines = [];
        let current = "";
        for (const w of words) {
            const candidate = current ? current + " " + w : w;
            if (candidate.length * avgChar <= maxWidth) {
                current = candidate;
            } else {
                if (current) lines.push(current);
                current = w;
            }
        }
        if (current) lines.push(current);
        const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
        return { width: longest * avgChar, lines };
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

    const DEFAULT_COLORS = [
        "#205ea6", "#5e409d", "#16a34a", "#dc2626", "#ea580c", "#0891b2"
    ];

    function createMindMap(svgElement, root, userOptions) {
        const options = Object.assign({
            fontSize: 14,
            lineHeight: 1.3,
            paddingX: 10,
            paddingY: 6,
            maxLabelWidth: 280,
            spacingX: 60,
            spacingY: 10,
            colors: DEFAULT_COLORS,
            backgroundColor: null, // null = transparent
        }, userOptions || {});

        // Ensure svg has a viewport <g> for zoom/pan transforms
        while (svgElement.firstChild) svgElement.removeChild(svgElement.firstChild);
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

        function colorForDepth(depth) {
            return options.colors[depth % options.colors.length];
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
                // Links to children
                for (const c of visible) {
                    const path = document.createElementNS(SVG_NS, "path");
                    const x1 = node._x + node._width;
                    const y1 = node._y;
                    const x2 = c._x;
                    const y2 = c._y;
                    path.setAttribute("d", curve(x1, y1, x2, y2));
                    path.setAttribute("fill", "none");
                    path.setAttribute("stroke", colorForDepth(c.depth));
                    path.setAttribute("stroke-width", "1.5");
                    path.setAttribute("opacity", "0.6");
                    linksGroup.appendChild(path);
                }

                // Node group
                const g = document.createElementNS(SVG_NS, "g");
                g.setAttribute("class", "markmap-node");
                g.setAttribute("transform", `translate(${node._x}, ${node._y - node._height / 2})`);

                const color = colorForDepth(node.depth);

                // Bottom border line (markmap-style)
                const baseline = document.createElementNS(SVG_NS, "line");
                baseline.setAttribute("x1", "0");
                baseline.setAttribute("y1", node._height);
                baseline.setAttribute("x2", node._width);
                baseline.setAttribute("y2", node._height);
                baseline.setAttribute("stroke", color);
                baseline.setAttribute("stroke-width", "2");
                g.appendChild(baseline);

                // Text
                const text = document.createElementNS(SVG_NS, "text");
                text.setAttribute("x", options.paddingX);
                text.setAttribute("y", options.paddingY);
                text.setAttribute("dominant-baseline", "hanging");
                text.setAttribute("font-size", String(options.fontSize));
                text.setAttribute("font-family", "system-ui, -apple-system, sans-serif");
                text.setAttribute("fill", "currentColor");
                text.style.userSelect = "none";

                node._lines.forEach((line, i) => {
                    const tspan = document.createElementNS(SVG_NS, "tspan");
                    tspan.setAttribute("x", String(options.paddingX));
                    tspan.setAttribute("dy", i === 0 ? "0" : String(options.fontSize * options.lineHeight));
                    tspan.textContent = line;
                    text.appendChild(tspan);
                });
                g.appendChild(text);

                // Fold toggle circle (only if has children)
                if (node.children && node.children.length > 0) {
                    const toggle = document.createElementNS(SVG_NS, "circle");
                    toggle.setAttribute("cx", String(node._width + 6));
                    toggle.setAttribute("cy", String(node._height));
                    toggle.setAttribute("r", "5");
                    toggle.setAttribute("fill", node.fold ? color : "#ffffff");
                    toggle.setAttribute("stroke", color);
                    toggle.setAttribute("stroke-width", "1.5");
                    toggle.style.cursor = "pointer";
                    toggle.addEventListener("click", (e) => {
                        e.stopPropagation();
                        node.fold = !node.fold;
                        render();
                    });
                    g.appendChild(toggle);
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

        function fit() {
            if (!state.bounds) return;
            const svgRect = svgElement.getBoundingClientRect();
            const sw = svgRect.width || 800;
            const sh = svgRect.height || 600;
            const bw = state.bounds.width;
            const bh = state.bounds.height;
            if (bw <= 0 || bh <= 0) return;
            const margin = 40;
            const k = Math.min((sw - margin * 2) / bw, (sh - margin * 2) / bh, 2);
            state.transform.k = k;
            // Center bounds in viewport
            const cx = (state.bounds.minX + state.bounds.maxX) / 2;
            const cy = (state.bounds.minY + state.bounds.maxY) / 2;
            state.transform.x = sw / 2 - cx * k;
            state.transform.y = sh / 2 - cy * k;
            applyTransform();
        }

        function rescale(factor) {
            const svgRect = svgElement.getBoundingClientRect();
            const cx = svgRect.width / 2;
            const cy = svgRect.height / 2;
            // Zoom centered on viewport center
            const newK = Math.max(0.1, Math.min(10, state.transform.k * factor));
            const ratio = newK / state.transform.k;
            state.transform.x = cx - (cx - state.transform.x) * ratio;
            state.transform.y = cy - (cy - state.transform.y) * ratio;
            state.transform.k = newK;
            applyTransform();
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
        let panStart = { x: 0, y: 0, tx: 0, ty: 0 };

        svgElement.addEventListener("mousedown", (e) => {
            // Don't start pan on toggle clicks
            if (e.target.tagName === "circle") return;
            isPanning = true;
            panStart.x = e.clientX;
            panStart.y = e.clientY;
            panStart.tx = state.transform.x;
            panStart.ty = state.transform.y;
            svgElement.style.cursor = "grabbing";
        });
        window.addEventListener("mousemove", (e) => {
            if (!isPanning) return;
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
        // Fit after DOM has dimensions
        requestAnimationFrame(() => fit());

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

        // Inline essential computed styles
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
                const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
                const url = URL.createObjectURL(svgBlob);

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
