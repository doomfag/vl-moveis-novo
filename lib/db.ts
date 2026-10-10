import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname, resolve } from "node:path";
import seed from "@/data/catalog.json";
import mediaRefinement from "@/data/media-refinement.json";
import type { Product, User, Promotion } from "./types";
const g = globalThis as unknown as { vlDb?: DatabaseSync };
export function db() {
  if (g.vlDb) return g.vlDb;
  const path = resolve(
    /* turbopackIgnore: true */ process.env.DB_PATH || "data/store.sqlite",
  );
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const d = new DatabaseSync(path);
  d.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
  );
  chmodSync(path, 0o600);
  d.exec(`
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS carts (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), product_id TEXT NOT NULL REFERENCES products(id), stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5), text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, product_id));
    CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), sender TEXT NOT NULL CHECK(sender IN ('customer','admin')), text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL, total INTEGER NOT NULL, delivery TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS order_lines (order_id TEXT NOT NULL REFERENCES orders(id), product_id TEXT NOT NULL REFERENCES products(id), variant TEXT NOT NULL, quantity INTEGER NOT NULL, price INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS cash (id TEXT PRIMARY KEY, direction TEXT NOT NULL CHECK(direction IN ('in','out')), amount INTEGER NOT NULL CHECK(amount>0), label TEXT NOT NULL, order_id TEXT UNIQUE REFERENCES orders(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS promotions (id TEXT PRIMARY KEY,data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS integration_events (id TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS email_tokens (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')), expires INTEGER NOT NULL);
  `);
  if (
    !d
      .prepare("PRAGMA table_info(users)")
      .all()
      .some((column) => column.name === "email_verified_at")
  ) {
    d.exec("ALTER TABLE users ADD COLUMN email_verified_at TEXT");
  }
  if (!d.prepare("SELECT id FROM products LIMIT 1").get()) {
    const insert = d.prepare(
      "INSERT INTO products(id,slug,data) VALUES(?,?,?)",
    );
    d.exec("BEGIN IMMEDIATE");
    try {
      for (const p of seed) insert.run(p.id, p.slug, JSON.stringify(p));
      d.exec("COMMIT");
    } catch (e) {
      d.exec("ROLLBACK");
      throw e;
    }
  }
  if (
    !d.prepare("SELECT id FROM migrations WHERE id='media-refinement-v3'").get()
  ) {
    d.exec("BEGIN IMMEDIATE");
    try {
      const changes = mediaRefinement as Record<
        string,
        {
          replacements: Record<string, string>;
          extras: string[];
          photoNote?: string | null;
          specs: Record<string, string>;
        }
      >;
      for (const row of d.prepare("SELECT id,data FROM products").all()) {
        const p = JSON.parse(String(row.data)) as Product;
        const refinement = changes[p.id];
        if (refinement && p.source) {
          const replaced = p.images.some(
            (image) => refinement.replacements[image],
          );
          p.images = p.images.map(
            (image) => refinement.replacements[image] || image,
          );
          p.colors = p.colors.map((color) => ({
            ...color,
            image: refinement.replacements[color.image] || color.image,
          }));
          if (replaced) {
            p.images = [...new Set([...p.images, ...refinement.extras])];
            if (refinement.photoNote) p.photoNote = refinement.photoNote;
          }
          for (const [key, value] of Object.entries(refinement.specs)) {
            if (
              !p.specs[key] ||
              /Veja as especificações|Consulte o catálogo/.test(p.specs[key])
            )
              p.specs[key] = value;
          }
          delete p.source.url;
          d.prepare("UPDATE products SET data=? WHERE id=?").run(
            JSON.stringify(p),
            p.id,
          );
        }
      }
      d.prepare(
        "INSERT INTO migrations(id) VALUES('media-refinement-v3')",
      ).run();
      d.exec("COMMIT");
    } catch (error) {
      d.exec("ROLLBACK");
      throw error;
    }
  }
  g.vlDb = d;
  return d;
}
export function products(admin = false): Product[] {
  return (db().prepare("SELECT data FROM products").all() as { data: string }[])
    .map((r) => JSON.parse(r.data) as Product)
    .filter((p) => admin || p.active);
}
export function product(id: string): Product | undefined {
  const r = db()
    .prepare("SELECT data FROM products WHERE id=? OR slug=?")
    .get(id, id) as { data: string } | undefined;
  return r ? JSON.parse(r.data) : undefined;
}
export function saveProduct(p: Product) {
  db()
    .prepare(
      "INSERT INTO products(id,slug,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,data=excluded.data",
    )
    .run(p.id, p.slug, JSON.stringify(p));
}
export function promotions(): Promotion[] {
  return (
    db().prepare("SELECT data FROM promotions").all() as { data: string }[]
  ).map((p) => JSON.parse(p.data));
}
export function publicUser(r: Record<string, unknown>): User {
  return {
    id: String(r.id),
    name: String(r.name),
    email: String(r.email),
    role: r.role === "admin" ? "admin" : "customer",
    emailVerified: !!r.email_verified_at,
  };
}
export function audit(u: User, action: string, target: string) {
  db()
    .prepare("INSERT INTO audit(user_id,action,target) VALUES(?,?,?)")
    .run(u.id, action, target);
}
export function transaction<T>(f: () => T): T {
  db().exec("BEGIN IMMEDIATE");
  try {
    const result = f();
    db().exec("COMMIT");
    return result;
  } catch (e) {
    db().exec("ROLLBACK");
    throw e;
  }
}
