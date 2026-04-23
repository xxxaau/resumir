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

            // Step 1 — MAIN world: llegir la llista de pistes de ytInitialPlayerResponse
            // per poder després casar-la amb la pista activa al panell (resolta al Step 2).
            const metaResult = await executeScriptSafe({
                target: { tabId: tabId },
                world: "MAIN",
                func: () => {
                    try {
                        const tracks = window.ytInitialPlayerResponse?.captions
                            ?.playerCaptionsTracklistRenderer?.captionTracks || [];
                        return {
                            hasTracks: tracks.length > 0,
                            tracks: tracks.map(t => ({
                                lang: t.languageCode || '',
                                name: t.name?.simpleText || '',
                                isAsr: t.kind === 'asr' || (t.vssId || '').startsWith('a.')
                            }))
                        };
                    } catch (e) { return { error: String(e) }; }
                }
            });
            const meta = metaResult?.[0]?.result || {};

            // Step 2 — ISOLATED world: clicar "Mostra la transcripció" i llegir segments del DOM.
            // YouTube actualment serveix dos formats de panell:
            //   - Format clàssic: ytd-transcript-segment-renderer .segment-text
            //   - Format modern: transcript-segment-view-model span.ytAttributedStringHost
            // Aquesta via funciona tant per captions manuals com ASR.
            if (meta.hasTracks) {
                const extractResult = await executeScriptSafe({
                    target: { tabId: tabId },
                    func: async () => {
                        const sleep = ms => new Promise(r => setTimeout(r, ms));

                        function readSegments() {
                            const modernSegs = document.querySelectorAll(
                                'transcript-segment-view-model span.ytAttributedStringHost'
                            );
                            if (modernSegs.length > 0) {
                                return Array.from(modernSegs)
                                    .map(s => s.textContent.trim())
                                    .filter(Boolean);
                            }
                            const classicSegs = document.querySelectorAll(
                                'ytd-transcript-segment-renderer .segment-text'
                            );
                            if (classicSegs.length > 0) {
                                return Array.from(classicSegs)
                                    .map(s => s.textContent.trim())
                                    .filter(Boolean);
                            }
                            return [];
                        }

                        // Nom de la pista activa al selector del panell (footer del panell clàssic
                        // o toolbar del panell modern). Permet al caller decidir isAsr correctament.
                        function activeTrackName() {
                            const classicPanel = document.querySelector(
                                'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] ytd-transcript-footer-renderer tp-yt-paper-button'
                            );
                            if (classicPanel) return classicPanel.textContent.trim();
                            const modernPanel = document.querySelector(
                                'ytd-engagement-panel-section-list-renderer[target-id="PAmodern_transcript_view"] yt-dropdown-menu'
                            );
                            if (modernPanel) return modernPanel.textContent.trim();
                            return '';
                        }

                        async function extract() {
                            // Si el panell ja és obert
                            let lines = readSegments();
                            if (lines.length > 0) return { text: lines.join(' '), activeName: activeTrackName() };

                            // Expandir descripció per exposar el botó
                            document.querySelector('#expand')?.click();
                            await sleep(600);

                            const section = document.querySelector('ytd-video-description-transcript-section-renderer');
                            const btn = section?.querySelector('button') ||
                                Array.from(document.querySelectorAll('button'))
                                    .find(b => /transcri/i.test((b.getAttribute('aria-label') || '') + ' ' + b.textContent));
                            if (!btn) return null;
                            btn.click();

                            for (let i = 0; i < 40; i++) {
                                await sleep(250);
                                lines = readSegments();
                                if (lines.length > 0) return { text: lines.join(' '), activeName: activeTrackName() };
                            }
                            return null;
                        }
                        return await extract();
                    }
                });

                const extracted = extractResult?.[0]?.result;
                if (extracted?.text && extracted.text.length > 50) {
                    // Resolució de la pista activa:
                    //   1. Selector visible (panell clàssic) — match estricte (nom no buit i,
                    //      si dos noms podrien matchejar, el més llarg guanya per evitar que
                    //      "English" encaixi dins de "English (auto-generated)").
                    //   2. Heurística: YouTube prefereix sempre manual sobre ASR, així que si
                    //      hi ha qualsevol pista no-ASR, marquem com a manual. Només etiquetem
                    //      com "(Auto)" quan totes les pistes disponibles són ASR.
                    const activeName = (extracted.activeName || '').replace(/\s+/g, ' ').trim();
                    const matched = (activeName && [...meta.tracks]
                        .filter(t => t.name)
                        .sort((a, b) => b.name.length - a.name.length)
                        .find(t => activeName.includes(t.name))) ||
                        meta.tracks.find(t => !t.isAsr) ||
                        meta.tracks[0];
                    const isAsr = !!matched?.isAsr;
                    const lang = matched?.lang || '';
                    transcriptText = `[TRANSCRIPT: ${lang}${isAsr ? ' (Auto)' : ''}]\n\n${extracted.text}`;
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
