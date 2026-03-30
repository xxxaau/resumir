# Content Extraction Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Millorar l'extracció de contingut per a Twitter/X (via Defuddle), HackerNews (tots els comentaris + article linked), mantenint YouTube i el fallback Readability sense canvis.

**Architecture:** S'afegeix Defuddle com a vendor npm (copiat a `defuddle.js` a l'arrel), s'estén `content.js` amb dos nous blocs condicionals (Twitter/X i HN millorat), i es fa `Readability.js` disponible al context del sidebar per parsejar l'article de HN via `fetch()`.

**Tech Stack:** Node.js scripts (copy-vendor), vanilla JS (content.js), Mozilla Readability, Defuddle (UMD), jsdom (tests)

---

## File Structure

| Fitxer | Rol |
|---|---|
| `scripts/copy-vendor.mjs` | Nou — copia `node_modules/defuddle/dist/index.js` → `defuddle.js` |
| `package.json` | Afegir dep `defuddle` + script `vendor:update` |
| `defuddle.js` | Nou — bundle UMD de Defuddle, injectat als tabs |
| `sidebar/content.js` | Modificat — HN sense límit + fetch article; nou bloc Twitter/X |
| `sidebar/sidebar.html` | Modificat — afegir `<script src="../Readability.js">` |
| `tests/content.test.mjs` | Modificat — actualitzar test HN + 4 tests nous |

---

## Task 1: Vendor setup — defuddle

**Files:**
- Modify: `package.json`
- Create: `scripts/copy-vendor.mjs`
- Create: `defuddle.js` (generat, no editar manualment)

- [ ] **Step 1: Afegir defuddle a package.json**

Al bloc `devDependencies`, afegir:

```json
"defuddle": "latest"
```

Al bloc `scripts`, afegir (al costat dels altres scripts):

```json
"vendor:update": "node scripts/copy-vendor.mjs"
```

- [ ] **Step 2: Crear scripts/copy-vendor.mjs**

```js
#!/usr/bin/env node
/**
 * scripts/copy-vendor.mjs
 * Copia el bundle UMD de defuddle a l'arrel de l'extensió.
 * Actualitzar: npm update defuddle && npm run vendor:update
 */
import { copyFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "node_modules/defuddle/dist/index.js");
const dest = resolve(root, "defuddle.js");

if (!existsSync(src)) {
    console.error(`ERROR: no s'ha trobat ${src}. Executa npm install primer.`);
    process.exit(1);
}

copyFileSync(src, dest);
console.log(`defuddle.js actualitzat des de node_modules/defuddle/dist/index.js`);
```

- [ ] **Step 3: Instal·lar i generar defuddle.js**

```bash
cd /d D:/40361989w/Dev/sergi-resum-navegador
npm install
npm run vendor:update
```

Expected: `defuddle.js actualitzat des de node_modules/defuddle/dist/index.js`

- [ ] **Step 4: Verificar que defuddle.js s'ha creat**

```bash
ls -lh defuddle.js
```

Expected: fitxer existent, mida > 50KB

- [ ] **Step 5: Verificar que els tests existents segueixen passant**

```bash
npm test
```

Expected: tots els tests passen (56 tests, 0 failures)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/copy-vendor.mjs defuddle.js
git commit -m "feat(vendor): afegir defuddle com a vendor npm per extracció Twitter/X"
```

---

## Task 2: Readability.js al context del sidebar

**Files:**
- Modify: `sidebar/sidebar.html` (línia 256, just abans de `<script src="../ext.js">`)

