# Market Copy — Textos per a Firefox Add-ons (AMO)

Textos en català per a la pàgina del producte a addons.mozilla.org.

---

## 🔥 FIREFOX ADD-ONS (AMO)

### 1. Títol

**Límit:** 50 caràcters
**Actual:** "Resumir" ✅ (7 caràcters)

> **Nota:** El títol ha de coincidir amb el `name` del manifest. Firefox l'agafa automàticament del fitxer.

---

### 2. Descripció breu

**Límit:** ~160 caràcters

```
Resumeix qualsevol pàgina web amb Google Gemini AI.
Suporta YouTube, Hacker News, PDF, mapa conceptual i lectura biònica.
Sense rastreig, sense telemetria, privacitat total.
```

**Caràcters:** 156 ✅

---

### 3. Descripció llarga

**Límit:** ~3.000 caràcters

```
📝 Resumir — Resums intel·ligents amb privacitat total

Una extensió de navegador que resumeix qualsevol pàgina web en segons
utilitzant la API de Google Gemini AI. Tot s'executa al teu navegador:
cap dada surt del teu ordinador excepte el text que TÚ decideixes resumir.

═══════════════════════════════════════════════════════════════

✨ FUNCIONALITATS

🎯 Resum amb IA
• Un sol clic per obtenir un resum estructurat de qualsevol pàgina
• Respostes en temps real (streaming SSE): el text apareix mentre es genera
• Trieu entre múltiples models Gemini: Flash (ràpid) o Pro (profund)
• Xat de seguiment: després del resum, podeu fer preguntes addicionals

📹 YouTube i Hacker News
• Extracció intel·ligent de transcripcions de vídeos YouTube
• Suport per subtítols automàtics (ASR) i manuals, amb detecció d'idioma
• Fils de comentaris de Hacker News resumits automàticament
• Múltiples vies de fallback per maximitzar la compatibilitat

📄 PDF amb text
• Resum de PDFs remots (HTTPS) i locals (des del vostre ordinador)
• Detecció automàtica per extensió o Content-Type
• Límit: 500 pàgines, 2 milions de caràcters, 60 segons de temps d'espera

🧠 Mapa conceptual interactiu
• Visualització jeràrquica del resum en format SVG (estil NotebookLM)
• Renderitzador natiu propi — zero dependències externes (~22 KB)
• Pan, zoom, plegar/desplegar branques, ajustar a la vista
• Exportació a PNG amb nom de fitxer intel·ligent

🔬 Validació científica
• Verifica afirmacions del text amb rigor acadèmic
• Avaluació de fiabilitat de fonts i detecció de biaixos

📖 Lectura biònica
• Mode de lectura ràpida amb nivell de fixació configurable (20–80%)
• Tipografia, gruix de negreta, mida de lletra i interlineat personalitzables

📤 Exporta a Markdown i Obsidian
• Copia el resum al porta-retalls amb plantilla personalitzable
• Envia resums directament al vault d'Obsidian amb un clic
• Format net i reutilitzable

🎨 Múltiples temes
• Sistema (segueix el tema del sistema operatiu)
• Clar, fosc, Solarized i gris clar

🧩 Sistema de plugins
• Activeu, desactiveu i reordeneu les funcionalitats des de la configuració
• Plugins inclosos: Resum, Aprofundiment, Mapa conceptual, Validació
  científica, Obsidian, Exportació Markdown, Lectura biònica

📊 Estadístiques d'ús
• Comptatge real de tokens des de l'API de Gemini
• Velocitat de generació (ms) i tokens d'entrada/sortida
• Selector de període (7 dies / 30 dies / 6 mesos / 1 any)
• Seguiment de cost per model

═══════════════════════════════════════════════════════════════

🔒 PRIVACITAT I SEGURETAT

Aquesta extensió NO fa:
❌ No recull dades personals
❌ No fa seguiment ni telemetria
❌ No envia dades a servidors propis
❌ No sincronitza dades entre dispositius
❌ No té anuncis

Aquesta extensió SÍ:
✅ La clau API s'emmagatzema localment al navegador (storage.local)
✅ Envia el text seleccionat a l'API de Google Gemini via HTTPS
✅ Guarda un historial local de resums (opcional, podeu esborrar-lo)
✅ Té el codi font públic a GitHub (MPL-2.0)

Política de privacitat completa:
https://github.com/xxxaau/extensio-resumir-contingut/blob/main/docs/PRIVACY_POLICY.md

═══════════════════════════════════════════════════════════════

🚀 COM COMENÇAR

1. Instal·leu l'extensió des de Firefox Add-ons
2. Obteniu una clau API gratuïta de Google Gemini:
   https://aistudio.google.com/app/apikey
3. Obriu Configuració > Clau API Gemini
4. Enganxeu la vostra clau
5. Visiteu qualsevol pàgina i feu clic a "Resumir"

🎁 GRATUÏT: Els usuaris nous de Google AI Studio obtenen:
• 60 peticions per minut (suficient per a ús personal)
• 300 $ de crèdit gratuït durant 90 dies
• Sense necessitat de targeta de crèdit

═══════════════════════════════════════════════════════════════

🐛 BUGS I SUGGERIMENTS

Reporteu errors:
https://github.com/xxxaau/extensio-resumir-contingut/issues

Contacte:
sergi@xaudiera.xyz

═══════════════════════════════════════════════════════════════

📄 LLICÈNCIA

Mozilla Public License 2.0 (MPL-2.0)
Codi font: https://github.com/xxxaau/extensio-resumir-contingut

═══════════════════════════════════════════════════════════════

v2.3.0 — Maig de 2026
```

