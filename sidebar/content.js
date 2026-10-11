/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// sidebar/content.js
// Handles parsing and extracting content from the active web page

/**
 * Safely executes a script in the target tab, requesting permissions if necessary.
 */
async function executeScriptSafe(injection) {
    // Strategy: try first, request permissions only if needed.
    // This avoids false negatives from permissions.contains() with complex URLs.
    try {
        return await ext.scripting.executeScript(injection);
    } catch (err) {
        // El text de l'error de permís difereix per navegador:
        //  - Firefox: "Missing host permission for the tab" / "Missing permissions"
        //  - Chromium/Edge: "Cannot access contents of the page. Extension
        //    manifest must request permission to access the respective host."
        // Si només es comprova la variant de Firefox, a Chromium l'error es
        // propaga sense demanar el permís → l'usuari veu l'error de permisos
        // en pàgines HTTPS normals on sí es podria concedir.
        const m = (err.message || "").toLowerCase();
        const isPermissionError = m.includes("missing host permission") ||
                                  m.includes("missing permissions") ||
                                  m.includes("cannot access contents") ||
                                  m.includes("must request permission");
        if (!isPermissionError) throw err;

        // Permission missing — try to request it (requires user gesture)
        try {
            const tab = await ext.tabs.get(injection.target.tabId);
            if (!tab.url) return null;

            const origin = new URL(tab.url).origin + "/*";
            const granted = await ext.permissions.request({ origins: [origin] });
            if (!granted) return null;

            // Retry after permission granted
            return await ext.scripting.executeScript(injection);
        } catch {
            // No user gesture, user denied, or privileged page — silently skip
            return null;
        }
    }
}

/**
 * Comprova si un hostname és una IP privada/reservada (guard SSRF).
 * Comparació per octets (clara i correcta) en lloc de màscares de bits.
 */
function isPrivateOrReservedIP(hostname) {
    const m = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (m) {
        const octets = m.slice(1).map(Number);
        if (octets.some(n => n > 255)) return true;        // malformat → rebutja
        const [a, b] = octets;
        if (a === 0) return true;                          // 0.0.0.0/8
        if (a === 10) return true;                         // 10.0.0.0/8 privat
        if (a === 127) return true;                        // 127.0.0.0/8 loopback
        if (a === 169 && b === 254) return true;           // 169.254.0.0/16 link-local
        if (a === 172 && b >= 16 && b <= 31) return true;  // 172.16.0.0/12 privat
        if (a === 192 && b === 168) return true;           // 192.168.0.0/16 privat
        if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
        if (a >= 224) return true;                         // multicast/reservat/broadcast
        return false;
    }
    if (hostname.includes(":")) {
        const lower = hostname.toLowerCase();
        // Loopback (::1), IPv4-mapped loopback, link-local (fe80::), ULA (fc../fd..)
        // i multicast (ff..). Qualsevol IPv6 literal no rutable pública.
        if (lower === "::1" || lower.startsWith("::ffff:127.") ||
            lower.startsWith("fe80:") || lower.startsWith("fc") ||
            lower.startsWith("fd") || lower.startsWith("ff")) return true;
    }
    return /^(localhost|metadata|internal)$/i.test(hostname);
}

/**
 * Descarrega i extreu (Readability) el text de l'article enllaçat des d'una
 * pàgina de Hacker News.
 *
 * S'executa al context del sidebar (extension page): amb host_permissions
 * <all_urls>, el fetch cross-origin NO té restriccions CORS, a diferència dels
 * content scripts (isolated/MAIN world), on el navegador el bloqueja. És el
 * mateix patró de permisos que el fetch de PDF. Retorna "" en qualsevol error
 * (degradació silenciosa: es resumeixen només els comentaris de la discussió).
 */
