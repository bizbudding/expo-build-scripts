/**
 * @bizbudding/expo-build-scripts
 *
 * Requiring this module runs the EAS preflight (Node version, clean package
 * files, in-sync lockfile) against the consuming app's cwd. On success, it
 * exports `run` and `getOutput` helpers, plus `withRevisionRevert` for
 * rolling back a revision bump when a build/submit fails.
 *
 * Usage:
 *   // scripts/utils.js in the consuming app
 *   module.exports = require('@bizbudding/expo-build-scripts');
 */
const runPreflight = require('./lib/preflight');
const exec = require('./lib/exec');
const revision = require('./lib/revision');

runPreflight();

module.exports = {
  ...exec,
  ...revision,
};
