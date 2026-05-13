# Build Instructions

This document describes how to build **Resumir contingut** from source. Required by AMO (addons.mozilla.org) for source code submission.

## Requirements

- **Node.js** 18 or higher
- **npm** 9 or higher
- **PowerShell** 5.1+ (pre-installed on Windows; available via `pwsh` on Linux/macOS)

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
- `resumir-contingut-vX.Y.Z-firefox.zip` — submit to AMO
- `resumir-contingut-vX.Y.Z-chromium.zip` — submit to Chrome Web Store

## Key dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| esbuild | `^0.27.3` | Bundles `background.js` and `sidebar/*.js` for Chromium |
| defuddle | `^0.14.0` | Twitter/X content extraction (vendored to `sidebar/defuddle.js`) |

## Vendored files

Two files are vendored (pre-built) in the repository:

- `sidebar/defuddle.js` — built from [defuddle](https://github.com/kepano/defuddle) (`npm run vendor:update`)
- `sidebar/Readability.js` — from [Mozilla/readability](https://github.com/mozilla/readability)

SHA-256 hashes for these files are recorded in `THIRD_PARTY.md` and verified by:

```bash
npm run vendor:verify
```

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
npm test          # 207 unit + E2E tests
npm run lint      # ESLint (0 warnings expected)
npm run prerelease  # Full pre-release audit
```