**Caràcters:** ~2.800 ✅ (dins del límit de 3.000)

---

### 4. Justificació de permisos

```
Resumir necessita aquests permisos per funcionar:

🔹 activeTab
   Per accedir al contingut de la pestanya actual quan feu clic a "Resumir"

🔹 storage
   Per guardar preferències, la clau API, l'historial i la memòria cau de resums

🔹 scripting
   Per extreure text net de les pàgines (Readability.js, YouTube, PDF)

🔹 tabs
   Per obtenir la URL i el títol de la pàgina (per a les claus de la memòria cau)

🔹 menus
   Per afegir les opcions "Resumir aquesta pàgina" i "Resumir text seleccionat"
   al menú contextual del botó dret

🔹 sidebar_action
   Per obrir el panell lateral on es mostren els resums

🔹 OPINABLE: <all_urls>
   Només per extreure contingut de pàgines Hacker News quan ho sol·liciteu.
   Es demana permís explícit en aquell moment, no a la instal·lació.

Cap d'aquests permisos es comparteix amb tercers.
```

---

### 5. Nota de versió (What's New)

Llista de canvis per a la versió **2.3.0** que es mostra als usuaris existents durant l'actualització.

```
🔖 Resumir v2.3.0

🆕 Noves funcionalitats
• 📄 Suport per a PDF (remots i locals) amb extracció de text
• 🧠 Mapa conceptual interactiu natiu (SVG, zero dependències)
• 🔬 Validació científica: verificació de fonts i detecció de biaixos
• 🧩 Sistema de plugins (activeu/desactiveu funcionalitats)
• ⭐ Models favorits: selecció ràpida des del menú desplegable
• 🌐 Suport per a Chromium (Chrome, Edge, Brave): instal·lació manual

🔧 Millores
• Models reordenats: els millors models al capdavant
• Transcripcions YouTube: detecció d'idioma i selecció de pista
• Mapa conceptual: pestanya de conversa sota el mapa
• ZIPs de build nets i verificats

🐛 Correccions
• Error [008] a YouTube amb paràmetres de cerca a l'URL

🛠 Intern
• Build migrat a Node.js (ja no cal Python)
• 233 tests automatitzats
• 0 warnings AMO (seguretat)
```

---

### 6. Text de les captures de pantalla

```
Captura 1 — Panell principal:
"Panell de resum — Resum estructurat generat en temps real amb estadístiques de tokens i velocitat"

Captura 2 — Mapa conceptual:
"Mapa conceptual interactiu — Visualització jeràrquica del resum amb zoom, pan i exportació a PNG"

Captura 3 — Historial:
"Historial amb memòria cau — Accés ràpid a resums anteriors sense consumir tokens"

Captura 4 — Configuració:
"Configuració — Clau API, selecció de model, tema i sistema de plugins"

Captura 5 — YouTube:
"YouTube — Extracció automàtica de transcripcions amb generació de resums"
```

---

### 7. Categoria i metadades

| Camp | Valor |
|------|-------|
| **Categoria** | Productivitat |
| **Idioma de la interfície** | Català, Anglès |
| **Pàgina d'inici** | https://github.com/xxxaau/extensio-resumir-contingut |
| **URL de suport** | https://github.com/xxxaau/extensio-resumir-contingut/issues |
| **Política de privacitat** | https://github.com/xxxaau/extensio-resumir-contingut/blob/main/docs/PRIVACY_POLICY.md |
| **Correu de contacte** | sergi@xaudiera.xyz |
| **Llicència** | Mozilla Public License 2.0 |

---

## 🌐 CHROME — Instal·lació manual

L'extensió **no està publicada al Chrome Web Store**. Per utilitzar-la a Chrome, Edge o Brave, cal instal·lar-la manualment:

1. Baixeu el fitxer `resumir-contingut-vX.X.X-chromium.zip` de la secció **Releases** del GitHub:
   https://github.com/xxxaau/extensio-resumir-contingut/releases
2. Descomprimiu el fitxer en una carpeta
3. Obriu `chrome://extensions`
4. Activeu el **Mode de desenvolupador** (interruptor a dalt a la dreta)
5. Feu clic a **Carrega extensió desempaquetada** i seleccioneu la carpeta descomprimida

> **Nota:** En obrir el navegador, de vegades Chrome us demanarà si voleu desactivar l'extensió. Feu clic a "Mantén-la activada". Per evitar aquest avís, podeu instal·lar-la des de la Chrome Web Store si està disponible. Alternativament, feu clic dret a la icona de l'extensió a la barra d'eines, seleccioneu "Gestiona l'extensió" i activeu l'opció "Permís en mode d'incògnit" si cal.

---

## ✅ LLISTA DE VERIFICACIÓ

```
[ ] Títol correcte
[ ] Descripció breu dins del límit de caràcters
[ ] Descripció llarga dins del límit (~2.800 / 3.000)
[ ] Enllaços funcionen (GitHub, issues, privacitat)
[ ] Permisos justificats
[ ] Release notes actualitzades
[ ] 5 captures de pantalla 1280×800 PNG
[ ] Textos de les captures preparats
[ ] Català correcte (sense errors)
[ ] Política de privacitat enllaçada
[ ] Codi font públic
[ ] Informació de llicència completa
```

---

**Última actualització:** 27 de maig de 2026
**Versió:** 2.0
**Status:** ✅ Ready for submission
