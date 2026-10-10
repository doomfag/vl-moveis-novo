import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

test("Backup restaura dados gravados em WAL, fotos e hashes; mantém três cópias e preserva as anteriores em falhas", () => {
  const dir = mkdtempSync(join(tmpdir(), "vl-backup-test-"));
  const photos = join(dir, "uploads"),
    backups = join(dir, "backups");
  mkdirSync(photos);
  writeFileSync(join(photos, "foto.webp"), "fixture-photo");
  const source = new DatabaseSync(join(dir, "source.sqlite"));
  const env = {
    ...process.env,
    DB_PATH: join(dir, "source.sqlite"),
    CATALOG_UPLOAD_DIR: photos,
    BACKUP_DIR: backups,
  };
  try {
    source.exec(
      "PRAGMA journal_mode=WAL; CREATE TABLE users (email TEXT); INSERT INTO users VALUES ('fixture@example.test');",
    );
    for (let index = 0; index < 4; index++) {
      source.prepare("INSERT INTO users VALUES (?)").run("row" + index);
      const result = JSON.parse(
        execFileSync(process.execPath, ["scripts/backup.mjs"], {
          env,
          encoding: "utf8",
        }),
      );
      assert.equal(statSync(result.file).mode & 0o777, 0o600);
      const restore = join(dir, "restore" + index);
      mkdirSync(restore);
      execFileSync("tar", ["-xzf", result.file, "-C", restore]);
      const db = new DatabaseSync(join(restore, "store.sqlite"), {
        readOnly: true,
      });
      assert.equal(
        db.prepare("SELECT COUNT(*) AS count FROM users").get().count,
        index + 2,
      );
      assert.equal(
        db.prepare("PRAGMA integrity_check").get().integrity_check,
        "ok",
      );
      db.close();
      const manifest = JSON.parse(readFileSync(join(restore, "manifest.json")));
      for (const [file, hash] of Object.entries(manifest.files))
        assert.equal(
          createHash("sha256")
            .update(readFileSync(join(restore, file)))
            .digest("hex"),
          hash,
        );
      assert.equal(
        readFileSync(join(restore, "photos/foto.webp"), "utf8"),
        "fixture-photo",
      );
      assert.ok(!readdirSync(restore).includes(".env.local"));
    }
    const status = JSON.parse(
      execFileSync(process.execPath, ["scripts/backup.mjs", "--status"], {
        env,
        encoding: "utf8",
      }),
    );
    assert.equal(status.count, 3);
    assert.ok(status.lastBackupAt);
    mkdirSync(join(backups, ".creating"));
    const locked = spawnSync(process.execPath, ["scripts/backup.mjs"], { env });
    assert.equal(locked.status, 1);
    assert.equal(
      readdirSync(backups).filter((f) => f.endsWith(".tar.gz")).length,
      3,
    );
    rmSync(join(backups, ".creating"), { recursive: true });
    const missing = spawnSync(process.execPath, ["scripts/backup.mjs"], {
      env: { ...env, DB_PATH: join(dir, "missing.sqlite") },
    });
    assert.equal(missing.status, 1);
    assert.equal(
      readdirSync(backups).filter((f) => f.endsWith(".tar.gz")).length,
      3,
    );
  } finally {
    source.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
