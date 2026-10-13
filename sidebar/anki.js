/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. */

// sidebar/anki.js
// Plugin Anki: genera targetes Q&A, les mostra en un panell interactiu i les
// exporta a Obsidian amb la sintaxi de obsidian_to_anki.

// Llindar (caràcters combinats q+a) per triar inline vs bloc multi-línia.
const ANKI_INLINE_MAX_LEN = 100;

/**
 * Parseja el text del model i n'extreu les targetes. Defensiu: localitza el
 * primer array JSON encara que el model afegeixi prosa o fences markdown.
 * @returns {Array<{q:string,a:string}>} buit si no parseja.
 */
function parseAnkiCards(rawText) {
    if (!rawText || typeof rawText !== "string") return [];
    const start = rawText.indexOf("[");
    const end = rawText.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) return [];
    let parsed;
    try {
        parsed = JSON.parse(rawText.slice(start, end + 1));
    } catch {
        return [];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed
        .filter(c => c && typeof c.q === "string" && typeof c.a === "string"
            && c.q.trim().length > 0 && c.a.trim().length > 0)
        .map(c => ({ q: c.q.trim(), a: c.a.trim() }));
}

/**
 * Formata una targeta a la sintaxi obsidian_to_anki, triant inline o
 * multi-línia segons la longitud i si hi ha salts de línia.
 */
function formatCardForAnki(card) {
    const q = (card.q || "").trim();
    const a = (card.a || "").trim();
    const hasNewline = q.includes("\n") || a.includes("\n");
    const isShort = (q.length + a.length) < ANKI_INLINE_MAX_LEN;
    if (isShort && !hasNewline) {
        return `STARTI [Basic] ${q} Back: ${a} ENDI`;
    }
    return `START\nBasic\n${q}\nBack: \n${a}\nEND`;
}

/**
 * Construeix el text complet a afegir a Obsidian: un bloc per targeta,
 * separats per una línia en blanc.
 */
function buildAnkiExport(cards) {
    return (cards || [])
        .filter(c => c && c.q && c.a)
        .map(formatCardForAnki)
        .join("\n\n");
}

// ── Estat de mòdul ──────────────────────────────────────────────────────────
let ankiState = []; // [{ q, a, selected, exported, editing }]
// Text escrit a la caixa d'«Afinar»: el panell es recrea a cada acció i no s'ha de perdre.
let ankiFocusDraft = "";

function setAnkiCards(cards) {
    ankiState = (cards || []).map(c => ({
        q: c.q, a: c.a,
        selected: c.selected !== undefined ? c.selected : false,
        exported: c.exported === true,
    }));
    return ankiState;
}
function getAnkiCards() { return ankiState; }
function getSelectedAnkiCards() {
    return ankiState.filter(c => c.selected && c.q.trim() && c.a.trim())
        .map(c => ({ q: c.q, a: c.a }));
}
// «Seleccionar-ho tot» NO torna a marcar les targetes ja enviades (duplicarien notes a Obsidian);
// l'usuari les pot marcar a mà si de debò vol reenviar-les.
function setAllAnkiSelected(value) {
    ankiState.forEach(c => { c.selected = value ? !c.exported : false; });
    return ankiState;
}
/** Després d'enviar: les seleccionades passen a «enviades» i es desmarquen. */
function markSelectedAnkiExported() {
    ankiState.forEach(c => { if (c.selected) { c.exported = true; c.selected = false; } });
}
function appendAnkiCards(cards) {
    const existing = new Set(ankiState.map(c => c.q.trim().toLowerCase()));
    for (const c of cards || []) {
        const key = (c.q || "").trim().toLowerCase();
        if (!key || existing.has(key)) continue;
        existing.add(key);
        ankiState.push({ q: c.q, a: c.a, selected: false, exported: false });
    }
    return ankiState;
}

