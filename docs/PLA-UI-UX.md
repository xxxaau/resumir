# Pla de millora UI/UX

Pla d'execució per millorar totes les interfícies (barra lateral, configuració,
visor PDF, mapa conceptual, Anki, historial, punts d'entrada i web). Sorgit de
l'auditoria del 2026-10-11 (tres auditories de codi, recerca de competidors i
guies, captures amb Playwright sobre Chromium) i revisat contra el codi per un
segon revisor.

> **Estat viu:** aquest document només conté feina **pendent**. Quan una fase o
> un ítem es completa, es treu d'aquí (el registre és `CHANGELOG.md` + git), igual
> que amb `BACKLOG.md`. No s'hi fixen números que canvien sols (nombre de botons,
> amples en px, versions, límits de quota): consulta el codi.

**Limitacions de l'auditoria:** Firefox no s'ha provat en viu (només Chromium) i
no s'ha fet cap prova amb lector de pantalla. No avaluats: el rendiment de la
neteja de memòria cau (llegeix tot l'storage local) i el contingut de la secció
d'historial de canvis de la configuració.

## Diagnòstic

1. **El resultat no és fiable de mantenir.** Lectura biònica, l'historial i el
   fallback de model poden substituir, exportar o desar una cosa diferent de la
   que l'usuari veu.
2. **Barra d'eines plana i sense etiquetes.** Botons d'icona de colors diferents,
   sense grups (generar / exportar / vista) ni salt de línia. Amb tots els plugins
   actius desborda a amplades típiques de panell i l'engranatge de configuració
   queda fora de pantalla. Una instal·lació nova en mostra només tres, així que
   afecta sobretot usuaris avançats; a l'usuari nou li falta «Copiar» (desactivat
   per defecte).
3. **Estats buits i de càrrega pobres.** El panell en repòs és blanc; el peu mostra
   «0.0s 0.0↓ 0.0↑» abans de res; la càrrega són tres punts sense etapa; els
   errors porten codis interns i de vegades text en anglès.
4. **La configuració no desa el que sembla desar.** Els interruptors de plugins
   actualitzen el menú lateral a l'instant però no es persisteixen fins a «Desar»
   (hi ha un botó per pestanya), sense avís de canvis pendents. A més no és
   responsiva.
5. **Dos sistemes de tokens que han divergit.** La barra lateral es va corregir
   per a AA; la configuració no. Crema i Fosc fallen contrast en botons, enllaços
   i text atenuat.

**A preservar:** construcció de DOM segura (sense `innerHTML` amb contingut del
model), CSP sense handlers inline, `prefers-reduced-motion` global, l'overlay del
mapa (diàleg modal amb trampa de focus), la recàrrega automàtica en desar la
clau, el versionat de prompts que no trepitja personalitzacions i el toolbar
mínim per defecte.

## Nivell 0 — Bugs que trenquen l'experiència

Un commit i un test de regressió per bug (`CLAUDE.md`: el test ha de fallar sense
el fix). Els marcats ✔ s'han verificat directament al codi; la resta porten
referència de línia dels auditors. **Els bugs 0.1–0.15 ja estan corregits** (vegeu
`git log` i `LEARNINGS.md`); aquí només queda el que en penja:

