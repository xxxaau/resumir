/**
 * extractors.js — funcions d'extracció per connector.
 * Autocontingudes (només globals + locals): s'injecten a la pàgina via
 * executeScript({func}) i s'importen als tests/canari. Font única de selectors.
 */

// Extreu el títol, els comentaris i la URL de l'article extern d'una pàgina HN.
//
// IMPORTANT: el fetch de l'article NO es fa aquí. Aquesta funció s'injecta al
// content-script (món isolated) i els fetch cross-origin dels content scripts
// estan subjectes a CORS (a Chromium el navegador els bloqueja). El fetch de
// l'article es fa al context del sidebar (content.js → fetchLinkedArticleText),
// que amb host_permissions <all_urls> NO té restriccions CORS — el mateix patró
// que el fetch de PDF.
function extractHackerNewsFromDOM() {
    const titleEl = document.querySelector(".titleline a");
    // textContent és compatible tant amb el navegador com amb jsdom als tests
    const getText = (el) => (el.innerText !== undefined ? el.innerText : el.textContent) || "";
    const comments = Array.from(document.querySelectorAll(".commtext"))
        .map(c => "- " + getText(c).replace(/\s+/g, " ").trim())
        .join("\n");
    const title = getText(titleEl) || document.title;
    const articleUrl = titleEl?.href || null;
    return { title, comments, articleUrl };
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

// Transcripció amb marques de temps: [{startMs, text}] → «[0:00] text … [0:35] text».
// La marca es posa al principi i cada ~30 s (no a cada línia, per estalviar tokens).
// Les funcions MAIN-world de sota són autocontingudes i n'incrusten una còpia.
function formatTimedTranscript(segments) {
    const fmt = (ms) => {
        const t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
        const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
        return (h > 0 ? h + ":" : "") + mm + ":" + String(sec).padStart(2, "0");
    };
    const out = [];
    let lastMark = -Infinity;
    for (const seg of segments) {
        if (!seg || !seg.text) continue;
        const ms = Number(seg.startMs);
        if (Number.isFinite(ms) && ms - lastMark >= 30000) {
            out.push("[" + fmt(ms) + "]");
            lastMark = ms;
        }
        out.push(seg.text);
    }
    return out.join(" ");
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
            // Marques [m:ss] cada ~30 s (còpia autocontinguda de formatTimedTranscript)
            const fmt = (ms) => {
                const t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
                return (h > 0 ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(sec).padStart(2, '0');
            };
            const pieces = [];
            let lastMark = -Infinity;
            for (const s of segments) {
                const r = s?.transcriptSegmentRenderer;
                const text = r?.snippet?.runs?.map(x => x.text)?.join('') || '';
                if (!text) continue;
                const ms = Number(r.startMs);
                if (Number.isFinite(ms) && ms - lastMark >= 30000) { pieces.push('[' + fmt(ms) + ']'); lastMark = ms; }
                pieces.push(text);
            }
            if (pieces.length > 0) prerenderedText = pieces.join(' ');
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

/**
 * Cerca una cita al text visible de la pàgina, la ressalta en groc i hi desplaça la vista
 * (com un Ctrl+F). S'injecta amb executeScript: ha de ser autocontinguda. Compara sense
 * distingir majúscules, amb espais, cometes i guions unificats; si la cita sencera no hi
 * és, prova amb el seu començament. Retorna { found }.
 */
function highlightQuoteInPage(quote) {
    try {
        const QUOTES = { "\u2018": "'", "\u2019": "'", "\u201a": "'", "\u201b": "'", "\u201c": '"', "\u201d": '"', "\u201e": '"', "\u00ab": '"', "\u00bb": '"', "\u2013": "-", "\u2014": "-" };
        const normChar = (c) => {
            if (/\s/.test(c)) return " ";
            if (QUOTES[c]) return QUOTES[c];
            const l = c.toLowerCase();
            return l.length === 1 ? l : c;
        };
        const normString = (t) => {
            let out = "";
            for (const c of String(t)) {
                const n = normChar(c);
                if (n === " " && (out === "" || out.endsWith(" "))) continue;
                out += n;
            }
            return out.trimEnd();
        };
        // Text visible de la pàgina, amb un mapa de cada caràcter normalitzat al seu node/posició
        let acc = "";
        const map = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => (n.parentElement && !n.parentElement.closest("script,style,noscript,template,[hidden],[aria-hidden='true']"))
                ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
        });
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const v = n.nodeValue;
            for (let i = 0; i < v.length; i++) {
                const c = normChar(v[i]);
                if (c === " " && (acc === "" || acc.endsWith(" "))) continue;
                acc += c;
                map.push([n, i]);
            }
        }
        const target = normString(quote);
        if (!target) return { found: false };
        const tries = [target];
        const words = target.split(" ");
        if (words.length > 6) tries.push(words.slice(0, 6).join(" "));
        let range = null;
        for (const t of tries) {
            for (let from = 0; ;) {
                const at = acc.indexOf(t, from);
                if (at < 0) break;
                const [n1, o1] = map[at];
                const [n2, o2] = map[at + t.length - 1];
                const r = document.createRange();
                r.setStart(n1, o1);
                r.setEnd(n2, o2 + 1);
                // Si el 1r resultat és amagat (menú, pestanya tancada), es prova el següent
                if (r.getClientRects().length > 0) { range = r; break; }
                from = at + 1;
            }
            if (range) break;
        }
        if (!range) return { found: false };
        const host = range.startContainer.parentElement;
        if (host && host.scrollIntoView) host.scrollIntoView({ block: "center", behavior: "smooth" });
        if (typeof CSS !== "undefined" && CSS.highlights && typeof Highlight !== "undefined") {
            let style = document.getElementById("resumir-quote-style");
            if (!style) {
                style = document.createElement("style");
                style.id = "resumir-quote-style";
                style.textContent = "::highlight(resumir-quote){background-color:#ffe14d;color:#000}";
                document.head.appendChild(style);
            }
            CSS.highlights.set("resumir-quote", new Highlight(range));
            clearTimeout(window.__resumirQuoteTimer);
            window.__resumirQuoteTimer = setTimeout(() => CSS.highlights.delete("resumir-quote"), 10000);
        } else {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
        return { found: true };
    } catch (e) { return { found: false, error: String(e) }; }
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
        highlightQuoteInPage,
        formatTimedTranscript,
    };
}
