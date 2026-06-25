# Guia de Contribució

Gràcies per l'interès en contribuir a **Resumir**! Aquesta guia explica com arribar a una conclusió.

## Requesits de desenvolupament

- **Node.js** 20+
- **npm** 9+
- **Firefox** 142+ o **Chromium** 142+ (testing manual)
- Una clau de **Google Gemini API** (gratuïta a [aistudio.google.com](https://aistudio.google.com/app/apikey))

## Flux de desenvolupament

### Primer: clona i instal·la

```bash
git clone https://github.com/xxxaau/resumir.git
cd resumir
npm install
npm run dev
```

### Fes canvis

1. **Crea una branca** per a la teva funcionalitat:
   ```bash
   git checkout -b feature/descriptio-breu
   ```

2. **Escriu/actualitza tests** PRIMER (TDD). Veure `tests/*.test.mjs` per a exemples.
   ```bash
   npm test
   ```

3. **Implementa la funcionalitat**, en petites passes.

4. **Valida**:
   ```bash
   npm run check          # Lint + tests
   npm run prerelease     # Pre-release audit
   npm run build          # Full build
   ```

### Seguretat

- Els canvis a `sidebar/api.js`, `sidebar/content.js`, `sidebar/ui.js`, `shared/defaults.js`, `options/settings*.js` es revisen per a seguretat.
- **Nou contingut dinàmic?** Assegura't que es renderitza per DOM (`createElement`, `textContent`), **mai** `innerHTML`.
- **Noves sol·licituds de xarxa?** Denylist de privats (RFC1918, localhost).
- **Nova clau/secret?** NO trackejis a git. Usa `.gitignore` o variables d'entorn.
- Consulta `SECURITY.md` per a detalls complets.

### Qualitat

- **Lint:** ESLint sense avisos (0 warnings). Corregeix els errors; afegeix `// eslint-disable-line` si un avís és justificat.
- **Globals cross-file:** L'extensió usa `<script>` tags (no mòduls). Les constants/funcions compartides entre fitxers s'han de registrar a `eslint.config.mjs` → `extensionGlobals` o `settingsGlobals`. Si no, ESLint donarà falsos `no-undef`. Les variables registrades s'ignoren automàticament a `no-unused-vars`.
- **Tests:** La suite actual té 243 tests. Qualsevol funcionalitat nova requereix els seus tests corresponents.
- **Noms:** utilitza camelCase per a variables/funcions, kebab-case per a fitxers. Preferiblement en català per als comentaris.

### Commit

1. Confirma que el teu codi és net i prouat:
   ```bash
   npm run check
   ```

2. Fes commits atòmics amb missatges clars:
   ```bash
   git commit -m "feat(youtube): millora del track selector

   - Separa la lògica en youtube-track-select.js
   - Afegeix 13 tests de cobertura per a idioma + fallback
   - Usa ytInitialData directament, evita obrir el panell
   "
   ```

3. Puja la teva branca:
   ```bash
   git push origin feature/descriptio-breu
   ```

4. Obri un **Pull Request** amb descripció clara del què estàs canviant i per què.

## Estructura del projecte

```
├── sidebar/                 # Interfície (UI principal)
│   ├── sidebar.js          # Orquestrador
│   ├── api.js              # Client Gemini (SSE)
│   ├── content.js          # Extracció de text (YouTube, HN, Readability, PDF)
│   ├── ui.js               # Renderitzador DOM
│   ├── cache.js            # Memòria local
│   ├── history.js          # Historial de resums
│   ├── pdf-viewer.html/js  # Visor PDF personalitzat
│   ├── markmap-native.js   # Renderitzador SVG natiu del mapa conceptual
│   └── conceptmap*.js      # Orquestrador del mapa conceptual
│
├── options/                # Pàgina de configuració
│   ├── settings.js         # Orquestrador
│   └── settings-*.js       # Mòduls funcionals
│
├── shared/                 # Codi compartit
│   ├── defaults.js         # Prompts per defecte
│   ├── models.js           # Model curated array
│   └── content-types.js    # Tipus de contingut centralitzats
│
├── vendor/                 # Llibreries vendoritzades
│   ├── pdf.min.js          # pdf.js (extracció de text PDF)
│   └── pdf.worker.min.js   # Worker pdf.js
│
├── tests/                  # 243 tests unitaris i E2E
│   └── *.test.mjs          # Node.js built-in test runner
│
└── scripts/                # Build + release (tot Node.js)
    ├── build.mjs           # Build multi-target
    ├── build-sidebar-bundle.mjs
    ├── merge-manifest.mjs
    ├── release.mjs         # Release workflow
    ├── set-mode.mjs        # Dev/Prod mode
    └── pre-release-check.mjs # Auditoria pre-release
```

## Reportar bugs

1. Busca si ja existeix un report similar.
2. Proporciona: navegador/versió, passos per reproduir, comportament real vs. esperat.
3. Adjunta captures de pantalla si és útil.

## Preguntes?

- Obri una **Discussion** per a preguntes generals.
- Obri una **Issue** per a bugs.
- Mira `SECURITY.md` per a vulnerabilitats.

---

Gràcies per contribuir! 🎉
