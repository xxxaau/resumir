# Mapa Conceptual Interactiu

Disseny i implementació del mapa conceptual de l'extensió **Resumir**.

> A partir de la **v2.2.10**, el mapa s'ha redissenyat completament en estil
> pill (similar a Google NotebookLM). Aquest document descriu l'estat actual.

---

## Visió general

El mapa conceptual transforma el resum (Markdown amb llistes anidades) en una
visualització jeràrquica interactiva en format SVG. Es renderitza amb un
motor propi (`sidebar/markmap-native.js`) que **no depèn de cap llibreria
externa** (substitueix `d3.min.js` + `markmap-lib.js` + `markmap-view.js`,
~627 KB, eliminats a la v2.2.9).

Hi ha dues vistes amb aspecte **idèntic**:

| Vista        | Fitxer                       | Ús                                          |
|--------------|------------------------------|---------------------------------------------|
| Sidebar      | `sidebar/conceptmap.js`      | Mapa embegut al panell lateral              |
| Pantalla completa | `fullscreenOverlayFunc` (dins `conceptmap.js`) | Overlay sobre la pàgina amfitriona |

---

## Disseny visual (estil NotebookLM)

### Pills enlloc de baseline + text

Cada node es renderitza com un `<rect>` arrodonit (`rx = min(12, height/2)`)
amb el text centrat verticalment al damunt (`dominant-baseline="central"`).

```
┌─────────────────────┐
│  Intel·ligència art.│ ← pill lila (root)
└──┬──────────────────┘
   │
   ├──┌───────────────┐
   │  │  Aprenentatge │ ← pill blau (nivell 1)
   │  └───────────────┘
   │
   └──┌───────────────┐
      │  Aplicacions  │
      └─┬─────────────┘
        ├─ ⊕ Sanitat        ← pill verd clar (nivell 2)
        └─ ⊖ Educació
```

### Paleta de colors (jeràrquica i constant entre temes)

Els pills tenen colors pastel **fixos**, independents del tema actiu (clar,
fosc, sèpia, gris). Codifiquen profunditat, no aparença del tema.

| Profunditat | Pill (background) | Edge (línia) |
|-------------|-------------------|--------------|
| 0 (root)    | `#c5c8f7` (lila)  | `#a5a8e0`    |
| 1           | `#c5dff7` (blau)  | `#a5a8e0`    |
| 2           | `#a8e6cf` (verd clar) | `#7fc8a9` |
| 3+          | `#c8f0d5` (verd menta) | `#7fc8a9` |

**Text**: sempre `#1a1a1a` (negre suau) per garantir contrast sobre els
pastels, sigui quin sigui el tema actiu de l'extensió.

### Mesura precisa del text

Substituïda l'aproximació `width = label.length * 0.55em` per
`canvas.getContext("2d").measureText(label).width` (singleton cau-keyed).
Això elimina els desencaixos entre el text i els edges que apareixien amb
etiquetes llargues o caràcters amples.

### Toggle de plegat (estil NotebookLM)

Cada node amb fills mostra un cercle blanc al lateral dret amb un glyph
tintat amb el color del pill del pare:

- `<` → branca **expandida** (clica per plegar)
- `>` → branca **plegada** (clica per desplegar)

### Edges

Els edges són línies rectes que connecten l'**extrem dret del pare** amb
l'**extrem esquerre del fill**, amb opacitat plena per màxima llegibilitat.

---

## Constants de layout

Definides com a mòdul-level al renderitzador:

| Constant      | Valor | Significat                                       |
|---------------|-------|--------------------------------------------------|
| `PAD_X`       | 14    | Padding horitzontal dins el pill                 |
| `PAD_Y`       | 8     | Padding vertical dins el pill                    |
| `SPACING_X`   | 50    | Distància horitzontal entre nivells              |
| `SPACING_Y`   | 14    | Espai vertical entre germans                     |
| `MAX_LABEL_W` | 280   | Amplada màxima del text abans de partir línia    |
| `RX_MAX`      | 12    | Radi màxim de la cantonada del pill              |

---

## Interactivitat

