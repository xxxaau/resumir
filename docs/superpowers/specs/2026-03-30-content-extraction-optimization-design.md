# Content Extraction Optimization Design

## Goal

Millorar la qualitat dels resums per a tres tipus de contingut específics: fils de Twitter/X, fils de Hacker News (incloent l'article original), i vídeos de YouTube. Optimitzar també el consum de tokens mitjançant una extracció més precisa i estructurada.

## Context del codi actual

`sidebar/content.js` implementa `getPageContent()` amb blocs especialitzats per HN i YouTube, i fallback a Readability per a la resta. El flux és:

```
if HN → extreu títol + top 15 comentaris
else if YouTube → transcripció (API → UI panel → descripció)
else → Readability
```

**Problemes actuals:**
- **Twitter/X**: cap tractament especial — Readability retorna contingut mínim en pàgines JS-heavy
- **HackerNews**: límit arbitrari de 15 comentaris; no consulta l'article original
- **YouTube**: ja funciona correctament (no canvia)

---

## Arquitectura

Tots els canvis viuen a `content.js`. No es modifica `summary.js` ni cap prompt del sistema — el contingut extret és prou semàntic perquè el model l'interpreti correctament.

El bloc condicional s'estén:

```
if HN (ycombinator.com/item)
    → extreu TOTS els comentaris (sense límit)
    → fetch() de l'article linked en paral·lel des del sidebar
    → Readability (context sidebar) sobre el HTML obtingut
    → combina: [ARTICLE] + [HACKER NEWS DISCUSSION]

else if Twitter/X (*twitter.com/*/status/* | *x.com/*/status/*)
    → injecta defuddle.js al tab (igual que Readability.js)
    → new Defuddle(document, { markdown: true }).parse()
    → retorna thread + respostes en Markdown
    → fallback a Readability si Defuddle retorna buit

else if YouTube (youtube.com/watch)
    → sense canvis (transcripció API → UI → descripció)

else → Readability (sense canvis)
```

---

## Dependència: Defuddle

**Defuddle** (MIT, by kepano) és una llibreria d'extracció de contingut amb extractors específics per a Twitter/X, HackerNews, YouTube, Reddit i altres. Retorna Markdown natiu i gestiona contingut JS-rendered via fallback a l'API FxTwitter.

### Integració com a vendor (fàcil de mantenir i actualitzar)

```json
// package.json — afegir a devDependencies
"defuddle": "latest"
```

```json
// package.json — afegir a scripts
"vendor:update": "node scripts/copy-vendor.mjs"
```

```js
// scripts/copy-vendor.mjs (nou fitxer)
import { copyFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
copyFileSync(
    resolve(root, "node_modules/defuddle/dist/index.js"),
    resolve(root, "defuddle.js")
);
console.log("defuddle.js updated");
```

**Per actualitzar defuddle:** `npm update defuddle && npm run vendor:update`

`defuddle.js` es commita a l'arrel (com `Readability.js`) — l'extensió no depèn de `node_modules` en runtime. La versió queda fixada via `package-lock.json`.

---

## Canvis detallats

### 1. Twitter/X — nou bloc a `content.js`

**Detecció:** URL conté `twitter.com/` o `x.com/` **i** `/status/` — cobreix threads i tweets individuals amb respostes. No s'aplica a pàgines de perfil ni cerca.

```js
else if ((tabUrl.includes("twitter.com/") || tabUrl.includes("x.com/"))
          && tabUrl.includes("/status/")) {
    try {
        await executeScriptSafe({ target: { tabId }, files: ["defuddle.js"] });
        const result = await executeScriptSafe({
            target: { tabId },
            func: () => {
                try {
                    const parsed = new Defuddle(document, { markdown: true }).parse();
                    return parsed?.contentMarkdown || parsed?.content || null;
                } catch { return null; }
            }
        });
        if (result?.[0]?.result) text = result[0].result;
    } catch (e) {
        console.warn("Twitter extraction failed", e);
    }
    // Si text és buit → cau al fallback Readability genèric
}
```

**Fallback:** si Defuddle retorna buit (tweet esborrat, pàgina no carregada, etc.), el codi cau al bloc `if (!text)` existent que aplica Readability.

### 2. HackerNews — bloc existent actualitzat a `content.js`

**Canvis:**
- Eliminar `.slice(0, 15)` — s'extreuen tots els comentaris
- Afegir `articleUrl` al resultat del script injectat
- `fetch()` de l'article linked des del context del sidebar (no obre cap tab)
- `DOMParser` + `Readability` (disponible al sidebar, veure punt 3) per parsejar l'HTML
- Format de sortida combinat

```js
if (tabUrl.includes("news.ycombinator.com/item")) {
    try {
        const hnResult = await executeScriptSafe({
            target: { tabId },
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
                    const resp = await fetch(hn.articleUrl);
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
```

**Nota tokens:** el contingut combinat (article + discussió) pot ser gran. El truncat existent a `summary.js` (`estimateTokens` + `safeLimit` al 80% del context window) gestiona automàticament qualsevol excés.

**Fallback graceful:** si el fetch de l'article falla (CORS, timeout, error de xarxa), `articleText` queda buit i el text inclou només la discussió HN — comportament equivalent a l'actual.

### 3. `sidebar.html` — Readability al context del sidebar

Per poder usar `Readability` al context de la pàgina sidebar (necessari per parsejar l'article HN obtingut via `fetch`), s'afegeix com a `<script>` **abans** de la resta de scripts:

```html
<!-- Afegir just abans dels <script> existents -->
<script src="../Readability.js"></script>
```

Readability.js ja existeix a l'arrel de l'extensió. Aquesta addició el fa disponible globalment al context del sidebar sense cap canvi al fitxer.

### 4. YouTube — sense canvis

L'extracció actual ja implementa exactament el comportament desitjat:
- Prioritza transcripcions oficials (ca → en → es) sobre ASR auto-generades
- Fallback al panell UI de transcripció
- Fallback a la descripció del vídeo amb nota explicativa

---

## Fitxers afectats

| Fitxer | Canvi |
|---|---|
| `defuddle.js` | Nou — generat per `npm run vendor:update` |
| `scripts/copy-vendor.mjs` | Nou — script de còpia vendor |
| `package.json` | + devDependency `defuddle` + script `vendor:update` |
| `sidebar/content.js` | + bloc Twitter/X; bloc HN actualitzat |
| `sidebar/sidebar.html` | + `<script src="../Readability.js">` |

---

## Testing

- **Twitter/X**: obrir un fil de Twitter/X, clicar resumir → verificar que el resum inclou el context del fil i les respostes
- **Twitter fallback**: tweet esborrat o pàgina no carregada → ha de caure a Readability sense error visible
- **HN amb article**: obrir un fil HN amb URL externa → verificar que el resum menciona el contingut de l'article i la discussió
- **HN sense article (ask HN / show HN sense URL)**: ha de funcionar sense fetch, retornant només la discussió
- **HN article amb CORS o error**: ha de degradar gracefully a discussió sola
- **YouTube**: verificar que segueix funcionant (transcripció prioritzada)
- **Pàgina genèrica**: Readability continua funcionant igual

---

## No inclòs (fora d'abast)

- Optimització de prompts específics per tipus de contingut (possible millora futura)
- Suport per a Twitter Spaces, pàgines de perfil, o cerca de Twitter
- Extracció de Reddit (podria seguir el mateix patró amb Defuddle en el futur)
