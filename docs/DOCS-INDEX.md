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

---

## Documents vius

| Document | Propòsit | Toca'l quan… |
|---|---|---|
| `README.md` (arrel) | Portada del projecte (proposta de valor + instal·lació + arquitectura) | Canvia una funció, la instal·lació o el missatge de marca |
| `VENDORS.md` (arrel) | Llibreries vendoritzades actives + hashes | Afegeixes/treus/actualitzes un vendor |
| `docs/README.md` | Índex de la carpeta `docs/` | Crees o mous un document |
| `docs/DOCS-INDEX.md` | Aquest índex | Crees, mous o recategoritzes un document |
| `docs/PROJECT-STRUCTURE.md` | Mapa de carpetes i fitxers del codi | Afegeixes/mous fitxers de codi o tests |
| `docs/ARCHITECTURE.md` | Graf de components i flux de dades | Canvia l'arquitectura ⚠️ (no cobreix el sistema de plugins) |
| `docs/BUILD.md` | Com compilar i empaquetar | Canvia el build, els scripts npm o els requisits |
| `docs/CONTRIBUTING.md` | Guia de contribució | Canvia el flux de contribució o de tests |
| `docs/SECURITY.md` | Política de seguretat i permisos | Canvien permisos, CSP o vendors |
| `docs/PRIVACY_POLICY.md` | Tractament de dades (requisit AMO/CWS) | Canvia què es desa/envia o els permisos |
| `docs/THIRD_PARTY.md` | Dependències de tercers + llicències + hashes | Afegeixes/treus/actualitzes un vendor |
| `docs/MODELS-WORKFLOW.md` | Models Gemini i scripts de models | Canvia `shared/models.js` o els scripts `models:*` |
| `docs/CREAR-PLUGIN.md` | Guia completa (CA) per crear un plugin | Canvia el sistema de plugins / passos |
| `docs/CONCEPTMAP-FEATURES.md` | Disseny del mapa conceptual | Canvia el renderitzador/funcions del mapa |
| `docs/DEV-CONTEXT.md` | Context de desenvolupament per a Claude | Canvien decisions/comandes clau |
| `docs/STORAGE_ISOLATION.md` | Arquitectura d'aïllament de storage | Canvia el model de storage o el mode DEV/prod |
| `docs/user-guide/GUIA-INICI.md` | Guia d'usuari: instal·lació i primer ús | Canvia la instal·lació o les funcions visibles |
| `docs/user-guide/PLUGINS.md` | Guia d'usuari: què fa cada plugin | Afegeixes/treus/canvies un plugin |
| `docs/user-guide/API-KEY-GOOGLE.md` | Guia d'usuari: obtenir la clau d'API | Canvia el flux d'aistudio o de configuració |
| `docs/COMUNICACIO.md` | Veu de marca i pla de comunicació (**font del to**) | Redefineixes el missatge o l'inventari de funcions |
| `docs/MARKETS-COPY.md` | Copy per a les stores (**font única**) | Canvia el copy públic |
| `docs/listing-texts.md` | Textos de listing AMO/CWS | Canvia el copy de listing |
| `docs/CHROME-STORE.md` | Procediment de publicació al CWS | ⚠️ Procés futur (avui Chromium només via GitHub Releases) |
| `docs/RELEASE-PROCESS.md` | SOP de release | Canvia el flux de release |
| `docs/SUBMISSION-CHECKLIST.md` | Checklist de submissió | ⚠️ Ancorat a una versió antiga; revisar per release |
| `docs/SCREENSHOTS-GUIDE.md` | Especificació de captures | Canvia el set de captures |
| `docs/BACKLOG.md` | Roadmap i millores pendents | Afegeixes/completes una idea del roadmap |
| `docs/SPONSORS.md` | Programa de sponsors | Canvia el patrocini |
| `docs/CODE_OF_CONDUCT.md` | Normes de comunitat | Rarament (boilerplate) |

## Documents històrics (no tocar)

Registres datats; reflecteixen el seu moment, no l'estat actual:

`docs/CHANGELOG.md` · `docs/AUDIT-REPORT-2026-05-19.md` · `docs/LEARNINGS.md` ·
`docs/DIRECTORY-CONSOLIDATION.md` · `docs/FILE-ORGANIZATION.md` ·
`docs/.planning/*` · `docs/superpowers/plans/*` · `docs/superpowers/specs/*` ·
`.opencode/plans/*` · `.dev/PROGRESS-LOG.md` · `.dev/TO-DO.md` ·
`.superpowers/*` (excepte plantilles) · `REVIEW.md` · `tasks/todo.md`

## Plantilles

`docs/RELEASE-NOTES-TEMPLATE.md` · `.github/PULL_REQUEST_TEMPLATE.md` ·
`.superpowers/**/TEMPLATE.md`

---

## Fonts de veritat

Quan canviïs el codi, actualitza el doc viu corresponent:

| Tema | Font al codi | Docs vius a sincronitzar |
|---|---|---|
| **Plugins / modes de resum** | `shared/defaults.js`, `shared/content-types.js`, `options/settings.html`, `sidebar/sidebar.js` (`CONFIG_KEYS`) | `user-guide/PLUGINS.md`, `CREAR-PLUGIN.md`, README |
| **Models i preus** | `shared/models.js` (`CURATED_MODELS`, `DEFAULT_MODEL_ID`) | `MODELS-WORKFLOW.md` |
| **Vendors i llicències** | `scripts/verify-vendor.mjs`, fitxers vendoritzats | `VENDORS.md`, `THIRD_PARTY.md` |
| **Permisos** | `manifest.base.json` (+ patches) | `SECURITY.md`, `PRIVACY_POLICY.md`, README |
| **Extracció de contingut** | `sidebar/content.js` | `SECURITY.md`, `COMUNICACIO.md`, README |
| **Copy / to de marca** | — (decisió de producte) | `COMUNICACIO.md` (font) → README, `listing-texts.md`, `MARKETS-COPY.md` |
| **Estructura de fitxers** | l'arbre real del repo | `PROJECT-STRUCTURE.md` |

## Valors que es desactualitzen sols

Aquests valors estan **escrits a mà** en alguns docs i s'obliden fàcilment. Si
canvien, busca'ls i actualitza'ls tots (o millor, no els tornis a fixar a mà):

- **Nombre de tests** (avui 243): `README.md`, `docs/BUILD.md`, `docs/CONTRIBUTING.md`,
  `docs/DEV-CONTEXT.md`, `docs/CREAR-PLUGIN.md`. Font real: `npm test`.
- **Versió** (avui 2.5.0): evita fixar-la als docs de release/store; alguns encara
  duen versions antigues d'exemple. Font real: `package.json` / manifests.
- **Model per defecte** (avui `gemini-3.1-flash-lite`): `MODELS-WORKFLOW.md`. Font
  real: `shared/models.js`.
- **Versió de Node** (avui 20+): `BUILD.md`, `CONTRIBUTING.md`. Font real:
  `package.json` (`engines.node`).

## Pendents coneguts (no bloquejants)

- `docs/ARCHITECTURE.md` no documenta el sistema de plugins.
- Els docs de release/store (`CHROME-STORE.md`, `SUBMISSION-CHECKLIST.md`) tracten
  el Chrome Web Store com a imminent i duen versions antigues; avui la distribució
  Chromium és només via GitHub Releases.
- `repo rename` (extensio-resumir-contingut → resumir): inventari complet a
  `docs/BACKLOG.md`.
