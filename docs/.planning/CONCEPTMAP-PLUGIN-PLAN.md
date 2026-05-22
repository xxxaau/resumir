# Pla: Plugin de Mapes Conceptuals Desplegables

> **Objectiu:** Afegir un nou mode de resum que generi mapes conceptuals interactius amb nodes desplegables/replegables, similar a NotebookLM.
>
> **Dificultat estimada:** Mitjana (3/5)
> **Dependències externes:** Cap (pure HTML/CSS/JS amb `<details>/<summary>`)
> **Temps estimat:** 2-3 sessions d'agent

---

## Context

L'extensió actual té 3 modes de resum (resum, deep dive, science) gestionats amb booleans a `startSummary()`. No hi ha sistema formal de plugins, però el patró és consistent i fàcil d'estendre. El renderitzat passa per un únic punt: `formatTextToFragment()` a `sidebar/ui.js:252-365`.

El mapa conceptual s'implementa amb HTML natiu (`<details>/<summary>` + `<ul>`) perquè:
- 0KB de dependències afegides
- Funciona perfectament en sidebar estret (~300-400px)
- Accessibilitat nativa (teclat + screen reader)
- Rendiment instantani amb transicions CSS

---

## Fases d'execució

### Fase 1 — Prompt del mapa conceptual

**Fitxer:** `shared/defaults.js`

**Tasca:** Crear `DEFAULT_CONCEPTMAP_PROMPT` que instrueixi Gemini a generar una estructura jeràrquica en format Markdown indentat (llistes niuades).

**Requisits del prompt:**
- Demanar un tema central amb 3-6 branques principals
- Cada branca pot tenir 2-4 sub-branques (màxim 4 nivells de profunditat)
- Format de sortida: llistes Markdown indentades amb `- `
- Cada node ha de ser concís (3-8 paraules)
- Opcional: afegir una línia descriptiva curta sota cada node (precedida per `: `)
- Incloure la defensa contra prompt injection amb `<UNTRUSTED_CONTENT>`
- Idioma: respondre en l'idioma del contingut (com fan els altres prompts)

**Exemple de sortida esperada del model:**
```markdown
- Intel·ligència Artificial
  - Aprenentatge Automàtic
    - Supervisat: models entrenats amb dades etiquetades
    - No supervisat: clustering i reducció de dimensionalitat
    - Per reforç: aprenentatge per recompensa
  - Processament del Llenguatge Natural
    - Transformers: arquitectura d'atenció
    - LLMs: models de gran escala
  - Visió per Computador
    - Detecció d'objectes
    - Segmentació d'imatges
```

**Verificació:** El prompt genera sortida parsejable quan es prova manualment amb l'API.

---

### Fase 2 — Parser i renderitzador de l'arbre

**Fitxer NOU:** `sidebar/conceptmap.js`

**Funcions a implementar:**

1. `parseConceptTree(text)` → `DocumentFragment`
   - Input: text Markdown indentat (llistes niuades amb `- `)
   - Detectar nivell d'indentació (2 o 4 espais per nivell)
   - Per cada node amb fills: generar `<details><summary>NODE</summary><ul>...</ul></details>`
   - Per cada node fulla: generar `<li>NODE</li>`
   - Si el node té descripció (`: text`), afegir-la com a `<span class="concept-desc">text</span>`
   - El primer nivell (arrel) ha d'estar obert per defecte (`<details open>`)
   - Retornar `DocumentFragment` (seguint el patró de `formatTextToFragment`)

2. `collapseAll(container)` — replega tots els `<details>` excepte l'arrel
3. `expandAll(container)` — desplega tots els `<details>`

**Consideracions:**
- NO usar `innerHTML` — construir DOM amb `createElement` (com fa `formatTextToFragment`)
- Gestionar graciosament text que no segueix el format esperat (fallback a `formatTextToFragment`)
- Parsing línia per línia per permetre extensió futura a streaming parcial

**Verificació:** Tests unitaris amb exemples de Markdown indentat → DOM correcte.

---

### Fase 3 — Integració al pipeline

**Fitxers a modificar:**

| Fitxer | Canvi |
|--------|-------|
| `sidebar/sidebar.html` | Afegir `<button id="conceptMapBtn">` al toolbar + `<script src="conceptmap.js">` |
| `sidebar/ui.js:73-80` | Afegir `conceptmap → conceptMapBtn` a `extensionIdToButtonId` |
| `sidebar/ui.js:17-52` | Afegir `config.enableConceptMap` a `applyExtensionVisibility()` |
| `sidebar/sidebar.js:95` | Afegir `enableConceptMap` a `CONFIG_KEYS` |
| `sidebar/sidebar.js` | Wiring del click: `conceptMapBtn.addEventListener('click', () => doSummary(null, false, false, false, true))` |
| `sidebar/summary.js` | Afegir paràmetre `isConceptMap` a `startSummary()` i `doSummary()` |

