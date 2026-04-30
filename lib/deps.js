/**
 * Dependency check / fix helpers for @bizbudding/expo-build-scripts.
 *
 * runCheck() — hard-fails on Expo SDK mismatch, soft-warns on outdated / audit
 *              findings. Designed to be run by the developer on demand
 *              (`npm run deps:check`), not automatically during builds.
 *
 * runFix()   — runs `expo install --fix` followed by `npm install`. Used
 *              after runCheck() reports drift the dev wants to resolve.
 *
 * Exit codes (runCheck):
 *   0 — all checks passed, or only soft-warns
 *   1 — Expo SDK alignment failed (hard fail)
 */
const { spawnSync } = require('child_process');

const RED = '\x1b[31m';
const YEL = '\x1b[33m';
const GRN = '\x1b[32m';
const DIM = '\x1b[2m';
const RST = '\x1b[0m';

function header(msg) {
  console.log(`\n${DIM}── ${msg} ───────────────${RST}`);
}

function ok(msg) {
  console.log(`${GRN}✓ ${msg}${RST}`);
}

function warn(msg) {
  console.log(`${YEL}⚠ ${msg}${RST}`);
}

function fail(msg) {
  console.log(`${RED}✗ ${msg}${RST}`);
}

/**
 * Run `npx expo install --check`. Hard-fail (exit 1) on any mismatch — these
 * cause real runtime issues (e.g., react-native version mismatch with the
 * installed Expo SDK).
 */
function checkExpoAlignment() {
  header('Expo SDK alignment (npx expo install --check)');
  const result = spawnSync('npx', ['expo', 'install', '--check'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
  const out = (result.stdout || '') + (result.stderr || '');
  process.stdout.write(out);

  if (result.status === 0 && /Dependencies are up to date/.test(out)) {
    ok('Expo packages aligned with installed SDK');
    return true;
  }
  fail('Expo SDK mismatch — run `npm run deps:fix` to resolve.');
  return false;
}

/**
 * Run `npm outdated`. Print findings as a warning. Never fails — outdated
 * packages are informational, not actionable for every build.
 *
 * `npm outdated` exits 1 when anything is outdated, 0 otherwise. We ignore
 * the exit code on purpose.
 */
function checkOutdated() {
  header('Third-party drift (npm outdated)');
  const result = spawnSync('npm', ['outdated'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
  const out = (result.stdout || '').trim();

  if (!out) {
    ok('No outdated packages');
    return;
  }
  process.stdout.write(out + '\n');
  warn('Outdated packages above. Review at the start of your next feature branch — never the day of a release.');
}

/**
 * Run `npm audit`. Print summary counts as a warning. Never fails — a high
 * audit finding deserves attention but should not block a hotfix.
 */
function checkAudit() {
  header('Vulnerability audit (npm audit)');
  const result = spawnSync('npm', ['audit', '--json'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
  let parsed;
  try {
    parsed = JSON.parse(result.stdout || '{}');
  } catch {
    warn('Could not parse `npm audit --json` output. Run `npm audit` manually.');
    return;
  }

  const v = (parsed.metadata && parsed.metadata.vulnerabilities) || {};
  const total = (v.info || 0) + (v.low || 0) + (v.moderate || 0) + (v.high || 0) + (v.critical || 0);

  if (total === 0) {
    ok('No known vulnerabilities');
    return;
  }
  const summary = `${v.critical || 0} critical, ${v.high || 0} high, ${v.moderate || 0} moderate, ${v.low || 0} low, ${v.info || 0} info`;
  warn(`${total} vulnerabilities (${summary})`);
  if ((v.critical || 0) > 0 || (v.high || 0) > 0) {
    warn('Critical/high findings — review and bump affected packages soon.');
  } else {
    console.log(`${DIM}Run \`npm audit\` for details.${RST}`);
  }
}

function runCheck() {
  console.log(`\n${DIM}Dependency check (deps:check)${RST}`);
  const expoOk = checkExpoAlignment();
  checkOutdated();
  checkAudit();
  console.log('');
  process.exit(expoOk ? 0 : 1);
}

function runFix() {
  console.log(`\n${DIM}Dependency fix (deps:fix)${RST}`);
  header('Aligning Expo SDK packages (npx expo install --fix)');
  const fix = spawnSync('npx', ['expo', 'install', '--fix'], { stdio: 'inherit' });
  if (fix.status !== 0) {
    fail('expo install --fix failed');
    process.exit(fix.status || 1);
  }
  header('Refreshing lockfile (npm install)');
  const inst = spawnSync('npm', ['install'], { stdio: 'inherit' });
  if (inst.status !== 0) {
    fail('npm install failed');
    process.exit(inst.status || 1);
  }
  ok('Dependencies fixed. Commit package.json + package-lock.json.');
}

module.exports = { runCheck, runFix };