// ── Panell interactiu ───────────────────────────────────────────────────────
// ctx: { contentDiv, errorDiv, getGlobalConfig, onGenerateMore(focusText) }
function renderAnkiPanel(ctx) {
    const { contentDiv } = ctx;
    // El panell es recrea sencer a cada acció: recordem quin control tenia el focus per
    // retornar-l'hi (si no, el focus cau a <body> i l'usuari de teclat es perd).
    const prev = (typeof document !== "undefined") ? document.activeElement : null;
    let focusKey = null;
    if (prev && prev !== document.body && contentDiv.contains(prev)) {
        const cardEl = prev.closest ? prev.closest(".anki-card") : null;
        const cardIdx = cardEl ? [...contentDiv.querySelectorAll(".anki-card")].indexOf(cardEl) : -1;
        focusKey = { cardIdx, cls: (prev.className || "").toString().split(/\s+/)[0], id: prev.id };
    }
    contentDiv.replaceChildren();
    contentDiv.classList.remove("hidden");

    const panel = document.createElement("div");
    panel.className = "anki-panel";

    ankiState.forEach((card) => {
        const item = document.createElement("div");
        item.className = "anki-card";

        // Selecció (cantonada). Desmarcada per defecte.
        const sel = document.createElement("input");
        sel.type = "checkbox";
        sel.className = "anki-select";
        sel.checked = card.selected;
        sel.title = "Incloure a l'exportació";
        // Totes les caselles es deien igual: el nom ha d'identificar la targeta.
        const labelSel = () => sel.setAttribute("aria-label", `Incloure a l'exportació: ${card.q}`);
        labelSel();
        sel.addEventListener("change", () => {
            card.selected = sel.checked;
            updateExportCount();
            updateSelectAllBtn();
        });

        // Cos: lectura (Q dalt / divisòria / A sota) o edició (textarees).
        const body = document.createElement("div");
        body.className = "anki-card-body";

        const editBtn = document.createElement("button");
        editBtn.className = "anki-edit";

        let editing = card.editing === true;
        function renderBody() {
            body.replaceChildren();
            if (editing) {
                const qField = document.createElement("textarea");
                qField.className = "anki-q";
                qField.value = card.q;
                qField.setAttribute("aria-label", "Pregunta");
                qField.addEventListener("input", () => { card.q = qField.value; labelSel(); });
                const aField = document.createElement("textarea");
                aField.className = "anki-a";
                aField.value = card.a;
                aField.setAttribute("aria-label", "Resposta");
                aField.addEventListener("input", () => { card.a = aField.value; });
                body.append(qField, aField);
                editBtn.textContent = "Fet";
                editBtn.setAttribute("aria-label", `Acabar d'editar la targeta: ${card.q}`);
            } else {
                const qView = document.createElement("div");
                qView.className = "anki-q-view";
                qView.textContent = card.q;
                const divider = document.createElement("hr");
                divider.className = "anki-divider";
                const aView = document.createElement("div");
                aView.className = "anki-a-view";
                aView.textContent = card.a;
                body.append(qView, divider, aView);
                editBtn.textContent = "Editar";
                editBtn.setAttribute("aria-label", `Editar la targeta: ${card.q}`);
            }
        }
        editBtn.addEventListener("click", () => { editing = !editing; card.editing = editing; renderBody(); });
        renderBody();

        // Footer estil barra d'Anki: Edita (esquerra) / Descarta (dreta).
        const footer = document.createElement("div");
        footer.className = "anki-card-footer";
        const discard = document.createElement("button");
        discard.className = "anki-discard";
        discard.textContent = "Descartar";
        discard.setAttribute("aria-label", `Descartar la targeta: ${card.q}`);
        discard.addEventListener("click", () => {
            const idx = ankiState.indexOf(card);
            if (idx !== -1) ankiState.splice(idx, 1);
            renderAnkiPanel(ctx);
        });
        footer.append(editBtn, discard);

        if (card.exported) {
            item.classList.add("anki-card-sent");
            const sent = document.createElement("span");
            sent.className = "anki-sent-badge";
            sent.textContent = "✓ Enviada";
            sent.title = "Ja s'ha enviat a Obsidian; si la marques, es tornarà a enviar";
            footer.prepend(sent);
        }
        item.append(sel, body, footer);
        panel.appendChild(item);
    });

    // ── Controls globals ──
    const controls = document.createElement("div");
    controls.className = "anki-controls";

    function isAllSelected() { return ankiState.length > 0 && ankiState.every(c => c.selected); }

    // Fila 1: botons d'acció.
    const btnRow = document.createElement("div");
    btnRow.className = "anki-btn-row";

    const moreBtn = document.createElement("button");
    moreBtn.textContent = "Generar més";
    moreBtn.addEventListener("click", () => ctx.onGenerateMore(""));

    const discardAllBtn = document.createElement("button");
    discardAllBtn.className = "anki-discard-all";
    discardAllBtn.textContent = "Descartar-ho tot";
    discardAllBtn.disabled = ankiState.length === 0;
    discardAllBtn.addEventListener("click", () => {
        if (ankiState.length === 0) return;
        if (confirm("Segur que vols descartar totes les targetes?")) {
            setAnkiCards([]);
            renderAnkiPanel(ctx);
        }
    });

    const selectAllBtn = document.createElement("button");
    selectAllBtn.className = "anki-select-all";
    selectAllBtn.addEventListener("click", () => {
        setAllAnkiSelected(!isAllSelected());
        renderAnkiPanel(ctx);
    });

    const exportBtn = document.createElement("button");
    exportBtn.id = "ankiExportBtn";
    exportBtn.addEventListener("click", () => exportAnkiToObsidian(ctx));

    // Sense text original (targetes obertes des de l'Historial) no es pot generar més ni afinar:
    // els controls no s'ofereixen en lloc de fallar en prémer-los.
    const canGenerateMore = ctx.canGenerateMore !== false;
    if (canGenerateMore) btnRow.append(moreBtn);
    btnRow.append(discardAllBtn, selectAllBtn, exportBtn);

    // Declaracions de funció (hoisted): usades pels handlers de selecció de dalt.
    function updateExportCount() {
        exportBtn.textContent = `Afegir a Obsidian (${getSelectedAnkiCards().length})`;
        exportBtn.disabled = getSelectedAnkiCards().length === 0;
    }
    function updateSelectAllBtn() {
        selectAllBtn.textContent = isAllSelected() ? "Desseleccionar-ho tot" : "Seleccionar-ho tot";
        selectAllBtn.disabled = ankiState.length === 0;
    }
    updateExportCount();
    updateSelectAllBtn();

    // Els botons (Generar/Descarta/Selecciona/Afegir) van en flux normal.
    controls.append(btnRow);

    // ── Barra d'Afinar: FIXA al fons, just sobre la barra inferior (footer-status) ──
    // Conté el feedback de generació (avís + puntets) i la caixa+botó d'afinar.
    const afinaBar = document.createElement("div");
    afinaBar.className = "anki-afina-bar";

    // Avís informatiu (no d'error): p.ex. quan no es poden generar més targetes.
    const notice = document.createElement("div");
    notice.id = "ankiNotice";
    notice.className = "anki-notice hidden";
    // Regió d'estat: els avisos (p. ex. «no hi ha més punts nous») s'anuncien.
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");

    // Indicador "treballant": puntets animats sempre visibles (barra fixa).
    const loading = document.createElement("div");
    loading.id = "ankiLoading";
    loading.className = "anki-loading hidden";
    loading.setAttribute("aria-hidden", "true"); // decoratiu; l'estat el diu announceStatus
    for (let k = 0; k < 3; k++) {
        const dot = document.createElement("span");
        dot.className = "loading-dot";
        dot.textContent = ".";
        loading.appendChild(dot);
    }

    const afinaRow = document.createElement("div");
    afinaRow.className = "anki-afina-row";
    const focusInput = document.createElement("input");
    focusInput.type = "text";
    focusInput.className = "anki-afina-input";
    focusInput.placeholder = "Afinar (p.ex. dates i xifres)…";
    focusInput.setAttribute("aria-label", "Afinar la generació de targetes");
    focusInput.value = ankiFocusDraft;
    focusInput.addEventListener("input", () => { ankiFocusDraft = focusInput.value; });
    const focusBtn = document.createElement("button");
    focusBtn.textContent = "Afinar";
    focusBtn.addEventListener("click", () => ctx.onGenerateMore(focusInput.value.trim()));
    afinaRow.append(focusInput, focusBtn);

    // Ordre: avís i puntets a dalt; la caixa d'afinar a baix (arran del footer).
    afinaBar.append(notice, loading, afinaRow);

    panel.appendChild(controls);
    if (canGenerateMore) panel.appendChild(afinaBar);
    contentDiv.appendChild(panel);

    if (focusKey) {
        let target = null;
        if (focusKey.id) target = document.getElementById(focusKey.id);
        else if (focusKey.cardIdx >= 0) {
            const cards = contentDiv.querySelectorAll(".anki-card");
            const cardEl = cards[Math.min(focusKey.cardIdx, cards.length - 1)];
            target = cardEl && (cardEl.querySelector("." + focusKey.cls) || cardEl.querySelector("button, input, textarea"));
        } else if (focusKey.cls) target = contentDiv.querySelector("." + focusKey.cls);
        if (target && typeof target.focus === "function") target.focus();
    }
}

