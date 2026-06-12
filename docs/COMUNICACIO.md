# Proposta de valor i pla de comunicació

> Document de disseny (2026-06-12). Base per al web propi de Resumir i per
> alinear README, listing d'AMO i materials de difusió. Posicionament aprovat:
> **pipeline de coneixement** com a columna vertebral, **confiança radical** com
> a capa de valors, **estalvi de temps** com a benefici quantificat.

## 1. Proposta de valor

**Essència:**

> Resumir converteix qualsevol cosa que llegeixes o mires — articles, vídeos,
> fils, PDFs — en coneixement estructurat, comprensible i teu. Al navegador,
> amb la teva clau, sense intermediaris.

**Claims** (per ordre de preferència; el primer és el del hero del web):

1. **«Del contingut al coneixement, en un clic.»**
2. «Llegeix menys. Entén més. Conserva-ho tot.»
3. «El teu segon cervell comença al navegador.»

**Elevator pitch (30 segons):**

> Cada dia obres més pestanyes de les que pots llegir. Resumir les converteix
> en coneixement: extreu el contingut de qualsevol pàgina, vídeo de YouTube,
> fil de Twitter o PDF, i te'l serveix amb la lent que necessites — un resum,
> un aprofundiment, una explicació planera, una validació científica o un mapa
> conceptual. I quan ho has entès, ho consolides: a Obsidian, a Markdown, al
> teu historial. Tot passa al teu navegador amb la teva clau de Gemini: cap
> servidor intermedi, cap telemetria, codi obert. Fet a Banyoles.

## 2. Arquitectura del missatge: els tres moments del pipeline

La jerarquia narrativa és sempre: **què fa** (pipeline) → **per què confiar-hi**
(local, obert, teu) → **què hi guanyes** (temps).

| Moment | Promesa | Funcionalitats que ho demostren |
|---|---|---|
| **📥 Captura universal** | «Si ho pots obrir al navegador, ho pots aprofitar» | Articles (Readability), YouTube (transcripcions amb 3 vies de fallback), Twitter/X (fils), Hacker News (article + comentaris), PDFs remots i locals |
| **🔍 Cinc lents per entendre** | «No un resum: la comprensió que necessites en cada moment» | Resum · Aprofundiment · Explica-ho fàcil · Validació científica · Mapa conceptual interactiu — amb prompts 100 % personalitzables |
| **📚 Coneixement que perdura** | «El que entens avui, ho trobes demà» | Export a Obsidian i Markdown, historial, caché instantània, estadístiques d'ús |

**Capa transversal — Confiança radical** (el «per què tu»):

- **Local de veritat**: la clau API i les dades no surten del navegador; cap servidor propi.
- **Zero telemetria**: cap analítica, cap compte, cap seguiment.
- **Codi obert** (MPL-2.0) i gratuït.
- **Accessible**: WCAG (focus visible, contrast, temes), lectura biònica.
- **En català**, fet a Banyoles.

## 3. Angles per públic

Mateixa proposta de valor; cada públic entra per una porta diferent.

| Públic | Dolor | Missatge d'entrada | Funcionalitats estrella |
|---|---|---|---|
| **Recerca / acadèmia** | La revisió de literatura es menja setmanes | «Sistematitza la revisió de literatura: del PDF a la fitxa d'Obsidian amb validació metodològica» | PDFs, Validació científica, Aprofundiment, export Obsidian |
| **Estudiants** | Temes densos, poc temps, apunts dispersos | «Entén qualsevol tema a la primera i estudia'l amb mapes conceptuals» | Explica-ho fàcil, Mapa conceptual, lectura biònica |
| **Professionals del coneixement** | Vigilància informativa impossible de seguir | «Els 20 articles i fils del matí, en 10 minuts i amb criteri» | Resum 1-clic, fils de Twitter/HN, YouTube, caché |
| **Comunitat PKM / Obsidian** | Capturar sense fricció cap a la bóveda | «El pont entre el que navegues i el teu segon cervell» | Plantilles Obsidian/Markdown, historial, prompts propis |

## 4. Pla de comunicació

Objectiu principal: **credibilitat del projecte** (entitat pròpia, marca,
carta de presentació). Estratègia d'idioma: **català primer, anglès després**
(quan arribi l'i18n del backlog).

### Fase 1 — Fonaments (projecte següent: el web propi)

- Domini propi + web estàtic **en català**:
  - Hero amb el claim 1 + demo visual (GIF del mapa conceptual i del streaming).
  - Secció «els tres moments» (pipeline) i les 5 lents.
  - Secció de privadesa en positiu: «què NO fem».
  - Descàrrega: Firefox (1 clic, AMO) i Chromium (guiat pas a pas des de GitHub Releases — la fricció s'ha d'explicar molt bé).
  - FAQ + changelog públic.
- **El web mateix com a prova**: ràpid, accessible WCAG, sense cookies ni
  analítica invasiva. Predicar amb l'exemple és l'argument de credibilitat
  més barat.
- Alinear README i listing d'AMO amb el nou missatge (avui són llistes de
  funcionalitats, no proposta de valor).

### Fase 2 — Llançament en català

- Post de presentació personal: «Per què he fet Resumir» (problema real →
  solució oberta; la història dona credibilitat).
- Canals: Mastodon/Bluesky tech en català, Softcatalà (directori i difusió),
  comunitats universitàries i de recerca catalanes.
- 3-4 peces de contingut, una per públic: «Com faig la revisió de literatura
  amb Resumir», «Estudiar amb mapes conceptuals», «La meva vigilància
  informativa en 10 minuts», «De la pestanya a la bóveda d'Obsidian».

### Fase 3 — Internacionalització

- Versió EN del web (després de l'i18n de la UI, vegeu BACKLOG).
- Comunitat Obsidian (fòrum, Discord) amb l'angle PKM.
- «Show HN» a Hacker News i Product Hunt.
- Valorar publicació al Chrome Web Store (avui només GitHub Releases).

### Mesura d'èxit (credibilitat, no volum)

- Domini propi actiu amb el web de fase 1.
- Captures i demos de qualitat publicades.
- Menció a Softcatalà o a un mitjà tech català.
- Primeres estrelles i contribucions externes al GitHub.

## 5. Inventari de funcionalitats (font de veritat per al copy)

Per evitar que el copy prometi coses que no hi són (o n'ometi):

- Resum amb streaming en temps real (1 clic o menú contextual).
- 5 tipus de contingut: Resum, Aprofundiment, Mapa conceptual, Validació
  (científica), Explica-ho fàcil — tots amb prompt editable.
- Extractors especialitzats: YouTube (transcripcions, 3 fallbacks), Hacker
  News (article + comentaris), Twitter/X (Defuddle), PDFs (pdf.js; HTTPS
  remots i locals; escanejats NO suportats — no prometre OCR).
- Mapa conceptual interactiu: pan/zoom, plegat de branques, pantalla
  completa, export PNG. Renderitzador SVG propi.
- Lectura biònica configurable (fixació, font, mida, interlineat).
- Export: Obsidian (plantilla configurable) i Markdown.
- Historial + caché local (30 dies) + estadístiques de tokens/cost.
- 5 temes (sistema/clar/fosc/solarized/gris) + accessibilitat WCAG.
- Firefox + Chrome/Edge/Brave (MV3). Cal API key gratuïta de Google Gemini.
- NO té: OCR, suport de documents Office online (al backlog), i18n (al
  backlog), publicació al Chrome Web Store.
