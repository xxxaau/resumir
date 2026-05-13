# Guia de Contribució

Gràcies per l'interès en contribuir a **Resumir contingut**! Aquesta guia explica com arribar a una conclusió.

## Requesits de desenvolupament

- **Node.js** 18+
- **PowerShell** 5.1+ (és la plataforma de script de build)
- **Firefox** 115+ o **Chromium** 116+ (testing manual)
- Una clau de **Google Gemini API** (gratuïta a [aistudio.google.com](https://aistudio.google.com/app/apikey))

## Flux de desenvolupament

### Primer: clona i instal·la

```bash
git clone https://github.com/SergiXaudiera/extensio-resumir-contingut.git
cd extensio-resumir-contingut
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
- **Tests:** La suite actual té 207 tests. Qualsevol funcionalitat nova requereix els seus tests corresponents.
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
│   ├── content.js          # Extracció de text (YouTube, HN, Readability)
│   ├── ui.js               # Renderitzador DOM
│   ├── cache.js            # Memòria local
│   ├── stats.js            # Estadístiques
│   └── youtube-track-select.js  # Selector de pista YouTube
│
├── options/                # Pàgina de configuració
│   ├── settings.js         # Orquestrador
│   └── settings-*.js       # Mòduls funcionals
│
├── shared/                 # Codi compartit
│   ├── defaults.js         # Prompts per defecte
│   └── models.js           # Model curated array
│
├── tests/                  # Tests unitaris
│   └── *.test.mjs          # Node.js built-in test runner
│
└── scripts/                # Build + release
    ├── build-sidebar-bundle.mjs
    ├── merge-manifest.mjs
    └── ...
```

Veure `CLAUDE.md` per a més detalls arquitectònics (fitxer intern, no inclòs al ZIP de release).

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