/**
 * Mostra un avís INFORMATIU al panell Anki (estil neutre, no d'error vermell).
 * Buit/null amaga l'avís.
 */
function showAnkiNotice(msg) {
    if (typeof document === "undefined") return;
    const n = document.getElementById("ankiNotice");
    if (!n) return;
    if (msg) {
        n.textContent = msg;
        n.classList.remove("hidden");
    } else {
        n.textContent = "";
        n.classList.add("hidden");
    }
}

// ── Exportació a Obsidian ───────────────────────────────────────────────────
async function exportAnkiToObsidian(ctx) {
    const config = ctx.getGlobalConfig() || {};
    const selected = getSelectedAnkiCards();
    if (selected.length === 0) return;

    // Vault independent del plugin d'Obsidian; si Anki no en té, cau al d'Obsidian.
    const vault = config.ankiVault || config.obsidianVault || "Obsidian";
    const pathTemplate = config.ankiPath || DEFAULT_ANKI_PATH;
    if (!config.ankiVault && !config.obsidianVault) {
        if (confirm("El vault d'Obsidian no està configurat. Vols obrir la configuració?")) {
            openSettings({ tab: "anki", focus: "ankiVault" });
        }
        return;
    }
    const filePath = parseObsidianPath(pathTemplate);
    const content = buildAnkiExport(selected);
    const uri = `obsidian://new?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(filePath)}&content=${encodeURIComponent(content)}&append=true`;
    try {
        const tab = await ext.tabs.create({ url: uri, active: false });
        setTimeout(() => ext.tabs.remove(tab.id).catch(() => {}), 5000);
        // Feedback d'èxit: mostra ✓ al botó d'exportació i restaura el text original
        // Les enviades es marquen (i es desmarquen) perquè un segon clic no dupliqui notes
        markSelectedAnkiExported();
        renderAnkiPanel(ctx);
        const exportBtn = document.getElementById("ankiExportBtn");
        if (exportBtn) {
            exportBtn.textContent = "✓ Enviat a Obsidian";
            exportBtn.disabled = true;
            setTimeout(() => {
                const btn = document.getElementById("ankiExportBtn");
                if (btn) { btn.textContent = `Afegir a Obsidian (${getSelectedAnkiCards().length})`; btn.disabled = getSelectedAnkiCards().length === 0; }
            }, 2000);
        }
    } catch (err) {
        if (ctx.errorDiv) {
            ctx.errorDiv.textContent = "Error obrint Obsidian: " + err.message;
            ctx.errorDiv.classList.remove("hidden");
        }
    }
}

