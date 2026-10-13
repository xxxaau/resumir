# Índex de documentació

Mapa de tots els documents del repositori, pensat per **revisar-los eficientment
quan s'apliquen canvis** i evitar que tornin a quedar desactualitzats.

L'estructura de `docs/` és **plana**: tots els documents viuen directament a `docs/`,
excepte les guies d'usuari (`docs/user-guide/`, amb el seu `img/`). Aquest índex fa
l'agrupació que abans feien els subdirectoris.

Tres categories:

- **Viu** — descriu l'estat actual; s'ha de mantenir sincronitzat amb el codi.
- **Històric** — registre datat (decisions, auditories, plans, changelog); **no es
  toca**, és una fotografia del seu moment.
- **Plantilla** — esquelet reutilitzable; no descriu res real.

> **Abans de res:** quan facis un canvi, mira la secció
> [Fonts de veritat](#fonts-de-veritat) per saber **quins docs vius cal tocar**.

> ⚠️ **Aquest índex mateix va quedar desactualitzat durant mesos** (referenciava
> 6 documents inexistents i un `CLAUDE.md` esborrat fa 3 mesos — corregit el
> 2026-08-09). La lliçó: quan esborris o mous un document referenciat aquí,
> actualitza aquest fitxer **al mateix commit**, no "més endavant".

---

## Documents vius

| Document | Propòsit | Toca'l quan… |
|---|---|---|
| `CLAUDE.md` (arrel) | Regles vinculants per a Claude Code (procés, no arquitectura) | Canvia una convenció de treball (commits, mode DEV, gestió de docs/backlog) |
| `README.md` (arrel) | Portada del projecte (proposta de valor + instal·lació + arquitectura) | Canvia una funció, la instal·lació o el missatge de marca |
| `VENDORS.md` (arrel) | Llibreries vendoritzades actives + hashes | Afegeixes/treus/actualitzes un vendor |
| `docs/README.md` | Índex de la carpeta `docs/` | Crees o mous un document |
| `docs/DOCS-INDEX.md` | Aquest índex | Crees, mous, esborres o recategoritzes un document |
| `docs/DEV-CONTEXT.md` | Context tècnic complet (arquitectura, comandes, flux de mòduls) per a assistents de codi | Canvia l'arquitectura, les comandes npm o el flux de mòduls |
| `docs/ARCHITECTURE.md` | Graf de components i flux de dades | Canvia l'arquitectura ⚠️ (no cobreix el sistema de plugins) |
| `docs/BUILD.md` | Com compilar i empaquetar | Canvia el build, els scripts npm o els requisits |
| `docs/CONTRIBUTING.md` | Guia de contribució | Canvia el flux de contribució o de tests |
| `docs/SECURITY.md` | Política de seguretat i permisos | Canvien permisos, CSP o vendors |
| `docs/PRIVACY_POLICY.md` | Tractament de dades (requisit AMO/CWS) | Canvia què es desa/envia o els permisos |
| `docs/STORAGE_ISOLATION.md` | Arquitectura d'aïllament de storage | Canvia el model de storage o el mode DEV/prod |
| `docs/CREAR-PLUGIN.md` | Guia completa (CA) per crear un plugin | Canvia el sistema de plugins / passos |
| `docs/CONCEPTMAP-FEATURES.md` | Disseny del mapa conceptual | Canvia el renderitzador/funcions del mapa |
| `docs/user-guide/GUIA-INICI.md` | Guia d'usuari: instal·lació i primer ús | Canvia la instal·lació o les funcions visibles |
| `docs/user-guide/PLUGINS.md` | Guia d'usuari: què fa cada plugin | Afegeixes/treus/canvies un plugin |
| `docs/user-guide/API-KEY-GOOGLE.md` | Guia d'usuari: obtenir la clau d'API | Canvia el flux d'aistudio o de configuració |
| `docs/COMUNICACIO.md` | Veu de marca i pla de comunicació (**font del to**) | Redefineixes el missatge o l'inventari de funcions |
| `docs/MARKETS-COPY.md` | Copy per a les stores (**font única**) | Canvia el copy públic |
| `docs/listing-texts.md` | Textos de listing AMO/CWS | Canvia el copy de listing |
| `docs/CHROME-STORE.md` | Procediment de publicació al CWS | ⚠️ Procés futur (avui Chromium només via GitHub Releases) |
| `docs/RELEASE-PROCESS.md` | SOP de release | Canvia el flux de release |
| `docs/SUBMISSION-CHECKLIST.md` | Checklist de submissió | ⚠️ Revisar que segueixi alineada amb RELEASE-PROCESS.md a cada release |
| `docs/SCREENSHOTS-GUIDE.md` | Especificació de captures | Canvia el set de captures |
| `docs/MANTENIMENT.md` | Revisions recurrents (YouTube cada mes) i com arreglar-les | Canvia una via d'extracció de YouTube o s'afegeix una altra revisió recurrent |
| `docs/BACKLOG.md` | Idees pendents (**només pendents** — vegeu nota al capdamunt del fitxer) | Afegeixes o completes una idea |
| `docs/PLA-UI-UX.md` | Pla d'execució de millores UI/UX (**només pendent**; es treu el que es completa) | Completes un ítem o fase del pla, o en canvia l'abast |
| `docs/SPONSORS.md` | Programa de sponsors | Canvia el patrocini |
| `docs/CODE_OF_CONDUCT.md` | Normes de comunitat | Rarament (boilerplate) |

## Documents històrics (no tocar)

Registres datats; reflecteixen el seu moment, no l'estat actual:

`docs/CHANGELOG.md` · `docs/LEARNINGS.md` (té taula de continguts al capdamunt —
consulta-la abans d'afegir-hi res, per no duplicar una lliçó ja capturada)

## Plantilles

`docs/RELEASE-NOTES-TEMPLATE.md` · `.github/PULL_REQUEST_TEMPLATE.md`

---

## Fonts de veritat

Quan canviïs el codi, actualitza el doc viu corresponent:

| Tema | Font al codi | Docs vius a sincronitzar |
|---|---|---|
| **Plugins / modes de resum** | `shared/defaults.js`, `shared/content-types.js`, `options/settings.html`, `sidebar/sidebar.js` (`CONFIG_KEYS`) | `user-guide/PLUGINS.md`, `CREAR-PLUGIN.md`, README |
| **Models i preus** | `shared/models.js` (`CURATED_MODELS`, `DEFAULT_MODEL_ID`) | cap doc dedicat avui (vegeu nota a sota) |
| **Vendors i llicències** | `scripts/verify-vendor.mjs`, fitxers vendoritzats | `VENDORS.md` |
| **Permisos** | `manifest.base.json` (+ patches) | `SECURITY.md`, `PRIVACY_POLICY.md`, README |
| **Extracció de contingut** | `sidebar/content.js` | `SECURITY.md`, `COMUNICACIO.md`, README |
| **Copy / to de marca** | — (decisió de producte) | `COMUNICACIO.md` (font) → README, `listing-texts.md`, `MARKETS-COPY.md` |
| **Convencions de procés (commits, mode DEV, gestió de docs)** | — (decisió de flux de treball) | `CLAUDE.md` |

**Nota — model/preus:** no hi ha cap doc dedicat als models des que es va
retirar `MODELS-WORKFLOW.md` (referenciat abans en aquest índex però mai
recreat). El manteniment del catàleg (`scripts/update-models-check.mjs`,
`scripts/update-models-sync.mjs`) i les decisions preses (p. ex. ordre del
desplegable, model per defecte) es documenten a `docs/LEARNINGS.md` sessió a
sessió. Si el catàleg de models creix en complexitat, valora crear-ne un doc
dedicat en lloc de dispersar-ho per LEARNINGS.

## Valors que es desactualitzen sols

Aquests valors **NO s'han de fixar a mà** als docs — apunta a la comanda o al
fitxer que els genera, no a un número, perquè un número fixat es
desactualitza sense que ningú se n'adoni (va passar: "243 tests" es va quedar
escrit a 3 docs mentre la suite real ja en tenia 293):

- **Nombre de tests**: NO escriguis un número. Font real: `npm test`.
- **Versió**: NO la fixis als docs de release/store. Font real:
  `package.json` / manifests.
- **Model per defecte** (avui `gemini-3.1-flash-lite`): font real:
  `DEFAULT_MODEL_ID` a `shared/models.js`.
- **Versió de Node** (avui `>=20.0.0`): font real: `package.json`
  (`engines.node`).

## Pendents coneguts (no bloquejants)

- No hi ha cap doc dedicat al catàleg de models (vegeu nota a "Fonts de
  veritat" més amunt) — valorar-ho si `shared/models.js` guanya complexitat
  (p. ex. si es reprèn la idea de multiproveïdor del `BACKLOG.md`).
