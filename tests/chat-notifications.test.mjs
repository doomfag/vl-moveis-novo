import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("Fila de e-mail persiste falhas, respeita intervalo de retry e evita reenvio após entrega ou resposta", () => {
  const dir = mkdtempSync(join(tmpdir(), "vl-chat-alert-"));
  const db = new DatabaseSync(join(dir, "store.sqlite"));
  try {
    db.exec(
      "CREATE TABLE messages (user_id TEXT,sender TEXT); CREATE TABLE chat_alerts (customer_id TEXT PRIMARY KEY,queued_row INTEGER,delivered_row INTEGER DEFAULT 0,attempts INTEGER DEFAULT 0,next_attempt INTEGER DEFAULT 0,locked_until INTEGER DEFAULT 0); INSERT INTO messages VALUES('fixture','customer'); INSERT INTO chat_alerts(customer_id,queued_row) VALUES('fixture',1);",
    );
    const stub = join(dir, "fetch-stub.mjs"),
      log = join(dir, "attempts");
    writeFileSync(
      stub,
      `import { appendFileSync } from 'node:fs'; globalThis.fetch=async (url, options)=>{ if(url!=='https://api.resend.com/emails') throw new Error('Unexpected host'); appendFileSync(process.env.TEST_MAIL_LOG,'attempt\\n'); return new Response('{}',{status:Number(process.env.TEST_MAIL_STATUS)}); };`,
    );
    const env = {
      ...process.env,
      DB_PATH: join(dir, "store.sqlite"),
      APP_ORIGIN: "https://vlmoveis.example.test",
      EMAIL_MODE: "",
      RESEND_API_KEY: "fixture-key-not-real",
      EMAIL_FROM: "VL Test <fixture@example.test>",
      CHAT_NOTIFY_EMAIL: "owner@example.test",
      TEST_MAIL_LOG: log,
      TEST_MAIL_STATUS: "403",
    };
    const run = (extra = {}) =>
      execFileSync(
        process.execPath,
        ["--import", stub, "scripts/chat-notifications.mjs"],
        { env: { ...env, ...extra }, stdio: "pipe" },
      );
    run();
    let row = db.prepare("SELECT * FROM chat_alerts").get();
    assert.equal(row.attempts, 1);
    assert.equal(row.delivered_row, 0);
    assert.ok(row.next_attempt > Date.now());
    assert.equal(row.locked_until, 0);
    run();
    assert.equal(readFileSync(log, "utf8").trim().split("\n").length, 1);
    db.exec("UPDATE chat_alerts SET next_attempt=0");
    run({ TEST_MAIL_STATUS: "200" });
    row = db.prepare("SELECT * FROM chat_alerts").get();
    assert.equal(row.delivered_row, 1);
    run({ TEST_MAIL_STATUS: "200" });
    assert.equal(readFileSync(log, "utf8").trim().split("\n").length, 2);
    db.exec(
      "INSERT INTO messages VALUES('fixture','admin'); UPDATE chat_alerts SET delivered_row=0,next_attempt=0;",
    );
    run({ TEST_MAIL_STATUS: "200" });
    assert.equal(readFileSync(log, "utf8").trim().split("\n").length, 2);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