/**
 * Construeix el prompt de regeneració substituint {{LANG}} i {{COUNT}}, afegint
 * les preguntes a excloure i l'enfocament optatiu.
 * Funció pura i testejable (sense efectes secundaris).
 * @param {string} basePrompt - Prompt base (pot contenir {{LANG}} i {{COUNT}})
 * @param {string} lang - Codi d'idioma ("en" → "English", qualsevol altre → "català")
 * @param {number} count - Nombre de targetes a generar
 * @param {string[]} existingQuestions - Preguntes ja generades a excloure
 * @param {string} focusText - Text d'afinament optatiu
 * @returns {string}
 */
function buildAnkiRegenPrompt(basePrompt, lang, count, existingQuestions, focusText) {
    const langName = lang === "en" ? "English" : "català";
    let p = basePrompt
        .replace(/\{\{LANG\}\}/g, langName)
        .replace(/\{\{COUNT\}\}/g, String(count));
    if (existingQuestions && existingQuestions.length) {
        p += `\n\nNo repeteixis aquestes preguntes ja generades:\n- ${existingQuestions.join("\n- ")}`;
        if (!focusText) {
            // "Generar més" sense focus: el prompt base demana només "punts clau" i el
            // model s'esgota de seguida. L'empenyem a anar més enllà cap a detalls
            // secundaris perquè pugui seguir generant targetes noves i útils.
            p += `\n\nJa s'han generat targetes dels punts principals. Genera'n de NOVES centrant-te en detalls secundaris, exemples, dates, xifres, definicions, causes, conseqüències o matisos del contingut que encara no s'hagin cobert. No reformulis les ja generades.`;
        }
    }
    if (focusText) {
        p += `\n\nCentra les noves targetes en: ${focusText}`;
    }
    return p;
}

/**
 * Genera targetes addicionals a partir del text original de la pàgina.
 * Llegeix la configuració directament de storage (no usa getGlobalConfig).
 * @param {Object} ctx - Context del panell (contentDiv, errorDiv, getGlobalConfig)
 * @param {string} focusText - Text d'afinament optatiu
 */
