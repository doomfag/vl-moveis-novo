import { NextRequest, NextResponse } from "next/server";
import {
  randomUUID,
  randomBytes,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { mailAvailable, localEmailMode, sendAccountEmail } from "@/lib/mail";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import {
  db,
  grantConfiguredOwner,
  products,
  product,
  saveProduct,
  publicUser,
  promotions,
  audit,
  transaction,
} from "@/lib/db";
import {
  checkPassword,
  hashPassword,
  currentUser,
  session,
  limited,
  tokenHash,
} from "@/lib/auth";
import {
  variantKey,
  variantPrice,
  type Product,
  type User,
  type CartLine,
} from "@/lib/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
class Failure extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function fail(status: number, message: string): never {
  throw new Failure(status, message);
}
const email = z.string().trim().toLowerCase().email().max(254);
const cartSchema = z
  .array(
    z.object({
      productId: z.string().max(100),
      color: z.string().max(80),
      size: z.string().max(100),
      quantity: z.number().int().min(1).max(20),
    }),
  )
  .max(30);
const asset = z
  .string()
  .regex(/^\/catalogo\/[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg|svg)$/);
const productSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,100}$/),
  slug: z.string().regex(/^[a-z0-9-]{1,100}$/),
  name: z.string().min(3).max(160),
  brand: z.string().max(80),
  category: z.enum([
    "Colchões",
    "Travesseiros",
    "Bases e camas",
    "Cabeceiras",
    "Hotelaria",
    "Acessórios",
    "Móveis",
    "Eletros",
  ]),
  description: z.string().min(10).max(10000),
  images: z.array(asset).min(1).max(20),
  sizes: z.array(z.string().min(1).max(100)).min(1).max(100),
  colors: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        hex: z.string().regex(/^#[a-fA-F0-9]{6}$/),
        image: asset,
      }),
    )
    .min(1)
    .max(20),
  discountPercent: z.number().int().min(0).max(90).optional(),
  photoNote: z.string().max(500).optional(),
  priceCents: z.number().int().min(1).max(100000000).nullable(),
  stock: z.number().int().min(0).max(1000000).nullable(),
  active: z.boolean(),
  featured: z.boolean(),
  specs: z.record(z.string(), z.string().max(2000)),
  variantInventory: z.record(
    z.string().max(250),
    z.object({
      priceCents: z.number().int().min(1).max(100000000).nullable(),
      stock: z.number().int().min(0).max(1000000).nullable(),
    }),
  ),
  source: z
    .object({
      catalog: z.string().max(100),
      page: z.number().int().min(1),
      url: z
        .string()
        .regex(/^\/catalogos\/[a-z0-9-]+\.pdf#page=\d+$/)
        .optional(),
    })
    .optional(),
  sourceText: z.string().max(25000).optional(),
});
function authorize(req: NextRequest, admin = false): User {
  const u = currentUser(req);
  if (!u) fail(401, "Entre na sua conta para continuar.");
  if (admin && u.role !== "admin")
    fail(403, "Acesso exclusivo da administração.");
  return u;
}
async function readBytes(req: NextRequest, max = 64000) {
  const reader = req.body?.getReader();
  if (!reader) fail(400, "Dados não informados.");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const r = await reader.read();
    if (r.done) break;
    bytes += r.value.byteLength;
    if (bytes > max) {
      await reader.cancel();
      fail(413, "Dados muito grandes.");
    }
    chunks.push(r.value);
  }
  return Buffer.concat(chunks);
}
async function body(req: NextRequest) {
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    fail(415, "Envie dados em JSON.");
  try {
    return JSON.parse((await readBytes(req)).toString("utf8"));
  } catch (e) {
    if (e instanceof Failure) throw e;
    fail(400, "Dados inválidos.");
  }
}
function validateCart(lines: CartLine[]) {
  const unique = new Set();
  for (const line of lines) {
    const p = product(line.productId);
    if (
      !p?.active ||
      !p.colors.some((c) => c.name === line.color) ||
      !p.sizes.includes(line.size)
    )
      fail(400, "Produto ou variação indisponível.");
    const key = p.id + variantKey(line.color, line.size);
    if (unique.has(key)) fail(400, "Variação repetida na sacola.");
    unique.add(key);
  }
}
function reservationRows(p: Product) {
  return db()
    .prepare(
      "SELECT l.variant,SUM(l.quantity) AS n FROM order_lines l JOIN orders o ON l.order_id=o.id WHERE l.product_id=? AND o.status='pending' GROUP BY l.variant",
    )
    .all(p.id);
}
function reserved(p: Product, key: string) {
  return reservationRows(p)
    .filter((l) =>
      key
        ? l.variant === key
        : p.variantInventory[String(l.variant)]?.stock == null,
    )
    .reduce((n, l) => n + Number(l.n), 0);
}
function totalReserved(p: Product) {
  return reservationRows(p).reduce((n, l) => n + Number(l.n), 0);
}
function accountOrigin(req: NextRequest) {
  const origin = process.env.APP_ORIGIN || req.headers.get("origin");
  if (!origin)
    fail(503, "Configure o endereço da loja para enviar confirmações.");
  const url = new URL(origin);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !loopback)
    fail(503, "Configure HTTPS e APP_ORIGIN para enviar confirmações.");
  return url.origin;
}
async function accountLink(
  userId: string,
  recipient: string,
  purpose: "verify" | "reset",
  origin: string,
) {
  const token = randomBytes(32).toString("hex");
  transaction(() => {
    db()
      .prepare("DELETE FROM email_tokens WHERE user_id=? AND purpose=?")
      .run(userId, purpose);
    db()
      .prepare(
        "INSERT INTO email_tokens(token,user_id,purpose,expires) VALUES(?,?,?,?)",
      )
      .run(
        tokenHash(token),
        userId,
        purpose,
        Date.now() + (purpose === "verify" ? 86400000 : 1800000),
      );
  });
  try {
    await sendAccountEmail(recipient, purpose, token, origin);
  } catch {
    db()
      .prepare("DELETE FROM email_tokens WHERE token=?")
      .run(tokenHash(token));
    fail(
      503,
      "Não foi possível enviar a mensagem agora. Tente reenviar a confirmação mais tarde.",
    );
  }
}
async function dispatch(req: NextRequest, path: string[]) {
  const route = path.join("/"),
    method = req.method;
  // Optional ERP connector: dedicated server-to-server signature, not cookie authentication.
  if (route === "integrations/inventory" && method === "POST") {
    const secret = process.env.INVENTORY_WEBHOOK_SECRET;
    if (!secret || secret.length < 32)
      fail(503, "Conector de estoque não configurado.");
    const timestamp = req.headers.get("x-vl-timestamp") || "",
      signature = req.headers.get("x-vl-signature") || "";
    if (
      !/^\d{13}$/.test(timestamp) ||
      Math.abs(Date.now() - Number(timestamp)) > 300000 ||
      !/^sha256=[a-f0-9]{64}$/.test(signature)
    )
      fail(401, "Assinatura inválida ou expirada.");
    const bytes = await readBytes(req);
    const expected = createHmac("sha256", secret)
      .update(timestamp + ".")
      .update(bytes)
      .digest();
    if (!timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex")))
      fail(401, "Assinatura inválida.");
    let raw;
    try {
      raw = JSON.parse(bytes.toString("utf8"));
    } catch {
      fail(400, "Dados inválidos.");
    }
    const input = z
      .object({
        eventId: z.string().uuid(),
        productId: z.string().max(100),
        stock: z.number().int().min(0).max(1000000),
        color: z.string().max(80).optional(),
        size: z.string().max(100).optional(),
      })
      .parse(raw);
    const result = transaction(() => {
      if (
        db()
          .prepare("SELECT id FROM integration_events WHERE id=?")
          .get(input.eventId)
      )
        return { ok: true, duplicate: true };
      const p = product(input.productId);
      if (!p) fail(404, "Produto não encontrado.");
      if (input.color || input.size) {
        if (
          !p.colors.some((c) => c.name === input.color) ||
          !p.sizes.includes(input.size || "")
        )
          fail(400, "Variação inválida.");
        const key = variantKey(input.color!, input.size!);
        if (input.stock < reserved(p, key))
          fail(409, "Estoque inferior às reservas.");
        p.variantInventory[key] = {
          priceCents: p.variantInventory[key]?.priceCents ?? null,
          stock: input.stock,
        };
      } else {
        if (input.stock < reserved(p, ""))
          fail(409, "Estoque inferior às reservas.");
        p.stock = input.stock;
      }
      saveProduct(p);
      db()
        .prepare("INSERT INTO integration_events(id) VALUES(?)")
        .run(input.eventId);
      db()
        .prepare(
          "INSERT INTO audit(user_id,action,target) VALUES('inventory-connector','inventory.sync',?)",
        )
        .run(p.id);
      return { ok: true, duplicate: false };
    });
    return result;
  }
  if (method !== "GET") {
    // Next may normalize nextUrl.host to its bind address. Browser Origin must
    // instead match the actual HTTP Host (or the explicitly configured origin).
    // Browsers cannot override Host; never trust forwarded host headers here.
    const host = req.headers.get("host");
    let expected =
      process.env.APP_ORIGIN ||
      (host ? `${req.nextUrl.protocol}//${host}` : "");
    try {
      expected = new URL(expected).origin;
    } catch {
      fail(503, "Endereço da loja não configurado.");
    }
    if (req.headers.get("origin") !== expected)
      fail(403, "Origem da solicitação não autorizada.");
    if (req.headers.get("sec-fetch-site") === "cross-site")
      fail(403, "Solicitação externa bloqueada.");
  }
  if (route === "health" && method === "GET") {
    db().prepare("SELECT 1").get();
    return { ok: true, storage: "sqlite" };
  }
  if (route === "products" && method === "GET")
    return {
      products: products(),
      promotions: promotions().filter((p) => p.active),
    };
  if (route === "auth/me" && method === "GET")
    return { user: currentUser(req) };
  if (route === "auth/register" && method === "POST") {
    const input = z
      .object({
        name: z.string().trim().min(2).max(80),
        email,
        password: z.string().min(12).max(128),
      })
      .parse(await body(req));
    if (limited("register:global", 60, 3600000))
      fail(429, "Muitas tentativas. Tente novamente mais tarde.");
    if (db().prepare("SELECT id FROM users WHERE email=?").get(input.email))
      fail(
        409,
        "Não foi possível cadastrar este e-mail. Tente entrar ou reenviar a confirmação.",
      );
    const origin = accountOrigin(req);
    if (!mailAvailable(origin))
      fail(
        503,
        "O envio de e-mails da loja ainda não está configurado. Fale com a equipe.",
      );
    const id = randomUUID();
    db()
      .prepare("INSERT INTO users(id,email,name,password) VALUES(?,?,?,?)")
      .run(id, input.email, input.name, hashPassword(input.password));
    await accountLink(id, input.email, "verify", origin);
    return NextResponse.json(
      {
        requiresVerification: true,
        email: input.email,
        localPreview: localEmailMode(origin),
        message: localEmailMode(origin)
          ? "Conta aguardando confirmação. Neste teste local, a mensagem está na prévia de e-mails do servidor; nenhum e-mail foi enviado."
          : "Confira sua caixa de entrada e confirme o e-mail para ativar sua conta.",
      },
      { status: 201 },
    );
  }
  if (
    (route === "auth/resend" || route === "auth/forgot-password") &&
    method === "POST"
  ) {
    const input = z.object({ email }).parse(await body(req));
    const purpose = route === "auth/resend" ? "verify" : "reset";
    if (
      limited(purpose + ":" + input.email, 3, 900000) ||
      limited(purpose + ":global", 100, 3600000)
    )
      fail(429, "Aguarde antes de solicitar outro e-mail.");
    const origin = accountOrigin(req);
    if (!mailAvailable(origin))
      fail(
        503,
        "O envio de e-mails da loja ainda não está configurado. Fale com a equipe.",
      );
    const row = db()
      .prepare("SELECT id,email_verified_at FROM users WHERE email=?")
      .get(input.email);
    if (row && (purpose === "reset" || !row.email_verified_at)) {
      try {
        await accountLink(String(row.id), input.email, purpose, origin);
      } catch {
        /* Keep recovery responses independent of whether an account exists. */
      }
    }
    return {
      ok: true,
      localPreview: localEmailMode(origin),
      message: localEmailMode(origin)
        ? "Se houver uma conta elegível, a mensagem foi preparada na prévia local. Nenhum e-mail foi enviado para a internet."
        : "Se houver uma conta com esse e-mail, você receberá as instruções. Confira também o spam.",
    };
  }
  if (
    (route === "auth/verify" || route === "auth/reset-password") &&
    method === "POST"
  ) {
    const input = z
      .object({
        token: z.string().regex(/^[a-f0-9]{64}$/),
        password: z.string().min(12).max(128).optional(),
      })
      .parse(await body(req));
    const purpose = route === "auth/verify" ? "verify" : "reset";
    if (purpose === "reset" && !input.password)
      fail(400, "Informe a nova senha.");
    if (limited("token:global", 200, 900000))
      fail(429, "Muitas tentativas. Aguarde um instante.");
    transaction(() => {
      const row = db()
        .prepare(
          "SELECT * FROM email_tokens WHERE token=? AND purpose=? AND expires>?",
        )
        .get(tokenHash(input.token), purpose, Date.now());
      if (!row)
        fail(
          400,
          "Link inválido, expirado ou já utilizado. Solicite um novo e-mail.",
        );
      db()
        .prepare(
          "UPDATE users SET email_verified_at=COALESCE(email_verified_at,CURRENT_TIMESTAMP) WHERE id=?",
        )
        .run(row.user_id);
      if (purpose === "reset") {
        db()
          .prepare("UPDATE users SET password=? WHERE id=?")
          .run(hashPassword(input.password!), row.user_id);
        db().prepare("DELETE FROM sessions WHERE user_id=?").run(row.user_id);
        db()
          .prepare("DELETE FROM email_tokens WHERE user_id=?")
          .run(row.user_id);
      } else
        db()
          .prepare("DELETE FROM email_tokens WHERE token=?")
          .run(tokenHash(input.token));
    });
    grantConfiguredOwner();
    return {
      ok: true,
      message:
        purpose === "verify"
          ? "E-mail confirmado. Você já pode entrar na sua conta."
          : "Senha atualizada. Entre com a nova senha.",
    };
  }
  if (route === "auth/login" && method === "POST") {
    const input = z
      .object({ email, password: z.string().max(128) })
      .parse(await body(req));
    if (
      limited("login:" + input.email, 10, 900000) ||
      limited("login:global", 200, 900000)
    )
      fail(429, "Muitas tentativas. Aguarde 15 minutos.");
    const row = db()
      .prepare("SELECT * FROM users WHERE email=?")
      .get(input.email);
    const valid = checkPassword(
      input.password,
      row
        ? String(row.password)
        : "00000000000000000000000000000000:" + "0".repeat(128),
    );
    if (!row || !valid) fail(401, "E-mail ou senha incorretos.");
    if (!row.email_verified_at)
      fail(
        403,
        "Confirme seu e-mail antes de entrar. Use a opção Reenviar confirmação.",
      );
    const r = NextResponse.json({ user: publicUser(row) });
    session(r, String(row.id));
    return r;
  }
  if (route === "auth/logout" && method === "POST") {
    const token = req.cookies.get("vl_session")?.value;
    if (token)
      db().prepare("DELETE FROM sessions WHERE token=?").run(tokenHash(token));
    const r = NextResponse.json({ ok: true });
    r.cookies.set("vl_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return r;
  }
  if (route === "cart") {
    const u = authorize(req);
    if (method === "GET") {
      const row = db()
        .prepare("SELECT data FROM carts WHERE user_id=?")
        .get(u.id);
      return { items: row ? JSON.parse(String(row.data)) : [] };
    }
    if (method === "PUT") {
      const lines = cartSchema.parse(await body(req));
      validateCart(lines);
      db()
        .prepare(
          "INSERT INTO carts VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data",
        )
        .run(u.id, JSON.stringify(lines));
      return { items: lines };
    }
  }
  if (route === "reviews" && method === "GET") {
    const id = req.nextUrl.searchParams.get("productId");
    if (!id) fail(400, "Informe o produto.");
    return {
      reviews: db()
        .prepare(
          "SELECT r.id,r.stars,r.text,r.created_at,u.name,EXISTS(SELECT 1 FROM orders o JOIN order_lines l ON o.id=l.order_id WHERE o.user_id=r.user_id AND l.product_id=r.product_id AND o.status IN ('paid','completed')) AS verified FROM reviews r JOIN users u ON r.user_id=u.id WHERE r.product_id=? ORDER BY r.created_at DESC",
        )
        .all(id),
    };
  }
  if (route === "reviews" && method === "POST") {
    const u = authorize(req);
    const input = z
      .object({
        productId: z.string().max(100),
        stars: z.number().int().min(1).max(5),
        text: z.string().trim().min(5).max(1500),
      })
      .parse(await body(req));
    if (!product(input.productId)?.active) fail(404, "Produto não encontrado.");
    if (limited("review:" + u.id, 10, 3600000))
      fail(429, "Aguarde antes de enviar outra avaliação.");
    if (
      db()
        .prepare("SELECT id FROM reviews WHERE user_id=? AND product_id=?")
        .get(u.id, input.productId)
    )
      fail(409, "Você já avaliou este produto.");
    db()
      .prepare(
        "INSERT INTO reviews(id,user_id,product_id,stars,text) VALUES(?,?,?,?,?)",
      )
      .run(randomUUID(), u.id, input.productId, input.stars, input.text);
    return { ok: true };
  }
  if (route === "shipping" && method === "POST") {
    const input = z
      .object({ cep: z.string().regex(/^\d{8}$/) })
      .parse(await body(req));
    return {
      cep: input.cep,
      options: [
        { id: "pickup-sepetiba", label: "Retirada em Sepetiba", priceCents: 0 },
        {
          id: "pickup-campo-grande",
          label: "Retirada em Campo Grande",
          priceCents: 0,
        },
        { id: "quote", label: "Entrega no endereço", priceCents: null },
      ],
      message:
        "Confirmamos prazo, disponibilidade e valor da entrega com a loja antes do pagamento.",
    };
  }
  if (route === "orders" && method === "GET") {
    const u = authorize(req);
    return {
      orders: db()
        .prepare(
          "SELECT id,status,total,delivery,data,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC",
        )
        .all(u.id),
    };
  }
  if (route === "orders" && method === "POST") {
    const u = authorize(req);
    if (limited("orders:" + u.id, 10, 3600000))
      fail(429, "Muitos pedidos em pouco tempo. Fale com a loja.");
    const input = z
      .object({
        items: cartSchema.min(1),
        delivery: z.enum(["pickup-sepetiba", "pickup-campo-grande"]),
        notes: z.string().max(1000).default(""),
      })
      .parse(await body(req));
    validateCart(input.items);
    const order = transaction(() => {
      const lines = input.items.map((l) => {
        const p = product(l.productId)!;
        const key = variantKey(l.color, l.size);
        const price = variantPrice(p, l.color, l.size);
        if (price === null)
          fail(409, "Produtos sob consulta precisam de orçamento no WhatsApp.");
        const variant = p.variantInventory[key];
        const stock = variant?.stock ?? p.stock;
        if (stock === null)
          fail(
            409,
            "A loja precisa confirmar o estoque antes de receber este pedido.",
          );
        const available =
          stock - reserved(p, variant?.stock != null ? key : "");
        if (available < l.quantity)
          fail(409, `Estoque insuficiente para ${p.name}.`);
        return { ...l, name: p.name, priceCents: price, variant: key };
      });
      // Aggregate product-level stock across multiple colors/sizes in the same order.
      for (const id of new Set(lines.map((l) => l.productId))) {
        const p = product(id)!;
        const common = lines
          .filter(
            (l) =>
              l.productId === id &&
              p.variantInventory[l.variant]?.stock == null,
          )
          .reduce((s, l) => s + l.quantity, 0);
        if (common && p.stock !== null && common > p.stock - reserved(p, ""))
          fail(409, "Quantidade superior ao estoque disponível.");
      }
      const total = lines.reduce((s, l) => s + l.priceCents * l.quantity, 0);
      const id = randomUUID();
      db()
        .prepare(
          "INSERT INTO orders(id,user_id,status,total,delivery,data) VALUES(?,?,'pending',?,?,?)",
        )
        .run(
          id,
          u.id,
          total,
          input.delivery,
          JSON.stringify({ items: lines, notes: input.notes }),
        );
      const statement = db().prepare(
        "INSERT INTO order_lines VALUES(?,?,?,?,?)",
      );
      for (const l of lines)
        statement.run(id, l.productId, l.variant, l.quantity, l.priceCents);
      db().prepare("DELETE FROM carts WHERE user_id=?").run(u.id);
      return { id, total, status: "pending" };
    });
    return {
      order,
      message:
        "Pedido reservado. A loja confirmará os dados e orientará o pagamento. Nenhum valor foi cobrado.",
    };
  }
  if (route === "chat") {
    const u = authorize(req);
    if (method === "GET")
      return {
        messages: db()
          .prepare(
            "SELECT id,sender,text,created_at FROM messages WHERE user_id=? ORDER BY created_at,id",
          )
          .all(u.id),
      };
    if (method === "POST") {
      const input = z
        .object({ text: z.string().trim().min(1).max(2000) })
        .parse(await body(req));
      if (limited("chat:" + u.id, 30, 60000))
        fail(429, "Aguarde um instante para enviar mais mensagens.");
      db()
        .prepare(
          "INSERT INTO messages(id,user_id,sender,text) VALUES(?,?,'customer',?)",
        )
        .run(randomUUID(), u.id, input.text);
      return { ok: true };
    }
  }
  if (path[0] === "admin") {
    const u = authorize(req, true);
    if (route === "admin/upload" && method === "POST") {
      if (!req.headers.get("content-type")?.startsWith("multipart/form-data"))
        fail(415, "Envie uma imagem.");
      if (limited("upload:" + u.id, 30, 3600000))
        fail(429, "Limite de imagens por hora atingido.");
      const bytes = await readBytes(req, 6 * 1024 * 1024);
      const data = await new Response(new Uint8Array(bytes), {
        headers: { "Content-Type": req.headers.get("content-type")! },
      }).formData();
      const file = data.get("file");
      if (
        !(file instanceof File) ||
        file.size > 5 * 1024 * 1024 ||
        file.size === 0
      )
        fail(400, "Escolha uma imagem de até 5 MB.");
      let image: Buffer;
      try {
        const decoder = sharp(Buffer.from(await file.arrayBuffer()), {
          limitInputPixels: 20000000,
          animated: false,
        });
        const meta = await decoder.metadata();
        if (!["png", "jpeg", "webp"].includes(meta.format || ""))
          fail(400, "Envie JPG, PNG ou WebP.");
        image = await decoder
          .rotate()
          .resize({
            width: 1600,
            height: 1600,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 86 })
          .toBuffer();
      } catch {
        fail(400, "Imagem inválida. Envie JPG, PNG ou WebP.");
      }
      const name = randomUUID() + ".webp";
      const directory = resolve(
        /* turbopackIgnore: true */ process.env.CATALOG_UPLOAD_DIR ||
          "public/catalogo",
      );
      await mkdir(directory, { recursive: true });
      await writeFile(resolve(directory, name), image, { flag: "wx" });
      audit(u, "image.upload", name);
      return { url: "/catalogo/" + name };
    }
    if (route === "admin/dashboard" && method === "GET")
      return {
        products: products(true),
        orders: db()
          .prepare(
            "SELECT o.*,u.name,u.email FROM orders o JOIN users u ON o.user_id=u.id ORDER BY o.created_at DESC",
          )
          .all(),
        cash: db().prepare("SELECT * FROM cash ORDER BY created_at DESC").all(),
        conversations: db()
          .prepare(
            "SELECT u.id,u.name,u.email,MAX(m.created_at) AS last_message,COUNT(m.id) AS messages FROM messages m JOIN users u ON m.user_id=u.id GROUP BY u.id ORDER BY last_message DESC",
          )
          .all(),
        promotions: promotions(),
        counts: {
          customers: (
            db()
              .prepare("SELECT COUNT(*) AS n FROM users WHERE role='customer'")
              .get() as { n: number }
          ).n,
        },
        integrations: {
          payment: "Não conectado",
          logistics: "Entrega sob orçamento; retirada nas lojas",
          inventory: "Estoque local transacional",
          assistant: "Atendimento humano; histórico preservado",
          email:
            process.env.RESEND_API_KEY && process.env.EMAIL_FROM
              ? "Resend configurado; confirme o domínio no serviço"
              : "Envio externo não conectado",
        },
      };
    if (route === "admin/products" && method === "PUT") {
      const p = productSchema.parse(await body(req)) as Product;
      for (const [key] of Object.entries(p.variantInventory)) {
        let pair;
        try {
          pair = JSON.parse(key);
        } catch {
          fail(400, "Identificador de variação inválido.");
        }
        if (
          !Array.isArray(pair) ||
          pair.length !== 2 ||
          !p.colors.some((c) => c.name === pair[0]) ||
          !p.sizes.includes(pair[1])
        )
          fail(400, "Variação de estoque inválida.");
      }
      transaction(() => {
        const old = product(p.id);
        const pending = db()
          .prepare(
            "SELECT l.variant,SUM(l.quantity) AS n FROM order_lines l JOIN orders o ON o.id=l.order_id WHERE l.product_id=? AND o.status='pending' GROUP BY l.variant",
          )
          .all(p.id);
        if (pending.length && old) {
          if (!p.active)
            fail(
              409,
              "Há pedidos reservados. Cancele-os antes de remover o produto.",
            );
          for (const line of pending) {
            const pair = JSON.parse(String(line.variant));
            if (
              !p.colors.some((c) => c.name === pair[0]) ||
              !p.sizes.includes(pair[1])
            )
              fail(409, "Há pedidos reservados nesta variação.");
            const stock =
              p.variantInventory[String(line.variant)]?.stock ?? p.stock;
            if (stock === null || stock < Number(line.n))
              fail(409, "O estoque não pode ser inferior às reservas.");
          }
          if (p.stock !== null && p.stock < reserved(p, ""))
            fail(409, "Estoque menor que o total reservado.");
        }
        saveProduct(p);
        audit(u, old ? "product.update" : "product.create", p.id);
      });
      return { ok: true };
    }
    if (path[1] === "products" && path[2] && method === "DELETE") {
      const p = product(path[2]);
      if (!p) fail(404, "Produto não encontrado.");
      if (totalReserved(p))
        fail(409, "Cancele os pedidos reservados antes de remover o produto.");
      p.active = false;
      saveProduct(p);
      audit(u, "product.archive", p.id);
      return { ok: true };
    }
    if (
      path[1] === "orders" &&
      path[2] &&
      path[3] === "discount" &&
      method === "PATCH"
    ) {
      const input = z
        .object({ discountCents: z.number().int().min(0).max(100000000) })
        .parse(await body(req));
      transaction(() => {
        const order = db()
          .prepare("SELECT * FROM orders WHERE id=?")
          .get(path[2]);
        if (!order) fail(404, "Pedido não encontrado.");
        if (order.status !== "pending")
          fail(
            409,
            "Descontos só podem ser alterados antes da confirmação do pagamento.",
          );
        const data = JSON.parse(String(order.data));
        const subtotal = data.items.reduce(
          (total: number, line: { priceCents: number; quantity: number }) =>
            total + line.priceCents * line.quantity,
          0,
        );
        if (input.discountCents >= subtotal)
          fail(400, "O desconto precisa ser menor que o subtotal do pedido.");
        data.subtotalCents = subtotal;
        data.discountCents = input.discountCents;
        db()
          .prepare("UPDATE orders SET total=?,data=? WHERE id=?")
          .run(subtotal - input.discountCents, JSON.stringify(data), path[2]);
        audit(u, "order.discount", path[2]);
      });
      return { ok: true };
    }
    if (
      path[1] === "orders" &&
      path[2] &&
      path.length === 3 &&
      method === "PATCH"
    ) {
      const input = z
        .object({ status: z.enum(["paid", "completed", "cancelled"]) })
        .parse(await body(req));
      transaction(() => {
        const o = db().prepare("SELECT * FROM orders WHERE id=?").get(path[2]);
        if (!o) fail(404, "Pedido não encontrado.");
        const prev = String(o.status);
        if (prev === input.status) return;
        if (!(
          (prev === "pending" &&
            ["paid", "cancelled"].includes(input.status)) ||
          (prev === "paid" && input.status === "completed")
        ))
          fail(
            409,
            "Transição não permitida. Estornos exigem conciliação com a loja.",
          );
        if (input.status === "paid") {
          const lines = db()
            .prepare("SELECT * FROM order_lines WHERE order_id=?")
            .all(path[2]);
          for (const l of lines) {
            const p = product(String(l.product_id))!;
            const inv = p.variantInventory[String(l.variant)];
            if (inv?.stock != null) {
              if (inv.stock < Number(l.quantity))
                fail(409, "Estoque inconsistente.");
              inv.stock -= Number(l.quantity);
            } else {
              if (p.stock === null || p.stock < Number(l.quantity))
                fail(409, "Estoque inconsistente.");
              p.stock -= Number(l.quantity);
            }
            saveProduct(p);
          }
          db()
            .prepare(
              "INSERT INTO cash(id,direction,amount,label,order_id) VALUES(?,'in',?,?,?)",
            )
            .run(
              randomUUID(),
              Number(o.total),
              "Venda " + path[2].slice(0, 8),
              path[2],
            );
        }
        db()
          .prepare("UPDATE orders SET status=? WHERE id=?")
          .run(input.status, path[2]);
        audit(u, "order." + input.status, path[2]);
      });
      return { ok: true };
    }
    if (route === "admin/cash" && method === "POST") {
      const input = z
        .object({
          direction: z.enum(["in", "out"]),
          amount: z.number().int().min(1).max(100000000),
          label: z.string().trim().min(3).max(160),
        })
        .parse(await body(req));
      db()
        .prepare("INSERT INTO cash(id,direction,amount,label) VALUES(?,?,?,?)")
        .run(randomUUID(), input.direction, input.amount, input.label);
      audit(u, "cash.create", input.direction);
      return { ok: true };
    }
    if (route === "admin/promotions" && method === "PUT") {
      const p = z
        .object({
          id: z.string().uuid(),
          title: z.string().min(3).max(100),
          subtitle: z.string().max(250),
          cta: z.string().min(2).max(40),
          href: z
            .string()
            .regex(/^\/(?!\/)[a-zA-Z0-9/?=&%._-]*$/)
            .max(200),
          active: z.boolean(),
          image: asset.optional(),
        })
        .parse(await body(req));
      db()
        .prepare(
          "INSERT INTO promotions VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
        )
        .run(p.id, JSON.stringify(p));
      audit(u, "promotion.update", p.id);
      return { ok: true };
    }
    if (path[1] === "chat" && path[2]) {
      if (method === "GET")
        return {
          messages: db()
            .prepare(
              "SELECT id,sender,text,created_at FROM messages WHERE user_id=? ORDER BY created_at,id",
            )
            .all(path[2]),
        };
      if (method === "POST") {
        const input = z
          .object({ text: z.string().trim().min(1).max(2000) })
          .parse(await body(req));
        if (!db().prepare("SELECT id FROM users WHERE id=?").get(path[2]))
          fail(404, "Cliente não encontrado.");
        db()
          .prepare(
            "INSERT INTO messages(id,user_id,sender,text) VALUES(?,?,'admin',?)",
          )
          .run(randomUUID(), path[2], input.text);
        audit(u, "chat.reply", path[2]);
        return { ok: true };
      }
    }
    if (route === "admin/audit" && method === "GET")
      return {
        events: db()
          .prepare(
            "SELECT action,target,created_at FROM audit ORDER BY id DESC LIMIT 200",
          )
          .all(),
      };
  }
  fail(404, "Recurso não encontrado.");
}
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const result = await dispatch(req, (await params).path);
    const response =
      result instanceof NextResponse ? result : NextResponse.json(result);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (e) {
    let status = 500,
      message = "Não foi possível concluir a operação. Tente novamente.";
    if (e instanceof Failure) {
      status = e.status;
      message = e.message;
    } else if (e instanceof z.ZodError) {
      status = 400;
      message = "Confira os dados informados. " + (e.issues[0]?.message || "");
    } else {
      console.error("API failure", e instanceof Error ? e.name : "unknown");
    }
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
