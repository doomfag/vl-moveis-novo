// Local operator-only role assignment. Never grant access based on public registration order.
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error(
    "Uso: npm run admin -- email-da-conta\nPrimeiro, cadastre sua conta na loja. Execute somente no servidor da VL Móveis.",
  );
  process.exit(1);
}
const path = resolve(process.env.DB_PATH || "data/store.sqlite");
if (!existsSync(path)) {
  console.error("Inicie a loja e cadastre sua conta primeiro.");
  process.exit(1);
}
const db = new DatabaseSync(path);
db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000");
const row = db.prepare("SELECT id FROM users WHERE email=?").get(email);
if (!row) {
  console.error(
    "Conta não encontrada. Cadastre-se na loja antes de habilitar o painel.",
  );
  db.close();
  process.exit(1);
}
db.prepare("UPDATE users SET role='admin' WHERE id=?").run(row.id);
db.prepare(
  "INSERT INTO audit(user_id,action,target) VALUES(?,'admin.grant',?)",
).run("local-operator", row.id);
console.log(
  "Acesso administrativo habilitado para a conta indicada. Atualize a página da conta.",
);
db.close();
