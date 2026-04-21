/**
 * Preflight checks for Expo build scripts.
 *
 * Runs before any build/submit operation and validates the dev environment
 * and git state against what EAS expects — so a failure surfaces here in
 * ~2 seconds instead of after a 20-minute EAS queue.
 *
 * Checks, in order:
 *   1. checkNodeVersion()       — runtime Node major matches package.json engines.node
 *   2. checkPackageFilesClean() — package.json + package-lock.json are committed
 *   3. checkLockfileSync()      — `npm ci --dry-run` passes; auto-fixes via `npm install`
 *      on stale-lockfile mismatch and re-verifies.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const RED = '\x1b[31m';
const YEL = '\x1b[33m';
const GRN = '\x1b[32m';
const RST = '\x1b[0m';

function fail(msg) {
  console.error(`\n${RED}Error: ${msg}${RST}`);
  process.exit(1);
}

function warn(msg) {
  console.error(`${YEL}${msg}${RST}`);
}

/**
 * Read the consuming app's package.json (not our own — resolved via cwd).
 * Falls back to fail() with a clear message if missing or unparseable.
 */
function readAppPackageJson() {
  const pkgPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(pkgPath)) {
    fail(`No package.json in ${process.cwd()}. Run build scripts from the app root.`);
  }
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (e) {
    fail(`Could not parse ${pkgPath}: ${e.message}`);
  }
}

/**
 * Validate that the runtime Node major matches what the app declares in
 * package.json engines.node. Each app pins its own Node version there, so
 * this check is self-adapting across SDK upgrades.
 */
function checkNodeVersion() {
  const pkg = readAppPackageJson();
  const engines = pkg.engines && pkg.engines.node;

  if (!engines) {
    fail(
      'package.json is missing engines.node. Add it to declare the Node major this app requires.\n' +
      'Example: "engines": { "node": "20.x" }'
    );
  }

  const match = String(engines).match(/(\d+)/);
  if (!match) {
    fail(`Could not parse major version from engines.node = "${engines}".`);
  }
  const expected = parseInt(match[1], 10);
  const actual = parseInt(process.versions.node.split('.')[0], 10);

  if (actual !== expected) {
    console.error(
      `\n${RED}Error: Node ${process.versions.node} detected, but package.json engines pins ${expected}.x.${RST}`
    );
    console.error(`\nFix: nvm use ${expected}\n`);
    process.exit(1);
  }
}

/**
 * Warn if package.json or package-lock.json have uncommitted changes.
 * EAS builds from the committed git state, so uncommitted dep changes
 * won't be in the build even though the preflight checks pass locally.
 */
function checkPackageFilesClean() {
  const result = spawnSync(
    'git',
    ['status', '--porcelain', 'package.json', 'package-lock.json'],
    { encoding: 'utf8' }
  );
  if (result.status !== 0) {
    // Not a git repo, or git unavailable. Skip rather than fail — this check
    // is a safety net, not a hard requirement.
    return;
  }
  const dirty = result.stdout.trim();
  if (dirty) {
    console.error(`\n${YEL}Warning: uncommitted changes to package files:${RST}`);
    console.error(dirty);
    console.error(
      '\nEAS builds from the committed git state. Commit these first or the build\nwill use the old deps.\n'
    );
    process.exit(1);
  }
}

/**
 * Run `npm ci --dry-run` to verify the lockfile is in sync with package.json.
 * EAS runs `npm ci` for real; if the lockfile is stale, EAS fails with
 * "Missing from lock file" after a long queue wait. We catch it here in seconds.
 *
 * Auto-fix: on stale-lockfile failure, run `npm install` to regenerate the
 * lockfile and re-run the dry-run. If the second run still fails, give up.
 */
function checkLockfileSync(allowAutoFix = true) {
  process.stdout.write('Verifying package-lock.json is in sync... ');
  const result = spawnSync('npm', ['ci', '--dry-run'], { encoding: 'utf8' });

  if (result.status === 0) {
    console.log(`${GRN}ok${RST}`);
    return;
  }

  console.log(`${RED}failed${RST}`);

  const stderr = result.stderr || '';
  const missing = stderr.split('\n').filter((l) => l.includes('Missing:')).slice(0, 5);

  if (!allowAutoFix) {
    console.error(`\n${RED}Error: package-lock.json is still out of sync after regeneration.${RST}`);
    if (missing.length) console.error('\n' + missing.join('\n'));
    console.error(`\nThis usually means a dependency constraint in package.json can't be satisfied.\n`);
    process.exit(1);
  }

  console.error(`\n${YEL}Lockfile out of sync. Regenerating automatically...${RST}`);
  if (missing.length) {
    console.error(missing.join('\n'));
  }
  console.error('');

  const install = spawnSync('npm', ['install'], { stdio: 'inherit' });
  if (install.status !== 0) {
    fail('npm install failed during auto-fix. Resolve the error above and re-run.');
  }

  console.error(
    `\n${YEL}Note: package-lock.json was regenerated. Remember to commit it before the build is pushed.${RST}\n`
  );

  // Re-verify (no further auto-fix) to confirm the install actually resolved the mismatch.
  checkLockfileSync(false);
}

function runPreflight() {
  checkNodeVersion();
  checkPackageFilesClean();
  checkLockfileSync();
}

module.exports = runPreflight;
module.exports.checkNodeVersion = checkNodeVersion;
module.exports.checkPackageFilesClean = checkPackageFilesClean;
module.exports.checkLockfileSync = checkLockfileSync;
