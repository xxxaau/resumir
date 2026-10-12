/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

document.addEventListener("DOMContentLoaded", () => {
    const contentDiv = document.getElementById("content");
    const errorDiv = document.getElementById("error");
    const summarizeBtn = document.getElementById("summarizeBtn");
    const copyBtn = document.getElementById("copyBtn");
    const settingsBtn = document.getElementById("settingsBtn");
    const obsidianBtn = document.getElementById("obsidianBtn");
    const bionicBtn = document.getElementById("bionicBtn");
    const deepDiveBtn = document.getElementById("deepDiveBtn");
    const scienceBtn = document.getElementById("scienceBtn");
    const explainSimpleBtn = document.getElementById("explainSimpleBtn");
    const historyBtn = document.getElementById("historyBtn");
    const sourceTextBtn = document.getElementById("sourceTextBtn");
    const selectPdfBtn = document.getElementById("selectPdfBtn");
    const pdfFileInput = document.getElementById("pdfFileInput");
    const modelSelect = document.getElementById("model-select");

    let isGenerating = false;
    let abortController = null;
    let currentMetadata = { title: "", url: "", summary: "", fromCache: false, type: "summary" };
    let currentSourceText = "";
    let contentPreload = null;
    let isBionicEnabled = false;
    let globalConfigCache = {};
    // Models que acaben de donar 429 (es salten de primeres durant uns minuts)
    const exhaustedModels = new Map();
    const modelNotice = document.getElementById("model-notice");
    function showModelNotice(message) {
        if (!modelNotice) return;
        modelNotice.textContent = message || "";
        modelNotice.classList.toggle("hidden", !message);
    }

    function showPageTitleStrip(title, url) {
        const strip = document.getElementById("page-title-strip");
        const link  = document.getElementById("page-title-link");
        if (!strip || !link) return;
        link.textContent = title || url;
        // Sense URL http(s) real (PDF local, selecció antiga): text pla, no
        // un href="#" que obria una còpia de la barra lateral en una pestanya.
        const href = getSourceHttpUrl(url);
        if (href) link.href = href; else link.removeAttribute("href");
        strip.classList.remove("hidden");
    }

    function updateSourceBtn() {
        if (sourceTextBtn) sourceTextBtn.disabled = !currentSourceText;
    }

    // L'Historial (history.js) mostra entrades de memòria cau directament al
    // #content. Han de passar a ser el «resum actual» perquè Copiar, Obsidian i
    // Biònica exportin/re-renderitzin EL QUE ES VEU, no el resum anterior.
    window.onHistoryEntryLoaded = (entry) => {
        currentMetadata.title = entry.title || "";
        currentMetadata.url = entry.url || "";
        currentMetadata.summary = entry.summary;
        currentMetadata.fromCache = true;
        currentMetadata.type = entry.type;
        setGeneratingState(false, true);
        updateTypeTabs(currentMetadata.url);
        updateStaleBanner();
        updateRegenerateHints();
    };

    // El mode historial amaga la barra d'eines i ancora la barra de tornar a dalt;
    // el títol de la pàgina s'ancora just a sota amb l'alçada real d'ambdues.
    const backBarEl = document.getElementById("history-back-bar");
    if (backBarEl && typeof ResizeObserver !== "undefined") {
        new ResizeObserver(() => {
            document.documentElement.style.setProperty("--backbar-height", backBarEl.offsetHeight + "px");
        }).observe(backBarEl);
    }

    // La barra d'eines és fixa i pot baixar de línia: el títol de la pàgina,
    // també fix, s'ancora just a sota amb la seva alçada real.
    const toolbarEl = document.querySelector(".toolbar");
    if (toolbarEl && typeof ResizeObserver !== "undefined") {
        new ResizeObserver(() => {
            document.documentElement.style.setProperty("--toolbar-height", toolbarEl.offsetHeight + "px");
        }).observe(toolbarEl);
    }

    // --- Context object for summary.js ---
    const ctx = {
        contentDiv,
        errorDiv,
        modelSelect,
        currentMetadata,
        exhaustedModels,
        showModelNotice,
        getSourceText: () => currentSourceText,
        setSourceText: (t) => { currentSourceText = t; updateSourceBtn(); },
        getContentPreload: () => contentPreload,
        // Preload d'un sol ús (contingut de pàgina en carregar el sidebar, o
        // un PDF local seleccionat): un cop consumit a startSummary s'ha de
        // netejar, si no un PDF local queda "enganxat" i contamina qualsevol
        // resum posterior d'una altra pestanya.
        clearContentPreload: () => { contentPreload = null; },
        isBionicEnabled: () => isBionicEnabled,
        getGlobalConfig: () => globalConfigCache,
        onPageIdentified: (title, url) => showPageTitleStrip(title, url),
        // Cridat per startSummary síncronament, abans del primer await, just
        // després de crear l'AbortController — perquè "atura" funcioni durant
        // tota l'streaming i no només un cop ja ha acabat (startSummary no
        // resol la seva promesa fins al final de la generació).
        setAbortController: (ctrl) => { abortController = ctrl; }
    };

    // Bound summary starter (partially applied with ctx)
    const doSummary = (overrideText, isDeepDive, isScience, isUserInitiated, isConceptMap, isSimple, isAnki, refine = null) => {
        if (isGenerating && abortController) {
            abortController.abort();
            abortController = null;
            isGenerating = false;
            setGeneratingState(false, !!currentMetadata.summary);
            return;
        }
        isGenerating = true;
        startSummary(ctx, overrideText, isDeepDive, isScience, isUserInitiated, isConceptMap, isSimple, isAnki, refine).then(ctrl => {
            abortController = ctrl;
        }).finally(() => {
            isGenerating = false;
            abortController = null;
            if (currentMetadata.url) updateTypeTabs(currentMetadata.url);
            updateStaleBanner();
            updateRegenerateHints();
        });
    };

    // --- Configuration Initialization & Migration ---

    const CONFIG_KEYS = ["enableMarkdown", "enableObsidian", "enableBionic", "enableDeepdive", "enableScience", "enableResum", "enableConceptMap", "enableSimple", "enablePdf", "enableAnki", "ankiVault", "ankiPath", "ankiPrompt", "ankiPacket", "ankiLang", "extensionOrder", "markdownTemplate", "obsidianVault", "obsidianPath", "obsidianTemplate", "bionicFont", "bionicWeight", "bionicFontSize", "bionicLineHeight", "bionicFixation"];

    ext.storage.sync
      .get(CONFIG_KEYS)
      .then(config => {
          globalConfigCache = config;
          applyExtensionVisibility(config);
          applyExtensionOrder(config.extensionOrder || DEFAULT_EXTENSION_ORDER);
          resetUI(false, config);
      })
      .catch(e => console.error("Error loading initial visibility config:", e));

    ext.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.apiKey && changes.apiKey.newValue !== changes.apiKey.oldValue) {
            window.location.reload();
        }
        if (area === 'sync') {
            if (changes.modelName) {
                const newModel = changes.modelName.newValue;
                if (globalConfigCache) {
                    globalConfigCache.modelName = newModel;
                }
                if (modelSelect && newModel && modelSelect.value !== newModel) {
                    if (Array.from(modelSelect.options).some(o => o.value === newModel)) {
                        modelSelect.value = newModel;
                    } else {
                        loadModels(null, newModel);
                    }
                }
            }
            // Recarregar el select si els favorits canvien des de settings
            if (changes.favoriteModels) {
                const currentVal = modelSelect.value;
                loadModels(null, currentVal);
            }
            const configChanged = CONFIG_KEYS.some(key => changes[key]);
            if (configChanged) {
                ext.storage.sync.get(CONFIG_KEYS).then(config => {
                    globalConfigCache = config;
                    applyExtensionVisibility(config);
                    if (config.extensionOrder) {
                        applyExtensionOrder(config.extensionOrder);
                    }
                    if (changes.bionicFont || changes.bionicWeight || changes.bionicFontSize || changes.bionicLineHeight || changes.bionicFixation) {
                        // Només reaplica si l'usuari ja té la biònica activa: tocar
                        // els paràmetres a Configuració no l'ha d'activar ni
                        // reescriure el contingut en pantalla.
                        if (isBionicEnabled) applyBionicToContent(config);
                    }
                });
            }
        }
    });

    // --- Button Event Listeners ---

    summarizeBtn.addEventListener("click", () => {
        doSummary(null, false, false, true);
    });

    // --- Selector de PDF local ---
    // Flux: l'usuari selecciona un PDF, l'extreim amb pdf.js, l'obrim en una
    // pestanya nova (blob URL) i disparem el resum. contentPreload conte el
    // text ja extret, indexat per la URL blob de la nova pestanya, de manera
    // que el pipeline normal el consumeix sense haver de re-fetch-ar.
    if (selectPdfBtn && pdfFileInput) {
        // Pulsa el bot\u00f3 quan apareix l'error PDF-016 a l'errorDiv per fer-lo descobrible.
        if (errorDiv && typeof MutationObserver !== "undefined") {
            const obs = new MutationObserver(() => {
                if (errorDiv.textContent && errorDiv.textContent.includes("[PDF-016]")) {
                    selectPdfBtn.classList.add("pulse");
                    setTimeout(() => selectPdfBtn.classList.remove("pulse"), 4000);
                }
            });
            obs.observe(errorDiv, { childList: true, characterData: true, subtree: true });
        }
        selectPdfBtn.addEventListener("click", () => {
            if (isGenerating) return;
            pdfFileInput.click();
        });
        pdfFileInput.addEventListener("change", async (e) => {
            const file = e.target.files && e.target.files[0];
            // Reset perqu\u00e8 re-seleccionar el mateix fitxer torni a disparar change.
            e.target.value = "";
            if (!file) return;
            if (isGenerating) return;
            // L'extracció pot trigar segons: es mostra l'estat de càrrega i es
            // bloquegen els botons (abans semblava penjat i es podia triar un altre
            // fitxer mentrestant; el títol ja canviava abans d'haver llegit res).
            const pdfBusyIds = ["summarizeBtn", "deepDiveBtn", "scienceBtn", "conceptMapBtn", "explainSimpleBtn", "selectPdfBtn", "ankiBtn"];
            const wasDisabled = new Map();
            const setPdfReading = (reading) => {
                const loading = document.getElementById("loading");
                if (reading) {
                    for (const id of pdfBusyIds) {
                        const b = document.getElementById(id);
                        if (b) { wasDisabled.set(id, b.disabled); b.disabled = true; }
                    }
                    if (loading) loading.classList.remove("hidden");
                    setLoadingStage("Llegint el PDF…");
                    announceStatus("Llegint el PDF…");
                } else {
                    for (const [id, was] of wasDisabled) {
                        const b = document.getElementById(id);
                        if (b) b.disabled = was;
                    }
                    wasDisabled.clear();
                    if (loading) loading.classList.add("hidden");
                    setLoadingStage("");
                }
            };
            setPdfReading(true);
            try {
                const buffer = await file.arrayBuffer();
                // Clonar el buffer abans de passar-lo a extractPdfText: pdf.js el pot
                // transferir al worker (via postMessage) i detachar l'original.
                const viewerBuffer = buffer.slice(0);
                if (typeof extractPdfText !== "function") {
                    throw new Error("pdf-extract no carregat (vendor/pdf.min.js)");
                }
                const pdfResult = await extractPdfText(buffer);
                // Només ara (extracció feta) canvia el títol: abans mostrava el
                // fitxer nou sobre el resum antic, i si fallava s'hi quedava.
                // Clau amb mida i data: dos «document.pdf» diferents no es trepitgen.
                const tabUrl = `pdf-local:${file.name}:${file.size}:${file.lastModified}`;
                showPageTitleStrip(file.name, tabUrl);
                // Obre el PDF en una pestanya per consultar-lo via visor personalitzat.
                // Usem storage.session (compartit entre pàgines d'extensió) per passar
                // el buffer, ja que blob: URLs no funcionen al visor nadiu de Firefox.
                let viewerKey = `pdfViewer:${Date.now()}`;
                const b64 = arrayBufferToBase64(viewerBuffer);
                try {
                    await ext.storage.session.set({ [viewerKey]: b64 });
                } catch (sessionErr) {
                    console.warn("[PDF picker] storage.session.set failed, skipping viewer:", sessionErr);
                    // Si storage.session no pot desar-lo (límit de mida), simplement no
                    // obrim el visor. El resum es genera igualment.
                    viewerKey = null;
                }
                if (viewerKey) {
                    ext.tabs.create({
                        url: ext.runtime.getURL(`sidebar/pdf-viewer.html?key=${encodeURIComponent(viewerKey)}&name=${encodeURIComponent(file.name)}`),
                        active: false // no robar el focus de la barra lateral abans que acabi el resum
                    });
                }
                const pageData = {
                    title: pdfResult.title || file.name,
                    text: pdfResult.text,
                    url: tabUrl,
                    truncated: pdfResult.metadata?.truncated === true,
                };
                // Injecta el contingut al pipeline normal de resum.
                // summary.js comprovara si el URL comenca per "pdf-local:" i usara
                // el preload directament (sense necessitat que coincideixi amb la pestanya activa).
                contentPreload = Promise.resolve(pageData);
                setPdfReading(false);
                doSummary(null, false, false, true);
            } catch (err) {
                setPdfReading(false);
                console.error("[PDF picker] error:", err);
                const codeMap = {
                    PASSWORD: "[PDF-010] PDF protegit amb contrasenya. No es pot resumir.",
                    INVALID: "[PDF-011] El fitxer no és un PDF vàlid o està corromput.",
                    SCANNED: "[PDF-012] PDF escanejat sense capa de text. OCR no suportat encara.",
                    TOO_LARGE: "[PDF-013] PDF massa gran.",
                    TIMEOUT: "[PDF-014] S'ha esgotat el temps en extreure el PDF.",
                };
                const msg = codeMap[err?.code] || `[PDF-019] Error obrint PDF: ${err?.message || err}`;
                if (errorDiv) {
                    errorDiv.textContent = msg;
                    errorDiv.classList.remove("hidden");
                }
            }
        });
    }

    // Open links in content area in a new browser tab (extension sidebar context)
    contentDiv.addEventListener("click", (e) => {
        const anchor = e.target.closest("a[href]");
        if (anchor) {
            e.preventDefault();
            try {
                const parsed = new URL(anchor.href);
                if (["http:", "https:"].includes(parsed.protocol)) ext.tabs.create({ url: anchor.href });
            } catch { /* invalid URL — ignore */ }
        }
    });

    copyBtn.addEventListener("click", async () => {
        if (!currentMetadata.summary) return;
        try {
            const template = globalConfigCache.markdownTemplate || DEFAULT_MARKDOWN_TEMPLATE;
            const markdown = formatMarkdownContent(template, currentMetadata);
            await navigator.clipboard.writeText(markdown);
            
            const originalChild = copyBtn.firstElementChild.cloneNode(true);
            copyBtn.replaceChildren(getIcon(CHECK_ICON_STR));
            setTimeout(() => { copyBtn.replaceChildren(originalChild); }, 1500);
        } catch (err) {
            console.error("Error copiant:", err);
            errorDiv.textContent = "Error copiant al porta-retalls.";
            errorDiv.classList.remove("hidden");
        }
    });

    obsidianBtn.addEventListener("click", async () => {
        if (!currentMetadata.summary) return;
        try {
            const vault = globalConfigCache.obsidianVault || "Obsidian";
            const pathTemplate = globalConfigCache.obsidianPath || DEFAULT_OBSIDIAN_PATH;
            const contentTemplate = globalConfigCache.obsidianTemplate || "- [{{title}}]({{url}})\n\t- {{summary_executive}}";

            const filePath = parseObsidianPath(pathTemplate);
            const content = formatObsidianContent(contentTemplate, currentMetadata);
            const uri = `obsidian://new?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(filePath)}&content=${encodeURIComponent(content.trim())}&append=true`;

            try {
                const tab = await ext.tabs.create({ url: uri, active: false });
                setTimeout(() => ext.tabs.remove(tab.id).catch(() => {}), 5000);
                // Feedback d'èxit (✓) NOMÉS si la pestanya s'ha obert bé. Abans es
                // mostrava sempre, també quan el protocol fallava (✓ enganyós).
                const originalChild = obsidianBtn.firstElementChild.cloneNode(true);
                obsidianBtn.replaceChildren(getIcon(CHECK_ICON_STR));
                setTimeout(() => obsidianBtn.replaceChildren(originalChild), 1500);
            } catch (err) {
                console.error("Obsidian protocol failed:", err);
                errorDiv.textContent = "Error obrint Obsidian: " + err.message;
                errorDiv.classList.remove("hidden");
            }

        } catch (e) {
            console.error("Error Obsidian:", e);
            errorDiv.textContent = "Error: " + e.message;
            errorDiv.classList.remove("hidden");
        }
    });

    function applyBionicToContent(config) {
        const cfg = config || globalConfigCache;
        // applyBionicStyles (summary.js) és l'únic punt que estila #content en
        // mode biònic — hi ancora la mida en px sobre --content-base-size.
        applyBionicStyles(contentDiv, true, cfg);
        const fixation = (cfg.bionicFixation || DEFAULT_BIONIC.fixation) / 100;
        if (currentMetadata.summary && isProseType(currentMetadata.type)) {
            contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, true, fixation));
        }
    }

    bionicBtn.addEventListener("click", async () => {
        isBionicEnabled = !isBionicEnabled;
        ext.storage.local.set({ isBionicActive: isBionicEnabled });
        if (isBionicEnabled) {
            bionicBtn.classList.add("active");
            bionicBtn.setAttribute("aria-pressed", "true");
            applyBionicToContent();
        } else {
            bionicBtn.classList.remove("active");
            bionicBtn.setAttribute("aria-pressed", "false");
            applyBionicStyles(contentDiv, false);
            if (currentMetadata.summary && isProseType(currentMetadata.type)) {
               contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, false));
            }
        }
    });

    // --- Prompt Update Notification ---
    const promptUpdateBanner = document.getElementById("prompt-update-notification");
    const promptUpdateText = document.getElementById("prompt-update-text");
    const promptUpdateLink = document.getElementById("prompt-update-link");
    const promptUpdateDismiss = document.getElementById("prompt-update-dismiss");

    // Flag d'avís de prompt → pestanya de configuració d'aquell prompt
    const PROMPT_UPDATE_TABS = {
        deepDivePromptUpdateAvailable: "deepdive",
        sciencePromptUpdateAvailable: "science",
        conceptMapPromptUpdateAvailable: "conceptmap",
        simplePromptUpdateAvailable: "simple",
    };

    let _currentUpdateKey = null;
    let _currentCallback = null;

    function showPromptUpdateBanner(type, updateKey, callback) {
        if (!promptUpdateBanner || !promptUpdateText || !promptUpdateLink) return;
        _currentUpdateKey = updateKey;
        _currentCallback = callback;
        // «de» s'apostrofa davant de vocal: «d'aprofundiment», «d'explicació»
        const preposition = /^[aeiouàèéíòóúh]/i.test(type) ? `d'${type}` : `de ${type}`;
        promptUpdateText.textContent = `Nova versió del prompt ${preposition} disponible. `;
        promptUpdateLink.onclick = (e) => {
            e.preventDefault();
            // NO esborrem el flag ni amaguem l'avís aquí: Configuració només
            // mostra el seu avís (mantenir o restaurar) si el flag és true, i
            // l'avís d'aquí és el que permet tornar i continuar (×).
            // Obre directament la pestanya del prompt afectat.
            openSettings({ tab: PROMPT_UPDATE_TABS[updateKey] });
        };
        promptUpdateBanner.classList.remove("hidden");
    }

    function dismissAndContinue() {
        if (!promptUpdateBanner) { if (_currentCallback) _currentCallback(); return; }
        promptUpdateBanner.classList.add("hidden");
        if (_currentUpdateKey) {
            ext.storage.sync.set({ [_currentUpdateKey]: false }).catch(() => {});
        }
        const cb = _currentCallback;
        _currentUpdateKey = null;
        _currentCallback = null;
        if (cb) cb();
    }

    function checkPromptUpdate(type, updateKey, callback) {
        if (!promptUpdateBanner) { callback(); return; }
        ext.storage.sync.get(updateKey).then(result => {
            if (result[updateKey]) {
                showPromptUpdateBanner(type, updateKey, callback);
            } else {
                callback();
            }
        }).catch(() => callback());
    }

    if (promptUpdateDismiss) {
        promptUpdateDismiss.addEventListener("click", dismissAndContinue);
    }

    deepDiveBtn.addEventListener("click", () => {
        checkPromptUpdate("aprofundiment", "deepDivePromptUpdateAvailable", () => {
            doSummary(null, true, false, true);
        });
    });

    scienceBtn.addEventListener("click", () => {
        checkPromptUpdate("validació científica", "sciencePromptUpdateAvailable", () => {
            doSummary(null, false, true, true);
        });
    });

    const conceptMapBtn = document.getElementById("conceptMapBtn");
    if (conceptMapBtn) {
        conceptMapBtn.addEventListener("click", () => {
            checkPromptUpdate("mapa conceptual", "conceptMapPromptUpdateAvailable", () => {
                doSummary(null, false, false, true, true);
            });
        });
    }

    if (explainSimpleBtn) {
        explainSimpleBtn.addEventListener("click", () => {
            checkPromptUpdate("explicació planera", "simplePromptUpdateAvailable", () => {
                doSummary(null, false, false, true, false, true);
            });
        });
    }

    // Listener del botó Anki — inicia la generació de targetes
    const ankiBtn = document.getElementById("ankiBtn");
    if (ankiBtn) {
        ankiBtn.addEventListener("click", () => {
            doSummary(null, false, false, true, false, false, true);
        });
    }

    if (historyBtn) historyBtn.addEventListener("click", () => {
        const historyPanel = document.getElementById("history-panel");
        if (historyPanel && !historyPanel.classList.contains("hidden")) {
            // Panel obert → tancar-lo
            closeHistoryPanel();
        } else {
            // Panel tancat → obrir-lo
            openHistoryPanel();
        }
    });
    if (sourceTextBtn) sourceTextBtn.addEventListener("click", () => {
        if (!currentSourceText) return;
        const sourcePanel = document.getElementById("source-panel");
        if (sourcePanel && !sourcePanel.classList.contains("hidden")) {
            // Panel obert → tancar-lo
            closeSourcePanel();
        } else {
            // Panel tancat → obrir-lo
            openSourcePanel(currentSourceText);
        }
    });
    const historyBackBtn = document.getElementById("historyBackBtn");
    if (historyBackBtn) historyBackBtn.addEventListener("click", openHistoryPanel);

    // Pestanyes per tipus: els resums desats d'aquesta pàgina, sota el títol.
    // La pestanya activa és la que es veu ara; clicar-ne una altra la carrega.
    let typeTabsTimer = null;
    function updateTypeTabs(url) {
        clearTimeout(typeTabsTimer);
        typeTabsTimer = setTimeout(async () => {
            const bar = document.getElementById("type-tabs");
            if (!bar) return;
            const types = (!url || url.startsWith("seleccio:")) ? [] : await getAvailableTypes(url);
            bar.replaceChildren();
            bar.classList.toggle("hidden", types.length === 0);
            if (types.length === 0) return;
            const active = currentMetadata.url === url && currentMetadata.summary ? currentMetadata.type : null;
            const shown = CONTENT_TYPES.filter(ct => types.includes(ct.id));
            const focusable = shown.some(ct => ct.id === active) ? active : shown[0].id;
            for (const ct of shown) {
                const tab = document.createElement("button");
                tab.type = "button";
                tab.className = "type-tab";
                tab.dataset.type = ct.id;
                tab.setAttribute("role", "tab");
                tab.setAttribute("aria-selected", String(ct.id === active));
                tab.tabIndex = ct.id === focusable ? 0 : -1;
                if (typeof typeIconSvg === "function") tab.appendChild(typeIconSvg(ct.id));
                tab.append(ct.label);
                tab.addEventListener("click", async () => {
                    const entry = await getSummaryCache(url, ct.id);
                    if (entry) await loadHistoryEntry(entry);
                    updateTypeTabs(url);
                });
                tab.addEventListener("keydown", (e) => {
                    const items = [...bar.querySelectorAll('[role="tab"]')];
                    const i = items.indexOf(tab);
                    const next = e.key === "ArrowRight" ? items[(i + 1) % items.length]
                        : e.key === "ArrowLeft" ? items[(i - 1 + items.length) % items.length] : null;
                    if (next) { e.preventDefault(); next.focus(); }
                });
                bar.appendChild(tab);
            }
        }, 150);
    }

    // Marques de temps d'un resum de vídeo: porten el vídeo d'aquesta pestanya a
    // l'instant (sense recarregar-lo); si la pestanya activa és una altra, obren el vídeo.
    contentDiv.addEventListener("click", async (e) => {
        const link = e.target.closest && e.target.closest("a[data-yt-time]");
        if (!link) return;
        e.preventDefault();
        try {
            const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
            const same = tab && youtubeVideoId(tab.url) && youtubeVideoId(tab.url) === youtubeVideoId(link.href);
            if (same) {
                await ext.scripting.executeScript({
                    target: { tabId: tab.id },
                    world: "MAIN",
                    func: (secs) => { const v = document.querySelector("video"); if (v) { v.currentTime = secs; v.play && v.play(); } },
                    args: [Number(link.dataset.ytTime)],
                });
            } else {
                await ext.tabs.create({ url: link.href });
            }
        } catch (err) {
            console.warn("[YouTube] seek failed:", err);
            ext.tabs.create({ url: link.href }).catch(() => {});
        }
    });

    // Refinadors ràpids: tornen a generar el mateix tipus amb una instrucció afegida.
    for (const [id, mode] of [["refine-shorter", "shorter"], ["refine-detailed", "detailed"]]) {
        const btn = document.getElementById(id);
        if (!btn) continue;
        btn.addEventListener("click", () => {
            const t = currentMetadata.type;
            doSummary(null, t === "deepdive", t === "science", true, false, t === "simple", false, mode);
        });
    }

    // 0.6: sense clau d'API els generadors són «no disponibles» (aria-disabled, no
    // disabled: altres camins n'activen/desactiven l'estat) i el clic porta al camp
    // de la clau de l'onboarding en lloc de fallar amb un error.
    const GENERATOR_BUTTONS = ["summarizeBtn", "deepDiveBtn", "scienceBtn", "conceptMapBtn", "explainSimpleBtn", "ankiBtn", "selectPdfBtn"];
    let keyGateActive = false;
    function applyKeyGate(noKey) {
        keyGateActive = noKey;
        for (const id of GENERATOR_BUTTONS) {
            const b = document.getElementById(id);
            if (!b) continue;
            if (!b.dataset.keyGateLabel) b.dataset.keyGateLabel = b.getAttribute("title") || "";
            if (noKey) {
                b.setAttribute("aria-disabled", "true");
                b.title = `${b.dataset.keyGateLabel} — falta la clau d'API`;
            } else {
                b.removeAttribute("aria-disabled");
                b.title = b.dataset.keyGateLabel;
            }
        }
    }
    document.querySelector(".toolbar").addEventListener("click", (e) => {
        const b = e.target.closest && e.target.closest("button");
        if (!keyGateActive || !b || !GENERATOR_BUTTONS.includes(b.id)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        const input = document.getElementById("apiKeyInput");
        if (input) input.focus();
    }, true);

    // El selector de model queda truncat al peu estret: el nom complet, a l'indicador.
    function syncModelTitle() {
        const o = modelSelect.selectedOptions && modelSelect.selectedOptions[0];
        modelSelect.title = o ? o.textContent : "";
    }
    modelSelect.addEventListener("change", syncModelTitle);
    if (typeof MutationObserver !== "undefined") {
        new MutationObserver(syncModelTitle).observe(modelSelect, { childList: true });
    }
    syncModelTitle();

    // 0.14: amb la còpia desada a la vista, tornar a clicar el mateix botó regenera.
    // Ho diu el títol del botó d'aquell tipus (la resta recuperen el seu).
    const TYPE_BUTTON = { summary: "summarizeBtn", deepdive: "deepDiveBtn", science: "scienceBtn",
        conceptmap: "conceptMapBtn", simple: "explainSimpleBtn", anki: "ankiBtn" };
    function updateRegenerateHints() {
        for (const [type, id] of Object.entries(TYPE_BUTTON)) {
            const b = document.getElementById(id);
            if (!b) continue;
            if (!b.dataset.defaultLabel) b.dataset.defaultLabel = b.getAttribute("title") || b.getAttribute("aria-label") || "";
            const regen = !!currentMetadata.summary && currentMetadata.fromCache && currentMetadata.type === type;
            const label = regen ? `Regenerar (ara es mostra la còpia desada) — ${b.dataset.defaultLabel}` : b.dataset.defaultLabel;
            b.title = label;
            b.setAttribute("aria-label", label);
        }
    }

    // La barra lateral és global per finestra: en canviar de pestanya el resum
    // visible pot ser d'una altra pàgina. Ho diem i oferim resumir l'actual.
    let lastActiveTab = null;
    function updateStaleBanner(tab) {
        if (tab) lastActiveTab = tab;
        const banner = document.getElementById("stale-banner");
        if (!banner) return;
        const shownUrl = (currentMetadata.url || "").replace(/^seleccio:/, "");
        const viewingHistory = !document.getElementById("history-back-bar")?.classList.contains("hidden");
        const stale = !!currentMetadata.summary && !viewingHistory && !shownUrl.startsWith("pdf-local:")
            && lastActiveTab && /^https?:/i.test(lastActiveTab.url || "") && lastActiveTab.url !== shownUrl;
        banner.classList.toggle("hidden", !stale);
        if (stale) {
            document.getElementById("stale-banner-text").textContent =
                `Aquest resum és de «${currentMetadata.title || shownUrl}».`;
        }
    }
    const staleBtn = document.getElementById("stale-banner-btn");
    if (staleBtn) staleBtn.addEventListener("click", () => {
        document.getElementById("stale-banner").classList.add("hidden");
        summarizeBtn.click();
    });

    // Estat en repòs: títol de la pestanya activa, botó de resumir i els resums
    // ja desats d'aquesta URL. La visibilitat real (només si el panell és buit)
    // la decideix el CSS; aquí només s'omple.
    async function updateIdleState(tab) {
        const idle = document.getElementById("idle-state");
        if (!idle) return;
        const url = tab && tab.url;
        if (!url || !/^https?:/i.test(url)) { idle.hidden = true; return; }
        document.getElementById("idle-title").textContent = tab.title || url;
        const savedBox = document.getElementById("idle-saved");
        savedBox.replaceChildren();
        let types = [];
        try { types = await getAvailableTypes(url); } catch {}
        if (types.length > 0) {
            const label = document.createElement("p");
            label.className = "idle-saved-label";
            label.textContent = "Ja tens aquí:";
            savedBox.appendChild(label);
            for (const ct of CONTENT_TYPES.filter(c => types.includes(c.id))) {
                const b = document.createElement("button");
                b.type = "button";
                b.className = "idle-saved-btn";
                b.textContent = ct.label;
                b.addEventListener("click", async () => {
                    const entry = await getSummaryCache(url, ct.id);
                    if (entry) loadHistoryEntry(entry);
                });
                savedBox.appendChild(b);
            }
        }
        idle.hidden = false;
    }
    const idleSummarize = document.getElementById("idle-summarize");
    if (idleSummarize) idleSummarize.addEventListener("click", () => summarizeBtn.click());

    ext.tabs.onActivated.addListener(async (activeInfo) => {
        try {
            const tab = await ext.tabs.get(activeInfo.tabId);
            updateTypeTabs(tab.url);
            updateIdleState(tab);
            updateStaleBanner(tab);
        } catch (e) {}
    });

    ext.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if ((changeInfo.url || changeInfo.title) && tab.active) {
            if (changeInfo.url) updateTypeTabs(tab.url);
            updateIdleState(tab);
            updateStaleBanner(tab);
        }
    });

    settingsBtn.addEventListener("click", () => {
        ext.runtime.openOptionsPage();
    });

    modelSelect.addEventListener("change", async (e) => {
        if (e.target.value === "__open_settings__") {
            // Revertir al model anterior i obrir configuració
            const saved = await ext.storage.sync.get({ modelName: DEFAULT_MODEL_ID });
            modelSelect.value = saved.modelName;
            openSettings({ tab: "general", focus: "checkModels" });
            return;
        }
        await ext.storage.sync.set({ modelName: e.target.value });
    });

    // --- Context Menu / Message Handling ---

    let lastTriggerTime = 0;
    
    const boundTrigger = (data) => {
        // Deduplicate triggers (prevent double summary if both message and storage events fire)
        const now = Date.now();
        if (now - lastTriggerTime < 500) return;
        lastTriggerTime = now;
        
        handleTrigger((text, dd, sc, ui) => doSummary(text, dd, sc, ui), data);
    };

    ext.runtime.onMessage.addListener((message, sender) => {
        if (sender.id !== ext.runtime.id) return;
        if (message.action === "trigger_summary") {
            boundTrigger(message.data);
        }
    });

    // Check for pending summary on load (context menu while sidebar was closed)
    ext.storage.local.get("pendingSummary").then(data => {
        if (data.pendingSummary) {
            ext.storage.local.remove("pendingSummary");
            boundTrigger(data.pendingSummary);
        }
    });

    function _handlePendingCacheLoad(value) {
        ext.storage.local.remove("pendingCacheLoad");
        let url = value;
        let type = "summary";
        if (typeof value === "string" && value.startsWith("{")) {
            try {
                const parsed = JSON.parse(value);
                if (parsed.url) { url = parsed.url; type = parsed.type || "summary"; }
            } catch {}
        }
        getSummaryCache(url, type).then(entry => {
            if (entry) loadHistoryEntry(entry);
        });
    }

    // Check for pending cache load on init (settings page wrote key while sidebar was closed)
    ext.storage.local.get("pendingCacheLoad").then(data => {
        if (data.pendingCacheLoad) {
            _handlePendingCacheLoad(data.pendingCacheLoad);
        }
    });

    // Watch for pendingSummary and pendingCacheLoad (reliable fallback for Chrome sidePanel timing)
    ext.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.pendingSummary && changes.pendingSummary.newValue) {
            ext.storage.local.remove("pendingSummary");
            boundTrigger(changes.pendingSummary.newValue);
        }
        if (area === "local" && changes.pendingCacheLoad?.newValue) {
            _handlePendingCacheLoad(changes.pendingCacheLoad.newValue);
        }
    });

    window.addEventListener('beforeunload', () => {
        if (abortController) abortController.abort();
        stopGenerationTimer();
    });

    // --- On Load Init ---
    (async () => {
        // 1. Migració de clau API: copy sync→local (només si cal)
        try {
            const local = await ext.storage.local.get(["apiKey", "apiKeyMigrated"]);
            if (!local.apiKeyMigrated) {
                const sync = await ext.storage.sync.get(["apiKey"]);
                if (sync.apiKey && !local.apiKey) {
                    await ext.storage.local.set({ apiKey: sync.apiKey, apiKeyMigrated: true });
                    // Esborrem de sync només si l'hem copiada (no si ja era a local)
                    await ext.storage.sync.remove("apiKey");
                } else {
                    // No hi ha clau per migrar o ja és a local — marquem com a fet
                    await ext.storage.local.set({ apiKeyMigrated: true });
                }
            }
        } catch (e) {
            console.warn("API key migration failed:", e);
        }

        // 2. Migració de prompts (versionat PER-PROMPT). La lògica és una funció
        //    pura a shared/defaults.js (computePromptMigration), testejada a
        //    tests/prompt-migration.test.mjs: només avisa els prompts que han
        //    canviat de versió I que l'usuari ha personalitzat.
        try {
            const promptDefs = [
                // Resum i Anki: només s'hi adopta el default nou en silenci (no tenen avís propi);
                // si l'usuari els ha editat, es respecten tal qual.
                { key: "systemPrompt", defaultVal: DEFAULT_SYSTEM_PROMPT, customizedKey: "systemPromptCustomized", updateKey: "systemPromptUpdateAvailable" },
                { key: "ankiPrompt", defaultVal: DEFAULT_ANKI_PROMPT, customizedKey: "ankiPromptCustomized", updateKey: "ankiPromptUpdateAvailable" },
                { key: "sciencePrompt", defaultVal: DEFAULT_SCIENCE_PROMPT, customizedKey: "sciencePromptCustomized", updateKey: "sciencePromptUpdateAvailable" },
                { key: "deepDivePrompt", defaultVal: DEFAULT_DEEP_DIVE_PROMPT, customizedKey: "deepDivePromptCustomized", updateKey: "deepDivePromptUpdateAvailable" },
                { key: "conceptMapPrompt", defaultVal: DEFAULT_CONCEPTMAP_PROMPT, customizedKey: "conceptMapPromptCustomized", updateKey: "conceptMapPromptUpdateAvailable" },
                { key: "simplePrompt", defaultVal: DEFAULT_SIMPLE_PROMPT, customizedKey: "simplePromptCustomized", updateKey: "simplePromptUpdateAvailable" },
            ];
            const promptKeys = [
                ...promptDefs.map(d => d.key),
                ...promptDefs.map(d => d.customizedKey),
                ...promptDefs.map(d => d.updateKey),
                "promptVersions", "promptDefaultsVersion",
            ];
            const promptConfig = await ext.storage.sync.get(promptKeys);
            const { toSet, toRemove } = computePromptMigration(promptConfig, promptDefs, PROMPT_VERSIONS);

            if (toRemove.length) await ext.storage.sync.remove(toRemove);
            if (Object.keys(toSet).length) await ext.storage.sync.set(toSet);
        } catch (e) {
            console.warn("Prompt migration failed:", e);
        }

        // Purgar caché expirada en segon pla (no bloquejant)
        purgeStaleCacheEntries().catch(err => { console.warn("Purge cache failed:", err); });
        // Inicialitzar badge de caché per a la URL del tab actiu
        ext.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            if (tabs[0]?.url) updateTypeTabs(tabs[0].url);
            lastActiveTab = tabs[0] || null;
            updateIdleState(tabs[0]);
        }).catch(() => {});
        try {
            const [syncData, localData] = await Promise.all([
                ext.storage.sync.get(["modelName"]),
                ext.storage.local.get(["apiKey", "blockedUntil", "isBionicActive"])
            ]);

            const apiKey = localData.apiKey;
            let modelName = syncData.modelName || DEFAULT_MODEL_ID;
            
            // Assegurar que el modelName es guarda si era per defecte (per a futures carregues)
            if (!syncData.modelName) {
                await ext.storage.sync.set({ modelName: DEFAULT_MODEL_ID });
            }
            
            if (localData.isBionicActive === true) {
                isBionicEnabled = true;
                if (bionicBtn) {
                    bionicBtn.classList.add("active");
                    bionicBtn.setAttribute("aria-pressed", "true");
                }
            }
            
            // Show footer immediately (model select always visible)
            const footer = document.getElementById("footer-status");
            if (footer) footer.classList.remove("hidden");
            
            contentPreload = Promise.race([
                getPageContent(),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Preload timeout")), 2000))
            ]).catch(() => null);

            // Neteja de la clau heretada `blockedUntil` (feature de bloqueig
            // temporal per quota, abandonada a favor del fallback de models).
            if (localData.blockedUntil) await ext.storage.local.remove("blockedUntil");

            applyKeyGate(!apiKey);

            if (apiKey) {
                await loadModels(apiKey, modelName);
                await ext.storage.local.remove("currentSession");
            } else {
                renderApiKeyWarning(contentDiv);
            }

        } catch (e) {
            console.error("Error initializing sidebar:", e);
        }
    })();
});
