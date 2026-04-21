/**
 * Revision-rollback helper.
 *
 * Wraps a block that bumps src/version.ts REVISION before submitting to
 * EAS. On failure, restores the file to its pre-bump state — and if the
 * bump got committed in the same block (ota flow), soft-resets HEAD back
 * to the pre-bump commit too.
 *
 * Idempotent and safe: if fn() succeeds, nothing is reverted; if HEAD
 * didn't move, only the file is restored.
 */
const fs = require('fs');
const { spawnSync } = require('child_process');

const YEL = '\x1b[33m';
const RST = '\x1b[0m';

function gitRevParseHead() {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

/**
 * @param {() => any} fn     Work to execute (bump + submit).
 * @param {object}   [opts]
 * @param {string}   [opts.versionPath='src/version.ts']
 * @returns whatever fn returns
 */
function withRevisionRevert(fn, opts = {}) {
  const versionPath = opts.versionPath || 'src/version.ts';

  if (!fs.existsSync(versionPath)) {
    throw new Error(
      `withRevisionRevert: ${versionPath} not found. ` +
        'Pass opts.versionPath if your revision file lives elsewhere.'
    );
  }

  const versionSnapshot = fs.readFileSync(versionPath, 'utf8');
  const headBefore = gitRevParseHead();

  try {
    return fn();
  } catch (e) {
    console.error(`\n${YEL}Build failed — reverting revision state.${RST}`);

    // If a commit was created during fn (ota bumps then commits), soft-reset
    // HEAD and unstage the file so we end up back at the pre-bump state.
    if (headBefore) {
      const headNow = gitRevParseHead();
      if (headNow && headNow !== headBefore) {
        console.error(`  Resetting HEAD ${headNow.slice(0, 8)} → ${headBefore.slice(0, 8)}`);
        spawnSync('git', ['reset', '--soft', headBefore], { stdio: 'inherit' });
        // Unstage any file that was picked up by the commit.
        spawnSync('git', ['reset', 'HEAD', versionPath], { stdio: 'ignore' });
      }
    }

    // Restore file contents to the snapshot regardless.
    const current = fs.readFileSync(versionPath, 'utf8');
    if (current !== versionSnapshot) {
      console.error(`  Restoring ${versionPath} to pre-bump contents.`);
      fs.writeFileSync(versionPath, versionSnapshot);
    }

    throw e;
  }
}

module.exports = { withRevisionRevert };
