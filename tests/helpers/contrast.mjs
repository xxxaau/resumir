/**
 * tests/helpers/contrast.mjs
 * Càlcul de contrast WCAG 2.x i lectura dels tokens de color dels temes (CSS).
 */
import { readFileSync } from "node:fs";

export function luminance(hex) {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255)
        .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/**
 * Llegeix els blocs de tema d'un CSS: `:root` (clar) i `[data-actual-theme="X"]`
 * NOMÉS quan el selector és exactament el tema (no `[theme] .component`).
 * Cada tema hereta els tokens que no redefineix de `:root`.
 * @returns {Record<string, Record<string,string>>} tema → {--token: valor}
 */
export function readThemes(cssPath) {
    const css = readFileSync(cssPath, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const blocks = {};
    for (const m of css.matchAll(/(^|\n)\s*(:root|\[data-actual-theme="([\w-]+)"\])\s*\{([^}]*)\}/g)) {
        const name = m[3] || "light";
        blocks[name] = blocks[name] || {};
        for (const d of m[4].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) blocks[name][d[1]] = d[2].trim();
    }
    const base = blocks.light || {};
    const out = {};
    for (const [name, tokens] of Object.entries(blocks)) out[name] = { ...base, ...tokens };
    return out;
}
