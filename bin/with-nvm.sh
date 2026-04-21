#!/usr/bin/env bash
# with-nvm: source nvm, run `nvm use` (reads .nvmrc), exec the passed command.
#
# Wraps npm-script invocations so Node-version switching happens automatically
# when developers run `npm run testflight`, etc.
#
# Degrades gracefully: if nvm is not installed, execs the command under
# whatever Node is already on PATH. This matters for EAS Build servers,
# which don't have nvm but manage Node versions themselves.

set -e

if [ "$#" -eq 0 ]; then
  echo "Usage: with-nvm <command> [args...]" >&2
  exit 1
fi

# Try common nvm locations.
NVM_SH=""
if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  NVM_SH="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
elif [ -s "/usr/local/opt/nvm/nvm.sh" ]; then
  NVM_SH="/usr/local/opt/nvm/nvm.sh"
elif [ -s "/opt/homebrew/opt/nvm/nvm.sh" ]; then
  NVM_SH="/opt/homebrew/opt/nvm/nvm.sh"
fi

if [ -n "$NVM_SH" ]; then
  # shellcheck source=/dev/null
  . "$NVM_SH"
  if [ -f ".nvmrc" ]; then
    nvm use --silent > /dev/null || {
      echo "with-nvm: nvm use failed — is the pinned Node version installed? Try: nvm install" >&2
      exit 1
    }
  fi
fi

exec "$@"
