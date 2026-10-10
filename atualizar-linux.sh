#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if ! command -v npm >/dev/null 2>&1; then echo 'Instale Node.js 24 para continuar.'; exit 1; fi
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) === 24 ? 0 : 1)' 2>/dev/null; then
  exec npx --yes --package=node@24.19.0 --package=npm@11.9.0 -- bash "${BASH_SOURCE[0]}" "$@"
fi
node scripts/update-local.mjs "$@"
echo 'Agora abra esta versão com: bash iniciar-linux.sh'
