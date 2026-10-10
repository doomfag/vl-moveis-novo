// Preserve the old installation; copy a consistent database and private configuration.
import { DatabaseSync } from "node:sqlite";
import {
  existsSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  copyFileSync,
  chmodSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import { parseEnv } from "node:util";
import { createInterface } from "node:readline/promises";
import { randomUUID } from "node:crypto";
const destination = process.cwd();
const candidates = [];
function inspect(path, depth = 0) {
  if (depth > 3 || resolve(path) === resolve(destination)) return;
  if (
    existsSync(join(path, "package.json")) &&
    existsSync(join(path, "data/store.sqlite"))
  ) {
    try {
      if (
        JSON.parse(readFileSync(join(path, "package.json"), "utf8")).name ===
        "vl-moveis"
      )
        candidates.push(path);
    } catch {}
    return;
  }
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      !["node_modules", ".git", ".next", "data", "public", "sources"].includes(
        entry.name,
      )
    )
      inspect(join(path, entry.name), depth + 1);
  }
}
async function main() {
  let source = process.argv[2];
  if (!source) {
    const downloads = join(homedir(), "Downloads");
    if (existsSync(downloads)) inspect(downloads);
    candidates.sort(
      (a, b) =>
        statSync(join(b, "data/store.sqlite")).mtimeMs -
        statSync(join(a, "data/store.sqlite")).mtimeMs,
    );
    if (!candidates.length)
      throw new Error(
        "Não encontrei a instalação antiga em Downloads. A pasta antiga não foi alterada. Informe a pasta para eu orientar o próximo passo.",
      );
    console.log(
      "Feche o site antigo no terminal dele com Ctrl+C antes de continuar.\nPastas antigas encontradas:",
    );
    candidates.forEach((p, i) => console.log(`${i + 1}. ${p}`));
    const prompt = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await prompt.question(
      "Digite o número da pasta que você estava usando: ",
    );
    prompt.close();
    const index = Number(answer) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= candidates.length)
      throw new Error("Número inválido. Nenhum dado foi alterado.");
    source = candidates[index];
  }
  source = resolve(source);
  if (source === destination)
    throw new Error("Escolha a pasta antiga, diferente desta versão nova.");
  if (
    JSON.parse(readFileSync(join(source, "package.json"), "utf8")).name !==
    "vl-moveis"
  )
    throw new Error("A pasta escolhida não é da VL Móveis.");
  const configuration = existsSync(join(source, ".env.local"))
    ? parseEnv(readFileSync(join(source, ".env.local"), "utf8"))
    : {};
  if (
    configuration.DB_PATH &&
    resolve(source, configuration.DB_PATH) !== join(source, "data/store.sqlite")
  )
    throw new Error(
      "A instalação antiga usa um banco em outro local. Não alterei esse banco; é necessário orientar essa transferência separadamente.",
    );
  const sourceDb = join(source, "data/store.sqlite"),
    targetDb = join(destination, "data/store.sqlite");
  if (!existsSync(sourceDb))
    throw new Error("A pasta escolhida não tem banco de dados.");
  if (existsSync(targetDb))
    throw new Error(
      "Esta pasta nova já tem um banco de dados. Não vou substituir seus cadastros. Use uma cópia recém-extraída para transferir os dados com segurança.",
    );
  mkdirSync(join(destination, "data"), { recursive: true, mode: 0o700 });
  mkdirSync(join(destination, "public/catalogo"), { recursive: true });
  const temporary = join(
    destination,
    "data",
    "update-" + randomUUID() + ".sqlite",
  );
  const db = new DatabaseSync(sourceDb, { readOnly: true });
  try {
    db.exec("VACUUM INTO '" + temporary.replaceAll("'", "''") + "'");
  } finally {
    db.close();
  }
  chmodSync(temporary, 0o600);
  try {
    const oldPhotos = join(source, "public/catalogo");
    if (existsSync(oldPhotos))
      for (const file of readdirSync(oldPhotos, { withFileTypes: true })) {
        if (
          !file.isFile() ||
          !/^[a-zA-Z0-9_-]+\.(webp|jpg|jpeg|png|svg)$/.test(file.name)
        )
          continue;
        const target = join(destination, "public/catalogo", file.name);
        if (!existsSync(target))
          copyFileSync(join(oldPhotos, file.name), target);
      }
    const oldConfig = join(source, ".env.local"),
      newConfig = join(destination, ".env.local");
    if (existsSync(oldConfig)) {
      if (
        existsSync(newConfig) &&
        !readFileSync(oldConfig).equals(readFileSync(newConfig))
      )
        throw new Error(
          "As duas pastas têm configurações de e-mail diferentes. Preservei ambas; é necessário escolher qual usar antes de transferir o banco.",
        );
      if (!existsSync(newConfig)) {
        copyFileSync(oldConfig, newConfig);
        chmodSync(newConfig, 0o600);
      }
    }
    renameSync(temporary, targetDb);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
  console.log(
    "Dados, conta de administrador, fotos enviadas e configuração preservados nesta versão. A pasta antiga permanece intacta.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