async function fetchLinkedArticleText(articleUrl) {
    if (!articleUrl || articleUrl.includes("ycombinator.com")) return "";
    let u;
    try { u = new URL(articleUrl); } catch { return ""; }
    // Guard SSRF: només https, sense port explícit, host no privat/reservat.
    if (u.protocol !== "https:" || u.port !== "" || isPrivateOrReservedIP(u.hostname)) return "";

    const doFetch = () => fetch(articleUrl, {
        credentials: "omit",
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
    });

    let resp;
    try {
        resp = await doFetch();
    } catch (e) {
        // El primer fetch pot fallar per CORS si encara no tenim host_permissions.
        // Demanem <all_urls> (sota gest d'usuari) i reintentem, com fa el fetch de PDF.
        try {
            const granted = await ext.permissions.request({ permissions: [], origins: ["<all_urls>"] });
            if (!granted) return "";
            resp = await doFetch();
        } catch { return ""; }
    }

    try {
        if (!resp || !resp.ok) return "";
        // Re-validació anti-SSRF de la URL FINAL després de seguir redireccions.
        // El navegador no permet validar cada salt (amb `redirect: "manual"` la
        // resposta és opaca i amaga el `Location`), però `resp.url` sí que dona la
        // destinació final: bloquegem el cas principal redirect→host intern. El
        // fetch omet credencials i el contingut mai s'exfiltra (només alimenta el
        // resum de l'usuari), de manera que el risc residual dels salts intermedis
        // (GET sense credencials, resposta descartada) és baix.
        try {
            const finalU = new URL(resp.url);
            if (finalU.protocol !== "https:" || finalU.port !== "" || isPrivateOrReservedIP(finalU.hostname)) return "";
        } catch { return ""; }
        const contentType = resp.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) return "";
        const raw = await resp.text();
        if (raw.length > 2 * 1024 * 1024) return "";
        if (typeof Readability === "undefined") return "";
        const doc = new DOMParser().parseFromString(raw, "text/html");
        const base = doc.createElement("base");
        base.href = articleUrl;
        doc.head.insertBefore(base, doc.head.firstChild);
        const article = new Readability(doc).parse();
        if (article?.textContent?.trim().length > 200) return article.textContent.trim();
    } catch (e) {
        console.debug("HN article fetch/parse failed", e?.message);
    }
    return "";
}

/**
 * Extracts and returns the relevant text content from the active tab.
 * Includes specific heuristics for HackerNews, YouTube, LinkedIn, Twitter/X, and fallback to Readability.
 */