| Acció                  | Sidebar | Pantalla completa |
|------------------------|---------|-------------------|
| Pan (arrossegar)       | ✅      | ✅                |
| Zoom (roda del ratolí) | ✅      | ✅                |
| Plegar/desplegar branca| ✅      | ✅                |
| Ajustar a la vista     | ✅      | ✅                |
| Exportar a PNG         | ✅      | ✅                |
| Tancar amb `Esc`       | —       | ✅                |
| Tancar amb click fora  | —       | ✅                |

### Per què codi duplicat a l'overlay?

`fullscreenOverlayFunc` és serialitzada com a string per
`chrome.scripting.executeScript` perquè s'executi al MAIN world de la pàgina
amfitriona. No pot fer `import`, ni accedir al scope del sidebar. Per això
duplica inline:

- Constants de color (NODE_COLORS, EDGE_COLORS, TEXT_COLOR)
- Mesura amb canvas (`measureLabel`)
- Walk del tree i render
- Lògica del filename PNG

Per al **sidebar** s'usa la funció pura compartida
`window.buildConceptMapFilename` (carregada des de
`sidebar/conceptmap-filename.js`). L'overlay té una rèplica inline de la
mateixa lògica.

---

## Exportació a PNG

El botó PNG dispara `serializeToSVG()` → `Blob` → `<img>` → `<canvas>` →
`canvas.toDataURL("image/png")` → descàrrega via `<a download>`.

### Nom del fitxer (v2.2.10+)

**Format**: `YYYYMMDD_word1_word2.png`

Les 2 paraules surten del **títol arrel del mapa** (no del títol de la
pestanya, que sovint és ambigu), normalitzat de la manera següent:

1. NFD + strip diacrítics → `història` → `historia`
2. Lowercase
3. Reemplaça no alfanumèric per espais
4. Tokenitza per espais
5. Filtra stop-words ca/es/en (`el`, `la`, `de`, `the`, `of`, ...)
6. Filtra tokens d'un sol caràcter
7. Trunca cada token a 20 caràcters
8. Agafa els 2 primers tokens

**Exemples**:

| `root.label`                      | Filename                                |
|-----------------------------------|-----------------------------------------|
| `Intel·ligència artificial`       | `20260522_intelligencia_artificial.png` |
| `Història de l'art`               | `20260522_historia_art.png`             |
| `Web 2.0`                         | `20260522_web.png`                      |
| `The Quick Brown Fox`             | `20260522_quick_brown.png`              |
| `` (buit) o només stop-words      | `20260522_mapa.png` (fallback)          |

**Funció pura**: `sidebar/conceptmap-filename.js` exporta
`buildConceptMapFilename(rootLabel, now?)` (15 tests unitaris a
`tests/conceptmap-filename.test.mjs`).

---

## Implementació tècnica

### API pública (`window.markmapNative`)

```js
window.markmapNative = {
    parseMarkdownTree(text)        // → root { label, children, depth, fold }
    renderMarkmapInteractive(...)  // crea SVG dins un contenidor + pan/zoom
    exportToPNG(svg, filename, opts) // descarrega PNG del SVG renderitzat
    serializeToSVG(svg)            // → string SVG amb estils inline
};
```

### Defensa CSS intra-SVG

Tant el sidebar com l'overlay incrusten un `<style>` dins el `<svg>`:

```html
<style>
  text { fill: #1a1a1a !important; font-family: 'Google Sans', system-ui, ...; }
  rect { fill-opacity: 1; stroke: none; }
  path { fill: none; }
</style>
```

Això protegeix contra reset CSS de la pàgina amfitriona (Tailwind, design
systems, etc.) que sobreescriurien atributs SVG.

### Ordre de càrrega de scripts

A `sidebar/sidebar.html`:

```html
<script src="markmap-native.js"></script>
<script src="conceptmap-filename.js"></script>  <!-- abans de conceptmap.js -->
<script src="conceptmap.js"></script>
```

També inclosos en aquest ordre al bundle final
(`scripts/build-sidebar-bundle.mjs`).

---

## Historial de canvis

- **v2.2.10** — Redisseny estil pill NotebookLM + nou format de nom PNG (basat
  en root label).
- **v2.2.9** — Reescriptura del renderitzador des de zero (`markmap-native.js`),
  eliminades les 3 llibreries externes (~627 KB → ~22 KB).
- **v2.2.8 i anteriors** — Renderitzador basat en `markmap-lib` + `markmap-view`
  + `d3`.
