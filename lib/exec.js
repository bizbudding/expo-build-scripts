/**
 * Run helpers for build scripts.
 *
 * Callers compose complex `eas` and `git` command strings with pipes/flags,
 * so these helpers run through a shell. All commands are string literals
 * defined in our own build scripts (no user input, no injection surface).
 */
const { spawnSync } = require('child_process');

/** Run a command with output streamed to the terminal. */
function run(cmd) {
  console.log(`\n> ${cmd}\n`);
  const result = spawnSync(cmd, { shell: true, stdio: 'inherit' });
  if (result.status !== 0) {
    const err = new Error(`Command failed with exit code ${result.status}: ${cmd}`);
    err.status = result.status;
    throw err;
  }
  return result;
}

/** Run a command and return its stdout (trimmed). */
function getOutput(cmd) {
  const result = spawnSync(cmd, { shell: true, encoding: 'utf8' });
  if (result.status !== 0) {
    const err = new Error(`Command failed with exit code ${result.status}: ${cmd}`);
    err.status = result.status;
    err.stderr = result.stderr;
    throw err;
  }
  return result.stdout.trim();
}

module.exports = { run, getOutput };
