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
            const hnResult = await executeScriptSafe({
                target: { tabId: tabId },
                func: () => {
                    const titleEl = document.querySelector(".titleline a");
                    const comments = Array.from(document.querySelectorAll(".commtext"))
                        .map(c => "- " + c.innerText.replace(/\s+/g, " ").trim())
                        .join("\n");
                    return {
                        title: titleEl?.innerText || document.title,
                        articleUrl: titleEl?.href || null,
                        comments
                    };
                }
            });
            const hn = hnResult?.[0]?.result;
            if (hn) {
                let articleText = "";
                if (hn.articleUrl && !hn.articleUrl.includes("ycombinator.com")) {
                    try {
                        const resp = await fetch(hn.articleUrl, { signal: AbortSignal.timeout(8000) });
                        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                        const html = await resp.text();
                        const doc = new DOMParser().parseFromString(html, "text/html");
                        const base = doc.createElement("base");
                        base.href = hn.articleUrl;
                        doc.head.insertBefore(base, doc.head.firstChild);
                        const article = new Readability(doc).parse();
                        if (article?.textContent?.trim().length > 200) {
                            articleText = article.textContent.trim();
                        }
                    } catch (e) {
                        console.warn("HN article fetch failed", e);
                    }
                }
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

            // Helper: fetch a timedtext URL (JSON3 format) and extract plain text
            async function fetchTimedText(url) {
                // Prefer JSON3 format for more reliable parsing
                const jsonUrl = url.includes("fmt=") ? url : url + (url.includes("?") ? "&" : "?") + "fmt=json3";
                const res = await fetch(jsonUrl, { credentials: 'include', signal: AbortSignal.timeout(8000) });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const body = await res.text();

                // Try JSON3 format first (events array)
                try {
                    const data = JSON.parse(body);
                    if (data.events) {
                        return data.events
                            .filter(e => e.segs)
                            .map(e => e.segs.map(s => s.utf8 || "").join(""))
                            .join(" ")
                            .replace(/\s+/g, " ")
                            .trim();
                    }
                } catch (_) { /* not JSON, fall through to XML */ }

                // XML format fallback
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(body, "text/xml");
                const texts = xmlDoc.getElementsByTagName("text");
                let fullText = "";
                for (let i = 0; i < texts.length; i++) {
                    let line = texts[i].textContent;
                    line = line.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
                    fullText += line + " ";
                }
                return fullText.replace(/\s+/g, " ").trim();
            }

            // 1. Player response injection: read captionTracks (manual + ASR)
            const playerResponse = await executeScriptSafe({
                target: { tabId: tabId },
                world: "MAIN",
                func: () => {
                    try {
                        const player = document.getElementById('movie_player');
                        let response = player && player.getPlayerResponse ? player.getPlayerResponse() : null;
                        if (!response) response = window.ytInitialPlayerResponse;
                        if (!response || !response.captions) return null;

                        const tracks = response.captions.playerCaptionsTracklistRenderer?.captionTracks;
                        if (!tracks || tracks.length === 0) return null;

                        // Score: prefer manual in Catalan > English > Spanish > any manual > ASR in those langs > any ASR
                        const getScore = (t) => {
                            const isAsr = t.kind === 'asr' || (t.vssId || '').startsWith('a.');
                            const base  = isAsr ? 0 : 20;
                            if (t.languageCode === 'ca') return base + 80;
                            if (t.languageCode === 'en') return base + 30;
                            if (t.languageCode === 'es') return base + 20;
                            return base;
                        };

                        tracks.sort((a, b) => getScore(b) - getScore(a));
                        const track = tracks[0];
                        const isAsr = track.kind === 'asr' || (track.vssId || '').startsWith('a.');
                        return { baseUrl: track.baseUrl, language: track.name?.simpleText || track.languageCode, isAsr };
                    } catch (e) {
                        return null;
                    }
                }
            });

            const trackData = playerResponse?.[0]?.result;

            if (trackData?.baseUrl) {
                try {
                    const fullText = await fetchTimedText(trackData.baseUrl);
                    if (fullText.length > 50) {
                        transcriptText = `[TRANSCRIPT: ${trackData.language}${trackData.isAsr ? ' (Auto)' : ''}]\n\n${fullText}`;
                    }
                } catch (err) {
                    console.warn("YouTube timedtext fetch failed:", err);
                }
            }

            // 2. Timedtext API fallback: probe common langs with ASR when captionTracks gave nothing
            if (!transcriptText) {
                const videoIdMatch = tabUrl.match(/[?&]v=([^&]+)/);
                const videoId = videoIdMatch?.[1];
                if (videoId) {
                    const langCandidates = ['ca', 'en', 'es', 'fr', 'de', 'pt'];
                    for (const lang of langCandidates) {
                        try {
                            const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&kind=asr&fmt=json3`;
                            const fullText = await fetchTimedText(url);
                            if (fullText.length > 50) {
                                transcriptText = `[TRANSCRIPT: ${lang} (Auto)]\n\n${fullText}`;
                                break;
                            }
                        } catch (_) { /* try next lang */ }
                    }
                }
            }

            // 3. UI Fallback: read the transcript panel if open
            if (!transcriptText) {
                const transcriptResult = await executeScriptSafe({
                    target: { tabId: tabId },
                    func: () => {
                        const segments = document.querySelectorAll('ytd-transcript-segment-renderer .segment-text');
                        if (segments && segments.length > 0) {
                            return Array.from(segments).map(s => s.innerText).join(" ");
                        }
                        return null;
                    }
                });
                if (transcriptResult?.[0]?.result) {
                    transcriptText = "[TRANSCRIPT (FROM PANEL)]\n\n" + transcriptResult[0].result;
                }
            }

            // 4. Description Fallback (last resort)
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
                    console.log("[LinkedIn] comments-comment-item found:", allCommentItems.length);

                    if (allCommentItems.length > 0) {
                        const comments = [];
                        allCommentItems.forEach(item => {
                            const isReply = !!item.closest(".comments-comment-item__nested-items");
                            const indent = isReply ? "  > " : "";
                            const c = extractComment(item, indent);
                            if (c) comments.push(c);
                        });
                        console.log("[LinkedIn] comments extracted:", comments.length);
                        if (comments.length > 0) {
                            parts.push(`\nComentaris:\n${comments.join("\n\n")}`);
                        }
                    } else {
                        // DOM diagnostic: log what comment-related classes are present
                        const allClasses = Array.from(document.querySelectorAll("[class]"))
                            .map(el => el.className)
                            .join(" ")
                            .split(/\s+/)
                            .filter(c => c.includes("comment"))
                            .filter((c, i, a) => a.indexOf(c) === i)
                            .slice(0, 20);
                        console.warn("[LinkedIn] No comments-comment-item found. Comment-related classes:", allClasses);
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
        } catch (e) {}

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
