# Screenshots Guide — Captura i Optimització

Guia pràctica per a crear screenshots de qualitat professional per a Firefox Add-ons i Chrome Web Store.

---

## 📐 REQUISITS TÈCNICS

### Firefox Add-ons (AMO)

| Aspect | Especificació |
|--------|--------------|
| **Resolució** | 1280×800 pixels (OBLIGATORI) |
| **Format** | PNG, JPG, JPEG |
| **Mida màxima** | 5 MB per fitxer |
| **Nombre** | 1-5 screenshots (recomanat 3) |
| **Aspect ratio** | 16:9 (1280÷800 = 1.6) |

### Chrome Web Store

| Aspect | Especificació |
|--------|--------------|
| **Resolució** | 1280×800 pixels (OBLIGATORI) |
| **Format** | PNG, JPG |
| **Mida màxima** | 5 MB per fitxer |
| **Nombre** | 1-5 screenshots |
| **Aspect ratio** | 16:9 (1280÷800 = 1.6) |

---

## 📸 ESTRUCTURA DE SCREENSHOTS

### Screenshot 1: Panell Principal (Main Panel)
**Objectiu:** Mostrar feature principal — **Generació de Resums**

#### Contingut a mostrar:
- 📍 **URL barra:** Pàgina exemple (ex: `wikipedia.org/wiki/...`)
- 📍 **Panell lateral:** Resum generat
- 📍 **Botó de còpia:** Visible
- 📍 **Estadístiques:** Tokens, temps

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
     - ✅ Botó "Copia a Markdown" visible
     - ✅ Estadístiques (tokens, ms) visibles

#### Design Tips:
- **Fons:** Panell fosc (tema "Dark" o "System" en mode dark)
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
- 📍 **Pestanya "Settings"** de l'extensió
- 📍 **Campo API Key** (sense mostrar clau real!)
- 📍 **Selector de tema** amb opcions visibles
- 📍 **Checkbox d'historial**
- 📍 **Link privacitat**

#### Passos per capturar:

1. Clica **extension icon** a toolbar
2. Clic **⚙️ Settings / Configuració**
3. S'obri full options en pestanya nova
4. **Mostra:** 
   - Camp "API Key" (deixa buit o usa placeholder "••••••••••••")
   - Dropdown temes (expandi per veure opcions)
   - Checkbox "Enable history"
5. **Captura:** Pantalla 1280×800
   - ✅ Tots els camps visibles
   - ✅ Tema selecionat (recomanat: "Dark")
   - ✅ Text legible

#### Design Tips:
- **Tema:** Usa tema "Light" per contrast (fons blanc)
- **Colores:** Ressalta botó "Save" en blau/verd
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
- 📍 **Pestanya Historial** amb múltiples entrades
- 📍 **URLs de pàgines anteriors**
- 📍 **Preview del resum cachejat**
- 📍 **Timestamps**
- 📍 **Botó eliminar (trash icon)**

#### Passos per capturar:

1. Extensió oberta → clica pestanya **"History"**
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
- **Colores:** Usa tema "Dark" per contrast
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
- Slider de "Fixation level"
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
   - "Nimbus Screenshot" (Chrome Web Store)
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

```
📁 icons/ (for marketing/documentation screenshots)
├── cws-screenshot-1.png          (Main panel)
├── cws-screenshot-2.png          (Settings)
├── cws-screenshot-3.png          (History)
├── amo-screenshot-1.png          (idem)
├── amo-screenshot-2.png          (idem)
└── amo-screenshot-3.png          (idem)

// Noms alternatius acceptats:
// screenshot-main.png
// screenshot-settings.png
// screenshot-history.png
```

---

## 🚀 SUBMISSIÓ

### Firefox Add-ons (AMO)
1. Accedir a developer.mozilla.org/firefox
2. Vés a Edit › Add images
3. Upload 3 PNG/JPG (1280×800 cada)
4. **Orden important:** Mostren en aquest ordre als llistats

### Chrome Web Store
1. Accedir a developer.chrome.com/webstore
2. Vés a Store listing › Images
3. Upload 3-5 screenshots
4. **CWS reordena per preview** (primera com a hero)

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

**Última actualització:** 19 de maig de 2026  
**Versió:** 1.0  
**Status:** ✅ Ready to capture
