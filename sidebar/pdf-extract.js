/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// sidebar/pdf-extract.js
// Extracció de text de fitxers PDF (locals i remots) usant pdf.js (vendor/pdf.min.js).
//
// API agnòstica: accepta una URL (string) o un ArrayBuffer/Uint8Array.
// Disseny pensat per ser reutilitzable en un futur plugin Zotero sense canvis.
//
// Errors codificats (e.code):
//   FETCH_FAILED  → No s'ha pogut descarregar el PDF
//   PASSWORD      → PDF protegit amb contrasenya
//   INVALID       → PDF corrupt o no és un PDF
//   SCANNED       → PDF sense capa de text (escanejat)
//   TOO_LARGE     → Supera MAX_PAGES
//   TIMEOUT       → El parsing ha excedit timeoutMs

// Estat intern: worker inicialitzat una sola vegada per sessió de sidebar
let _pdfWorkerInitialized = false;

function _initPdfWorker() {
    if (_pdfWorkerInitialized) return;
    if (typeof pdfjsLib === "undefined") {
        throw Object.assign(new Error("pdf.js no carregat (vendor/pdf.min.js)"), { code: "NO_LIB" });
    }
    // ext.runtime.getURL retorna l'URL absolut del worker dins del paquet d'extensió.
    // El worker ha d'estar declarat a web_accessible_resources al manifest.
    if (typeof ext !== "undefined" && ext.runtime && ext.runtime.getURL) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = ext.runtime.getURL("vendor/pdf.worker.min.js");
    } else if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("vendor/pdf.worker.min.js");
    }
    _pdfWorkerInitialized = true;
}

/**
 * Detecta si una URL apunta a un PDF basant-se en l'extensió.
 * Heurística ràpida: no fa cap petició de xarxa. Si el contingut real no és
 * un PDF, getDocument() llançarà un error INVALID que es propagarà a l'UI.
 *
 * @param {string} url
 * @returns {boolean}
 */
