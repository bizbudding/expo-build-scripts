/**
 * @bizbudding/expo-build-scripts
 *
 * Requiring this module runs the EAS preflight (Node version, clean package
 * files, in-sync lockfile) against the consuming app's cwd. On success, it
 * re-exports `run` and `getOutput` helpers for use in build scripts.
 *
 * Usage:
 *   // scripts/utils.js in the consuming app
 *   module.exports = require('@bizbudding/expo-build-scripts');
 */
const runPreflight = require('./lib/preflight');
const exec = require('./lib/exec');

runPreflight();

module.exports = exec;
