# Market Copy — Textos per a Firefox Add-ons (AMO)

Textos en català per a la pàgina del producte a addons.mozilla.org.
Alineats amb la proposta de valor de `docs/COMUNICACIO.md` (pipeline de
coneixement: captura → 5 lents → consolidació; confiança radical com a capa
de valors).

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
Converteix articles, vídeos de YouTube, fils i PDFs en coneixement: resums,
mapes conceptuals i validació científica. Privat, local i en català.
```

**Caràcters:** 144 ✅

---

### 3. Descripció llarga

**Límit:** ~3.000 caràcters

```
📝 Resumir — Del contingut al coneixement, en un clic

Cada dia obres més pestanyes de les que pots llegir. Resumir converteix
qualsevol cosa que llegeixes o mires — articles, vídeos, fils, PDFs — en
coneixement estructurat, comprensible i teu. Al teu navegador, amb la teva
clau de Gemini, sense intermediaris.

═══════════════════════════════

📥 CAPTURA QUALSEVOL CONTINGUT

Si ho pots obrir al navegador, ho pots aprofitar:
• Articles i pàgines web (extracció neta del text)
• Vídeos de YouTube (transcripcions, també automàtiques)
• Fils de Twitter/X i discussions de Hacker News (article + comentaris)
• PDFs remots i locals (amb capa de text)

🔍 CINC LENTS PER ENTENDRE

No un resum: la comprensió que necessites en cada moment.
• Resum — l'essencial, estructurat i en temps real (streaming)
• Aprofundiment — el context i els matisos que un resum no dona
• Explica-ho fàcil — qualsevol tema en llenguatge planer
• Validació científica — afirmacions verificades, fonts avaluades,
  biaixos detectats
• Mapa conceptual — visualització interactiva amb zoom, plegat de
  branques i exportació a PNG

Tots els prompts són 100 % personalitzables.

📚 CONEIXEMENT QUE PERDURA

El que entens avui, ho trobes demà:
• Envia resums a Obsidian amb plantilla configurable
• Copia en Markdown net i reutilitzable
• Historial i memòria cau local: resums anteriors a l'instant
• Estadístiques de tokens i cost per model

📖 LLEGIBILITAT A LA TEVA MIDA

• Lectura biònica configurable (fixació, tipografia, mida, interlineat)
• 5 temes: sistema, clar, fosc, solarized i gris
• Navegable per teclat i amb contrast acurat (WCAG)

═══════════════════════════════

🔒 CONFIANÇA RADICAL

Aquesta extensió NO fa:
❌ No recull dades personals ni fa telemetria
❌ No envia dades a servidors propis (no en té)
❌ No demana cap compte ni subscripció
❌ No té anuncis

Aquesta extensió SÍ:
✅ Guarda la clau API i totes les dades només al teu navegador
✅ Envia el contingut només a l'API de Google Gemini (HTTPS), quan tu ho demanes
✅ Codi obert (MPL-2.0), auditable per qualsevol

Política de privacitat completa:
https://github.com/xxxaau/resumir/blob/main/docs/PRIVACY_POLICY.md

═══════════════════════════════

🚀 COM COMENÇAR

1. Instal·la l'extensió
2. Obtén una clau API gratuïta de Google Gemini (sense targeta de crèdit):
   https://aistudio.google.com/app/apikey
3. Enganxa-la a Configuració › Clau API Gemini
4. Obre qualsevol pàgina i clica «Resumir»

═══════════════════════════════

🙏 CONSTRUÏT SOBRE ESPATLLES DE GEGANTS

Resumir existeix gràcies a aquests projectes open source:
• Readability.js (Mozilla, Apache-2.0) — extracció d'articles
• pdf.js (Mozilla, Apache-2.0) — lectura de PDFs

🐛 Errors i suggeriments:
https://github.com/xxxaau/resumir/issues

📄 Llicència MPL-2.0 — codi font:
https://github.com/xxxaau/resumir

Fet a Banyoles ❤️
```

**Caràcters:** 2957 ✅ (dins del límit de 3.000)

---

### 4. Justificació de permisos

> ⚠️ Actualitzat (juny 2026): `<all_urls>` ara és un permís de host REQUERIT
> al manifest (es concedeix a la instal·lació), ja NO és opcional en temps
> d'execució. La justificació ha de reflectir-ho.

```
Resumir necessita aquests permisos per funcionar:

🔹 Accés a totes les pàgines (<all_urls>)
   Per llegir el contingut de la pàgina que demanes resumir — i pot ser
   qualsevol pàgina. Es concedeix a la instal·lació perquè el resum
   funcioni sense un avís de permís a cada lloc. El contingut es llegeix
   NOMÉS quan cliques «Resumir» i s'envia NOMÉS a l'API de Google Gemini.

🔹 activeTab
   Per identificar la pestanya que vols resumir (URL i títol)

🔹 storage
   Per guardar preferències, la clau API, l'historial i la memòria cau