**Detall de `summary.js`:**
- Línia ~88-95: Si `isConceptMap`, usar `DEFAULT_CONCEPTMAP_PROMPT`
- Línia ~316: Si `isConceptMap`, cridar `parseConceptTree(fullText)` en lloc de `formatTextToFragment(fullText)`
- Línia ~248-253: Durant streaming, mostrar text cru (com ara)

**Verificació:** El botó apareix, fa la crida API amb el prompt correcte, i renderitza l'arbre.

---

### Fase 4 — Cache i persistència

**Fitxer:** `sidebar/cache.js`

**Tasca:** Assegurar que el resum cachejat es re-renderitza correctament.

**Opció A (mínima):** Afegir un prefix al text cachejat (ex: `<!--conceptmap-->\n`) que el codi de renderitzat detecti per saber quin formatter usar.

**Opció B (millor):** Modificar l'estructura de cache per incloure un camp `type: 'summary' | 'deepdive' | 'science' | 'conceptmap'`. Caldrà revisar `sidebar/cache.js` i `sidebar/summary.js:116-167` (lectura de cache).

**Verificació:** Obrir el sidebar en una pàgina ja resumida en mode conceptmap mostra l'arbre (no text pla).

---

### Fase 5 — Estils CSS i UX

**Fitxer:** `sidebar/sidebar.css`

**Estils a afegir:**
```css
/* Concept map tree */
.concept-map { list-style: none; padding-left: 0; }
.concept-map ul { padding-left: 1.2em; border-left: 2px solid var(--border-color); margin: 0.3em 0; }
.concept-map details { margin: 0.2em 0; }
.concept-map summary { cursor: pointer; font-weight: 600; padding: 0.2em 0.4em; border-radius: 4px; }
.concept-map summary:hover { background: var(--hover-bg); }
.concept-map li { padding: 0.2em 0.4em; }
.concept-map .concept-desc { display: block; font-size: 0.85em; color: var(--text-muted); margin-top: 0.1em; }

/* Expand/collapse controls */
.concept-map-controls { display: flex; gap: 0.5em; margin-bottom: 0.5em; }
.concept-map-controls button { font-size: 0.8em; padding: 0.2em 0.6em; }

/* Depth colors */
.concept-map > li > details > summary { color: var(--accent-1); }
.concept-map details details > summary { color: var(--accent-2); }
.concept-map details details details > summary { color: var(--accent-3); }
```

**Icona del botó:** SVG d'un arbre/diagrama jeràrquic (afegir a `icons/` o inline al HTML).

**Controls UX:**
- Barra superior amb botons "Desplega tot" / "Replega tot" (criden `expandAll()`/`collapseAll()`)
- Primer nivell obert per defecte, resta tancat

**Fitxer:** `options/settings.html`
- Afegir toggle "Mapa conceptual" a la secció d'extensions (seguint el patró dels altres toggles)

**Verificació:** Visual review — l'arbre es veu bé en sidebar estret, els colors són coherents amb el tema, les animacions són suaus.

---

## Ordre d'execució recomanat per agents

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5
         (seqüencial, cada fase depèn de l'anterior)
```

Un sol agent pot fer Fase 1+2 juntes (prompt + parser), i un altre Fase 3+4+5 (integració + estils). Però la seqüència ha de respectar l'ordre.

---

## Extensió futura (fora d'abast)

- Renderitzat visual amb Markmap (~45KB) per a mode "gràfic" opcional
- Streaming progressiu de l'arbre (renderitzar nodes a mesura que arriben)
- Exportar el mapa com a imatge SVG
- Interactivitat avançada: arrossegar nodes, zoom, cercar dins el mapa

---

## Criteris d'acceptació

- [ ] El botó de mapa conceptual apareix al toolbar i respecta l'ordre configurable
- [ ] El prompt genera una estructura jeràrquica coherent amb el contingut de la pàgina
- [ ] L'arbre es renderitza amb nodes desplegables/replegables
- [ ] "Desplega tot" i "Replega tot" funcionen
- [ ] El resum cachejat es re-renderitza correctament com a arbre
- [ ] L'opció es pot activar/desactivar des de settings
- [ ] Funciona tant a Firefox com a Chromium
- [ ] 0 dependències externes afegides
- [ ] Els tests existents continuen passant (`npm test`)
- [ ] Lint passa sense warnings (`npm run lint`)
