# Changes

Versioned by [semver](https://semver.org/). Apps pin via a git tag or a `#semver:^x.y.z` range.

---

## 1.1.0 — 2026-04-30

- Add `bizbudding-deps-check` CLI: runs `expo install --check` (hard-fail on mismatch) plus soft-warn `npm outdated` and `npm audit`.
- Add `bizbudding-deps-fix` CLI: runs `expo install --fix` then `npm install`, with post-fix alignment re-verification.
- Wire both via the existing `with-nvm` shim in consuming apps.

---

## 1.0.0 — 2026-04-21

First stable release. Repo flipped from private to public; install via `git+https://github.com/bizbudding/expo-build-scripts.git#semver:^1.0.0` (no auth required).

No code changes from 0.2.0 — promoting the API to 1.0 signals that `run`, `getOutput`, `withRevisionRevert`, and the `with-nvm` bin are stable. The engines-based Node check self-adapts per consuming app, so SDK upgrades don't force lock-step updates of this package.

### Removed

- `"private": true` from `package.json` — now that the repo is public, blocking accidental npm-registry publish is no longer interesting.

---

## 0.2.0 — 2026-04-21

### Added

- `withRevisionRevert(fn, opts?)` helper for `scripts/testflight.js` and `scripts/ota.js`. Snapshots `src/version.ts` + git HEAD before `fn`, restores both on throw (including a soft-reset of any commit `fn` created mid-flight).

Solves the "revision got bumped to N but never shipped" problem when an EAS build fails after the revision increment.

---

## 0.1.0 — 2026-04-21

Initial release. Extracts preflight + exec helpers that had been copy-pasted across Bizbudding Expo apps.

### Added

- `checkNodeVersion()` — reads `engines.node` from the consuming app's `package.json` and errors if the runtime major differs.
- `checkPackageFilesClean()` — errors if `package.json` / `package-lock.json` are uncommitted (EAS builds from committed git state).
- `checkLockfileSync()` — runs `npm ci --dry-run`; on failure, auto-runs `npm install` and re-verifies, printing a "please commit `package-lock.json`" reminder on auto-fix.
- `run(cmd)` / `getOutput(cmd)` — the shell-command helpers each app's build scripts already used.
- `with-nvm` bin — shell wrapper that sources nvm and runs `nvm use` (reads `.nvmrc`) before executing the passed command. Falls through silently when nvm isn't installed (e.g., on EAS Build servers).