Necessari perquè `content.js` (que s'executa al context de la pàgina sidebar) pugui usar `new Readability(doc)` sobre l'HTML obtingut via `fetch()` per l'article de HN.

- [ ] **Step 1: Afegir script tag a sidebar.html**

Localitzar el bloc de scripts al final del `<body>` (línia ~256). Afegir `Readability.js` **just abans** de `ext.js`:

```html
    <script src="../Readability.js"></script>
    <script src="../ext.js"></script>
    <script src="../shared/models.js"></script>
```

El fitxer complet quedaria (línies 255-267):
```html
    <script src="../Readability.js"></script>
    <script src="../ext.js"></script>
    <script src="../shared/models.js"></script>
    <script src="utils.js"></script>
    <script src="api.js"></script>
    <script src="content.js"></script>
    <script src="cache.js"></script>
    <script src="stats.js"></script>
    <script src="ui.js"></script>
    <script src="summary.js"></script>
    <script src="history.js"></script>
    <script src="sidebar.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Verificar tests**

```bash
npm test
```

Expected: 56 tests, 0 failures

- [ ] **Step 3: Commit**

```bash
git add sidebar/sidebar.html
git commit -m "feat(sidebar): carregar Readability.js al context del sidebar per fetch d'articles HN"
```

---

## Task 3: HackerNews — eliminar límit i afegir article fetch

**Files:**
- Modify: `sidebar/content.js` (línies 49–64)
- Modify: `tests/content.test.mjs`

El bloc HN actual extreu títol + top 15 comentaris com a string. El nou:
1. Extreu **tots** els comentaris (sense `.slice(0,15)`)
2. Retorna un objecte `{ title, articleUrl, comments }` des del script injectat
3. Fa `fetch(articleUrl)` des del context sidebar → `DOMParser` + `Readability` → text article
4. Combina: `ARTICLE:\n...\n\nHACKER NEWS DISCUSSION:\n...`
5. Si fetch falla o no hi ha articleUrl → retorna sols la discussió (degradació graceful)

- [ ] **Step 1: Escriure els tests nous (i actualitzar l'existent)**

Substituir el test existent de HN i afegir-ne tres de nous a `tests/content.test.mjs`. Inserir just després del test existent de HN (línia ~138):

```js
// ---------------------------------------------------------------------------
// getPageContent — Hacker News (actualitzat)
// ---------------------------------------------------------------------------

test("getPageContent - HN retorna discussió sense article quan articleUrl és null", async () => {
    const hnTab = { id: 2, url: "https://news.ycombinator.com/item?id=12345", title: "HN Thread" };
    global.Readability = class { parse() { return null; } };
    global.fetch = async () => ({ ok: true, text: async () => "" });
    global.ext = makeExt({
        tabs: [hnTab],
        scriptResult: { title: "Article Title", articleUrl: null, comments: "- Un comentari interessant" },
    });
    const result = await getPageContent();
    assert.ok(result.text.includes("Top Discussion Comments"), "Ha de retornar discussió HN sense article");
    assert.ok(result.text.includes("Un comentari interessant"), "Ha d'incloure els comentaris");
});

test("getPageContent - HN combina article i discussió quan articleUrl és extern", async () => {
    const hnTab = { id: 2, url: "https://news.ycombinator.com/item?id=12345", title: "HN Thread" };
    const articleHtml = "<html><body><p>" + "Text de l'article. ".repeat(20) + "</p></body></html>";
    global.fetch = async () => ({ ok: true, text: async () => articleHtml });
    global.Readability = class {
        constructor(doc) { this._doc = doc; }
        parse() { return { textContent: "Text de l'article. ".repeat(20) }; }
    };
    global.ext = makeExt({
        tabs: [hnTab],
        scriptResult: { title: "Article Title", articleUrl: "https://example.com/article", comments: "- Comentari sobre l'article" },
    });
    const result = await getPageContent();
    assert.ok(result.text.includes("ARTICLE:"), "Ha d'incloure la secció ARTICLE");
    assert.ok(result.text.includes("HACKER NEWS DISCUSSION:"), "Ha d'incloure la secció HN DISCUSSION");
    assert.ok(result.text.includes("Text de l'article"), "Ha d'incloure el text de l'article");
    assert.ok(result.text.includes("Comentari sobre l'article"), "Ha d'incloure la discussió HN");
});

test("getPageContent - HN degrada gracefully quan el fetch de l'article falla", async () => {
    const hnTab = { id: 2, url: "https://news.ycombinator.com/item?id=12345", title: "HN Thread" };
    global.fetch = async () => { throw new Error("Network error"); };
    global.Readability = class { parse() { return null; } };
    global.ext = makeExt({
        tabs: [hnTab],
        scriptResult: { title: "Article Title", articleUrl: "https://example.com/article", comments: "- Comentari de fallback" },
    });
    const result = await getPageContent();
    assert.ok(result.text.includes("Top Discussion Comments"), "Ha de mostrar discussió sola si fetch falla");
    assert.ok(result.text.includes("Comentari de fallback"), "Ha d'incloure els comentaris");
    assert.ok(!result.text.includes("ARTICLE:"), "No ha d'incloure secció ARTICLE si fetch falla");
});
```

- [ ] **Step 2: Eliminar el test HN original (ja obsolet)**

Eliminar el test de les línies 130–138 de `tests/content.test.mjs`:
```js
test("getPageContent - detecta URL de HN i retorna el contingut del thread", async () => {
    const hnTab = { id: 2, url: "https://news.ycombinator.com/item?id=12345", title: "HN Thread" };
    global.ext = makeExt({
        tabs: [hnTab],
        scriptResult: "Title: Article\n\nTop Discussion Comments:\n- Un comentari interessant",
    });
    const result = await getPageContent();
    assert.ok(result.text.includes("Top Discussion Comments"), "Ha de retornar contingut del thread HN");
});
```

- [ ] **Step 3: Executar tests per verificar que fallen**

```bash
node --test tests/content.test.mjs
```

Expected: 3 tests nous fallen perquè `content.js` encara té el codi antic

- [ ] **Step 4: Actualitzar el bloc HN a content.js**

Substituir les línies 49–65 (el bloc `if (tabUrl.includes("news.ycombinator.com/item"))`) per:

```js
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

- [ ] **Step 5: Executar tests per verificar que passen**

```bash
node --test tests/content.test.mjs
```

Expected: tots els tests passen (els 3 nous + els existents de HN)

- [ ] **Step 6: Executar suite completa**

```bash
npm test
```

Expected: tots els tests passen

- [ ] **Step 7: Commit**

```bash
git add sidebar/content.js tests/content.test.mjs
git commit -m "feat(hn): eliminar límit comentaris i afegir fetch article linked"
```

---

## Task 4: Twitter/X — extracció amb Defuddle

**Files:**
- Modify: `sidebar/content.js` (afegir bloc `else if` després del bloc YouTube, línia ~179)
- Modify: `tests/content.test.mjs`

El bloc Twitter/X:
1. Detecta `twitter.com/*/status/*` i `x.com/*/status/*`
2. Injecta `defuddle.js` al tab (primer executeScriptSafe amb `files`)
3. Crida `new Defuddle(document, { markdown: true }).parse()` al tab
4. Retorna `contentMarkdown` o `content` si disponible
5. Si Defuddle retorna null o llença error → cau al fallback Readability (el `if (!text)` existent)

- [ ] **Step 1: Escriure els tests de Twitter/X**

Afegir a `tests/content.test.mjs`, just abans del comentari `// ---------------------------------------------------------------------------\n// getPageContent — YouTube`:

```js
// ---------------------------------------------------------------------------
// getPageContent — Twitter/X
// ---------------------------------------------------------------------------

test("getPageContent - detecta URL de Twitter i usa Defuddle", async () => {
    const twitterTab = { id: 5, url: "https://twitter.com/user/status/123456789", title: "Tweet" };
    let callCount = 0;
    global.ext = {
        tabs: { query: async () => [twitterTab], get: async () => twitterTab },
        scripting: {
            executeScript: async (injection) => {
                callCount++;
                // Primera crida: injecció de defuddle.js (files)
                if (injection.files) return [{ result: null }];
                // Segona crida: Defuddle.parse() — simula resultat
                return [{ result: "## Thread title\n\nContingut del fil de Twitter amb respostes." }];
            },
        },
        permissions: { request: async () => false },
    };
    const result = await getPageContent();
    assert.ok(result.text.includes("Thread title"), "Ha de retornar el contingut del fil via Defuddle");
    assert.equal(callCount, 2, "Ha de fer exactament 2 crides (inject + parse)");
});

test("getPageContent - Twitter/X degrada a Readability si Defuddle retorna null", async () => {
    const twitterTab = { id: 6, url: "https://x.com/user/status/987654321", title: "Tweet X" };
    let callCount = 0;
    global.ext = {
        tabs: { query: async () => [twitterTab], get: async () => twitterTab },
        scripting: {
            executeScript: async (injection) => {
                callCount++;
                // Injecció de defuddle.js
                if (injection.files && injection.files[0] === "defuddle.js") return [{ result: null }];
                // Defuddle.parse() retorna null
                if (!injection.files && injection.func) {
                    if (callCount === 2) return [{ result: null }];
                    // Readability fallback
                    return [{ result: "Contingut via Readability fallback" }];
                }
                return [{ result: null }];
            },
        },
        permissions: { request: async () => false },
    };
    const result = await getPageContent();
    assert.ok(result.text.includes("Readability fallback"), "Ha de caure a Readability si Defuddle retorna null");
});
```

- [ ] **Step 2: Executar tests per verificar que fallen**

```bash
node --test tests/content.test.mjs
```

Expected: els 2 tests nous fallen (`getPageContent` no detecta Twitter)

- [ ] **Step 3: Afegir el bloc Twitter/X a content.js**

A `sidebar/content.js`, localitzar la línia just **abans** del comentari `// FALLBACK / STANDARD LOGIC` (aproximadament línia 181). Inserir el bloc `else if` entre el tancament del bloc YouTube (`}`) i el comentari de fallback:

```js
    // TWITTER/X SPECIAL LOGIC
    else if ((tabUrl.includes("twitter.com/") || tabUrl.includes("x.com/")) && tabUrl.includes("/status/")) {
        try {
            await executeScriptSafe({ target: { tabId: tabId }, files: ["defuddle.js"] });
            const result = await executeScriptSafe({
                target: { tabId: tabId },
                func: () => {
                    try {
                        const parsed = new Defuddle(document, { markdown: true }).parse();
                        return parsed?.contentMarkdown || parsed?.content || null;
                    } catch { return null; }
                }
            });
            if (result?.[0]?.result) text = result[0].result;
        } catch (e) {
            console.warn("Twitter/X extraction failed", e);
        }
        // Si text és buit → cau al fallback Readability
    }
```

L'estructura del fitxer queda:
```
if (HN) { ... }
else if (YouTube) { ... }
else if (Twitter/X) { ... }   ← nou
// FALLBACK / STANDARD LOGIC
if (!text) { Readability ... }
```

- [ ] **Step 4: Executar tests per verificar que passen**

```bash
node --test tests/content.test.mjs
```

Expected: tots els tests passen

- [ ] **Step 5: Executar suite completa**

```bash
npm test
```

Expected: tots els tests passen

- [ ] **Step 6: Commit**

```bash
git add sidebar/content.js tests/content.test.mjs
git commit -m "feat(twitter): extracció de fils Twitter/X via Defuddle"
```

---

## Verificació manual final

Després de tots els commits, verificar al navegador:

1. **Twitter/X thread**: obrir un fil (`/status/`), clicar resumir → el resum ha de reflectir el fil i les respostes, no contingut genèric
2. **HN amb article extern**: obrir un thread HN (`/item?id=...`), clicar resumir → el resum ha de mencionar contingut de l'article original + la discussió
3. **HN Ask/Show HN sense URL**: thread sense article extern → només discussió, sense error
4. **YouTube**: continua funcionant (transcripció)
5. **Pàgina genèrica**: Readability continua funcionant
