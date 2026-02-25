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
- [ ] **Manifest correcte**:
  - `name` sense `(DEV)`
  - `gecko.id` de producció
  - `version` incrementada respecte l'anterior
  - Tots els camps obligatoris presents

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

- [ ] **Resum de pàgina estàndard** — Generar resum d'un article
- [ ] **Resum de text seleccionat** — Via menú contextual
- [ ] **YouTube** — Generar resum d'un vídeo amb transcripció
- [ ] **Hacker News** — Generar resum d'un fil de discussió
- [ ] **Deep Dive** — Generar anàlisi profunda
- [ ] **Validació Científica** — Generar validació i verificar links clicables
- [ ] **Memòria cau** — Verificar que un segon resum de la mateixa pàgina ve de cache
- [ ] **Streaming** — Verificar que el text apareix progressivament
- [ ] **Aturar generació** — Verificar botó de pausa
- [ ] **Copiar Markdown** — Verificar portapapers
- [ ] **Lectura biònica** — Verificar toggle i format
- [ ] **Estadístiques** — Verificar que es registren peticions i tokens

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

---

## 9. Verificació de Models de l'API

Comprovar que els IDs dels 5 models curats a `sidebar/api.js` i `options/settings.js` existeixen i suporten `generateContent` a l'API de Google.

```bash
# Substitueix AIZA_... per la API key real (no commitada)
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=AIZA_..." \
  | python -c "
import sys, json
data = json.load(sys.stdin)
ids = {m['name'].replace('models/','') for m in data.get('models',[]) if 'generateContent' in m.get('supportedGenerationMethods',[])}
curated = [
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemma-3-27b-it',
  'gemini-2.0-flash-lite',
]
print('=== Verificació models curats ===')
for m in curated:
    status = '✅' if m in ids else '❌ NO TROBAT'
    print(f'  {status}  {m}')
print(f'\nTotal models disponibles a l\'API: {len(ids)}')
"
```

- [ ] Tots els 5 models mostren ✅
- [ ] Cap model mostra ❌
- [ ] Si algun falla → actualitzar l'ID a `sidebar/api.js` i `options/settings.js` **abans de publicar**
- [ ] **Prioritat de Fallback**: Verificar que l'ordre en què estan definits els models a `CURATED_MODELS` (`sidebar/api.js`) és l'ordre prioritari desitjat per al salt automàtic quan s'esgoti la quota (del més prioritari al menys).

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
