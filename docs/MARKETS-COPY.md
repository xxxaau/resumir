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

**Límit:** ~160 caràcters (AMO) · 132 (Chrome)

```
Resumeix pàgines, vídeos de YouTube i PDFs amb Gemini. Privat, al teu navegador i en català.
```

**Caràcters:** 92 ✅

---

### 3. Descripció llarga

**Límit:** ~3.000 caràcters

```
Resumir — Entén el que llegeixes i mires, en un clic

Resumeix articles, vídeos de YouTube, fils i PDFs al panell lateral del navegador, amb la teva pròpia clau gratuïta de Google Gemini.

• Un resum clar amb punts clau i cites: clica una cita i la pàgina la ressalta en groc.
• Aprofundiment, explicació fàcil, validació científica i mapa conceptual quan en vols més.
• Desa'l a Obsidian, copia'l en Markdown o torna-hi des de l'historial.

PRIVAT PER DISSENY

Sense servidor propi, telemetria, compte ni anuncis. La clau es queda al teu navegador i el text només va a Google Gemini quan demanes un resum. Codi obert (MPL-2.0).

COM COMENÇAR

1. Instal·la l'extensió.
2. Crea una clau gratuïta de Gemini, sense targeta: https://aistudio.google.com/app/apikey
3. Enganxa-la al panell i clica «Resumir» (o prem Alt+Maj+S).

Política de privacitat: https://github.com/xxxaau/resumir/blob/main/docs/PRIVACY_POLICY.md
Errors i suggeriments: https://github.com/xxxaau/resumir/issues
Codi font: https://github.com/xxxaau/resumir

Fet a Banyoles.
```

**Caràcters:** 1040 ✅ (molt per sota dels 3.000)

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
   Per llegir la URL i el títol de la pestanya activa i detectar canvis de pestanya o navegació (memòria cau, pestanyes per tipus i estat en repòs)

🔹 menus
   Per afegir «Resumir aquesta pàgina» i «Resumir la selecció» al menú contextual

🔹 sidebar_action
   Per mostrar els resums al panell lateral

Cap dada es comparteix amb tercers: l'únic destí del contingut és l'API
de Google Gemini, i només quan tu ho demanes.
```

---

### 5. Nota de versió (What's New)

Per a la **darrera versió publicada** (`npm run release:notes` imprimeix la secció
completa del CHANGELOG, a punt per enganxar). Ha de coincidir amb «Sobre l'extensió»
(vegeu `docs/CHANGELOG.md`). Text curt per a AMO (v2.7.2):

```
Resumir — novetats

• La lletra del resum creix amb l'amplada de la barra lateral, també amb la lectura biònica.
• Als vídeos de YouTube, la secció «Cites» porta minut i segon clicables, també amb transcripció automàtica.
• Als fils de Hacker News, una cita de l'article enllaçat obre l'article amb la frase ressaltada.
• La clau d'API ja no fa saltar el gestor de contrasenyes.
```

---

### 6. Text de les captures de pantalla

```
Captura 1 — Resum amb cites clicables:
"Un resum clar, amb cites que la pàgina ressalta en groc"

Captura 2 — Mapa conceptual:
"Mapa conceptual interactiu: amplia, plega i descarrega"

Captura 3 — YouTube:
"De la transcripció del vídeo al resum, amb marques de temps clicables"

Captura 4 — Configuració:
"Cinc maneres d'entendre un text, i els prompts són teus"

Captura 5 — Dades i privadesa:
"Veus on es desa cada dada: res no surt del teu navegador, tret de Gemini"
```

---

### 7. Categoria i metadades

| Camp | Valor |
|------|-------|
| **Categoria** | Productivitat |
| **Idioma de la interfície** | Català |
| **Pàgina d'inici** | https://xxxaau.github.io/resumir/ |
| **URL de suport** | https://github.com/xxxaau/resumir/issues |
| **Política de privacitat** | https://github.com/xxxaau/resumir/blob/main/docs/PRIVACY_POLICY.md |
| **Correu de contacte** | sergi@xaudiera.xyz |
| **Llicència** | Mozilla Public License 2.0 |

---

## 🌐 CHROME — Instal·lació manual

L'extensió **no es publica al Chrome Web Store**. Per utilitzar-la a Chrome, Edge o Brave, cal instal·lar-la manualment:

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
[ ] Descripció llarga dins del límit (~1.000 / 3.000)
[ ] Enllaços funcionen (GitHub, issues, privacitat)
[ ] Permisos justificats (⚠️ <all_urls> ara és REQUERIT — text actualitzat)
[ ] Release notes actualitzades (`npm run release:notes`)
[ ] 5 captures de pantalla 1280×800 PNG
[ ] Textos de les captures preparats
[ ] Català correcte (sense errors)
[ ] Política de privacitat enllaçada
[ ] Codi font públic
[ ] Informació de llicència completa
```

---

**Última actualització:** 14 d'octubre de 2026
**Versió:** 4.0 (copy més clar i curt; alineat amb docs/COMUNICACIO.md i «Sobre l'extensió»)
**Status:** ✅ Alineat amb la v2.7.2
