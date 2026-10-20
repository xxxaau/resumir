# Build Instructions

This document describes how to build **Resumir** from source. Required by AMO (addons.mozilla.org) for source code submission.

## Requirements

- **Node.js** 20 or higher
- **npm** 9 or higher

> Since **v2.3.0**, the build and release pipeline use **pure Node.js**
> scripts — no PowerShell dependency. The scripts `set-mode.mjs`,
> `build.mjs`, and `release.mjs` replace the previous `set_dev_mode.ps1`,
> `build.ps1`, and `release.ps1`. This avoids issues on systems where
> PowerShell execution policy is `Restricted` (e.g. managed Windows
> machines under `MachinePolicy`).

## Steps

```bash
# 1. Install dependencies
npm ci

# 2. Make sure tracked files are in production mode (normally already true)
npm run prod

# 3. Build both ZIPs (Firefox + Chromium)
npm run build
```

This produces:
- `build/resumir-contingut-vX.Y.Z-firefox.zip` — submit to AMO
- `build/resumir-contingut-vX.Y.Z-chromium.zip` — published on GitHub Releases (not on the Chrome Web Store, which is ruled out)

## AMO submission note

When AMO asks *"Do you use code generators, minifiers, bundlers, or code
transformers in your extension?"* answer **Yes**. Reason:

| Tool | What it does |
|------|-------------|
| **esbuild** | Minifies the sidebar bundle (`sidebar/*.js` → `sidebar/sidebar.bundle.js`) and Chromium's background bundle |
| **merge-manifest.mjs** | Generates `manifest.json` from base + platform patches |

Provide these URLs in the AMO form:
- **Source code:** `https://github.com/xxxaau/resumir`
- **Build instructions:** `https://github.com/xxxaau/resumir/blob/main/docs/BUILD.md`

The build is fully reproducible: `npm run build` from a clean checkout produces
byte-identical ZIPs. Source files are readable JS in the repo — only the final
bundle is minified.

## Key dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| esbuild | see `package.json` | Bundles `sidebar/*.js` (Firefox + Chromium) and `background.js` (Chromium) |

## Vendored files

Three files are vendored (pre-built) in the repository:

| File | Source | Purpose |
|------|--------|---------|
| `Readability.js` (root) | [Mozilla/readability](https://github.com/mozilla/readability) | Article text extraction |
| `vendor/pdf.min.js` | [pdf.js](https://mozilla.github.io/pdf.js/) v3.11.174 (legacy UMD) | PDF parsing (text layer extraction) |
| `vendor/pdf.worker.min.js` | pdf.js v3.11.174 (legacy UMD) | PDF worker (CSP-safe, loaded via `runtime.getURL`) |

SHA-256 hashes for all these files are recorded in `scripts/verify-vendor.mjs` and verified by:

```bash
npm run vendor:verify
```

See [`VENDORS.md`](../VENDORS.md) for the full vendor history, including the
libraries removed in v2.2.9 (`d3.min.js`, `markmap-lib.js`, `markmap-view.js`)
when the native SVG renderer was introduced.

## Firefox-only build

```bash
npm run build:firefox
```

## Chromium-only build

```bash
npm run build:chromium
```

## Running tests

```bash
npm test          # Unit + integration tests (the runner prints the current count)
npm run lint      # ESLint (0 warnings expected)
npm run prerelease  # Full pre-release audit
```

## Release workflow

Releases follow `docs/RELEASE-PROCESS.md`: CHANGELOG → `npm run prod` → prepare commit → `npm version` → `npm run build` → `npm run prerelease` → push commit + tag (the tag triggers `release.yml`, which checks that the tag matches the version, builds, lints the real Firefox package and publishes the GitHub Release).

### Commands

```bash
# DEV folders (orange icons, "Resumir (DEV)" name, separate gecko.id) — tracked files stay PROD
npm run dev

# Make changes, test in browser...

# Verify everything is green
npm run build
npm run prerelease

# Full release: backup → set PROD → build → restore mode
npm run release

# Or release a single target
npm run release:firefox
npm run release:chromium

# La versió i el tag es creen amb `npm version X.Y.Z -m "chore: release v%s"`
# (el hook `version` sincronitza manifests + settings.html); el push del tag
# dispara release.yml. Procés complet: docs/RELEASE-PROCESS.md
```

### DEV safety

DEV mode never rewrites tracked files (it lives in `build_firefox_dev/` and `build_chromium_dev/`, which are git-ignored), so there is nothing DEV to publish by accident. `scripts/build.mjs` still aborts if a manifest carries "(DEV)", and `npm run prerelease` checks it too.
