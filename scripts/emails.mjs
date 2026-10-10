// Local operator preview only. This is not a public API and never serves tokens to customers.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Uso: npm run emails -- seu-email");
  process.exit(1);
}
const directory = resolve(process.env.EMAIL_PREVIEW_DIR || "data/emails-local");
let messages;
try {
  messages = readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(resolve(directory, name), "utf8")))
    .filter((message) => message.to === email)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
} catch {
  console.error(
    "Nenhuma mensagem local encontrada. Cadastre a conta ou solicite novo link primeiro.",
  );
  process.exit(1);
}
if (!messages.length) {
  console.error("Nenhuma mensagem local encontrada para esse e-mail.");
  process.exit(1);
}
console.log(
  "Prévia local — nenhum e-mail foi enviado para a internet.\n" +
    messages[0].subject +
    "\n\n" +
    messages[0].text,
);
