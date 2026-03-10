---
description: Auditoria exhaustiva pre-release (Codi, Seguretat, Accessibilitat, UX, AMO)
---

# Auditoria Pre-Release

Checklist exhaustiva a passar **cada vegada que es tanca una nova versió** de l'extensió, abans de generar el ZIP i publicar.

> [!IMPORTANT]
> Aquesta auditoria s'ha d'executar **en mode producció** (`set_dev_mode.ps1 prod`).

---

## 1. Conformitat AMO (Mozilla Add-on Policies)

- [ ] **No `eval()` ni `new Function()`** — Cercar en tots els `.js`
- [ ] **No codi remot** — Verificar que tots els `<script>` carreguen fitxers locals
- [ ] **No codi ofuscat/minificat propi** — Tot el codi ha de ser llegible
- [ ] **Codi de tercers documentat** — Verificar que `Readability.js` (o qualsevol lib) té:
  - Font original documentada
  - Versió especificada
  - Llicència indicada (Apache 2.0)
- [ ] **Manifests correctes**:
  - `manifest.json` (Firefox):
    - `name` sense `(DEV)`
    - `gecko.id` de producció
    - `version` incrementada respecte l'anterior
    - Tots els camps obligatoris presents
  - `manifest.chromium.json` (Chromium):
    - `name` sense `(DEV)`
    - Mateixa `version` que `manifest.json`
    - Tots els camps obligatoris presents
- [ ] **Sincronització de manifests**: Verificar que ambdós manifests tenen la mateixa versió, nom, description, icons, i permissions equivalents

## 1.5. Compatibilitat Multi-Navegador

- [ ] **Build Firefox** — Generar i descomprimir `resumir-contingut-vX.Y.Z-firefox.zip`:
  - Verificar que conté `manifest.json`, `ext.js`, `background.js`
  - Verificar que `manifest.json` té `sidebar_action` i `menus`
  - Verificar que **no** conté `background.bundle.js`
- [ ] **Build Chromium** — Generar i descomprimir `resumir-contingut-vX.Y.Z-chromium.zip`:
  - Verificar que conté `manifest.json` (copiat de `manifest.chromium.json`), `background.bundle.js`
  - Verificar que el manifest té `side_panel` i `contextMenus`
  - Verificar que `background.bundle.js` conté tant el contingut d'`ext.js` com de `background.js`
- [ ] **Provar en Firefox** — Instal·lar temporalment el ZIP de Firefox i verificar funcionalitat bàsica
- [ ] **Provar en Chrome/Edge** — Instal·lar temporalment el ZIP de Chromium i verificar funcionalitat bàsica

## 2. Seguretat

- [ ] **API key mai a URL** — Verificar que totes les crides a `fetch` usen header `x-goog-api-key`
- [ ] **No `innerHTML` amb dades dinàmiques** — Cercar `innerHTML` en tots els `.js` (excloent `Readability.js`)
  - Acceptat: SVG estàtics literals
  - Rebutjat: qualsevol ús amb variables o dades de l'usuari
- [ ] **No secrets al codi font** — Cercar patrons `AIza`, `key=`, tokens, passwords
- [ ] **`host_permissions` és opcional** — No `host_permissions`, sí `optional_host_permissions`
- [ ] **`world: "MAIN"` documentat** — Si existeix, justificar-ne l'ús

## 3. Accessibilitat

- [ ] **`lang="ca"`** a tots els `<html>`
- [ ] **`aria-label`** a tots els `<button>`
- [ ] **`aria-hidden="true"`** a tots els `<svg>` decoratius dins botons
- [ ] **`aria-live`** als elements d'estat dinàmic (`#loading`, `#error`, notificacions)
- [ ] **`role`** adequat als elements semàntics (`status`, `alert`)
- [ ] **HTML vàlid** — Tots els `<div>` tancats, estructura correcta
- [ ] **Keyboard navigation** — Tots els elements interactius accessibles via Tab

## 4. Qualitat de Codi

- [ ] **Sense `console.log` en producció** — Cercar `console.log` (permesos: `console.error`, `console.warn`)
- [ ] **Sense typos** a strings d'error i UI
- [ ] **Sense claus duplicades** a l'storage (ex: `enableDeepdive` vs `enableDeepDive`)
- [ ] **Sense selectors CSS injectables** — Mai concatenar variables a selectors d'atributs sense `CSS.escape()`
- [ ] **Constants no duplicades** — Cada prompt/template definit en un sol lloc
- [ ] **Dead code** — Verificar que no hi ha funcions ni variables mai referenciades

## 5. Usabilitat (UX) i Estil

- [ ] **Estil de textos (Sentence case)**: Verificar proactivament que els títols, enunciats i etiquetes visibles a la UI no estiguin mai en format `camelCase` ni en `Title Case` (majúscula a cada paraula). Tot ha d'estar formatat naturalment en *sentence case* (ex: "Resums per model i dia").
- [ ] **Tots els botons funcionals** — Verificar manualment cada botó de la toolbar
- [ ] **Temes** — Provar els 5 temes (sistema, clar, fosc, solarized, gris) a sidebar i settings
- [ ] **Configuració** — Canviar opcions a settings i verificar que es reflecteixen en viu a la sidebar
- [ ] **Reordenar extensions** — Verificar que l'ordre es desa i es respecta
- [ ] **Activar/desactivar extensions** — Verificar visibilitat immediata
- [ ] **Obsidian** — Verificar que no substitueix la pestanya activa
- [ ] **Menú contextual** — Provar "Resumir text seleccionat" i "Resumir contingut"