🔹 scripting
   Per extreure el text net de les pàgines (Readability, YouTube, PDF)

🔹 tabs
   Per obtenir la URL i el títol de la pàgina (claus de la memòria cau)

🔹 menus
   Per afegir «Resumir» i «Resumir text seleccionat» al menú contextual

🔹 sidebar_action
   Per mostrar els resums al panell lateral

Cap dada es comparteix amb tercers: l'únic destí del contingut és l'API
de Google Gemini, i només quan tu ho demanes.
```

---

### 5. Nota de versió (What's New)

Esborrany per a la **propera versió** (número pendent de bump; els canvis ja
són a `main`).

```
🔖 Resumir — propera versió

🛠 Edge i Chrome, ara de debò
• Arreglat el bug que feia que la icona no obrís el panell lateral
  (Chromium/Edge moderns exposen un global `browser` que confonia la
  detecció de navegador)
• Selector de models llegible a la barra inferior, amb focus de teclat
  visible
• L'extracció de fils de Twitter/X funciona també als paquets publicats

🔑 Permisos més simples
• L'accés a les pàgines es concedeix una sola vegada a la instal·lació:
  adéu a l'avís de permís a cada lloc nou
• ⚠️ En actualitzar, el navegador et demanarà re-aprovar els permisos:
  és normal i només passa aquesta vegada

📖 Llegibilitat
• La lectura biònica manté la mida coherent a tot arreu (en generar,
  a l'historial i en canviar la configuració)
• El mapa conceptual s'obre amb l'enquadrament ideal, sense haver
  d'allunyar el zoom a mà

💬 Errors més clars
• Les pàgines restringides del navegador ara expliquen el motiu real
  en lloc de suggerir recarregar
```

---

### 6. Text de les captures de pantalla

```
Captura 1 — Panell principal:
"Del contingut al coneixement — resum estructurat generat en temps real"

Captura 2 — Mapa conceptual:
"Mapa conceptual interactiu — zoom, plegat de branques i exportació a PNG"

Captura 3 — Historial:
"El que entens avui, ho trobes demà — historial amb memòria cau local"

Captura 4 — Configuració:
"Cinc lents personalitzables — cada prompt és teu"

Captura 5 — YouTube:
"YouTube — de la transcripció del vídeo al resum en segons"
```

---

### 7. Categoria i metadades

| Camp | Valor |
|------|-------|
| **Categoria** | Productivitat |
| **Idioma de la interfície** | Català |
| **Pàgina d'inici** | https://github.com/xxxaau/resumir |
| **URL de suport** | https://github.com/xxxaau/resumir/issues |
| **Política de privacitat** | https://github.com/xxxaau/resumir/blob/main/docs/PRIVACY_POLICY.md |
| **Correu de contacte** | sergi@xaudiera.xyz |
| **Llicència** | Mozilla Public License 2.0 |

---

## 🌐 CHROME — Instal·lació manual

L'extensió **no està publicada al Chrome Web Store**. Per utilitzar-la a Chrome, Edge o Brave, cal instal·lar-la manualment:

1. Baixa el fitxer `resumir-contingut-vX.X.X-chromium.zip` de la secció **Releases** del GitHub:
   https://github.com/xxxaau/resumir/releases
2. Descomprimeix el fitxer en una carpeta
3. Obre `chrome://extensions`
4. Activa el **Mode de desenvolupador** (interruptor a dalt a la dreta)
5. Fes clic a **Carrega extensió desempaquetada** i selecciona la carpeta descomprimida

> **Nota:** En obrir el navegador, de vegades Chrome demana si vols desactivar l'extensió. Fes clic a «Mantén-la activada».

> ⚠️ **Actualització amb permisos nous:** en passar a una versió amb `<all_urls>` requerit, Chrome/Edge desactiven l'extensió fins que re-aprovis els permisos («L'extensió necessita permisos nous»). És el comportament estàndard del navegador; cal explicar-ho a les notes de versió.

---

## ✅ LLISTA DE VERIFICACIÓ

```
[ ] Títol correcte
[ ] Descripció breu dins del límit de caràcters
[ ] Descripció llarga dins del límit (~2.600 / 3.000)
[ ] Enllaços funcionen (GitHub, issues, privacitat)
[ ] Permisos justificats (⚠️ <all_urls> ara és REQUERIT — text actualitzat)
[ ] Release notes actualitzades (inclou avís de re-aprovació de permisos)
[ ] 5 captures de pantalla 1280×800 PNG
[ ] Textos de les captures preparats
[ ] Català correcte (sense errors)
[ ] Política de privacitat enllaçada
[ ] Codi font públic
[ ] Informació de llicència completa
```

---

**Última actualització:** 12 de juny de 2026
**Versió:** 3.0 (alineat amb docs/COMUNICACIO.md)
**Status:** ✅ Llest per a la propera submissió (pendent de número de versió)
