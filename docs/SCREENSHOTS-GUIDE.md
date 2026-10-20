# Screenshots Guide — Captura i Optimització

Guia pràctica per a crear screenshots de qualitat professional per a Firefox Add-ons.

> **Set vigent (v2.7.0):** el set de captures i els seus textos es defineixen a
> [`MARKETS-COPY.md` §6](MARKETS-COPY.md) (font única): **5 captures** — 1) resum amb cites
> clicables, 2) mapa conceptual, 3) YouTube, 4) configuració, 5) «Dades i privadesa». Les
> seccions de sota (3 captures + opcionals) descriuen el set antic i serveixen només com a
> guia de com capturar; si hi ha discrepància, mana MARKETS-COPY.md.

---

## 📐 REQUISITS TÈCNICS

### Firefox Add-ons (AMO)

| Aspect | Especificació |
|--------|--------------|
| **Resolució** | 1280×800 pixels (OBLIGATORI) |
| **Format** | PNG, JPG, JPEG |
| **Mida màxima** | 5 MB per fitxer |
| **Nombre** | 5 screenshots (set vigent a MARKETS-COPY §6) |
| **Aspect ratio** | 16:10 (1280÷800 = 1.6) |

--------|--------------|
| **Resolució** | 1280×800 pixels (OBLIGATORI) |
| **Format** | PNG, JPG |
| **Mida màxima** | 5 MB per fitxer |
| **Nombre** | 1-5 screenshots |
| **Aspect ratio** | 16:10 (1280÷800 = 1.6) |

---

## 📸 ESTRUCTURA DE SCREENSHOTS

### Screenshot 1: Panell Principal (Main Panel)
**Objectiu:** Mostrar feature principal — **Generació de Resums**

#### Contingut a mostrar:
- 📍 **URL barra:** Pàgina exemple (ex: `wikipedia.org/wiki/...`)
- 📍 **Panell lateral:** Resum generat
- 📍 **Botó de còpia:** Visible
- 📍 **Línia de procedència** sota el resum: paraules enviades, model i tokens

#### Passos per capturar:

1. Obri navegador amb **extensió instal·lada**
2. Vés a pàgina de contingut substancial (Wikipedia, article, blog)
   - **Recomanat:** https://en.wikipedia.org/wiki/Artificial_intelligence (paragraf d'IA)
3. Clica extensió → s'obri panell lateral
4. **Genera resum:** Clic botó "Resum"
5. **Espera:** Fins que finalitzi streaming
6. **Captura:** Pantalla sencera (1280×800)
   - Assegura't que: 
     - ✅ Panell resum visible + complert
     - ✅ Text resum llegible
     - ✅ Botó «Copiar Markdown» visible
     - ✅ Línia de procedència (paraules, model, tokens) visible

#### Design Tips:
- **Fons:** Panell fosc (tema «Fosc» o «Sistema (automàtic)» en mode fosc)
- **Contrast:** Alt contrast per llegibilitat
- **Text:** Sans-serif clara, 16px mínima

#### Example caption:
```
Catalan:
"Panell de resum — Resum estructurat generat en millisecons amb estadístiques de tokens"

English:
"Summary panel — Structured summaries generated in milliseconds with token statistics"
```

---

### Screenshot 2: Configuració (Settings)
**Objectiu:** Mostrar facilitat d'instal·lació i personalització

#### Contingut a mostrar:
- 📍 **Pàgina de configuració** de l'extensió (pestanyes General, Resum, Plugins, Dades i privadesa, Sobre l'extensió)
- 📍 **Camp de la clau d'API** (sense mostrar clau real!)
- 📍 **Selector de tema** (Sistema, Flexoki, Clar, Fosc, Flexoki clar, Gris clar)
- 📍 **Pestanya «Dades i privadesa»** (on es desa cada dada, historial)

#### Passos per capturar:

