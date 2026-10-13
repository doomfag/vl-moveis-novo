import { spawn, execFile } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
process.env.BACKUP_AUTOMATIC = "1";
const directory = resolve(
  process.env.BACKUP_DIR ||
    join(
      dirname(resolve(process.env.DB_PATH || "data/store.sqlite")),
      "backups",
    ),
);
// One production process per persistent disk. Clear a lock left by an interrupted deployment.
rmSync(join(directory, ".creating"), { recursive: true, force: true });
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"],
  { env: process.env, stdio: "inherit" },
);
let busy = false;
function backup() {
  if (busy || !existsSync(resolve(process.env.DB_PATH || "data/store.sqlite")))
    return;
  busy = true;
  execFile(
    process.execPath,
    ["scripts/backup.mjs"],
    { env: process.env, timeout: 120000 },
    (error) => {
      busy = false;
      console.log(
        error
          ? "Falha no backup automático. Confira os logs e o disco."
          : "Backup automático concluído.",
      );
    },
  );
}
let notifying = false;
const messages = setInterval(() => {
  if (
    notifying ||
    !existsSync(resolve(process.env.DB_PATH || "data/store.sqlite"))
  )
    return;
  notifying = true;
  execFile(
    process.execPath,
    ["scripts/chat-notifications.mjs"],
    { env: process.env, timeout: 120000 },
    (error) => {
      notifying = false;
      if (error)
        console.error("Falha no processamento dos avisos de atendimento.");
    },
  );
}, 20000);
const first = setTimeout(backup, 60000);
const daily = setInterval(backup, 86400000);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    clearTimeout(first);
    clearInterval(messages);
    clearInterval(daily);
    server.kill(signal);
  });
server.on("exit", (code) => {
  clearTimeout(first);
  clearInterval(messages);
  clearInterval(daily);
  process.exitCode = code ?? 1;
});
