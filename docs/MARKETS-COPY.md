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
Resumeix pàgines, vídeos de YouTube, fils i PDFs amb Gemini i entén-los millor. Privat, al teu navegador i en català.
```

**Caràcters:** 117 ✅

---

### 3. Descripció llarga

**Límit:** ~3.000 caràcters

```
Resumir — Entén el que llegeixes i mires, en un clic

Cada dia obres més pestanyes de les que pots llegir. Resumir et dona un resum clar de qualsevol pàgina, vídeo de YouTube, fil o PDF, i et deixa aprofundir-hi quan en vols més. Tot al teu navegador, amb la teva pròpia clau de Google Gemini.

COM FUNCIONA

1. Obre una pàgina i clica «Resumir» (o prem Alt+Maj+S).
2. Llegeix el resum al panell lateral mentre es genera.
3. Clica una cita i la pàgina la ressalta en groc i hi va, com un Ctrl+F.

QUÈ POTS RESUMIR

• Articles i pàgines web
• Vídeos de YouTube (amb les marques de temps clicables)
• Fils de Twitter/X i discussions de Hacker News
• PDFs, de la web o del teu ordinador (amb números de pàgina enllaçats)

CINC MANERES D'ENTENDRE-HO

• Resum: l'essencial, amb punts clau i cites literals
• Aprofundiment: el context i els matisos que un resum deixa fora
• Explica-ho fàcil: el mateix, en llenguatge planer
• Validació científica: què diu el text i què en diu el consens
• Mapa conceptual: un mapa interactiu que pots ampliar, plegar i descarregar

Cada resum diu de quant text parteix i amb quin model s'ha fet, perquè sàpigues què pots creure. Els prompts els pots canviar tots.

CONSERVA-HO

• Desa el resum a Obsidian amb la teva plantilla
• Copia'l en Markdown
• Torna a veure qualsevol resum a l'historial, sense gastar res
• Genera targetes de memòria per a Anki
• Exporta i importa la configuració en un fitxer

A LA TEVA MIDA

• Lectura biònica opcional
• Temes clar, fosc, Flexoki i gris, o el del sistema
• Es pot fer servir amb el teclat i té contrast acurat

LA TEVA PRIVACITAT

• No hi ha servidor nostre, ni telemetria, ni compte, ni anuncis
• La clau d'API es queda només en aquest navegador
• El text de la pàgina només surt cap a Google Gemini quan tu demanes un resum
• La pàgina «Dades i privadesa» de la configuració t'ho mostra tot
• Codi obert (MPL-2.0)

Política de privacitat: https://github.com/xxxaau/resumir/blob/main/docs/PRIVACY_POLICY.md

COM COMENÇAR

1. Instal·la l'extensió.
2. Crea una clau d'API gratuïta de Google Gemini, sense targeta de crèdit: https://aistudio.google.com/app/apikey
3. Enganxa-la a la barra lateral i comença a resumir.

Resumir fa servir Readability.js i pdf.js de Mozilla (Apache-2.0).

Errors i suggeriments: https://github.com/xxxaau/resumir/issues
Codi font: https://github.com/xxxaau/resumir

Fet a Banyoles.
```

**Caràcters:** 2384 ✅ (dins del límit de 3.000)

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
   Per afegir «Resumir aquesta pàgina» i «Resumir la selecció» al menú contextual

🔹 sidebar_action
   Per mostrar els resums al panell lateral

Cap dada es comparteix amb tercers: l'únic destí del contingut és l'API
de Google Gemini, i només quan tu ho demanes.
```

---

### 5. Nota de versió (What's New)

Esborrany per a la **propera versió** (la xifra l'assigna el pas de release;
els canvis ja són a `main`). Ha de coincidir amb «Sobre l'extensió» (vegeu
`docs/CHANGELOG.md`).

```
Resumir — novetats

Cites clicables
• Clica una cita o un punt clau i la pàgina el ressalta en groc, com un Ctrl+F.
• Les marques de temps dels vídeos de YouTube i els números de pàgina dels PDF també són enllaços.

Més clar què has llegit
• Cada resum diu de quant text parteix i amb quin model s'ha fet, i avisa si el text s'ha tallat.
• Pestanyes per tipus amb els resums que ja tens d'aquella pàgina.
• Drecera Alt+Maj+S per obrir Resumir i resumir.

Configuració renovada
• Nova pàgina «Dades i privadesa»: on es desa cada dada, quant ocupa l'historial i còpia de seguretat de la configuració.
• Selector de model més clar, plugins agrupats com la barra d'eines i canvis pendents sempre visibles.
• Nou aspecte Flexoki (clar, fosc o segons el sistema) i una icona nova.

Arreglat
• El botó «Atura» ara atura de veritat.
• Un PDF local ja no es barreja amb resums d'altres pestanyes.
• Prompts per defecte revisats: no inventen i avisen quan no hi ha prou contingut.
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
[ ] Descripció llarga dins del límit (2.384 / 3.000)
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

**Última actualització:** 14 d'octubre de 2026
**Versió:** 4.0 (copy més clar i curt; alineat amb docs/COMUNICACIO.md i «Sobre l'extensió»)
**Status:** ✅ Llest per a la propera submissió (pendent de número de versió)
