/**
 * extractors.js — funcions d'extracció per connector.
 * Autocontingudes (només globals + locals): s'injecten a la pàgina via
 * executeScript({func}) i s'importen als tests/canari. Font única de selectors.
 */

// Extreu el títol i comentaris d'una pàgina HN, i intenta obtenir el text de l'article extern.
async function extractHackerNewsFromDOM() {
    const titleEl = document.querySelector(".titleline a");
    // textContent és compatible tant amb el navegador com amb jsdom als tests
    const getText = (el) => (el.innerText !== undefined ? el.innerText : el.textContent) || "";
    const comments = Array.from(document.querySelectorAll(".commtext"))
        .map(c => "- " + getText(c).replace(/\s+/g, " ").trim())
        .join("\n");
    const title = getText(titleEl) || document.title;
    const articleUrl = titleEl?.href || null;

    // Guard SSRF: rebutja IPs privades/reservades inlineat (cap import extern).
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
            // Silencia errors de xarxa (inclou el cas de test amb fetch mock)
        }
    }
    return { title, comments, articleText };
}

// Extreu els tweets visibles al DOM de Twitter/X.
// Retorna null si el DOM és degradat (servidor bloqueja bots).
function scrapeTwitterTweets() {
    const tweetEls = document.querySelectorAll('[data-testid="tweetText"]');
    if (tweetEls.length === 0) return null;
    const getText = (el) => (el.innerText !== undefined ? el.innerText : el.textContent) || "";
    return Array.from(tweetEls).map(el => getText(el)).join("\n\n---\n\n");
}

// Extreu el contingut OG (og:title + og:description) de Twitter/X com a fallback robust.
function extractTwitterOG() {
    const desc = document.querySelector('meta[property="og:description"]')?.content;
    if (!desc) return null;
    const title = document.querySelector('meta[property="og:title"]')?.content || "";
    return title ? `${title}\n\n${desc}` : desc;
}

// Extreu el cos de l'article amb Readability si disponible, o innerText/textContent com a fallback.
function extractWithReadability() {
    if (typeof Readability !== "undefined") {
        try {
            const docClone = document.cloneNode(true);
            [
                "script", "style", "noscript", "iframe", "svg",
                "nav", "header", "footer", "aside",
                '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
                '[role="contentinfo"]', '[data-ad="true"]',
                ".ad", ".advertisement", ".social", ".sharing", ".comments-section"
            ].forEach(sel => {
                try { docClone.querySelectorAll(sel).forEach(el => el.remove()); } catch (e) {}
            });
            try { docClone.querySelectorAll("img").forEach(el => el.remove()); } catch (e) {}

            const article = new Readability(docClone).parse();
            if (article && article.textContent && article.textContent.trim().length > 100) {
                return article.textContent.replace(/\s{3,}/g, "\n\n").trim();
            }
        } catch (e) {}
    }
    // Fallback: textContent del body sense elements innecessaris
    try {
        const bodyClone = document.body.cloneNode(true);
        [
            "script", "style", "noscript", "iframe", "svg",
            "nav", "header", "footer", "aside",
            '[role="navigation"]', '[role="banner"]', '[role="complementary"]'
        ].forEach(sel => {
            try { bodyClone.querySelectorAll(sel).forEach(el => el.remove()); } catch (e) {}
        });
        try { bodyClone.querySelectorAll("img").forEach(el => el.remove()); } catch (e) {}
        const raw = (bodyClone.innerText !== undefined ? bodyClone.innerText : bodyClone.textContent) || "";
        return raw.replace(/\s{3,}/g, "\n\n").trim();
    } catch (e) {}
    const fallback = document.body.innerText !== undefined ? document.body.innerText : document.body.textContent;
    return (fallback || "").replace(/\s{3,}/g, "\n\n").trim();
}