async function getPageContent() {
    const tabs = await ext.tabs.query({active: true, currentWindow: true});
    if (tabs.length === 0) throw new Error("[004] No active tab found");
    const tabId = tabs[0].id;
    const tabUrl = tabs[0].url;
    const tabTitle = tabs[0].title;

    let text = "";

    // PDF SPECIAL LOGIC
    // Detecta PDFs HTTPS i extreu text amb pdf.js (vendor/pdf.min.js).
    //
    // Arquitectura del fetch:
    //  - Primer intent: fetch directe des del sidebar (moz-extension://).
    //    Requereix que la CSP de l'extensió permeti `connect-src https:`.
    //  - Si el directe falla per CORS (el servidor no envia ACAO), demanem
    //    el permís opcional `<all_urls>` a l'usuari. A Firefox/Chromium,
    //    amb host_permissions, el fetch() des de l'extensió NO té
    //    restriccions CORS. El permís es demana sota gest d'usuari
    //    (clic a "Resum" o obertura del sidebar), no a l'instal·lació.
    //  - Per a PDFs `file://` i `http://`, el fetch directe NO és possible
    //    (la CSP només permet `https:` per principi de mínim privilegi).
    //    L'usuari els resumeix amb el botó "Selecciona PDF local" del sidebar
    //    (FileReader, sense xarxa). No demanem `<all_urls>` per a aquests casos.
    //  - No usem content script injection perquè a Firefox el fetch dels
    //    content scripts (ISOLATED o MAIN world) també està subjecte a CORS
    //    sense host_permissions explícites.
    //  - No usem background fetch perquè background i sidebar comparteixen
    //    la mateixa CSP extension_pages a MV3 (no es pot diferenciar).
    //
    // Guarda defensiva: si pdf-extract.js no està disponible (build antic o test),
    // degradem en silenci a la lògica HTML normal.
    if (typeof isPdfUrl === "function" && typeof extractPdfText === "function") {
        // Detecci\u00f3 r\u00e0pida per extensi\u00f3 .pdf (sense xarxa).
        let isPdf = isPdfUrl(tabUrl);
        // Fallback HEAD: URLs HTTPS sense .pdf poden ser PDFs (arxiv.org/pdf/123, etc.).
        if (!isPdf && tabUrl && tabUrl.startsWith("https://") && typeof looksLikePdfByHead === "function") {
            try {
                isPdf = await looksLikePdfByHead(tabUrl);
                if (isPdf) console.debug("[PDF] Detectat via HEAD Content-Type:", tabUrl);
            } catch { /* defensiu */ }
        }
        if (isPdf) {
            console.debug("[PDF] Detectat PDF:", tabUrl);
        try {
            // Pas 1: fetch del PDF. Primer intent des del sidebar (directe).
            // La CSP permet `connect-src https:` (vegeu manifest base).
            // Si falla per CORS, demanem <all_urls> i reintentem.
            console.debug("[PDF] Fetch directe...");
            let buffer;
            try {
                const resp = await fetch(tabUrl, { credentials: "omit" });
                if (!resp.ok) {
                    throw Object.assign(
                        new Error(`HTTP ${resp.status} descarregant el PDF`),
                        { code: "FETCH_FAILED" }
                    );
                }
                buffer = await resp.arrayBuffer();
            } catch (fetchErr) {
                // Intent 2: demanar permís d'amplitud total (<all_urls>) i
                // reintentar el fetch directe. A Firefox, amb host_permissions,
                // el fetch() des del sidebar NO té restriccions CORS.
                // El permís es demana ara (amb gest d'usuari) en lloc de
                // a l'instal·lació (on falla per manca de gest).
                if (tabUrl && tabUrl.startsWith("https://")) {
                    console.debug("[PDF] Fetch directe ha fallat, demanant permís <all_urls>...");
                    try {
                        const granted = await ext.permissions.request({
                            permissions: [],
                            origins: ["<all_urls>"]
                        });
                        if (granted) {
                            console.debug("[PDF] Permís <all_urls> concedit, reintentant fetch...");
                            const resp2 = await fetch(tabUrl, { credentials: "omit" });
                            if (resp2.ok) {
                                buffer = await resp2.arrayBuffer();
                                console.debug("[PDF] Fetch amb permís OK, bytes:", buffer.byteLength);
                            }
                        } else {
                            console.debug("[PDF] Permís <all_urls> denegat per l'usuari");
                        }
                    } catch (permErr) {
                        console.debug("[PDF] No es pot demanar permís (sense gest):", permErr?.message);
                    }
                }

                if (!buffer) {
                    const isLocal = tabUrl && (tabUrl.startsWith("file://") || tabUrl.startsWith("http://"));
                    throw Object.assign(
                        new Error(isLocal
                            ? "Fetch d'URL local/HTTP bloquejat. Usa el bot\u00f3 'Selecciona PDF local'."
                            : "Fetch del PDF ha fallat: " + (fetchErr.message || fetchErr)),
                        { code: isLocal ? "NON_HTTPS" : "FETCH_FAILED" }
                    );
                }
            }
            console.debug("[PDF] Bytes descarregats:", buffer.byteLength);

            // Pas 2: parsing amb pdf.js.
            console.debug("[PDF] Cridant extractPdfText...");
            const pdfResult = await extractPdfText(buffer);
            console.debug("[PDF] Extraccio OK,", pdfResult.pageCount, "pags,", pdfResult.text.length, "chars");
            return {
                title: pdfResult.title || tabTitle || "PDF",
                text: pdfResult.text,
                url: tabUrl,
                truncated: pdfResult.metadata?.truncated === true,
            };
        } catch (e) {
            console.error("[PDF] Error final:", e?.code, e?.message, e);
            const codeMap = {
                PASSWORD: "[PDF-010] PDF protegit amb contrasenya. No es pot resumir.",
                INVALID: "[PDF-011] El fitxer no és un PDF vàlid o està corromput.",
                SCANNED: "[PDF-012] PDF escanejat sense capa de text. OCR no suportat encara.",
                TOO_LARGE: "[PDF-013] PDF massa gran. Massa pàgines per processar.",
                TIMEOUT: "[PDF-014] S'ha esgotat el temps en extreure el PDF. Prova amb un fitxer més petit.",
                FETCH_FAILED: "[PDF-015] No s'ha pogut descarregar el PDF.",
                NON_HTTPS: "[PDF-016] PDFs locals i HTTP no es poden descarregar directament. Usa el bot\u00f3 'Triar un PDF de l'ordinador' de la barra lateral.",
            };
            const friendly = codeMap[e?.code] || `[PDF-019] Error inesperat extraient PDF: ${e?.message || e}`;
            throw new Error(friendly);
        }
        } // end if (isPdf)
    }

    // HACKER NEWS SPECIAL LOGIC
    if (tabUrl.includes("news.ycombinator.com/item")) {
        try {
            const hnResult = await executeScriptSafe({
                target: { tabId: tabId },
                // Només llegeix el DOM (títol, comentaris, URL de l'article).
                // La lògica viu a extractors.js (font única de selectors).
                func: extractHackerNewsFromDOM
            });
            const hn = hnResult?.[0]?.result;
            if (hn) {
                // El fetch de l'article extern es fa AQUÍ (context del sidebar), no
                // dins la pàgina: els content scripts (isolated/MAIN) estan subjectes
                // a CORS. Des del sidebar, amb host_permissions <all_urls>, el fetch
                // cross-origin NO té restriccions CORS (mateix patró que el PDF).
                const articleText = await fetchLinkedArticleText(hn.articleUrl);
                text = articleText
                    ? `Title: ${hn.title}\n\nARTICLE:\n${articleText}\n\nHACKER NEWS DISCUSSION:\n${hn.comments}`
                    : `Title: ${hn.title}\n\nTop Discussion Comments:\n${hn.comments}`;
            }
        } catch (e) {
            console.warn("HN extraction failed", e);
        }
    }
    
    // YOUTUBE SPECIAL LOGIC
    else if (tabUrl.includes("youtube.com/watch")) {
        let noTranscript = false;
        try {
            let transcriptText = "";

            // Step 1 — MAIN world: llegir la transcripció PRE-RENDERITZADA dins de
            // ytInitialData.engagementPanels[engagement-panel-searchable-transcript].
            // YouTube incrusta els segments a la pàgina sense necessitat d'obrir cap panell.
            // També llegim les pistes (per a etiquetatge idioma/ASR) i la pista activa al player.
            // Si MAIN world falla (p.ex. Firefox antic), Step 2 intenta obrir el panell.
            let meta = {};
            try {
                const metaResult = await executeScriptSafe({
                    target: { tabId: tabId },
                    world: "MAIN",
                    // Lector MAIN-world: llegeix ytInitialPlayerResponse/ytInitialData.
                    // La lògica viu a extractors.js (font única de selectors).
                    func: readYoutubeCaptionMeta
                });
                meta = metaResult?.[0]?.result || {};
            } catch (e) {
                console.debug("YouTube Step 1 (MAIN world) failed, fallback to DOM-only extraction:", e?.message);
                meta = {}; // Step 2 intentarà llegir segments igualment
            }

            // Quan entrem al bloc d'extracció:
            //  - Step 1 va fallar (meta buit) → Step 2 prova el DOM, [TRANSCRIPT] genèric.
            //  - Step 1 detecta pistes (hasTracks) → camí normal.
            //  - Step 1 no detecta pistes però SÍ prerenderedText → alguns vídeos exposen
            //    el panell a ytInitialData.engagementPanels sense llistar les pistes a
            //    playerCaptionsTracklistRenderer; en aquests casos, prerenderedText és
            //    l'únic senyal de transcripció disponible.
            //  - Cap senyal → saltem al fallback de descripció (estalviem 5–10 s de polling).
            const step1Worked = meta && typeof meta.hasTracks === 'boolean';
            if (!step1Worked || meta.hasTracks || meta.prerenderedText) {
                // Sidebar: triar la pista que representarà millor el que el panell mostrarà.
                // Nota: el panell modern NO respecta player.setOption — mostra sempre la pista
                // que YouTube ha decidit (generalment la primera no-ASR o la del player actiu).
                // Per això usem selectYoutubeTrack PROJECTIVAMENT: prioritza activeVssId (el que
                // realment surt al panell) i cau a preferències si l'activa no és coneguda.
                let preferredLangs = [];
                try {
                    const prefsStore = await ext.storage.sync.get(["youtubePreferredLangs"]);
                    if (Array.isArray(prefsStore.youtubePreferredLangs)) {
                        preferredLangs = prefsStore.youtubePreferredLangs;
                    }
                } catch { /* storage no accessible — sense preferències */ }

                // Si Step 1 va funcionar, seleccionem la pista que el panell mostrarà.
                // Si no, resolvedTrack és null i el header usarà una etiqueta genèrica.
                let resolvedTrack = null;
                if (step1Worked && meta.tracks && meta.tracks.length > 0) {
                    resolvedTrack = meta.activeVssId
                        ? meta.tracks.find(t => t.vssId === meta.activeVssId)
                        : null;
                    if (!resolvedTrack && typeof selectYoutubeTrack === 'function') {
                        const browserLang = (typeof navigator !== 'undefined' && navigator.language) || 'en';
                        const selection = selectYoutubeTrack(meta.tracks, meta.activeVssId, preferredLangs, browserLang);
                        resolvedTrack = selection?.track;
                    }
                    if (!resolvedTrack) {
                        resolvedTrack = meta.tracks.find(t => !t.isAsr) || meta.tracks[0];
                    }
                }

                // Shortcut: si Step 1 ha aconseguit llegir la transcripció pre-renderitzada
                // des de ytInitialData, la fem servir directament i saltem tot el Step 2
                // (obrir panell + polling del DOM). Aquesta és la via més robusta.
                if (meta.prerenderedText && meta.prerenderedText.length > 50) {
                    if (resolvedTrack) {
                        const lang = resolvedTrack.lang || '';
                        const isAsr = !!resolvedTrack.isAsr;
                        transcriptText = `[TRANSCRIPT: ${lang}${isAsr ? ' (Auto)' : ''}]\n\n${meta.prerenderedText}`;
                    } else {
                        transcriptText = `[TRANSCRIPT]\n\n${meta.prerenderedText}`;
                    }
                }

                // Via B: fetch de la timedtext API des del sidebar (bypassa la CSP de YouTube).
                // El MAIN world ens ha retornat captionBaseUrl; el sidebar té <all_urls> i pot fer-ho.
                // Provem múltiples variants d'URL perquè per a vídeos amb només ASR (pista
                // auto-generada), &fmt=json3 sovint retorna 200 amb body buit; en canvi
                // &fmt=srv3 (XML) o la URL crua (XML per defecte) sí donen segments.
                if (!transcriptText && meta.captionBaseUrl) {
                    const _captionHost = (() => { try { return new URL(meta.captionBaseUrl).hostname; } catch { return ""; } })();
                    const _allowedCaptionHosts = ["www.youtube.com", "youtube.com", "www.googleapis.com", "googleapis.com"];
                    if (!_allowedCaptionHosts.some(h => _captionHost === h || _captionHost.endsWith("." + h))) {
                        console.warn("[YouTube] captionBaseUrl fora de domini esperat:", _captionHost);
                        meta.captionBaseUrl = null;
                    }
                }
                if (!transcriptText && meta.captionBaseUrl) {
                    const variants = [
                        meta.captionBaseUrl + '&fmt=json3',
                        meta.captionBaseUrl + '&fmt=srv3',
                        meta.captionBaseUrl,
                    ];
                    for (const url of variants) {
                        try {
                            const resp = await fetch(url);
                            if (!resp.ok) continue;
                            const raw = await resp.text();
                            if (!raw || raw.length < 20) continue;
                            let timed = [];
                            if (url.includes('fmt=json3')) {
                                try {
                                    const data = JSON.parse(raw);
                                    timed = (data.events || [])
                                        .filter(e => e.segs)
                                        .map(e => ({ startMs: e.tStartMs, text: e.segs.map(s => s.utf8 ?? '').join('').replace(/\n/g, ' ').trim() }))
                                        .filter(x => x.text);
                                } catch { /* malformed JSON — try next variant */ }
                            } else {
                                // XML (srv3 o per defecte): <text start="..." dur="...">contingut</text>
                                try {
                                    const doc = new DOMParser().parseFromString(raw, 'text/xml');
                                    const nodes = doc.querySelectorAll('text, p');
                                    // <text start="segons"> (clàssic) o <p t="ms"> (srv3)
                                    timed = Array.from(nodes)
                                        .map(n => ({
                                            startMs: n.hasAttribute('t') ? Number(n.getAttribute('t'))
                                                : Number(n.getAttribute('start')) * 1000,
                                            text: (n.textContent || '')
                                                .replace(/&amp;/g, '&')
                                                .replace(/&lt;/g, '<')
                                                .replace(/&gt;/g, '>')
                                                .replace(/&quot;/g, '"')
                                                .replace(/&#39;/g, "'")
                                                .replace(/\n/g, ' ')
                                                .trim(),
                                        }))
                                        .filter(x => x.text);
                                } catch { /* malformed XML — try next variant */ }
                            }
                            const fetched = formatTimedTranscript(timed);
                            if (fetched.length > 50) {
                                if (resolvedTrack) {
                                    const lang = resolvedTrack.lang || '';
                                    const isAsr = !!resolvedTrack.isAsr;
                                    transcriptText = `[TRANSCRIPT: ${lang}${isAsr ? ' (Auto)' : ''}]\n\n${fetched}`;
                                } else {
                                    transcriptText = `[TRANSCRIPT]\n\n${fetched}`;
                                }
                                break;
                            }
                        } catch { /* fetch error — try next variant */ }
                    }
                }

                // Via C: youtubei/v1/get_transcript — última via abans del DOM scraping.
                // Útil per a vídeos amb només pista ASR on timedtext torna body buit.
                // Executem al MAIN world per accedir a ytcfg (INNERTUBE_API_KEY/CONTEXT) i
                // a getTranscriptEndpoint.params dins de ytInitialData.engagementPanels.
                if (!transcriptText) {
                    try {
                        const innertubeResult = await executeScriptSafe({
                            target: { tabId: tabId },
                            world: "MAIN",
                            func: async () => {
                                try {
                                    const cfg = window.ytcfg;
                                    const apiKey = cfg?.get?.('INNERTUBE_API_KEY') || cfg?.data_?.INNERTUBE_API_KEY;
                                    const ctx = cfg?.get?.('INNERTUBE_CONTEXT') || cfg?.data_?.INNERTUBE_CONTEXT;
                                    if (!apiKey || !ctx) return { error: 'no innertube config' };

                                    // Trobar el paràmetre del getTranscriptEndpoint dins
                                    // d'engagementPanels (associat al panell de transcripció).
                                    let params = null;
                                    try {
                                        const panels = window.ytInitialData?.engagementPanels || [];
                                        for (const p of panels) {
                                            const cmd = p?.engagementPanelSectionListRenderer?.content
                                                ?.continuationItemRenderer?.continuationEndpoint
                                                ?.getTranscriptEndpoint?.params
                                                || p?.engagementPanelSectionListRenderer?.header
                                                ?.engagementPanelTitleHeaderRenderer?.menu
                                                ?.menuRenderer?.items?.[0]
                                                ?.menuServiceItemRenderer?.serviceEndpoint
                                                ?.getTranscriptEndpoint?.params;
                                            if (cmd) { params = cmd; break; }
                                        }
                                    } catch { /* engagementPanels absent */ }

                                    if (!params) return { error: 'no params' };

                                    const resp = await fetch(
                                        `/youtubei/v1/get_transcript?key=${encodeURIComponent(apiKey)}`,
                                        {
                                            method: 'POST',
                                            credentials: 'same-origin',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ context: ctx, params }),
                                        }
                                    );
                                    if (!resp.ok) return { error: `HTTP ${resp.status}` };
                                    const data = await resp.json();

                                    // Estructura: actions[0].updateEngagementPanelAction.content
                                    //   .transcriptRenderer.content.transcriptSearchPanelRenderer
                                    //   .body.transcriptSegmentListRenderer.initialSegments
                                    const segs = data?.actions?.[0]?.updateEngagementPanelAction
                                        ?.content?.transcriptRenderer?.content
                                        ?.transcriptSearchPanelRenderer?.body
                                        ?.transcriptSegmentListRenderer?.initialSegments || [];
                                    // Marques [m:ss] cada ~30 s (còpia autocontinguda de formatTimedTranscript)
                                    const fmt = (ms) => {
                                        const t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
                                        return (h > 0 ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(sec).padStart(2, '0');
                                    };
                                    const pieces = [];
                                    let lastMark = -Infinity;
                                    for (const s of segs) {
                                        const r = s?.transcriptSegmentRenderer;
                                        const text = r?.snippet?.runs?.map(x => x.text)?.join('') || '';
                                        if (!text) continue;
                                        const ms = Number(r.startMs);
                                        if (Number.isFinite(ms) && ms - lastMark >= 30000) { pieces.push('[' + fmt(ms) + ']'); lastMark = ms; }
                                        pieces.push(text);
                                    }
                                    return { text: pieces.join(' ') };
                                } catch (e) { return { error: String(e) }; }
                            }
                        });
                        const innertube = innertubeResult?.[0]?.result;
                        if (innertube?.text && innertube.text.length > 50) {
                            if (resolvedTrack) {
                                const lang = resolvedTrack.lang || '';
                                const isAsr = !!resolvedTrack.isAsr;
                                transcriptText = `[TRANSCRIPT: ${lang}${isAsr ? ' (Auto)' : ''}]\n\n${innertube.text}`;
                            } else {
                                transcriptText = `[TRANSCRIPT]\n\n${innertube.text}`;
                            }
                        }
                    } catch (e) {
                        console.debug("YouTube Via C (youtubei) failed:", e?.message);
                    }
                }

                // Step 2 — ISOLATED world: obrir descripció, clicar "Mostra la transcripció"
                // (detecció multi-idioma) i llegir segments del DOM.
                // Només s'executa si Step 1 no ha aconseguit la transcripció pre-renderitzada.
                const extractResult = transcriptText ? null : await executeScriptSafe({
                    target: { tabId: tabId },
                    func: async () => {
                        const sleep = ms => new Promise(r => setTimeout(r, ms));

                        function readSegments() {
                            const modernSegs = document.querySelectorAll(
                                'transcript-segment-view-model span.ytAttributedStringHost'
                            );
                            if (modernSegs.length > 0) {
                                return Array.from(modernSegs).map(s => s.textContent.trim()).filter(Boolean);
                            }
                            const classicSegs = document.querySelectorAll(
                                'ytd-transcript-segment-renderer .segment-text'
                            );
                            if (classicSegs.length > 0) {
                                return Array.from(classicSegs).map(s => s.textContent.trim()).filter(Boolean);
                            }
                            return [];
                        }

                        // Intenta expandir la descripció usant diversos selectors coneguts.
                        // YouTube canvia l'estructura sovint; aquests selectors cobreixen
                        // les variants modernes i clàssiques.
                        function expandDescription() {
                            const expandSelectors = [
                                'ytd-text-inline-expander #expand',
                                'ytd-text-inline-expander tp-yt-paper-button',
                                '#description #expand',
                                'tp-yt-paper-button#expand',
                                '#expand',
                                'ytd-text-inline-expander #more',
                                '#more',
                            ];
                            for (const sel of expandSelectors) {
                                const el = document.querySelector(sel);
                                if (el) { try { el.click(); } catch {} }
                            }
                        }

                        // Detecció del botó "Mostra la transcripció" — multi-idioma i robusta.
                        // Via 1: selector semàntic dins de la descripció.
                        // Via 2: fallback per text, excloent el reproductor (on està el botó CC).
                        // IMPORTANT: els termes han de ser específics de "transcripció", NO de
                        // "subtítols" — són botons diferents (CC vs. panell de transcripció).
                        function findTranscriptButton() {
                            // Via 1: selector semàntic (funciona en qualsevol idioma)
                            const section = document.querySelector('ytd-video-description-transcript-section-renderer');
                            const semanticBtn = section?.querySelector('button');
                            if (semanticBtn) return semanticBtn;

                            // Via 2: també provar selectors semàntics alternatius que YouTube usa
                            const altSelectors = [
                                'ytd-video-description-transcript-section-renderer button',
                                '[target-id="engagement-panel-searchable-transcript"] button',
                                'button[aria-label*="transcri" i]',
                                'button[aria-label*="transkri" i]',
                            ];
                            for (const sel of altSelectors) {
                                try {
                                    const el = document.querySelector(sel);
                                    if (el) return el;
                                } catch {}
                            }

                            // Via 3: fallback per text en tot el document, però EXCLOENT
                            // el reproductor (#movie_player) per evitar matchejar el botó CC.
                            const TRANSCRIPT_TERMS = [
                                'transcri',     // ca/en/es/fr/pt/it/ro/da/sv/no
                                'transkri',     // de/nl
                                'átirat',       // hu
                                'транскри',     // ru/uk/bg
                                'प्रतिलेख',       // hi
                                '文字起こし',    // ja
                                '字幕記錄',      // zh-TW
                                '脚本',         // zh-CN
                                '스크립트',      // ko
                            ];
                            const player = document.querySelector('#movie_player');
                            return Array.from(document.querySelectorAll('button')).find(b => {
                                if (player && player.contains(b)) return false;
                                const blob = ((b.getAttribute('aria-label') || '') + ' ' + b.textContent);
                                return TRANSCRIPT_TERMS.some(term => blob.toLowerCase().includes(term.toLowerCase()));
                            });
                        }

                        // Si ja hi ha segments, reaprofitem-los (panell ja obert en visita prèvia).
                        const existing = readSegments();
                        if (existing.length > 0) return { text: existing.join(' ') };

                        // Scroll i expand per exposar el botó (YouTube fa lazy loading del
                        // contingut sota del vídeo).
                        try { window.scrollTo({ top: 500, behavior: 'instant' }); } catch {}
                        expandDescription();

                        // Polling fins a 5 s per esperar que el botó aparegui al DOM.
                        // Reintentar expand a cada iteració — de vegades YouTube triga
                        // a renderitzar el botó de transcripció després d'expandir.
                        let btn = null;
                        for (let i = 0; i < 20; i++) {
                            await sleep(250);
                            btn = findTranscriptButton();
                            if (btn) break;
                            // Cada 1s, reintentem expandir (útil si el primer expand no va)
                            if (i > 0 && i % 4 === 0) expandDescription();
                        }
                        if (!btn) return null;
                        btn.click();

                        // 40 × 250 ms = 10 s màxim d'espera fins que el panell es renderitzi.
                        for (let i = 0; i < 40; i++) {
                            await sleep(250);
                            const lines = readSegments();
                            if (lines.length > 0) return { text: lines.join(' ') };
                        }
                        return null;
                    },
                });

                const extracted = extractResult?.[0]?.result;
                if (extracted?.text && extracted.text.length > 50) {
                    if (resolvedTrack) {
                        const lang = resolvedTrack.lang || '';
                        const isAsr = !!resolvedTrack.isAsr;
                        transcriptText = `[TRANSCRIPT: ${lang}${isAsr ? ' (Auto)' : ''}]\n\n${extracted.text}`;
                    } else {
                        // Step 1 va fallar però hem aconseguit extreure segments del DOM
                        transcriptText = `[TRANSCRIPT]\n\n${extracted.text}`;
                    }
                }
            }

            // Fallback: descripció
            if (!transcriptText) {
                noTranscript = true;
                const descResult = await executeScriptSafe({
                    target: { tabId: tabId },
                    func: () => {
                        const moreBtn = document.querySelector('#expand');
                        if (moreBtn) moreBtn.click();
                        const descEl = document.querySelector('#description-inline-expander') || document.querySelector('#description');
                        const desc = descEl ? descEl.innerText : "";
                        return `Title: ${document.title}\n\nDescription:\n${desc}`;
                    }
                });
                if (descResult?.[0]?.result && descResult[0].result.length > 50) {
                    transcriptText = descResult[0].result;
                }
            }

            text = transcriptText || `Títol del vídeo: ${tabTitle}`;

        } catch (e) {
            console.warn("YouTube extraction totally failed", e);
            noTranscript = true;
            text = `Títol del vídeo: ${tabTitle}`;
        }
        if (noTranscript) {
            return { title: tabTitle, url: tabUrl, text, noTranscript: true };
        }
    }
    
    // LINKEDIN SPECIAL LOGIC
    else if (tabUrl.includes("linkedin.com/posts/") || tabUrl.includes("linkedin.com/feed/update/")) {
        try {
            const linkedinResult = await executeScriptSafe({
                target: { tabId: tabId },
                // La lògica viu a extractors.js (font única de selectors LinkedIn).
                func: extractLinkedInPost
            });

            const linkedinText = linkedinResult?.[0]?.result;
            if (linkedinText && linkedinText.trim().length > 30) {
                text = linkedinText;
            }
        } catch (e) {
            console.warn("LinkedIn extraction failed", e);
        }
    }

    // TWITTER / X SPECIAL LOGIC
    else if (tabUrl.includes("twitter.com") || tabUrl.includes("x.com")) {
        try {
            // Via primària: scrape directe dels tweets renderitzats. Captura el fil
            // sencer que el DOM tingui carregat (X virtualitza i carrega tweets a
            // mesura que es fa scroll, igual per a qualsevol extractor).
            const scrapeResult = await executeScriptSafe({
                target: { tabId: tabId },
                // La lògica viu a extractors.js (font única de selectors Twitter).
                func: scrapeTwitterTweets
            });
            const scraped = scrapeResult?.[0]?.result;
            if (scraped && scraped.trim().length > 0) text = scraped;

            // Fallback robust: meta Open Graph (HTML servit pel servidor, immune a
            // canvis del DOM i a la detecció d'automatització). Només el tweet arrel.
            if (!text) {
                const ogResult = await executeScriptSafe({
                    target: { tabId: tabId },
                    // Fallback OG robust: meta og:description (immune a canvis DOM).
                    // La lògica viu a extractors.js (font única de selectors Twitter).
                    func: extractTwitterOG
                });
                const og = ogResult?.[0]?.result;
                if (og && og.trim().length > 0) text = og;
            }
        } catch (e) {
            console.warn("Twitter/X extraction failed", e);
        }
    }

    // FALLBACK / STANDARD LOGIC
    if (!text) {
        try {
          await executeScriptSafe({
              target: {tabId: tabId},
              files: ["Readability.js"]
          });
        } catch (e) { console.debug("Readability.js inject failed (CSP or permission)", e?.message); }

        const scriptResults = await executeScriptSafe({
          target: {tabId: tabId},
          // Extracció estàndard via Readability (amb fallback body.innerText).
          // La lògica viu a extractors.js (font única).
          func: extractWithReadability
        });
        
        // executeScriptSafe retorna null NOMÉS quan el permís falta i no s'ha
        // pogut concedir (pàgina restringida del navegador, permís denegat,
        // sense gest d'usuari). Distingim-ho del cas "pàgina buida": el consell
        // de recarregar (F5) no arregla un problema de permisos.
        if (scriptResults === null) {
            throw new Error("[011] No es pot llegir aquesta pàgina: és una pàgina restringida del navegador o l'extensió no hi té permís. Prova-ho en una pàgina web normal.");
        }
        if (scriptResults?.[0]?.result) text = scriptResults[0].result;
    }

    if (!text || text.trim() === "") throw new Error("[006] No s'ha pogut extreure el contingut d'aquesta pàgina. Recarrega la pestanya i torna-ho a provar.");
    
    return { title: tabTitle, url: tabUrl, text: text };
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { executeScriptSafe, getPageContent };
}