1. Clica **extension icon** a toolbar
2. Clic **⚙️ Settings / Configuració**
3. S'obri full options en pestanya nova
4. **Mostra:** 
   - Camp "API Key" (deixa buit o usa placeholder "••••••••••••")
   - Dropdown temes (expandi per veure opcions)
   - (o bé la pestanya «Dades i privadesa»)
5. **Captura:** Pantalla 1280×800
   - ✅ Tots els camps visibles
   - ✅ Tema selecionat (recomanat: «Fosc»)
   - ✅ Text legible

#### Design Tips:
- **Tema:** Usa tema «Clar» per contrast (fons blanc)
- **Colores:** Ressalta el botó de desar de la barra de canvis pendents
- **Spacing:** Deja padding entre camps

#### Example caption:
```
Catalan:
"Configuració — Enganxa clau Gemini, tria tema i activa historial cachejat"

English:
"Settings — Paste Gemini key, choose theme, enable cached history"
```

---

### Screenshot 3: Historial (History)
**Objectiu:** Mostrar feature **cache local + accés ràpid**

#### Contingut a mostrar:
- 📍 **Panell d'historial** (botó «Historial» de la barra d'eines del panell) amb múltiples entrades
- 📍 **URLs de pàgines anteriors**
- 📍 **Preview del resum cachejat**
- 📍 **Timestamps**
- 📍 **Botó eliminar (trash icon)**

#### Passos per capturar:

1. Extensió oberta → clica el botó **«Historial»** de la barra d'eines
2. **Genera 3-4 resums** de pàgines diferents PRÈVIAMENT:
   - Wikipedia article
   - News article
   - Blog post
   - Stack Overflow answer
3. **Historial hauria mostrar:**
   - Títol pàgina
   - URL
   - Data/hora de creació
   - Preview (primeres 100 caràcters)
4. **Captura:** Panell historial sencer
   - ✅ Almenys 4 entrades visibles
   - ✅ Text legible
   - ✅ Data/hora visible

#### Design Tips:
- **Ordenació:** Descendent (més recent primer)
- **Colores:** Usa tema «Fosc» per contrast
- **Icons:** Trash icon visible per eliminar

#### Example caption:
```
Catalan:
"Historial cachejat — Accés ràpid a resums anteriors sense consumir tokens de Gemini"

English:
"Cached history — Fast access to previous summaries without consuming Gemini tokens"
```

---

### Screenshots Opcionals (si vols 4-5)

#### Screenshot 4: YouTube Summaries (Catalan/English)
```
Catalan:
"YouTube intel·ligent — Extracció automàtica de transcripcions i generació de resums"

English:
"Smart YouTube — Automatic transcript extraction and summary generation"
```
**Mostrar:** 
- YouTube video player
- Panell lateral amb resum de transcripció
- Boto "Copy transcript" visible

#### Screenshot 5: Bionic Reading (Catalan/English)
```
Catalan:
"Lectura biònica — Mode de lectura ràpida personalitzable per millor comprensió"

English:
"Bionic reading — Customizable speed reading mode for improved comprehension"
```
**Mostrar:**
- Text amb fixacions destacades (bold)
- Control «Percentatge de fixació» (configuració del plugin)
- Text sense distraccions

---

## 🎨 ESTIL VISUAL RECOMANAT

