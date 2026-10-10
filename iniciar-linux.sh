#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

if ! command -v npm >/dev/null 2>&1; then
  echo 'Instale Node.js 24 LTS para abrir a loja.'
  exit 1
fi
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) === 24 ? 0 : 1)' 2>/dev/null; then
  echo 'Preparando Node.js 24 para este projeto...'
  exec npx --yes --package=node@24.19.0 --package=npm@11.9.0 -- bash "${BASH_SOURCE[0]}"
fi

if [[ ! -d node_modules ]]; then
  echo 'Instalando o projeto. Aguarde a primeira instalação...'
  npm ci
fi

export VL_PREVIEW_PORT="${VL_PREVIEW_PORT:-3000}"
node - "$VL_PREVIEW_PORT" <<'JS'
const net = require('node:net');
const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('Escolha uma porta entre 1024 e 65535.'); process.exit(1);
}
const server = net.createServer();
server.on('error', () => {
  console.error(`A porta ${port} está ocupada. Tente: VL_PREVIEW_PORT=3001 bash iniciar-linux.sh`);
  process.exit(1);
});
server.listen(port, '127.0.0.1', () => server.close());
JS

vl_launch_group=0
if command -v setsid >/dev/null 2>&1; then
  setsid ./node_modules/.bin/next dev --hostname 127.0.0.1 --port "$VL_PREVIEW_PORT" &
  vl_server_pid=$!
  vl_launch_group=1
else
  ./node_modules/.bin/next dev --hostname 127.0.0.1 --port "$VL_PREVIEW_PORT" &
  vl_server_pid=$!
fi
vl_cleanup() {
  if [[ "$vl_launch_group" == 1 ]]; then
    kill -TERM -- "-$vl_server_pid" 2>/dev/null || true
    for ((vl_stop_attempt=0; vl_stop_attempt<10; vl_stop_attempt++)); do
      if ! kill -0 -- "-$vl_server_pid" 2>/dev/null; then break; fi
      sleep .2
    done
    kill -KILL -- "-$vl_server_pid" 2>/dev/null || true
  else
    kill -INT "$vl_server_pid" 2>/dev/null || true
  fi
  wait "$vl_server_pid" 2>/dev/null || true
}
trap vl_cleanup EXIT
trap 'exit 130' INT TERM

vl_ready=0
for ((vl_attempt=0; vl_attempt<90; vl_attempt++)); do
  if ! kill -0 "$vl_server_pid" 2>/dev/null; then
    echo 'O servidor não iniciou. Consulte o erro acima.'
    exit 1
  fi
  if node - "$VL_PREVIEW_PORT" <<'JS'
const http = require('node:http');
const request = http.get(`http://127.0.0.1:${process.argv[2]}/api/health`, (response) => {
  let body = '';
  response.on('data', (chunk) => body += chunk);
  response.on('end', () => {
    try { const data = JSON.parse(body); process.exit(response.statusCode === 200 && data.ok === true && data.storage === 'sqlite' ? 0 : 1); }
    catch { process.exit(1); }
  });
});
request.setTimeout(1500, () => request.destroy());
request.on('error', () => process.exit(1));
JS
  then
    vl_ready=1
    break
  fi
  sleep 1
done
if [[ "$vl_ready" != 1 ]]; then
  echo 'O servidor não ficou pronto em 90 segundos.'
  exit 1
fi
vl_url="http://127.0.0.1:$VL_PREVIEW_PORT"
echo "Loja pronta: $vl_url"
echo 'Mantenha este terminal aberto. Ctrl+C encerra a loja.'
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$vl_url" >/dev/null 2>&1 || true
fi
wait "$vl_server_pid"