// Extreu el contingut d'una publicació de LinkedIn amb fallback de 3 nivells.
// Nivell 1: selectors de la vista logged-in. Nivell 2: selectors de la vista pública.
// Nivell 3: Open Graph (og:title + og:description).
function extractLinkedInPost() {
    // Helper local: innerText quan disponible (navegador), textContent com a fallback (jsdom).
    const getText = (el) => (el && el.innerText !== undefined ? el.innerText : (el ? el.textContent : "")) || "";

    // Nivell 1 — vista logged-in (feed): autor + post + comentaris.
    const loggedInAuthor = getText(
        document.querySelector(".update-components-actor__title, .feed-shared-actor__title")
    ).trim().split("\n")[0];

    const expandBtn = document.querySelector(
        ".feed-shared-inline-show-more-text button, " +
        ".update-components-text button.see-more"
    );
    if (expandBtn) expandBtn.click();

    const loggedInPost = getText(
        document.querySelector(".update-components-text, .feed-shared-text")
    ).trim();

    if (loggedInPost) {
        const parts = [];
        if (loggedInAuthor) parts.push(`Autor: ${loggedInAuthor}`);
        parts.push(`\nPublicació:\n${loggedInPost}`);

        const UI_NOISE = /^(Like|Reply|Show translation|Load more|Comment|Repost|Send|See more|\d+\s*(like|comment|reaction))/i;
        const extractComment = (item, indent) => {
            const nameEl = item.querySelector(
                ".comments-post-meta__name-text, .comments-post-meta__name, " +
                ".feed-shared-actor__name, .hoverable-link-text"
            );
            const textEl = item.querySelector(
                ".comments-comment-item__main-content, .comments-comment-texteditor, .update-components-text"
            );
            const name = getText(nameEl).trim().split("\n")[0];
            const txt = getText(textEl).trim();
            if (txt.length <= 5 || UI_NOISE.test(txt)) return null;
            return `${indent}${name ? name + ":\n" + indent : ""}${txt}`;
        };
        const items = Array.from(document.querySelectorAll(".comments-comment-item"));
        const comments = [];
        items.forEach(item => {
            const isReply = !!item.closest(".comments-comment-item__nested-items");
            const c = extractComment(item, isReply ? "  > " : "");
            if (c) comments.push(c);
        });
        if (comments.length > 0) parts.push(`\nComentaris:\n${comments.join("\n\n")}`);
        return parts.join("\n");
    }

    // Nivell 2 — vista pública (logged-out): card amb autor + text complet.
    const card = document.querySelector(".main-feed-activity-card");
    const publicSegs = Array.from(document.querySelectorAll(".attributed-text-segment-list__content"))
        .map(s => getText(s).replace(/\s+/g, " ").trim())
        .filter(Boolean);
    if (publicSegs.length > 0) {
        const authorEl = card && card.querySelector("a[href*='/company/'], a[href*='/in/']");
        const author = getText(authorEl).trim();
        const body = publicSegs.join("\n\n");
        return author ? `Autor: ${author}\n\nPublicació:\n${body}` : `Publicació:\n${body}`;
    }

    // Nivell 3 — Open Graph (servit pel servidor, immune al DOM).
    const ogDesc = document.querySelector('meta[property="og:description"]')?.content;
    if (ogDesc) {
        const ogTitle = document.querySelector('meta[property="og:title"]')?.content || "";
        return ogTitle ? `${ogTitle}\n\n${ogDesc}` : ogDesc;
    }

    return null;
}

// Llegeix les metadades de subtítols de YouTube des dels globals del MAIN world.
// Retorna { hasTracks, tracks, activeVssId, prerenderedText, captionBaseUrl }
// o { error } si falla. Autocontinguda: només usa globals window i document.
function readYoutubeCaptionMeta() {
    try {
        // Pistes de subtítols del player
        const rawCaptionTracks = window.ytInitialPlayerResponse?.captions
            ?.playerCaptionsTracklistRenderer?.captionTracks || [];

        // Pista activa via API privada del player (pot no estar disponible)
        let activeVssId = null;
        try {
            const player = document.querySelector('#movie_player');
            player?.loadModule?.('captions');
            const active = player?.getOption?.('captions', 'track');
            activeVssId = active?.vss_id || active?.vssId || null;
        } catch { /* API privada — ignorem */ }

        // Text pre-renderitzat del panell de transcripció (ytInitialData)
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

        // URL base de la millor pista si no hi ha text pre-renderitzat
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

// Export per a Node (tests/canari). Ignorat al navegador (module undefined).
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        extractHackerNewsFromDOM,
        scrapeTwitterTweets,
        extractTwitterOG,
        extractWithReadability,
        extractLinkedInPost,
        readYoutubeCaptionMeta,
    };
}
