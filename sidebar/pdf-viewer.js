(function () {
    "use strict";

    const container = document.getElementById("canvas-container");
    const canvas = document.getElementById("pdf-canvas");
    const ctx = canvas.getContext("2d");
    const pageInput = document.getElementById("pageInput");
    const totalPagesEl = document.getElementById("totalPages");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const zoomOutBtn = document.getElementById("zoomOutBtn");
    const zoomInBtn = document.getElementById("zoomInBtn");
    const zoomLabel = document.getElementById("zoomLabel");
    const closeBtn = document.getElementById("closeBtn");
    const errorDiv = document.getElementById("error");
    const loadingDiv = document.getElementById("loading");
    const footerDiv = document.getElementById("footer");
    const docTitleEl = document.getElementById("doc-title");

    let pdfDoc = null;
    let pageNum = 1;
    let scale = 2.0;
    let sessionKey = null;

    function showError(msg) {
        loadingDiv.style.display = "none";
        container.style.display = "none";
        footerDiv.style.display = "none";
        errorDiv.style.display = "flex";
        errorDiv.textContent = msg;
    }

    function base64ToUint8Array(b64) {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    function updateZoomLabel() {
        zoomLabel.textContent = Math.round(scale * 100) + "%";
    }

    async function renderPage(num) {
        if (!pdfDoc) return;
        try {
            const page = await pdfDoc.getPage(num);
            const viewport = page.getViewport({ scale });

            const containerRect = container.getBoundingClientRect();
            const maxW = containerRect.width - 32;
            const maxH = containerRect.height - 32;
            const fitScale = Math.min(maxW / viewport.width, maxH / viewport.height, 1);
            const finalScale = scale * fitScale;

            const finalViewport = page.getViewport({ scale: finalScale });
            const dpr = window.devicePixelRatio || 1;
            canvas.width = finalViewport.width * dpr;
            canvas.height = finalViewport.height * dpr;
            canvas.style.width = finalViewport.width + "px";
            canvas.style.height = finalViewport.height + "px";

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const renderCtx = {
                canvasContext: ctx,
                viewport: finalViewport,
            };
            await page.render(renderCtx).promise;
            pageNum = num;
            pageInput.value = num;
            prevBtn.disabled = num <= 1;
            nextBtn.disabled = num >= pdfDoc.numPages;
        } catch (e) {
            console.error("[pdf-viewer] render error:", e);
        }
    }

    async function init() {
        const params = new URLSearchParams(window.location.search);
        sessionKey = params.get("key");
        if (!sessionKey) {
            showError("Falta el paràmetre 'key' a la URL.");
            return;
        }

        try {
            const storage = ext && ext.storage && ext.storage.session
                ? ext.storage.session
                : (chrome && chrome.storage && chrome.storage.session ? chrome.storage.session : null);
            if (!storage) {
                showError("storage.session no disponible en aquest navegador.");
                return;
            }

            const data = await storage.get(sessionKey);
            const base64 = data && data[sessionKey];
            if (!base64) {
                showError("No s'ha trobat el PDF a la sessió. Potser ha expirat o el visor s'ha obert incorrectament.");
                return;
            }

            const buffer = base64ToUint8Array(base64);

            if (typeof pdfjsLib === "undefined") {
                showError("pdf.js no carregat.");
                return;
            }

            const runtime = (ext && ext.runtime) || chrome.runtime;
            if (runtime && runtime.getURL) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = runtime.getURL("vendor/pdf.worker.min.js");
            }

            const loadingTask = pdfjsLib.getDocument({
                data: buffer,
                disableFontFace: true,
                isEvalSupported: false,
                useSystemFonts: false,
                verbosity: 0,
            });

            pdfDoc = await loadingTask.promise;
            totalPagesEl.textContent = pdfDoc.numPages;

            loadingDiv.style.display = "none";
            container.style.display = "flex";
            footerDiv.style.display = "flex";

            await renderPage(1);
        } catch (e) {
            console.error("[pdf-viewer] init error:", e);
            const msg = e?.name === "PasswordException"
                ? "PDF protegit amb contrasenya."
                : "Error carregant el PDF: " + (e?.message || e);
            showError(msg);
        }
    }

    function cleanup() {
        if (sessionKey) {
            try {
                const storage = (ext && ext.storage && ext.storage.session)
                    ? ext.storage.session
                    : (chrome && chrome.storage && chrome.storage.session ? chrome.storage.session : null);
                if (storage) storage.remove(sessionKey).catch(() => {});
            } catch { /* ignore */ }
            sessionKey = null;
        }
        if (pdfDoc) {
            try { pdfDoc.destroy(); } catch { /* ignore */ }
            pdfDoc = null;
        }
    }

    pageInput.addEventListener("change", () => {
        const num = parseInt(pageInput.value, 10);
        if (num >= 1 && num <= pdfDoc.numPages) renderPage(num);
        else pageInput.value = pageNum;
    });

    prevBtn.addEventListener("click", () => {
        if (pageNum > 1) renderPage(pageNum - 1);
    });

    nextBtn.addEventListener("click", () => {
        if (pageNum < pdfDoc.numPages) renderPage(pageNum + 1);
    });

    zoomOutBtn.addEventListener("click", () => {
        scale = Math.max(0.25, scale - 0.25);
        updateZoomLabel();
        renderPage(pageNum);
    });

    zoomInBtn.addEventListener("click", () => {
        scale = Math.min(3.0, scale + 0.25);
        updateZoomLabel();
        renderPage(pageNum);
    });

    closeBtn.addEventListener("click", () => {
        cleanup();
        window.close();
    });

    window.addEventListener("beforeunload", cleanup);

    window.addEventListener("resize", () => {
        if (pdfDoc) renderPage(pageNum);
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            cleanup();
            window.close();
        }
        if (e.key === "ArrowLeft" && pageNum > 1) renderPage(pageNum - 1);
        if (e.key === "ArrowRight" && pageNum < pdfDoc.numPages) renderPage(pageNum + 1);
    });

    init();
})();
