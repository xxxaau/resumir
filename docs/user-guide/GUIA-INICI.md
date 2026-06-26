# Guia d'inici de Resumir

Resumir converteix qualsevol cosa que llegeixes o mires —articles, vídeos, fils,
PDFs— en coneixement estructurat. Al navegador, amb la teva clau, sense
intermediaris: cap servidor propi, cap telemetria, codi obert.

Aquesta guia et posa en marxa en pocs minuts.

---

## 1. Instal·la l'extensió

**Firefox**
Vés a [addons.mozilla.org/firefox/addon/resumir-contingut](https://addons.mozilla.org/firefox/addon/resumir-contingut/),
clica **«Afegeix a Firefox»** i accepta els permisos.

**Chrome / Edge / Brave**
Descarrega l'últim paquet des de
[Releases](https://github.com/xxxaau/extensio-resumir-contingut/releases) i segueix-hi
les instruccions d'instal·lació.

---

## 2. Posa la teva clau d'API de Google

Resumir funciona amb Google Gemini i necessita una **clau d'API**, gratuïta i sense
targeta de crèdit. La crees a [aistudio.google.com](https://aistudio.google.com/),
la copies i l'enganxes a **Configuració (⚙️) → Claus i models**.

👉 Pas a pas: **[guia per obtenir la clau](./API-KEY-GOOGLE.md)**.

La clau es desa **només al teu ordinador**.

---

## 3. El teu primer resum

1. Obre una pàgina amb text: un article, un vídeo de YouTube, un fil de Hacker
   News, un PDF…
2. Obre Resumir des de la icona de l'extensió.
3. Clica **«Resum»**. En uns segons el tindràs.

---

## Què pots fer

Resumir segueix tres moments —captures, entens, conserves— repartits en plugins
que actives i reordenes al teu gust:

- **Captura:** pàgines web, YouTube, Hacker News i Twitter/X (automàtic) i PDFs locals.
- **Cinc lents per entendre:** Resum, Explica-ho fàcil, Aprofundiment, Validació
  científica i Mapa conceptual —totes amb prompt editable.
- **Conserva:** exporta a Obsidian o Markdown; historial i caché locals.
- **Llegeix millor:** lectura biònica.

👉 Què fa cada eina i quan usar-la: **[guia de plugins](./PLUGINS.md)**.

---

## Configuració

Tot es controla des de **Configuració (⚙️)**:

| Apartat | Què hi trobes |
|---|---|
| **Claus i models** | La teva clau d'API i el model de Gemini a fer servir |
| **Aparença** | Tema visual de l'extensió |
| **Emmagatzematge i privadesa** | Caché dels resums i preferències |
| **Plugins** | Activar, reordenar i configurar cada eina (i editar-ne els prompts) |

---

## Si alguna cosa no va

**«API Key invàlida»** — Revisa que la clau estigui sencera i sense espais. Més detall
a la [guia de la clau](./API-KEY-GOOGLE.md#problemes-habituals).

**No surt la icona** — A Firefox, `about:addons` → Resumir → fixa-la a la barra. A
Chrome/Edge, clica la icona de peça (Extensions) i fixa Resumir.

**El resum va lent o dóna error de límit** — El nivell gratuït de Gemini limita les
peticions per minut. Espera uns segons i torna-ho a provar.

**Un plugin no surt a la barra** — Comprova que estigui activat a Configuració → Plugins.

---

Dubtes o errors: [GitHub Issues](https://github.com/xxxaau/extensio-resumir-contingut/issues).