function isPdfUrl(url) {
    if (!url || typeof url !== "string") return false;
    try {
        const u = new URL(url);
        // Coincidim amb .pdf al path o als query params (p.ex. ?file=foo.pdf)
        return /\.pdf(?:$|[?#])/i.test(u.pathname) ||
               /\.pdf(?:$|&|=)/i.test(u.search);
    } catch {
        // URL invàlida (p.ex. about:blank) — no és un PDF
        return false;
    }
}

/**
 * Fa una petició HEAD per detectar si una URL HTTPS retorna un PDF.
 *
 * Útil per URLs sense extensió `.pdf` (p. ex. https://arxiv.org/pdf/2401.12345,
 * doi.org/... amb redirect, links amb Content-Disposition: inline).
 *
 * Mai llança: qualsevol error (xarxa, CORS, timeout, no-HTTPS) retorna `false`.
 * Només dispara per a URLs HTTPS perquè HTTP/file estan bloquejats per CSP.
 *
 * @param {string} url
 * @param {Object} [options]
 * @param {number} [options.timeoutMs=5000]
 * @returns {Promise<boolean>}
 */
async function looksLikePdfByHead(url, { timeoutMs = 5000 } = {}) {
    if (!url || typeof url !== "string") return false;
    if (!url.startsWith("https://")) return false;
    let controller;
    let timeoutId;
    try {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const resp = await fetch(url, {
            method: "HEAD",
            credentials: "omit",
            signal: controller.signal,
            redirect: "follow",
        });
        if (!resp.ok) return false;
        const ct = (resp.headers.get("content-type") || "").toLowerCase();
        return ct.startsWith("application/pdf");
    } catch {
        return false;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

/**
 * Extreu text d'un PDF.
 *
 * @param {string|ArrayBuffer|Uint8Array} urlOrBuffer
 *   URL del PDF (http/https/file) o el binari directament.
 * @param {Object} [options]
 * @param {number} [options.maxPages=500]   Límit dur de pàgines (protecció OOM).
 * @param {number} [options.maxChars=2000000]  Límit dur de caràcters (truncació suau).
 * @param {number} [options.timeoutMs=60000]  Timeout global del parsing.
 * @param {number} [options.fetchTimeoutMs=15000]  Timeout específic del fetch inicial.
 *
 * @returns {Promise<{title:string, text:string, pageCount:number, metadata:object}>}
 * @throws {Error} amb propietat `code` (vegeu capçalera del fitxer).
 */
async function extractPdfText(urlOrBuffer, options = {}) {
    _initPdfWorker();

    const MAX_PAGES = options.maxPages || 500;
    const MAX_CHARS = options.maxChars || 2_000_000;
    const TIMEOUT_MS = options.timeoutMs || 60_000;
    const FETCH_TIMEOUT_MS = options.fetchTimeoutMs || 15_000;

    // ---- Pas 1: obtenir el buffer ----
    let data;
    if (urlOrBuffer instanceof ArrayBuffer) {
        data = new Uint8Array(urlOrBuffer);
    } else if (ArrayBuffer.isView(urlOrBuffer)) {
        // Uint8Array u altres typed arrays
        data = urlOrBuffer;
    } else if (typeof urlOrBuffer === "string") {
        try {
            const resp = await fetch(urlOrBuffer, {
                credentials: "omit",
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            // Nota: no validem content-type — alguns servidors retornen tipus
            // genèrics per a PDFs i el header binari serà l'única validació real.
            const arr = await resp.arrayBuffer();
            data = new Uint8Array(arr);
        } catch (e) {
            throw Object.assign(
                new Error("No s'ha pogut descarregar el PDF: " + (e.message || e)),
                { code: "FETCH_FAILED", cause: e }
            );
        }
    } else {
        throw Object.assign(
            new Error("Argument invàlid: cal una URL o un ArrayBuffer/Uint8Array"),
            { code: "INVALID_ARG" }
        );
    }

    // ---- Pas 2: parsing amb timeout global ----
    let pdfDoc;
    try {
        const loadingTask = pdfjsLib.getDocument({
            data,
            disableFontFace: true,    // Evita carregar fonts (només extraiem text)
            isEvalSupported: false,   // CSP-friendly: no eval() ni Function()
            useSystemFonts: false,
            verbosity: 0,             // Silencia logs de pdf.js
        });
        let timeoutHandle;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutHandle = setTimeout(
                () => reject(Object.assign(new Error("Timeout"), { code: "TIMEOUT" })),
                TIMEOUT_MS
            );
        });
        try {
            pdfDoc = await Promise.race([loadingTask.promise, timeoutPromise]);
        } finally {
            clearTimeout(timeoutHandle);
        }
    } catch (e) {
        if (e?.code === "TIMEOUT") throw e;
        if (e?.name === "PasswordException") {
            throw Object.assign(new Error("PDF protegit amb contrasenya"), { code: "PASSWORD" });
        }
        throw Object.assign(
            new Error("PDF corrupt o invàlid: " + (e.message || e)),
            { code: "INVALID", cause: e }
        );
    }

    // ---- Pas 3: límit dur de pàgines ----
    const totalPages = pdfDoc.numPages;
    if (totalPages > MAX_PAGES) {
        try { pdfDoc.destroy(); } catch { /* ignore */ }
        throw Object.assign(
            new Error(`PDF massa gran (${totalPages} pàgines, màxim ${MAX_PAGES})`),
            { code: "TOO_LARGE", pageCount: totalPages }
        );
    }

    // ---- Pas 4: metadades (best effort) ----
    let title = "";
    try {
        const md = await pdfDoc.getMetadata();
        const t = md?.info?.Title;
        if (typeof t === "string") title = t.trim();
    } catch { /* sense metadades — no és fatal */ }

    // ---- Pas 5: extracció pàgina a pàgina ----
    const pageTexts = [];
    let totalChars = 0;
    let truncated = false;
    try {
        for (let i = 1; i <= totalPages; i++) {
            const page = await pdfDoc.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
                .map(it => (it && typeof it.str === "string") ? it.str : "")
                .join(" ")
                .replace(/\s+/g, " ")
                .trim();
            pageTexts.push(pageText);
            totalChars += pageText.length;
            try { page.cleanup(); } catch { /* ignore */ }
            if (totalChars > MAX_CHARS) {
                truncated = true;
                break;
            }
        }
    } finally {
        try { pdfDoc.destroy(); } catch { /* ignore */ }
    }

    const text = pageTexts.join("\n\n");

    // ---- Pas 6: detecció de PDF escanejat ----
    // Heurística: <10 caràcters per pàgina en mitjana, amb un mínim absolut de 100.
    const minExpected = Math.max(100, totalPages * 10);
    if (text.length < minExpected) {
        throw Object.assign(
            new Error("PDF sembla escanejat (sense capa de text). OCR no suportat encara."),
            { code: "SCANNED", pageCount: totalPages, extractedChars: text.length }
        );
    }

    return {
        title,
        text,
        pageCount: totalPages,
        metadata: {
            extractedPages: pageTexts.length,
            totalChars,
            truncated,
        }
    };
}

// Export Node (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { isPdfUrl, looksLikePdfByHead, extractPdfText, _resetWorkerInit: () => { _pdfWorkerInitialized = false; } };
}