// Guard de re-entrada: renderAnkiPanel recrea moreBtn/focusBtn a cada render
// (p.ex. si l'usuari marca una targeta mentre s'està generant), així que
// deshabilitar-los sols no aguantaria un doble clic — cal un flag de mòdul
// que persisteixi independentment de qualsevol re-render del DOM.
let ankiGenerateInFlight = false;

async function generateMoreAnkiCards(ctx, focusText) {
    if (ankiGenerateInFlight) return;
    ankiGenerateInFlight = true;
    try {
        // Obtenim el text original de la pàgina (injectat per la pipeline, Task 5)
        const rawPageText = (typeof window !== "undefined" && window.__ankiPageText) || "";
        if (!rawPageText) return;

        // Indicador "treballant": puntets animats als controls (visibles on clica l'usuari).
        const loadingDiv = (typeof document !== "undefined") ? document.getElementById("ankiLoading") : null;
        if (loadingDiv) loadingDiv.classList.remove("hidden");
        showAnkiNotice(null); // neteja avisos previs en començar
        if (ctx.errorDiv) ctx.errorDiv.classList.add("hidden");
        try {
            // Clau d'API (storage.local) i configuració del model (storage.sync)
            const { apiKey } = await ext.storage.local.get(["apiKey"]);
            const cfg = await ext.storage.sync.get(["modelName", "ankiPrompt", "ankiLang", "ankiPacket"]);
            const modelName = cfg.modelName || DEFAULT_MODEL_ID;
            const base = cfg.ankiPrompt || DEFAULT_ANKI_PROMPT;
            const lang = cfg.ankiLang || DEFAULT_ANKI_LANG;
            const count = cfg.ankiPacket || DEFAULT_ANKI_PACKET;

            // Amb un focus (Afinar) NO excloem les existents: volem que el model pugui
            // aprofundir o reformular sobre el tema. Sense focus ("Generar més") sí que
            // les excloem per evitar duplicats.
            const existing = focusText ? [] : getAnkiCards().map(c => c.q);
            const prompt = buildAnkiRegenPrompt(base, lang, count, existing, focusText);

            // Apliquem la mateixa neutralització + embolcall UNTRUSTED que la pipeline principal
            // (mirrors sidebar/summary.js:267-268) per mantenir la frontera anti-injecció de prompts.
            const safePageText = rawPageText.replace(/<\s*\/?\s*UNTRUSTED[_\s-]*CONTENT\s*>/gi, "[FILTERED]");
            const pageText = `<UNTRUSTED_CONTENT>\n${safePageText}\n</UNTRUSTED_CONTENT>`;

            // AbortController real (abans es passava `undefined`): sense
            // signal, aquesta petició no tenia manera de cancel·lar-se ni
            // compartia el guard de timeout combinat de sidebar/api.js de
            // forma explícita per part del cridant.
            const abortController = new AbortController();

            // Acumulem la resposta en streaming
            let raw = "";
            try {
                await callGeminiStream(apiKey, modelName, prompt, pageText, abortController.signal,
                    (chunk) => { raw += chunk; }, () => {});
            } catch (e) {
                if (ctx.errorDiv) {
                    ctx.errorDiv.textContent = "Error generant més targetes: " + e.message;
                    ctx.errorDiv.classList.remove("hidden");
                }
                return;
            }

            // Parsejem i afegim les targetes noves
            const NO_MORE_MSG = "No hi ha més punts nous per generar d'aquest contingut. Prova «Afinar» per centrar-te en un aspecte concret.";
            const newCards = parseAnkiCards(raw);
            if (newCards.length === 0) {
                showAnkiNotice(NO_MORE_MSG);
                return;
            }
            const before = getAnkiCards().length;
            appendAnkiCards(newCards);
            const added = getAnkiCards().length - before;
            if (added === 0) {
                showAnkiNotice(NO_MORE_MSG);
                return;
            }
            renderAnkiPanel(ctx);
        } finally {
            if (loadingDiv) loadingDiv.classList.add("hidden");
        }
    } finally {
        ankiGenerateInFlight = false;
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        parseAnkiCards, formatCardForAnki, buildAnkiExport, ANKI_INLINE_MAX_LEN,
        setAnkiCards, getAnkiCards, getSelectedAnkiCards, setAllAnkiSelected, appendAnkiCards,
        renderAnkiPanel, exportAnkiToObsidian, markSelectedAnkiExported,
        buildAnkiRegenPrompt, generateMoreAnkiCards,
    };
}
