#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo 'Abra a loja com iniciar-linux.sh primeiro.'; exit 1
fi
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) === 24 ? 0 : 1)' 2>/dev/null; then
  exec npx --yes --package=node@24.19.0 --package=npm@11.9.0 -- bash "${BASH_SOURCE[0]}" "$@"
fi
vl_admin_email="${1:-}"
if [[ -z "$vl_admin_email" ]]; then
  echo 'Primeiro crie sua conta na loja e confirme o e-mail recebido.'
  read -r -p 'Digite o e-mail dessa conta e pressione Enter: ' vl_admin_email
fi
node --env-file-if-exists=.env.local scripts/admin.mjs "$vl_admin_email"
