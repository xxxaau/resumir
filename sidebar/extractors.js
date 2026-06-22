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

// Export per a Node (tests/canari). Ignorat al navegador (module undefined).
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        extractHackerNewsFromDOM,
        scrapeTwitterTweets,
        extractTwitterOG,
        extractWithReadability,
    };
}