### Colores
- **Primary:** Blau (#4285F4 — Google Blue)
- **Accent:** Verd (#34A853)
- **Fons:** Negre/Gris fosc (#1F2937 per dark mode)
- **Text:** Blanc (#FFFFFF)

### Fonts
- **Sans-serif:** 'Segoe UI', 'Helvetica Neue', 'Roboto'
- **Mida:** 16px mínima per llegibilitat
- **Weight:** 400 (regular) o 600 (bold per destac)

### Layout
- **Padding:** 16px al voltant de contingut
- **Border radius:** 8px per elements
- **Shadows:** Subtils (rgba 0,0,0,0.1)
- **Icons:** 24×24px mínima

---

## 🛠️ TOOLS PER CAPTURAR

### Firefox
1. **Builtin:** Press `F12` → DevTools → Rightclick → **"Screenshot Element"**
   - ✅ Pros: Built-in, sense install
   - ❌ Cons: Pot requerir crop manual a 1280×800

2. **Firefox Screenshots:** (Built-in tool)
   - Rightclick → "Take Screenshot"
   - ✅ Pros: Full page capture
   - ❌ Cons: Pot necessitar crop

### Chrome
1. **Built-in DevTools:**
   - Press `F12` → DevTools → Menu (⋮) → **"Capture screenshot"**
   - ✅ Pros: No plugin
   - ❌ Cons: Crop manual potser

2. **Extensions:**
   - "Nimbus Screenshot"
   - "FireShot" (Firefox + Chrome)

### Generic Tools
- **ShareX** (Windows): Crop perfect + hotkey
- **Greenshot** (Windows): Lightweight, free
- **macOS:** Built-in Cmd+Shift+4
- **Linux:** GNOME Screenshot o Flameshot

---

## 📐 CROP À 1280×800

### Windows (PowerShell)
```powershell
# Usa ImageMagick si instal·lat
magick convert input.png -resize 1280x800 -background white -gravity center -extent 1280x800 output.png
```

### macOS (Terminal)
```bash
# Usa sips (built-in)
sips -z 800 1280 input.png --out output.png
```

### Online Tool
- https://www.birme.net/ (resize + batch)
- https://www.iloveimg.com/resize-image

### Photoshop/GIMP
1. **Image** → **Canvas Size**
2. Set to **1280×800 pixels**
3. **File** → **Export As** → PNG
4. Optimize (comprimir sense pèrdua)

---

## 📋 PREPARACIÓ FINAL

### Checklist per image:

```
[ ] Resolució: 1280×800 pixels exactament
[ ] Format: PNG o JPG
[ ] Mida: < 5 MB
[ ] Color profile: sRGB (web-safe)
[ ] Quality: PNG max compression (no loss)
[ ] Filename: screenshot-1.png, screenshot-2.png, screenshot-3.png
[ ] No personal data visible (no claus API, emails, etc.)
[ ] UI clara i legible
[ ] Temes consistents (tots dark o tots light)
[ ] Language consistent (tots CA o tots EN)
```

### Organització al repo

Les captures de les botigues **no es versionen** al repo (`icons/` només conté les
icones de l'extensió). Desa-les fora de git (p. ex. `tmp/`, que és a `.gitignore`).
Les captures del web viuen a `web/src/shots/` (la barra lateral s'hi captura a ≥500px perquè
la barra d'eines no es parteixi en dues files; `npm run web:captures` i `npm run web:hero`; detalls a `LEARNINGS.md`, sessió 2026-10-15)
i les de les guies d'usuari a
`docs/user-guide/img/`.

---

## 🚀 SUBMISSIÓ

### Firefox Add-ons (AMO)
1. Accedir a addons.mozilla.org/developers/
2. Vés a Edit › Add images
3. Upload les 5 PNG/JPG (1280×800 cada)
4. **Orden important:** Mostren en aquest ordre als llistats

---

## 💡 BEST PRACTICES

✅ **DO:**
- ✅ Mostrar feature actual (resum, historial, settings)
- ✅ Text legible (16px mínima)
- ✅ Contrasts alts (negre/blanc)
- ✅ Consistent visual style entre imatges
- ✅ Real use case (no placeholders)

❌ **DON'T:**
- ❌ Mostrar claus API o dades sensibles
- ❌ Text borrós o petit
- ❌ Fons massa aclarat/fosc
- ❌ Inconsistència d'estil
- ❌ Screenshots de 500×300 (redimensionat pixelat)

---

**Última actualització:** 20 d'octubre de 2026  
**Versió:** 1.1  
**Status:** ✅ Ready to capture
