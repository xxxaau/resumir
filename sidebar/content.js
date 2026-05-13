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
        const isPermissionError = err.message.includes("Missing host permission") ||
                                  err.message.includes("Missing permissions");
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

    // HACKER NEWS SPECIAL LOGIC
    if (tabUrl.includes("news.ycombinator.com/item")) {
        try {
            // Pre-inject Readability so the in-page func can parse the article.
            // Required when the article fetch succeeds and we want clean text.
            try {
                await executeScriptSafe({
                    target: { tabId: tabId },
                    files: ["Readability.js"]
                });
            } catch (e) { console.debug("HN Readability inject failed", e?.message); }

            const hnResult = await executeScriptSafe({
                target: { tabId: tabId },
                // The fetch runs INSIDE the page's content-script context (not the
                // extension's extension_pages context), so the CSP `connect-src`
                // of manifest.json does not apply. Cross-origin reach needs the
                // optional <all_urls> host permission, which the user grants once.
                func: async () => {
                    const titleEl = document.querySelector(".titleline a");
                    const comments = Array.from(document.querySelectorAll(".commtext"))
                        .map(c => "- " + c.innerText.replace(/\s+/g, " ").trim())
                        .join("\n");
                    const title = titleEl?.innerText || document.title;
                    const articleUrl = titleEl?.href || null;

                    // Inline SSRF guard (function arg can't capture from outer scope).
                    const isPrivateOrReservedIPInline = (hostname) => {
                        const m = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
                        if (m) {
                            const [, a, b, c, d] = m.map(Number);
                            const ip = (a << 24) | (b << 16) | (c << 8) | d;
                            if ((ip >>> 24) === 0) return true;
                            if ((ip >>> 24) === 10) return true;
                            if ((ip >>> 24) === 127) return true;
                            if ((ip & 0xfff0000) === 0xc0a80000) return true;
                            if ((ip >>> 20) === 0xac1) return true;
                            if ((ip >>> 16) === 0xa9fe) return true;
                            if ((ip >>> 22) === 0x1840) return true;
                            if ((ip >>> 4) === 0x0fffffff) return true;
                            return false;
                        }
                        if (hostname.includes(":")) {
                            const lower = hostname.toLowerCase();
                            if (lower === "::1" || lower.startsWith("::ffff:127.") ||
                                lower.startsWith("fe80:") || lower.startsWith("ff")) return true;
                        }
                        return /^(localhost|metadata|internal)$/i.test(hostname);
                    };

                    let articleText = "";
                    if (articleUrl && !articleUrl.includes("ycombinator.com")) {
                        try {
                            const u = new URL(articleUrl);
                            if (u.protocol !== "https:" || u.port !== "" || isPrivateOrReservedIPInline(u.hostname)) {
                                throw new Error("Blocked: private/reserved IP or invalid protocol/port");
                            }
                            // redirect:"manual" prevents DNS-rebinding via cross-origin
                            // 30x to internal IPs after the initial host check.
                            const resp = await fetch(articleUrl, {
                                credentials: "omit",
                                redirect: "manual",
                                signal: AbortSignal.timeout(8000)
                            });
                            if (resp.type === "opaqueredirect") throw new Error("Blocked: redirect");
                            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                            const contentType = resp.headers.get("content-type") || "";
                            if (!contentType.includes("text/html")) throw new Error("Invalid content-type");
                            const raw = await resp.text();
                            if (raw.length > 2 * 1024 * 1024) throw new Error("Response too large");
                            if (typeof Readability !== "undefined") {
                                const doc = new DOMParser().parseFromString(raw, "text/html");
                                const base = doc.createElement("base");
                                base.href = articleUrl;
                                doc.head.insertBefore(base, doc.head.firstChild);
                                const article = new Readability(doc).parse();
                                if (article?.textContent?.trim().length > 200) {
                                    articleText = article.textContent.trim();
                                }
                            }
                        } catch (e) {
                            console.warn("HN article fetch failed:", e?.message);
                        }
                    }
                    return { title, comments, articleText };
                }
            });
            const hn = hnResult?.[0]?.result;
            if (hn) {
                text = hn.articleText
                    ? `Title: ${hn.title}\n\nARTICLE:\n${hn.articleText}\n\nHACKER NEWS DISCUSSION:\n${hn.comments}`
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
                    func: () => {
                        try {
                            const rawCaptionTracks = window.ytInitialPlayerResponse?.captions
                                ?.playerCaptionsTracklistRenderer?.captionTracks || [];
                            let activeVssId = null;
                            try {
                                const player = document.querySelector('#movie_player');
                                player?.loadModule?.('captions');
                                const active = player?.getOption?.('captions', 'track');
                                activeVssId = active?.vss_id || active?.vssId || null;
                            } catch { /* API privada — ignorem */ }

                            // Via A: segments pre-renderitzats a ytInitialData.engagementPanels.
                            let prerenderedText = '';
                            try {
                                const panels = window.ytInitialData?.engagementPanels || [];
                                const transcriptPanel = panels.find(p =>
                                    p?.engagementPanelSectionListRenderer?.targetId === 'engagement-panel-searchable-transcript'
                                );
                                const segments = transcriptPanel
                                    ?.engagementPanelSectionListRenderer
                                    ?.content?.transcriptRenderer
                                    ?.content?.transcriptSearchPanelRenderer
                                    ?.body?.transcriptSegmentListRenderer
                                    ?.initialSegments || [];
                                const lines = segments
                                    .map(s => s?.transcriptSegmentRenderer?.snippet?.runs?.map(r => r.text)?.join('') || '')
                                    .filter(Boolean);
                                if (lines.length > 0) prerenderedText = lines.join(' ');
                            } catch { /* ytInitialData absent o estructura canviada */ }

                            // Via B: retornem baseUrl de la millor pista perquè el sidebar faci
                            // el fetch directament (evita la CSP de YouTube al MAIN world).
                            let captionBaseUrl = null;
                            if (!prerenderedText && rawCaptionTracks.length > 0) {
                                const best = rawCaptionTracks.find(t => t.vssId === activeVssId)
                                    || rawCaptionTracks.find(t => t.kind !== 'asr')
                                    || rawCaptionTracks[0];
                                captionBaseUrl = best?.baseUrl || null;
                            }

                            return {
                                hasTracks: rawCaptionTracks.length > 0,
                                tracks: rawCaptionTracks.map(t => ({
                                    lang: t.languageCode || '',
                                    langName: t.name?.simpleText || '',
                                    vssId: t.vssId || '',
                                    isAsr: t.kind === 'asr' || (t.vssId || '').startsWith('a.'),
                                })),
                                activeVssId,
                                prerenderedText,
                                captionBaseUrl,
                            };
                        } catch (e) { return { error: String(e) }; }
                    }
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
                if (!transcriptText && meta.captionBaseUrl) {
                    try {
                        const resp = await fetch(meta.captionBaseUrl + '&fmt=json3');
                        if (resp.ok) {
                            const data = await resp.json();
                            const lines = (data.events || [])
                                .filter(e => e.segs)
                                .map(e => e.segs.map(s => s.utf8 ?? '').join('').replace(/\n/g, ' ').trim())
                                .filter(Boolean);
                            const timedtextFetched = lines.join(' ');
                            if (timedtextFetched.length > 50) {
                                if (resolvedTrack) {
                                    const lang = resolvedTrack.lang || '';
                                    const isAsr = !!resolvedTrack.isAsr;
                                    transcriptText = `[TRANSCRIPT: ${lang}${isAsr ? ' (Auto)' : ''}]\n\n${timedtextFetched}`;
                                } else {
                                    transcriptText = `[TRANSCRIPT]\n\n${timedtextFetched}`;
                                }
                            }
                        }
                    } catch { /* timedtext API no disponible — Step 2 com a fallback */ }
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
                func: () => {
                    const parts = [];

                    // Post author
                    const authorEl = document.querySelector(
                        ".update-components-actor__title, .feed-shared-actor__title"
                    );
                    const author = authorEl?.innerText?.trim().split("\n")[0] || "";

                    // Post text — try expanded first, then visible text
                    const expandBtn = document.querySelector(
                        ".feed-shared-inline-show-more-text button, " +
                        ".update-components-text button.see-more"
                    );
                    if (expandBtn) expandBtn.click();

                    const postEl = document.querySelector(
                        ".update-components-text, .feed-shared-text"
                    );
                    const postText = postEl?.innerText?.trim() || "";

                    if (author) parts.push(`Autor: ${author}`);
                    if (postText) parts.push(`\nPublicació:\n${postText}`);

                    // Comments + replies (full thread)
                    // Strategy: find all comment items, detect top-level vs reply by
                    // checking if the item is inside a nested-items container.
                    const UI_NOISE = /^(Like|Reply|Show translation|Load more|Comment|Repost|Send|See more|\d+\s*(like|comment|reaction))/i;

                    const extractComment = (item, indent) => {
                        // Author name — multiple known selector variants
                        const nameEl = item.querySelector(
                            ".comments-post-meta__name-text, " +
                            ".comments-post-meta__name, " +
                            ".feed-shared-actor__name, " +
                            ".hoverable-link-text"
                        );
                        // Comment body text
                        const textEl = item.querySelector(
                            ".comments-comment-item__main-content, " +
                            ".comments-comment-texteditor, " +
                            ".update-components-text"
                        );
                        const name = nameEl?.innerText?.trim().split("\n")[0] || "";
                        const txt = textEl?.innerText?.trim() || "";
                        if (txt.length <= 5 || UI_NOISE.test(txt)) return null;
                        return `${indent}${name ? name + ":\n" + indent : ""}${txt}`;
                    };

                    const allCommentItems = Array.from(
                        document.querySelectorAll(".comments-comment-item")
                    );

                    if (allCommentItems.length > 0) {
                        const comments = [];
                        allCommentItems.forEach(item => {
                            const isReply = !!item.closest(".comments-comment-item__nested-items");
                            const indent = isReply ? "  > " : "";
                            const c = extractComment(item, indent);
                            if (c) comments.push(c);
                        });
                        if (comments.length > 0) {
                            parts.push(`\nComentaris:\n${comments.join("\n\n")}`);
                        }
                    }

                    return parts.length > 0 ? parts.join("\n") : null;
                }
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
            // Inject Defuddle to extract clean content from the React-rendered page
            await executeScriptSafe({
                target: { tabId: tabId },
                files: ["defuddle.js"]
            });

            const defuddleResult = await executeScriptSafe({
                target: { tabId: tabId },
                func: () => {
                    if (typeof Defuddle === "undefined") return null;
                    try {
                        const parsed = new Defuddle(document, { url: window.location.href }).parse();
                        return parsed?.markdown || null;
                    } catch (e) {
                        return null;
                    }
                }
            });

            const defuddleText = defuddleResult?.[0]?.result;
            if (defuddleText && defuddleText.trim().length > 50) {
                text = defuddleText;
            }

            // Fallback: scrape tweet text directly from DOM
            if (!text) {
                const scrapeResult = await executeScriptSafe({
                    target: { tabId: tabId },
                    func: () => {
                        const tweetEls = document.querySelectorAll('[data-testid="tweetText"]');
                        if (tweetEls.length === 0) return null;
                        return Array.from(tweetEls).map(el => el.innerText).join("\n\n---\n\n");
                    }
                });
                const scraped = scrapeResult?.[0]?.result;
                if (scraped && scraped.trim().length > 0) text = scraped;
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
          func: () => {
              if (typeof Readability !== 'undefined') {
                  try {
                      const docClone = document.cloneNode(true);
                      // Remove ALL non-content elements: scripts, styles, navigation/chrome, images, iframes, etc.
                      [
                          'script', 'style', 'noscript', 'iframe', 'svg',
                          'nav', 'header', 'footer', 'aside', 
                          '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
                          '[role="contentinfo"]', '[data-ad="true"]',
                          '.ad', '.advertisement', '.social', '.sharing', '.comments-section'
                      ].forEach(sel => {
                          try { docClone.querySelectorAll(sel).forEach(el => el.remove()); } catch(e) {}
                      });
                      // Also remove all img tags to avoid image URLs/data inflating tokens
                      try { docClone.querySelectorAll('img').forEach(el => el.remove()); } catch(e) {}
                      
                      const article = new Readability(docClone).parse();
                      if (article && article.textContent && article.textContent.trim().length > 100) {
                          // Further clean: remove excessive whitespace after Readability
                          return article.textContent.replace(/\s{3,}/g, '\n\n').trim();
                      }
                  } catch(e) {}
              }
              // Last resort: body text with aggressive cleanup.
              try {
                  const bodyClone = document.body.cloneNode(true);
                  [
                      'script', 'style', 'noscript', 'iframe', 'svg',
                      'nav', 'header', 'footer', 'aside',
                      '[role="navigation"]', '[role="banner"]', '[role="complementary"]'
                  ].forEach(sel => {
                      try { bodyClone.querySelectorAll(sel).forEach(el => el.remove()); } catch(e) {}
                  });
                  // Remove images
                  try { bodyClone.querySelectorAll('img').forEach(el => el.remove()); } catch(e) {}
                  return bodyClone.innerText.replace(/\s{3,}/g, '\n\n').trim();
              } catch(e) {}
              // Fallback cru sense filtre de longitud: el filtre > 100 s'aplica a l'exterior
              return document.body.innerText.replace(/\s{3,}/g, '\n\n').trim();
          }
        });
        
        if (scriptResults?.[0]?.result) text = scriptResults[0].result;
    }

    if (!text || text.trim() === "") throw new Error("[006] No s'ha pogut extreure el contingut d'aquesta pàgina. Recarrega la pestanya (F5) i torna-ho a provar.");
    
    return { title: tabTitle, url: tabUrl, text: text };
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { executeScriptSafe, getPageContent };
}
