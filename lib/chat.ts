import { db } from "./db";
export function conversations(readerId: string) {
  return db()
    .prepare(
      `SELECT u.id,u.name,u.email,MAX(m.created_at) AS last_message,MAX(m.rowid) AS latest_row,MAX(CASE WHEN m.sender='customer' THEN m.rowid ELSE 0 END) AS latest_customer_row,COUNT(*) AS messages,
    SUM(CASE WHEN m.sender='customer' AND m.rowid>COALESCE(r.last_row,0) THEN 1 ELSE 0 END) AS unread,
    SUM(CASE WHEN m.sender='customer' AND m.rowid>COALESCE((SELECT MAX(a.rowid) FROM messages a WHERE a.user_id=u.id AND a.sender='admin'),0) THEN 1 ELSE 0 END) AS pending
    FROM messages m JOIN users u ON u.id=m.user_id LEFT JOIN chat_reads r ON r.customer_id=u.id AND r.reader_id=?
    GROUP BY u.id ORDER BY pending>0 DESC,latest_row DESC`,
    )
    .all(readerId);
}