## 6. Funcionalitat Core

**Provar en ambdós navegadors (Firefox i Chromium):**

- [ ] **Resum de pàgina estàndard** — Generar resum d'un article (Firefox + Chromium)
- [ ] **Resum de text seleccionat** — Via menú contextual (Firefox: "menus" + Chromium: "contextMenus")
- [ ] **YouTube** — Generar resum d'un vídeo amb transcripció (Firefox + Chromium)
- [ ] **Hacker News** — Generar resum d'un fil de discussió (Firefox + Chromium)
- [ ] **Deep Dive** — Generar anàlisi profunda (Firefox + Chromium)
- [ ] **Validació Científica** — Generar validació i verificar links clicables (Firefox + Chromium)
- [ ] **Memòria cau** — Verificar que un segon resum de la mateixa pàgina ve de cache (Firefox + Chromium)
- [ ] **Streaming** — Verificar que el text apareix progressivament (Firefox + Chromium)
- [ ] **Aturar generació** — Verificar botó de pausa (Firefox + Chromium)
- [ ] **Copiar Markdown** — Verificar portapapers (Firefox + Chromium)
- [ ] **Lectura biònica** — Verificar toggle i format (Firefox + Chromium)
- [ ] **Estadístiques** — Verificar que es registren peticions i tokens (Firefox + Chromium)
- [ ] **Sidebar/Side Panel** — Verificar que s'obre i tanca correctament (Firefox: `Ctrl+Shift+Y`, Chromium: icona action)

## 7. Privadesa

- [ ] **`PRIVACY_POLICY.md` actualitzada** amb:
  - Tots els permisos del manifest justificats
  - Totes les connexions externes documentades (Google API, YouTube transcripcions)
  - Dades locals descrites (`usageHistory` amb URLs, models, tokens)
  - `world: "MAIN"` documentat si existeix

## 8. Documentació

- [ ] **`CHANGELOG.md`** actualitzat amb la nova versió
- [ ] **`README.md`** — Verificar que reflecteix funcionalitats actuals
- [ ] **`settings.html`** (tab "Sobre") — Actualitzar llista de canvis visual
- [ ] **`ROADMAP.md`** — Moure items implementats

---

## Resultat esperat

Cada ítem ha de ser ✅. Si hi ha ⚠️ o 🔴, documentar-los i corregir-los **abans de generar el ZIP**.

**Verificació crítica abans de publicar:**
- Tots dos ZIPs (Firefox i Chromium) generats correctament
- Provat en Firefox amb funcionalitat completa ✅
- Provat almenys en Chrome o Edge amb funcionalitat completa ✅
- Manifests sincronitzats (versió, nom, descripció)
- Documentació (`CHANGELOG.md`, `README.md`) actualitzada

---

## 9. Verificació de Models de l'API

Comprovar manualment que els IDs dels models curats a `shared/models.js` existeixen i funcionen.

```powershell
# Executar els tests automatitzats (cobreix lògica de models)
npm test
```

- [ ] Tots els tests de `npm test` passen en verd
- [ ] Verificar manualment que cada model de `CURATED_MODELS` (`shared/models.js`) respon correctament: obrir la sidebar, seleccionar cada model i generar un resum de prova
- [ ] Si algun model falla (canvi d'ID a l'API de Google) → actualitzar `shared/models.js` **abans de publicar**
- [ ] **Prioritat de Fallback**: Verificar que l'ordre de `CURATED_MODELS` és el desitjat per al salt automàtic quan s'esgota la quota (del més prioritari al menys)

> [!TIP]
> Models curats actuals (`sidebar/api.js` → `CURATED_MODELS`):
>
> | ID | Label |
> | --- | --- |
> | `gemini-2.5-pro` | Gemini 2.5 Pro |
> | `gemini-2.0-flash` | Gemini 2.0 Flash |
> | `gemini-2.5-flash` | Gemini 2.5 Flash |
> | `gemma-3-27b-it` | Gemma 3 (27B) |
> | `gemini-2.0-flash-lite` | Gemini 2.0 Flash Lite |

---

## 10. Verificació Final Multi-Navegador

**Proves d'integració en navegadors reals:**

- [ ] **Firefox**: Carregar `resumir-contingut-vX.Y.Z-firefox.zip` a `about:debugging` i executar test complet
  - Sidebar funciona
  - Menú contextual funciona
  - API key es desa correctament
  - Temes funcionen
  - Configuració es desa
- [ ] **Chrome**: Carregar `resumir-contingut-vX.Y.Z-chromium.zip` a `chrome://extensions` i executar test complet
  - Side panel funciona
  - Menú contextual funciona
  - API key es desa correctament
  - Temes funcionen
  - Configuració es desa
- [ ] **Edge**: Carregar `resumir-contingut-vX.Y.Z-chromium.zip` a `edge://extensions` i verificar funcionalitat bàsica
- [ ] **Compatibilitat de storage**: Verificar que les dades es desen correctament en els dos navegadors (ús de `browser.storage.local`)
