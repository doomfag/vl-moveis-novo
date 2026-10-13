import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { sendOwnerChatEmail, mailAvailable } from "../lib/mail.ts";
const origin = process.env.APP_ORIGIN;
if (!origin || !mailAvailable(origin)) process.exit(0);
if (!existsSync(resolve(process.env.DB_PATH || "data/store.sqlite")))
  process.exit(0);
const db = new DatabaseSync(
  resolve(process.env.DB_PATH || "data/store.sqlite"),
);
db.exec("PRAGMA busy_timeout=5000");
try {
  if (
    !db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='chat_alerts'",
      )
      .get()
  )
    process.exitCode = 0;
  else {
    const rows = db
      .prepare(
        `SELECT * FROM chat_alerts q WHERE q.delivered_row<q.queued_row AND q.next_attempt<=? AND q.locked_until<=?
      AND q.queued_row>COALESCE((SELECT MAX(m.rowid) FROM messages m WHERE m.user_id=q.customer_id AND m.sender='admin'),0) ORDER BY q.queued_row LIMIT 5`,
      )
      .all(Date.now(), Date.now());
    for (const row of rows) {
      const claim = db
        .prepare(
          "UPDATE chat_alerts SET locked_until=? WHERE customer_id=? AND queued_row=? AND delivered_row<queued_row AND locked_until<=?",
        )
        .run(Date.now() + 120000, row.customer_id, row.queued_row, Date.now());
      if (!claim.changes) continue;
      try {
        await sendOwnerChatEmail(origin);
        db.prepare(
          "UPDATE chat_alerts SET delivered_row=?,locked_until=0 WHERE customer_id=? AND queued_row=?",
        ).run(row.queued_row, row.customer_id, row.queued_row);
        console.log("Aviso de nova conversa enviado.");
      } catch {
        const delay = Math.min(
          3600000,
          60000 * 2 ** Math.min(Number(row.attempts), 6),
        );
        db.prepare(
          "UPDATE chat_alerts SET attempts=attempts+1,next_attempt=?,locked_until=0 WHERE customer_id=? AND queued_row=?",
        ).run(Date.now() + delay, row.customer_id, row.queued_row);
        console.error(
          "Aviso de conversa não enviado; nova tentativa agendada.",
        );
      }
    }
  }
} finally {
  db.close();
}
