# @bizbudding/expo-build-scripts

Shared preflight + execution helpers for Bizbudding Expo app build scripts (`testflight`, `ota`, `appstore`).

Three things consolidated out of the copy-paste-per-app pattern:

1. **Preflight checks** that run before every `eas build` and catch EAS environment issues in ~2 seconds instead of after a 20-minute EAS queue wait.
2. **`run` / `getOutput` / `withRevisionRevert`** helpers for build scripts.
3. **`with-nvm`** shell wrapper so `npm run testflight` auto-switches to the Node version pinned in `.nvmrc`.

---

## Install

Add to your app's `devDependencies`. The repo is public, so HTTPS with a semver range is the recommended form — no GitHub auth required from local or EAS:

```json
{
  "devDependencies": {
    "@bizbudding/expo-build-scripts": "git+https://github.com/bizbudding/expo-build-scripts.git#semver:^1.0.0"
  }
}
```

Then `npm install`. The `#semver:^1.0.0` range pulls the highest compatible tag — minor and patch updates flow in when you run `npm update @bizbudding/expo-build-scripts` and commit the refreshed `package-lock.json`. Major version bumps stay pinned (they may be breaking).

> **Heads up on tag bumps:** `npm install` alone doesn't re-resolve a git ref whose previous SHA is already pinned in the lockfile. Use `npm update @bizbudding/expo-build-scripts` after changing the range (e.g., `^1` → `^2`) to force a fresh resolve.

---

## Use

### `scripts/utils.js` in the consuming app

One-line re-export:

```js
module.exports = require('@bizbudding/expo-build-scripts');
```

Requiring the package runs the preflight (Node version, clean package files, in-sync lockfile) against the app's `cwd`. If anything fails, the process exits non-zero with a clear error and fix. If everything passes, `run`, `getOutput`, and `withRevisionRevert` are exported for your build scripts.

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

`with-nvm` is installed as a bin by this package — available at `node_modules/.bin/with-nvm` once the package is installed, which is on the `npm run` PATH automatically.

### `scripts/testflight.js`

```js
#!/usr/bin/env node
const { run, withRevisionRevert } = require('./utils');

withRevisionRevert(() => {
  run('node scripts/increment-revision.js');
  run('eas build -p ios --profile preview --submit');
});
```

### `scripts/ota.js`

```js
#!/usr/bin/env node
const { run, getOutput, withRevisionRevert } = require('./utils');

const branchChannelMap = {
  develop: 'preview',
  main: 'production',
};
const branch = getOutput('git rev-parse --abbrev-ref HEAD');
const channel = branchChannelMap[branch];
if (!channel) {
  console.error(`Error: Branch "${branch}" has no EAS channel mapping.`);
  console.error(`Valid branches: ${Object.keys(branchChannelMap).join(', ')}`);
  process.exit(1);
}
console.log(`Branch: ${branch} → Channel: ${channel}`);

withRevisionRevert(() => {
  const revision = getOutput('node scripts/increment-revision.js');
  run('git add src/version.ts');
  run(`git commit -m "chore: bump revision to ${revision}"`);
  const message = getOutput('git log -1 --skip=1 --pretty=%s');
  const updateMessage = `r${revision}: ${message}`;
  console.log(`Update message: ${updateMessage}`);
  run(`eas update --branch ${channel} --message "${updateMessage}"`);
});
```

---

## What the preflight catches

| Check | What it validates | Auto-fix? |
|---|---|---|
| `checkNodeVersion` | Runtime Node major matches `package.json` → `engines.node` | No (run `nvm use`) |
| `checkPackageFilesClean` | `package.json` and `package-lock.json` are committed | No (human judgment) |
| `checkLockfileSync` | `npm ci --dry-run` passes — the exact check EAS runs | Yes (runs `npm install` and re-verifies) |

The Node check is **self-adapting**: each app declares its own Node version in its own `engines.node`. When Expo SDK 56 requires Node 22, an app bumps `engines.node` to `"22.x"` and this package needs no update.

---

## API

### `run(cmd: string): SpawnSyncReturns`

Runs a shell command with stdio inherited to the terminal. Throws on non-zero exit. Cmd is a full shell string (pipes, flags, substitutions all supported). Intended for hardcoded build commands — don't interpolate untrusted input.

### `getOutput(cmd: string): string`

Runs a shell command and returns trimmed stdout. Throws on non-zero exit. Same safety caveats as `run`.

### `withRevisionRevert(fn, opts?)`

Snapshots `src/version.ts` and the current git HEAD, runs `fn()`, and on throw:

- Restores `src/version.ts` to its pre-`fn` contents.
- If `fn()` created a commit (detected by HEAD movement), soft-resets HEAD back to the snapshot — with the file revert, the branch returns to its pre-bump state cleanly.

Idempotent: on a clean run, nothing is reverted. Accepts `opts.versionPath` if your revision file lives somewhere other than `src/version.ts`.

---

## Versioning

Semver. Released as git tags. Apps pin via a semver range (`#semver:^1.0.0`) so patches and minor updates flow on `npm update`; majors require an explicit range bump.

See [CHANGES.md](./CHANGES.md) for the version history.