- **0.2 (navegació de l'historial):** la integritat de dades ja està resolta
  (Copiar/Obsidian exporten l'entrada visible); queda redissenyar la navegació
  (barra d'eines visible en veure una entrada, «Tornar a l'historial» només si
  s'hi ha vingut). Es fa amb les pestanyes per tipus del Nivell 3.

## Nivell 1 — Guanys ràpids (resta)

La Fase C (contrast i accessibilitat de base) està feta; vegeu `git log` i el
test `quality-contrast`, que vigila AA amb la llista de fallades buida (el visor PDF, amb paleta fosca fixa, té el seu
propi control a `pdf-viewer-contrast`). No queda res pendent.

**Decisió sobre `shared/tokens.css`:** no es fa. Els dos fitxers de tema (barra
lateral i configuració) no divergeixen per descuit sinó pel disseny (fons i
primari diferents), i el que importava —que cap parell de colors falli AA— ja ho
garanteixen els tests. Un fitxer compartit només valdria la pena si es vol
unificar el disseny dels dos.

## Nivell 2 — Canvis estructurals (resta)

La Fase D està feta en bona part (barra d'eines agrupada i fixa, onboarding amb
comprovació de la clau, estats de càrrega, renderitzador Markdown, configuració
responsiva, historial amb cerca/esborrar/desfer, pantalla General reordenada,
enllaços profunds, rutes neutres). Vegeu `git log`.

### 2.4 Configuració

Tot fet. Decisió presa: els camps de text i els sliders **no** es desen sols (hi ha avís de canvis sense desar i `beforeunload`; un desat automàtic de prompts a mig escriure podria trepitjar un prompt bo).

## Nivell 3 — Estratègia de producte

> **Estat (2026-10-12):** les fases A–D són fetes i, de la Fase E, tot excepte el que
> queda a la taula de sota (vegeu `git log`). Ja hi són: línia de procedència (amb
> text enviat i avisos de text tallat / bàner de galetes), pestanyes per tipus, avís
> de resum d'una altra pàgina, refinadors «Més curt / Més detall», drecera
> Alt+Maj+S, cites `(p. N)` dels PDF web, marques `[m:ss]` de YouTube (camins B, C i
> text pre-renderitzat; el rascat del DOM no en porta), format i llargada com a
> preferències de Resum, i verificació literal de la secció «Cites».
> Mètode: test de regressió primer, commit atòmic, `npm test` + `npm run lint` +
> `npm run dev:chromium` + `npm run smoke:e2e` abans de commitejar, i treure del pla
> el que es completi.

La direcció és fer de Resumir el resumidor més **verificable**: el mercat ja ha
convertit en mínim el xat de seguiment i els segells de temps, i la diferència ara
és la confiança. Ordenat per relació impacte/esforç.

| Idea | Què veu l'usuari | Per què | Referència | Esforç |
| --- | --- | --- | --- | --- |
| Cites verificades als punts clau | Fet per a la secció «Cites» (✓/⚠ + ↗ amb `#:~:text=`). Queda estendre-ho a cada punt clau (cal que el model hi citi un fragment literal per punt) | Les cites inventades augmenten la falsa confiança; verificades, la calibren | Perplexity Comet; AAAI 2025 (Ding et al.) | L |
| Llengua de sortida independent | Els prompts ja forcen el català; només queda la sortida en altres llengües, que pertany a l'entrada d'i18n del backlog | Ajuda el posicionament «català primer» | Kagi Universal Summarizer | S |

**Relació amb el backlog:** els prompts editables, els proveïdors alternatius i la
i18n ja hi tenen entrada («Múltiples proveïdors», «Interfície multidioma»); aquí només se'n tracta l'impacte a la UI. El **xat de
seguiment** sobre el resum no hi és: és el patró més estès del mercat (Gemini,
Merlin, Recall, Comet) i mereix una entrada nova, però és esforç L i fora de
l'abast d'una millora d'UI.

## Ordre d'execució

Cinc fases; cada una deixa l'extensió publicable i no depèn de les següents,
excepte on s'indica.

1. **Fase A — Integritat del resultat: feta** (queden només els tres ítems
   enllaçats a la secció del Nivell 0, que van amb les fases B i D).
2. **Fase B — Configuració que no perd canvis: feta** (desat automàtic d'interruptors, ordre i tema; avisos de prompt per pestanya; historial de canvis; avís en buidar la memòria cau). Del 2.4 queda el desat automàtic dels camps de text i sliders, amb indicador de canvis pendents.
3. **Fase C — Contrast i accessibilitat: feta** (la resta, a la secció del Nivell 1). Falta una revisió amb lector de pantalla real durant el streaming.
4. **Fase D — Estructura (en bona part feta; vegeu el Nivell 2)** (2.1 barra d'eines, 2.2 onboarding, 2.3 estats, la resta
   de 2.4 (ordre, selector de models, revelació progressiva, enllaços profunds,
   rutes neutres), 2.5 responsiva, 2.6 historial). 2.1 i 2.2 primer: són el que
   veu un usuari nou. Captures noves per a les botigues després d'aquesta fase
   (`docs/SCREENSHOTS-GUIDE.md`).
5. **Fase E — Confiança** (Nivell 3): feta en bona part; queda el que consta a la taula.

Si la i18n del backlog s'aborda, fer-la **després** de la passada de microcopy de
la Fase C: traduir textos que encara s'han de reescriure duplica la feina.

**Prerequisit transversal:** una passada a Firefox abans de tancar la Fase D. La
barra lateral de Firefox sol ser més estreta i redimensionable, i `sidebar_action`
és per finestra.

**Regles del repositori:** tornar a executar `npm run dev:chromium` abans de cada
captura. Els bugs del Nivell 0 es corregeixen directament (un commit i un test de
regressió cadascun) i no van al backlog; en passar els Nivells 2–3 a
`docs/BACKLOG.md`, treure'n els números que canvien sols.

Documents que caldrà tocar a mesura que s'avanci: `docs/user-guide/GUIA-INICI.md`
(diu «Clica «Resum»» però és una icona; no esmenta el menú contextual ni
l'historial), `docs/CONCEPTMAP-FEATURES.md` (descriu un botó d'ajustar a la vista
que no existeix i una paleta antiga), `README.md` i `docs/SCREENSHOTS-GUIDE.md`.

## Annex — Altres troballes per superfície

Troballes que no surten als nivells de dalt, per no perdre-les. (El cost en € per resum es descarta a propòsit: els usuaris de la clau gratuïta no paguen res i els preus envelleixen; la línia de procedència mostra tokens.)

| Superfície | Troballa | On | Sev. | Esforç |
| --- | --- | --- | --- | --- |
| Configuració | «Restaurar» sobreescriu un prompt llarg sense confirmació i, des de l'avís, desa tota la pàgina | `settings-options.js:168-212`, `settings.js:69-71` | Mitjana | S |
| Configuració | HTML de plugins duplicat; un registre únic de plugins evitaria la deriva | `settings.html`, `settings-sidebar.js` | Baixa | M |
| Mapa conceptual | `confirm()` d'origen diferent salta gairebé sempre que es ve de l'historial (ara diu el nom del fitxer/pàgina, però continua saltant) | `conceptmap.js:398-405` | Baixa | S |

## Fonts

- [Chrome sidePanel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) i [llançament del side panel](https://developer.chrome.com/blog/extension-side-panel-launch)
- [Chrome Summarizer API](https://developer.chrome.com/docs/ai/summarizer-api)
- [Gemini en Chrome](https://support.google.com/chrome/answer/16283624)
- [Firefox AI chatbot](https://support.mozilla.org/en-US/kb/ai-chatbot) i [Firefox Link Previews](https://blog.mozilla.org/en/firefox/firefox-ai/ai-link-previews-firefox/)
- [MDN — Sidebars](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Sidebars) i [Acorn Design System](https://acorn.firefox.com/latest/foundations/foundations-overview-zjsOvXKJ)
- [AMO: consentiment de recollida de dades](https://blog.mozilla.org/addons/2025/10/23/data-collection-consent-changes-for-new-firefox-extensions/)
- [Gemini API: límits](https://ai.google.dev/gemini-api/docs/rate-limits), [termes](https://ai.google.dev/gemini-api/terms) i [resolució d'errors](https://ai.google.dev/gemini-api/docs/troubleshooting)
- [Kagi Universal Summarizer](https://blog.kagi.com/universal-summarizer)
- [Readwise Ghostreader](https://docs.readwise.io/reader/guides/ghostreader/overview)
- [Glasp YouTube Summary](https://glasp.ai/features/youtube-summary)
- [Recall: augmented browsing](https://docs.recall.it/deep-dives/recall-augmented-browsing)
- [NN/g — Prompt controls](https://www.nngroup.com/articles/prompt-controls-genai/)
- [Shape of AI — Citations](https://www.shapeof.ai/patterns/citations)
- [Google PAIR — Explainability + Trust](https://pair.withgoogle.com/chapter/People%20+%20AI%20Guidebook%20-%20Explainability%20+%20Trust.pdf)
- [Ding et al., AAAI 2025 — cites i confiança](https://ojs.aaai.org/index.php/AAAI/article/view/34550)
- [IBM Research — puntuacions de factualitat i atribució](https://research.ibm.com/publications/facilitating-human-llm-collaboration-through-factuality-scores-and-source-attributions)
- [Deque — WCAG 2.2](https://dequeuniversity.com/resources/wcag-2.2)
- [Streaming accessible amb lectors de pantalla](https://azukiazusa.dev/en/blog/accessible-streaming-chat-ui)
