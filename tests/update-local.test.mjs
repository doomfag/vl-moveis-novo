import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
test("Atualizador copia banco consistente em WAL, papel admin e configuração; preserva pasta antiga e recusa sobrescrever dados", () => {
  const dir = mkdtempSync(join(tmpdir(), "vl-updater-")),
    source = join(dir, "old"),
    destination = join(dir, "new");
  let db;
  try {
    for (const p of [source, destination]) {
      mkdirSync(join(p, "data"), { recursive: true });
      mkdirSync(join(p, "public/catalogo"), { recursive: true });
      writeFileSync(
        join(p, "package.json"),
        JSON.stringify({ name: "vl-moveis" }),
      );
    }
    db = new DatabaseSync(join(source, "data/store.sqlite"));
    db.exec(
      "PRAGMA journal_mode=WAL; CREATE TABLE users(id TEXT PRIMARY KEY,role TEXT); INSERT INTO users VALUES('owner','admin');",
    );
    writeFileSync(
      join(source, ".env.local"),
      "EMAIL_FROM=Loja <loja@example.test>\nRESEND_API_KEY=test-fixture-not-a-real-key\n",
    );
    writeFileSync(
      join(source, "public/catalogo/customer-photo.webp"),
      "original uploaded pixels",
    );
    writeFileSync(
      join(source, "public/catalogo/source.webp"),
      "old catalogue pixels",
    );
    writeFileSync(
      join(destination, "public/catalogo/source.webp"),
      "new catalogue pixels",
    );
    const script = resolve("scripts/update-local.mjs");
    const result = execFileSync(process.execPath, [script, source], {
      cwd: destination,
      encoding: "utf8",
    });
    assert.match(result, /permanece intacta/);
    assert.doesNotMatch(result, /test-fixture-not-a-real-key/);
    const backup = new DatabaseSync(join(destination, "data/store.sqlite"));
    assert.equal(
      backup.prepare("SELECT role FROM users WHERE id='owner'").get().role,
      "admin",
    );
    backup.close();
    assert.equal(
      readFileSync(join(source, ".env.local"), "utf8"),
      readFileSync(join(destination, ".env.local"), "utf8"),
    );
    assert.equal(
      readFileSync(join(destination, "public/catalogo/source.webp"), "utf8"),
      "new catalogue pixels",
    );
    assert.equal(
      readFileSync(
        join(destination, "public/catalogo/customer-photo.webp"),
        "utf8",
      ),
      "original uploaded pixels",
    );
    assert.ok(existsSync(join(source, "data/store.sqlite")));
    assert.throws(
      () =>
        execFileSync(process.execPath, [script, source], {
          cwd: destination,
          stdio: "pipe",
        }),
      /Command failed/,
    );
  } finally {
    db?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
