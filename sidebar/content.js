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
 * Includes specific heuristics for HackerNews, YouTube, and fallback to Readability.
 */
async function getPageContent() {
    const tabs = await ext.tabs.query({active: true, currentWindow: true});
    if (tabs.length === 0) throw new Error("No active tab found");
    const tabId = tabs[0].id;
    const tabUrl = tabs[0].url;
    const tabTitle = tabs[0].title;

    let text = "";

    // HACKER NEWS SPECIAL LOGIC
    if (tabUrl.includes("news.ycombinator.com/item")) {
        try {
            const scriptResults = await executeScriptSafe({
               target: {tabId: tabId},
               func: () => {
                   const titleEl = document.querySelector(".titleline a");
                   const title = titleEl ? titleEl.innerText : document.title;
                   const comments = Array.from(document.querySelectorAll(".commtext"));
                   const topComments = comments.slice(0, 15).map(c => "- " + c.innerText.replace(/\s+/g, " ").trim()).join("\n");
                   return `Title: ${title}\n\nTop Discussion Comments:\n${topComments}`;
               }
            });
            if (scriptResults?.[0]?.result) text = scriptResults[0].result;
        } catch (e) {
            console.warn("HN extraction failed", e);
        }
    } 
    
    // YOUTUBE SPECIAL LOGIC
    else if (tabUrl.includes("youtube.com/watch")) {
        try {
            let transcriptText = "";
            
            // 1. Try to get Transcript via Internal API (MAIN world injection)
            const playerResponse = await executeScriptSafe({
                target: {tabId: tabId},
                world: "MAIN", 
                func: () => {
                    try {
                        const player = document.getElementById('movie_player');
                        let response = player && player.getPlayerResponse ? player.getPlayerResponse() : null;
                        if (!response) response = window.ytInitialPlayerResponse;
                        
                        if (!response || !response.captions) return null;
                        
                        const tracks = response.captions.playerCaptionsTracklistRenderer?.captionTracks;
                        if (!tracks || tracks.length === 0) return null;
                        
                        const getScore = (t) => {
                            if (t.languageCode === 'ca') return 100;
                            if (t.languageCode === 'en') return 50;
                            if (t.languageCode === 'es') return 40;
                            if (t.kind === 'asr') return 0; // Auto-generated
                            return 10;
                        };
                        
                        tracks.sort((a, b) => getScore(b) - getScore(a));
                        const track = tracks[0];
                                   
                        return { baseUrl: track.baseUrl, language: track.name?.simpleText, isAsr: track.kind === 'asr' };
                    } catch (e) {
                        return null;
                    }
                }
            });

            const trackData = playerResponse?.[0]?.result;

            if (trackData && trackData.baseUrl) {
                 
                 try {
                     const transcriptResponse = await fetch(trackData.baseUrl, { credentials: 'include' });
                     if (!transcriptResponse.ok) throw new Error("Fetch failed");
                     const transcriptXml = await transcriptResponse.text();
                     
                     if (transcriptXml) {
                         const parser = new DOMParser();
                         const xmlDoc = parser.parseFromString(transcriptXml, "text/xml");
                         const texts = xmlDoc.getElementsByTagName("text");
                         
                         let fullText = "";
                         for (let i = 0; i < texts.length; i++) {
                             let line = texts[i].textContent;
                             line = line.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
                             fullText += line + " ";
                         }
                         
                         fullText = fullText.replace(/\s+/g, " ").trim();
                         if (fullText.length > 50) {
                             transcriptText = `[TRANSCRIPT: ${trackData.language}${trackData.isAsr ? ' (Auto)' : ''}]\n\n${fullText}`;
                         }
                     }
                 } catch (err) {
                     console.error("Error fetching/parsing XML transcript:", err);
                 }
            }
            
            // 2. UI Fallback (if API failed)
            if (!transcriptText) {
                 const transcriptResult = await executeScriptSafe({
                     target: {tabId: tabId},
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

            // 3. Description Fallback (Critical if no transcript found)
            if (!transcriptText) {
                const descResult = await executeScriptSafe({
                    target: {tabId: tabId},
                    func: () => {
                        const title = document.title;
                        const moreBtn = document.querySelector('#expand');
                        if(moreBtn) moreBtn.click();
                        
                        const descEl = document.querySelector('#description-inline-expander') || document.querySelector('#description');
                        const desc = descEl ? descEl.innerText : "";
                        return `Title: ${title}\n\nDescription:\n${desc}`;
                    }
                });
                if (descResult?.[0]?.result && descResult[0].result.length > 50) {
                    transcriptText = descResult[0].result + "\n\n[Nota: No s'ha trobat transcripció disponible per a aquest vídeo. Es resumeix la descripció.]";
                }
            }

            if (transcriptText) {
                text = transcriptText;
            }

        } catch (e) {
            console.warn("YouTube extraction totally failed", e);
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
                      const article = new Readability(document.cloneNode(true)).parse();
                      if (article && article.textContent) return article.textContent;
                  } catch(e) {}
              }
              return document.body.innerText;
          }
        });
        
        if (scriptResults?.[0]?.result) text = scriptResults[0].result;
    }

    if (!text || text.trim() === "") throw new Error("Page content empty");
    
    return { title: tabTitle, url: tabUrl, text: text };
}
