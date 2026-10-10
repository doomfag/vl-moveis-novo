import { DatabaseSync } from "node:sqlite";
import { createReadStream } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readdir,
  writeFile,
  copyFile,
  chmod,
  rm,
  stat,
  rename,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
const database = resolve(process.env.DB_PATH || "data/store.sqlite");
const directory = resolve(
  process.env.BACKUP_DIR || join(dirname(database), "backups"),
);
const pattern = /^vl-moveis-[0-9TZ_-]+-[a-f0-9-]+\.tar\.gz$/;
async function archives() {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const names = (await readdir(directory)).filter((name) => pattern.test(name));
  const files = await Promise.all(
    names.map(async (name) => ({
      name,
      modified: (await stat(join(directory, name))).mtimeMs,
    })),
  );
  return files
    .sort((a, b) => b.modified - a.modified || b.name.localeCompare(a.name))
    .map((file) => file.name);
}
async function main() {
  if (process.argv[2] === "--status") {
    const files = await archives();
    const latest = files[0] ? await stat(join(directory, files[0])) : null;
    console.log(
      JSON.stringify({
        count: files.length,
        lastBackupAt: latest?.mtime.toISOString() || null,
        automatic: process.env.BACKUP_AUTOMATIC === "1",
        retention: 3,
      }),
    );
    return;
  }
  await stat(database); // Never create an empty database as a backup.
  await archives();
  const lock = join(directory, ".creating");
  await mkdir(lock, { mode: 0o700 }); // Serialize daemon and admin requests.
  let staging;
  let pending;
  try {
    staging = await mkdtemp(join(directory, ".snapshot-"));
    const copy = join(staging, "store.sqlite");
    const db = new DatabaseSync(database, { readOnly: true });
    try {
      db.exec("PRAGMA busy_timeout=5000");
      db.exec("VACUUM INTO '" + copy.replaceAll("'", "''") + "'");
    } finally {
      db.close();
    }
    await chmod(copy, 0o600);
    const check = new DatabaseSync(copy, { readOnly: true });
    try {
      if (
        check.prepare("PRAGMA integrity_check").get().integrity_check !== "ok"
      )
        throw new Error("Backup integrity check failed");
    } finally {
      check.close();
    }
    const photos = resolve(process.env.CATALOG_UPLOAD_DIR || "public/catalogo");
    await mkdir(join(staging, "photos"), { mode: 0o700 });
    let entries = [];
    try {
      entries = await readdir(photos, { withFileTypes: true });
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    for (const entry of entries) {
      if (
        !entry.isFile() ||
        !/^[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg|svg)$/.test(entry.name)
      )
        continue;
      await copyFile(
        join(photos, entry.name),
        join(staging, "photos", entry.name),
      );
      await chmod(join(staging, "photos", entry.name), 0o600);
    }
    const files = [
      "store.sqlite",
      ...(await readdir(join(staging, "photos")))
        .sort()
        .map((name) => "photos/" + name),
    ];
    const hashes = {};
    for (const file of files) {
      const hash = createHash("sha256");
      for await (const chunk of createReadStream(join(staging, file)))
        hash.update(chunk);
      hashes[file] = hash.digest("hex");
    }
    const createdAt = new Date().toISOString();
    await writeFile(
      join(staging, "manifest.json"),
      JSON.stringify({ version: 1, createdAt, files: hashes }, null, 2),
      { mode: 0o600 },
    );
    await writeFile(
      join(staging, "RESTAURAR.txt"),
      "Backup privado da VL Móveis: banco SQLite consistente e fotos enviadas. Não publique este arquivo.\nPara restaurar, pare o serviço e preserve os dados atuais. Confira os hashes SHA-256 de manifest.json, restaure store.sqlite em DB_PATH e photos em CATALOG_UPLOAD_DIR. Remova os antigos arquivos -wal e -shm apenas com o serviço parado. As configurações privadas do Render e o código do site não fazem parte deste arquivo. Retome o serviço e teste contas, produtos e fotos.\n",
      { mode: 0o600 },
    );
    const name =
      "vl-moveis-" +
      createdAt.replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z") +
      "-" +
      randomUUID() +
      ".tar.gz";
    const destination = join(directory, name);
    pending = destination + ".partial";
    await run("tar", [
      "-czf",
      pending,
      "-C",
      staging,
      "store.sqlite",
      "photos",
      "manifest.json",
      "RESTAURAR.txt",
    ]);
    await chmod(pending, 0o600);
    await rename(pending, destination);
    pending = null;
    for (const old of (await archives()).slice(3))
      await rm(join(directory, old));
    console.log(
      JSON.stringify({
        file: destination,
        name,
        createdAt,
        bytes: (await stat(destination)).size,
      }),
    );
  } finally {
    if (pending) await rm(pending, { force: true });
    if (staging) await rm(staging, { recursive: true, force: true });
    await rm(lock, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(
    error.code === "EEXIST"
      ? "Já existe um backup em andamento."
      : "Não foi possível criar/verificar o backup: " +
          (error.code || error.message),
  );
  process.exitCode = 1;
});
