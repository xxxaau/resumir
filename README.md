# ![Icona](icons/icon-48.png) Resumir

**Del contingut al coneixement, en un clic.**

Resumir és una extensió de navegador que converteix qualsevol cosa que llegeixes o mires — articles, vídeos, fils, PDFs — en coneixement estructurat, comprensible i teu. Al teu navegador, amb la teva clau de Google Gemini, sense intermediaris: cap servidor propi, cap telemetria, cap seguiment.

[![Disponible a Firefox Add-ons](https://img.shields.io/badge/Firefox-Descarregar-FF7139?logo=firefox-browser)](https://addons.mozilla.org/en-US/firefox/addon/resumir)
[![Baixar de GitHub Releases](https://img.shields.io/badge/Chrome-Descarregar-4285F4?logo=googlechrome)](https://github.com/xxxaau/extensio-resumir-contingut/releases)
[![Llicència MPL-2.0](https://img.shields.io/badge/Llicència-MPL--2.0-blue)](LICENSE)
[![CI](https://github.com/xxxaau/extensio-resumir-contingut/actions/workflows/ci.yml/badge.svg)](https://github.com/xxxaau/extensio-resumir-contingut/actions/workflows/ci.yml)
[![Sponsor](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?logo=githubsponsors)](https://github.com/sponsors/xxxaau)

---

## 📥 Captura qualsevol contingut

Si ho pots obrir al navegador, ho pots aprofitar:

- **Articles i pàgines web** — extracció neta del text (Readability)
- **YouTube** — transcripcions, també amb subtítols automàtics (3 vies de fallback per maximitzar compatibilitat)
- **Twitter/X** — fils complets (scrape del DOM amb fallback a meta `og:description`)
- **Hacker News** — article enllaçat + fil de comentaris
- **PDFs** — remots (HTTPS, descàrrega automàtica) i locals (botó «Selecciona PDF local»). Cal capa de text; PDFs escanejats no suportats (sense OCR)

## 🔍 Cinc lents per entendre

No un resum: la comprensió que necessites en cada moment. Amb streaming en temps real i **tots els prompts 100 % personalitzables**:

| Lent | Què et dona |
|---|---|
| **Resum** | L'essencial, estructurat i en segons |
| **Aprofundiment** | El context i els matisos que un resum no dona |
| **Explica-ho fàcil** | Qualsevol tema en llenguatge planer |
| **Validació científica** | Afirmacions verificades, fonts avaluades, biaixos detectats |
| **Mapa conceptual** | Visualització interactiva (pan, zoom, plegat de branques, export PNG) amb renderitzador SVG propi de ~22 KB |

## 📚 Coneixement que perdura

El que entens avui, ho trobes demà:

- **Obsidian** — envia resums a la teva bóveda amb plantilla configurable
- **Markdown** — copia net i reutilitzable
- **Historial + memòria cau local** — els resums anteriors carreguen a l'instant (30 dies)
- **Estadístiques** — tokens i cost per model, amb selector de període

## 📖 Llegibilitat a la teva mida

- **Lectura biònica** configurable (fixació, tipografia, mida, interlineat)
- **5 temes**: sistema, clar, fosc, solarized i gris
- **Accessible**: navegable per teclat, focus visible, contrast WCAG

---

## Instal·lació

### Firefox

L'extensió es distribueix **exclusivament** via Mozilla Add-ons:

1. Visita [addons.mozilla.org/en-US/firefox/addon/resumir](https://addons.mozilla.org/en-US/firefox/addon/resumir/)
2. Fes clic a «Afegir a Firefox»

### Chrome / Edge / Brave

L'extensió **no està al Chrome Web Store**. Per instal·lar-la:

1. Ves a la secció **Releases** del GitHub:
   https://github.com/xxxaau/extensio-resumir-contingut/releases
2. Baixa el fitxer `resumir-contingut-vX.X.X-chromium.zip` de l'última versió
3. Descomprimeix-lo en una carpeta
4. Obre `chrome://extensions` i activa el «Mode de desenvolupador»
5. Fes clic a «Carrega extensió desempaquetada» i selecciona la carpeta

> **Consell:** Després de cada actualització, repeteix el procés amb el nou ZIP. Les dades (clau API, historial, preferències) es conserven.

## Configuració

1. Obre la barra lateral o vés a **Extensions › Resumir › Opcions**
2. Enganxa la teva **API Key de Google Gemini** (gratuïta a [aistudio.google.com](https://aistudio.google.com/app/apikey), sense targeta de crèdit)
3. Desa els canvis i comença a resumir

---

## Privadesa i seguretat

**Confiança radical**: el teu coneixement és teu. Literalment.

- **Sense seguiment ni telemetria**: la clau API, les preferències, l'historial i la caché viuen només al teu navegador (`storage.local`)
- **Sense servidors propis**: el contingut s'envia directament a l'API de Google Gemini (HTTPS), i només quan tu cliques «Resumir»
- **Permís d'accés a pàgines** (`<all_urls>`): es concedeix a la instal·lació perquè puguis resumir qualsevol pàgina sense un avís de permís a cada lloc. L'extensió només llegeix el contingut quan tu ho demanes — mai en segon pla
- **Seguretat**: CSP restrictiva, protecció contra contingut no fiable als prompts, vendors verificats per hash (SHA-256)

Llegeix la [Política de privadesa](docs/PRIVACY_POLICY.md) per a més detalls.

---

## Construït sobre espatlles de gegants 🙏

Resumir existeix gràcies a aquests projectes open source, que mereixen tot el crèdit:

| Projecte | Autor | Llicència | Què hi aporta |
|---|---|---|---|
| [Readability.js](https://github.com/mozilla/readability) | Mozilla (orig. Arc90) | Apache-2.0 | L'extracció d'articles — el mateix motor que el mode lectura del Firefox |
| [pdf.js](https://github.com/mozilla/pdf.js) | Mozilla | Apache-2.0 | La lectura de PDFs al navegador |
| [markmap](https://markmap.js.org/) + [D3](https://d3js.org/) | markmap team / Mike Bostock | MIT / ISC | La inspiració del mapa conceptual (avui substituïts per un renderitzador SVG propi, però en van ser la llavor) |

I en el desenvolupament: [esbuild](https://esbuild.github.io/), [ESLint](https://eslint.org/), [Playwright](https://playwright.dev/), [jsdom](https://github.com/jsdom/jsdom), [c8](https://github.com/bcoe/c8) i [PDFKit](https://pdfkit.org/).

Les versions exactes i els hashes de verificació són a [`VENDORS.md`](VENDORS.md).

---

## Arquitectura

```
manifest.base.json          # Configuració MV3 compartida (Firefox + Chromium)
ext.js                      # Wrapper cross-browser (Firefox ↔ Chromium)
background.js               # Service worker i menú contextual
sidebar/
  sidebar.js                # Orquestrador principal
  summary.js                # Lògica de generació
  api.js                    # Client de streaming Gemini (SSE)
  content.js                # Extracció de text (YouTube amb 3 vies, HN, Readability)
  cache.js                  # Caché local i estadístiques
  history.js                # Historial de resums
  markmap-native.js         # Renderitzador SVG natiu del mapa conceptual
  conceptmap.js             # Orquestrador del mapa (sidebar + fullscreen)
  conceptmap-filename.js    # Generador del nom de fitxer PNG (funció pura)
options/                    # Pàgina de configuració
shared/                     # Models i valors per defecte compartits
tests/                      # 243 tests unitaris i d'integració
```

Consulta [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md) per a mapa de projectes, [docs/MODELS-WORKFLOW.md](docs/MODELS-WORKFLOW.md) per a detalls tècnics d'API i models, o [docs/CONCEPTMAP-FEATURES.md](docs/CONCEPTMAP-FEATURES.md) per al disseny del mapa conceptual.

---

## Desenvolupament

```bash
# Executar els tests
npm test

# Lint + tests
npm run check

# Compilar per a tots els navegadors
npm run build

# Carpeta dev per a Edge/Chrome (carrega-la desempaquetada a edge://extensions)
npm run dev:chromium

# Verificació completa pre-release (lint + tests + manifests)
npm run prerelease

# Activar mode desenvolupament (icones DEV)
npm run dev

# Tornar a mode producció
npm run prod
```

> **Firefox:** carrega l'arrel del projecte (`manifest.json`) des de `about:debugging#/runtime/this-firefox`.
> **Edge/Chrome:** el `manifest.json` de l'arrel és el de Firefox — fes servir `npm run dev:chromium` i carrega la carpeta `build_chromium_dev/`.

---

## Contribucions

Les contribucions són benvingudes! Consulta:

- [Guia de contribució](docs/CONTRIBUTING.md) — com començar
- [Codi de conducta](docs/CODE_OF_CONDUCT.md) — normes de la comunitat
- [Backlog de millores](docs/BACKLOG.md) — funcionalitats pendents
- [Issues](https://github.com/xxxaau/extensio-resumir-contingut/issues) — reporta bugs o demana funcionalitats
- [Discussions](https://github.com/xxxaau/extensio-resumir-contingut/discussions) — preguntes generals

## Reportar bugs

Si trobes un error, obre una [issue](https://github.com/xxxaau/extensio-resumir-contingut/issues/new/choose)
i inclou: navegador/versió, passos per reproduir, comportament real vs. esperat.

---

## Sponsors

Resumir és programari lliure i gratuït. Si l'extensió et resulta útil,
considera fer una donació per donar suport al seu desenvolupament:

[![Sponsor](https://img.shields.io/badge/GitHub_Sponsors-xxxaau-ea4aaa?logo=githubsponsors)](https://github.com/sponsors/xxxaau)

Consulta [docs/SPONSORS.md](docs/SPONSORS.md) per a més informació.

---

## Llicència

[Mozilla Public License 2.0 (MPL-2.0)](LICENSE)

---

Fet amb ❤️ a Banyoles
