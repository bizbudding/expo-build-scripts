# @bizbudding/expo-build-scripts

Shared preflight and execution helpers for Bizbudding Expo app build scripts (`testflight`, `ota`, `appstore`).

Consolidates three things that used to be copy-pasted across every Expo app:

1. **Preflight checks** that run before every `eas build` to catch environment issues in ~2 seconds instead of after a 20-minute EAS queue wait.
2. **`run` / `getOutput` helpers** for invoking `git`, `eas`, and `expo` commands from build scripts.
3. **`with-nvm` shell wrapper** so `npm run testflight` auto-switches to the Node version pinned in `.nvmrc`.

---

## Install

Apps consume this package directly from GitHub via a pinned tag:

```json
{
  "devDependencies": {
    "@bizbudding/expo-build-scripts": "github:bizbudding/expo-build-scripts#v0.1.0"
  }
}
```

Then `npm install`.

---

## Use

### `scripts/utils.js` in the consuming app

Replace the contents with a one-line re-export:

```js
module.exports = require('@bizbudding/expo-build-scripts');
```

Requiring the package runs the preflight (Node version, clean package files, in-sync lockfile) against the app's `cwd`. If anything fails, the process exits non-zero with a clear error and fix. If everything passes, `run` and `getOutput` are exported for your build scripts.

### `package.json` scripts

Wrap the build-submit scripts with `with-nvm` so Node auto-switches:

```json
{
  "scripts": {
    "dev": "expo start",
    "dev:clear": "expo start -c",
    "dev:build": "expo run:ios",
    "testflight": "with-nvm node scripts/testflight.js",
    "ota": "with-nvm node scripts/ota.js",
    "appstore": "with-nvm eas build -p ios --profile production --submit"
  }
}
```

`with-nvm` is installed as a bin by this package, so it's available at `node_modules/.bin/with-nvm` once the package is installed.

---

## What the preflight catches

| Check | What it validates | Auto-fix? |
|---|---|---|
| `checkNodeVersion` | Runtime Node major matches `package.json` → `engines.node` | No (run `nvm use`) |
| `checkPackageFilesClean` | `package.json` and `package-lock.json` are committed | No (human judgment) |
| `checkLockfileSync` | `npm ci --dry-run` passes — the exact check EAS runs | Yes (runs `npm install` and re-verifies) |

The Node check is **self-adapting**: each app declares its own Node version in its own `engines.node`. When Expo SDK 56 requires Node 22, app A bumps `engines.node` to `"22.x"` and this package needs no update.

---

## Versioning

Git-tagged releases. Apps pin to a tag (`#v0.1.0`) so upgrades are explicit per-app. Bump the ref in an app's `package.json`, run `npm install`, commit.

---

## Why not npm publish?

Tiny internal tooling. Git-install is zero-overhead and keeps the package private by default via GitHub repo permissions. If the consumer set ever outgrows that, switching to GitHub Packages or npm private is a one-line `publishConfig` change.
