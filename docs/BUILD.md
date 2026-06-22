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

# 2. Switch to production mode (removes DEV label from icons and manifest)
npm run prod

# 3. Build both ZIPs (Firefox + Chromium)
npm run build
```

This produces:
- `build/resumir-contingut-vX.Y.Z-firefox.zip` — submit to AMO
- `build/resumir-contingut-vX.Y.Z-chromium.zip` — submit to Chrome Web Store

## AMO submission note

When AMO asks *"Do you use code generators, minifiers, bundlers, or code
transformers in your extension?"* answer **Yes**. Reason:

| Tool | What it does |
|------|-------------|
| **esbuild** | Minifies the sidebar bundle (18 files → `sidebar/sidebar.bundle.js`) and Chromium's background bundle |
| **merge-manifest.mjs** | Generates `manifest.json` from base + platform patches |

Provide these URLs in the AMO form:
- **Source code:** `https://github.com/xxxaau/extensio-resumir-contingut`
- **Build instructions:** `https://github.com/xxxaau/extensio-resumir-contingut/blob/main/docs/BUILD.md`

The build is fully reproducible: `npm run build` from a clean checkout produces
byte-identical ZIPs. Source files are readable JS in the repo — only the final
bundle is minified.

## Key dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| esbuild | `^0.27.3` | Bundles `background.js` and `sidebar/*.js` for Chromium |

## Vendored files

Three files are vendored (pre-built) in the repository:

| File | Source | Purpose |
|------|--------|---------|
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
npm test          # 243 unit + E2E tests
npm run lint      # ESLint (0 warnings expected)
npm run prerelease  # Full pre-release audit (17 checks)
```

## Release workflow

The recommended way is to use the **interactive script** — it asks for confirmation
at every step and never proceeds without your explicit approval:

```bash
node scripts/prepare-release.mjs
# or
npm run prepare-release
```

This walks you through:
1. ✓ Check you're on `main` branch
2. ✓ Check working tree is clean (or let you commit)
3. ✓ Switch to PROD mode
4. ✓ Run prerelease audit (17 checks)
5. ✓ Build ZIPs
6. ✓ Bump version (patch / minor / major — you choose)
7. ✓ Create release commit + tag
8. ✓ Push to GitHub

Each step requires `s` confirmation — nothing happens automatically.

### Manual steps (equivalent)

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

### Git hooks

The `pre-push` git hook blocks pushes while the manifest contains
`"Resumir (DEV)"` to avoid accidentally publishing the DEV build.
Note: the hook is a Bash script — on Windows, use `git-bash` or WSL.
