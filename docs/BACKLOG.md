# Backlog de millores

Llista de millores pendents, no prioritzades. Cada entrada inclou context i criteris d'acceptació mínims.

---

## Coherència visual dels botons de control del mapa conceptual

**Context (2026-06-05):** Els botons de control del mapa conceptual (sidebar + fullscreen) s'han unificat amb estil planer (32×32, padding 4px, border-radius 4px, hover amb background) per coincidir amb els botons de la toolbar. El codi està aplicat però no s'ha pogut verificar en local (probablement cache del sidebar panel de Firefox).

**Pendent:**
- [ ] Verificar que els canvis CSS s'apliquen correctament al sidebar (`.markmap-control-btn`) i al fullscreen (`.markmap-fs-btn`).
- [ ] Confirmar que el padding 4px i l'SVG 24×24 donen el mateix aspecte que els botons d'acció del menú de resumir.
- [ ] Si el problema persisteix després de tancar/obrir la sidebar, investigar si Firefox cacheja el sidebar panel independentment de la recàrrega de l'extensió.

---

## Interfície d'usuari multidioma (i18n)

**Context (2026-05-27):** Actualment tota la interfície d'usuari està en català dur — ~200+ cadenes repartides entre ~18 fitxers (3 HTML + 15 JS). No existeix cap infraestructura d'internacionalització: ni `_locales/`, ni `default_locale` als manifests, ni `chrome.i18n`, ni `__MSG__` als HTML.

La decisió d'idioma ja es va identificar com a pendent al TO-DO.md (veure «Decisions estratègiques», punt 3), i el README descriu l'extensió com a catalana. L'objectiu és habilitar contribucions externes d'idiomes i preparar l'extensió per a un públic internacional.

**Comportament esperat:**
- L'extensió detecta l'idioma del navegador i mostra la UI en l'idioma corresponent.
- Si l'idioma del navegador no està disponible, es mostra el català (idioma per defecte).
- Totes les cadenes visibles a la UI són traduïbles: sidebar, settings, visor PDF, botons, etiquetes, missatges d'error, menús contextuals, nom/descripció del manifest.
- Els system prompts de l'IA (`shared/defaults.js`) es mantenen en català (instrueixen la IA en català independentment de l'idioma UI) o es tradueixen segons decisió de disseny.

**Abast:**
- `_locales/ca/messages.json` — traducció catalana (completa)
- `_locales/en/messages.json` — traducció anglesa (completa)
- `_locales/es/messages.json` — traducció castellana (opcional, fase 2)

**Evolució tècnica (proposta):**
1. Crear `_locales/{ca,en}/messages.json` amb totes les claus de traducció.
2. Afegir `"default_locale": "ca"` a tots els manifests (`manifest.base.json`, `manifest.chromium.json`, patches).
3. Substituir cadenes en HTML per `__MSG_*__` (sidebar/sidebar.html, options/settings.html, sidebar/pdf-viewer.html).
4. Afegir `ext.i18n.getMessage(key, ...args)` a `ext.js` com a wrapper cross-browser de `chrome.i18n.getMessage`.
5. Substituir cadenes hardcoded als JS per crides a `ext.i18n.getMessage()`.
6. Decidir el tractament dels system prompts de l'IA (mantenir en català o traduir-los).
7. Actualitzar build pipeline per validar que totes les claus `__MSG__` existeixin als messages.json.

**Criteris d'acceptació:**
- [ ] `_locales/` creat amb `ca` i `en` (mínim).
- [ ] `default_locale` present a tots els manifests.
- [ ] Totes les cadenes UI són substituïdes per claus i18n.
- [ ] L'extensió funciona correctament en navegador configurat en català i en anglès.
- [ ] No hi ha regressió visual ni funcional.
- [ ] Les cadenes noves es poden afegir sense tocar codi (només afegir clau als messages.json).
- [ ] Els tests existents continuen passant (207/207).

**Fitxers probables a modificar:**
- `_locales/ca/messages.json` (nou)
- `_locales/en/messages.json` (nou)
- `ext.js` (wrapper `ext.i18n.getMessage`)
- `sidebar/sidebar.html`, `options/settings.html`, `sidebar/pdf-viewer.html`
- `sidebar/ui.js`, `sidebar/summary.js`, `sidebar/sidebar.js`, `sidebar/history.js`, `sidebar/content.js`, `sidebar/api.js`, `sidebar/pdf-viewer.js`, `sidebar/cache.js`, `background.js`
- `options/settings-options.js`, `options/settings-cache.js`, `options/settings-models.js`
- `shared/content-types.js`
- `manifest.base.json` (+ patches)
- `scripts/pre-release-check.mjs` (validació de claus i18n)
