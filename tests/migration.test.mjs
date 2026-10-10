import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

test(
  "Atualização preserva preços, estoque, conta e fotos personalizadas do banco antigo",
  { timeout: 60000 },
  async () => {
    const dir = mkdtempSync(join(tmpdir(), "vl-migrate-")),
      path = join(dir, "store.sqlite"),
      origin = "http://127.0.0.1:3103";
    const seed = JSON.parse(readFileSync("data/catalog.json", "utf8"));
    const changes = JSON.parse(
      readFileSync("data/media-refinement.json", "utf8"),
    );
    const p = structuredClone(
      seed.find((p) => p.id === "colchao-ortobom-physical-nanolastic"),
    );
    const old = Object.keys(changes[p.id].replacements)[0];
    p.images = ["/catalogo/hotelaria-1-ambiente.webp", old];
    p.colors[0].image = p.images[0];
    p.priceCents = 12345;
    p.stock = 7;
    p.discountPercent = 5;
    p.specs.Material = "Material revisado pela loja";
    const legacy = new DatabaseSync(path);
    legacy.exec(
      "CREATE TABLE products(id TEXT PRIMARY KEY,slug TEXT UNIQUE NOT NULL,data TEXT NOT NULL); CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'customer',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    );
    legacy
      .prepare("INSERT INTO products VALUES(?,?,?)")
      .run(p.id, p.slug, JSON.stringify(p));
    legacy
      .prepare(
        "INSERT INTO users(id,email,name,password) VALUES('legacy','cliente@example.test','Cliente antigo','existing-hash')",
      )
      .run();
    legacy.close();
    const server = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3103",
      ],
      {
        env: {
          ...process.env,
          DB_PATH: path,
          APP_ORIGIN: origin,
          EMAIL_MODE: "local",
          EMAIL_PREVIEW_DIR: join(dir, "emails"),
          RESEND_API_KEY: "",
        },
        stdio: "ignore",
      },
    );
    try {
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        try {
          if ((await fetch(origin + "/api/health")).ok) break;
        } catch {}
        await new Promise((r) => setTimeout(r, 200));
      }
      assert.equal((await fetch(origin + "/api/health")).status, 200);
      const products = (await (await fetch(origin + "/api/products")).json())
        .products;
      assert.equal(products.length, 1);
      const updated = products[0];
      assert.equal(updated.priceCents, 12345);
      assert.equal(updated.stock, 7);
      assert.equal(updated.discountPercent, 5);
      assert.equal(updated.images[0], p.images[0]);
      assert.equal(updated.colors[0].image, p.colors[0].image);
      assert.equal(updated.images[1], changes[p.id].replacements[old]);
      assert.equal(updated.specs.Material, p.specs.Material);
      const inspect = new DatabaseSync(path);
      const user = inspect
        .prepare("SELECT * FROM users WHERE id='legacy'")
        .get();
      assert.equal(user.email, "cliente@example.test");
      assert.equal(user.password, "existing-hash");
      assert.equal(user.email_verified_at, null);
      assert.equal(user.role, "customer");
      inspect.close();
    } finally {
      server.kill("SIGTERM");
      if (server.exitCode === null)
        await new Promise((resolve) => server.once("exit", resolve));
      rmSync(dir, { recursive: true, force: true });
    }
  },
);
