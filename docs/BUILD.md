# Build Instructions

This document describes how to build **Resumir contingut** from source. Required by AMO (addons.mozilla.org) for source code submission.

## Requirements

- **Node.js** 18 or higher
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

# 2. Switch to production mode (removes DEV label from icons and manifest)
npm run prod

# 3. Build both ZIPs (Firefox + Chromium)
npm run build
```

This produces:
- `build/resumir-contingut-vX.Y.Z-firefox.zip` — submit to AMO
- `build/resumir-contingut-vX.Y.Z-chromium.zip` — submit to Chrome Web Store

## Key dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| esbuild | `^0.27.3` | Bundles `background.js` and `sidebar/*.js` for Chromium |
| defuddle | `^0.14.0` | Twitter/X content extraction (vendored to `sidebar/defuddle.js`) |

## Vendored files

Four files are vendored (pre-built) in the repository:

| File | Source | Purpose |
|------|--------|---------|
| `sidebar/defuddle.js` | [defuddle](https://github.com/kepano/defuddle) | Twitter/X content extraction |
| `sidebar/Readability.js` | [Mozilla/readability](https://github.com/mozilla/readability) | Article text extraction |
| `vendor/pdf.min.js` | [pdf.js](https://mozilla.github.io/pdf.js/) v3.11.174 (legacy UMD) | PDF parsing (text layer extraction) |
| `vendor/pdf.worker.min.js` | pdf.js v3.11.174 (legacy UMD) | PDF worker (CSP-safe, loaded via `runtime.getURL`) |

SHA-256 hashes for all these files are recorded in `THIRD_PARTY.md` and verified by:

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
npm test          # 222 unit + E2E tests
npm run lint      # ESLint (0 warnings expected)
npm run prerelease  # Full pre-release audit (17 checks)
```

## Release workflow

```bash
# Switch to DEV mode (orange icons, "Resumir (DEV)" name, separate gecko.id)
npm run dev

# Make changes, test in browser...

# Bump patch version (also regenerates manifests + updates settings.html changelog)
npm version patch --no-git-tag-version

# Verify everything is green
npm run build
npm run prerelease

# Full release: backup → set PROD → build → restore mode
npm run release

# Or release a single target
npm run release:firefox
npm run release:chromium

# Commit, tag, push, GitHub release
```

The `pre-push` git hook blocks pushes while the manifest contains
`"Resumir (DEV)"` to avoid accidentally publishing the DEV build.
