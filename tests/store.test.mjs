import test from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
const origin = "http://127.0.0.1:3101";
test(
  "Loja: autenticação, permissões, pedidos, estoque, caixa e atendimento reais",
  { timeout: 120000 },
  async (t) => {
    const dir = mkdtempSync(join(tmpdir(), "vl-test-"));

    const secret = randomBytes(32).toString("hex");
    const proc = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3101",
      ],
      {
        env: {
          ...process.env,
          DB_PATH: join(dir, "store.sqlite"),
          BACKUP_DIR: join(dir, "backups"),
          APP_ORIGIN: "",
          INVENTORY_WEBHOOK_SECRET: secret,
          EMAIL_MODE: "local",
          EMAIL_PREVIEW_DIR: join(dir, "emails"),
          RESEND_API_KEY: "",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let logs = "";
    for (const stream of [proc.stdout, proc.stderr])
      stream.on("data", (b) => {
        logs = (logs + b.toString()).slice(-20000);
      });
    try {
      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        try {
          const r = await fetch(origin + "/api/health");
          if (r.ok) break;
        } catch {}
        await new Promise((r) => setTimeout(r, 400));
      }
      assert.equal(
        (await fetch(origin + "/api/health")).status,
        200,
        "Application did not become healthy",
      );
      let adminCookie = "",
        customerCookie = "",
        otherCookie = "";
      const request = async (
        path,
        method = "GET",
        body,
        cookie = "",
        headers = {},
      ) => {
        const r = await fetch(origin + "/api/" + path, {
          method,
          headers: {
            ...(body === undefined
              ? {}
              : { "Content-Type": "application/json", Origin: origin }),
            ...(cookie ? { Cookie: cookie } : {}),
            ...headers,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        let data;
        try {
          data = await r.json();
        } catch {
          data = {};
        }
        return {
          status: r.status,
          data,
          cookie: r.headers.get("set-cookie")?.split(";")[0] || "",
          headers: r.headers,
        };
      };
      const emailToken = (email, purpose = "confirmar-email") => {
        const messages = readdirSync(join(dir, "emails"))
          .map((name) =>
            JSON.parse(readFileSync(join(dir, "emails", name), "utf8")),
          )
          .filter((m) => m.to === email && m.text.includes("/" + purpose))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        assert.ok(messages.length);
        return new URL(
          messages[0].text.match(/https?:\/\/[^\s]+/)[0],
        ).searchParams.get("token");
      };
      const registerVerified = async (input) => {
        const registered = await request("auth/register", "POST", input);
        assert.equal(registered.status, 201);
        assert.equal(registered.data.requiresVerification, true);
        assert.equal(registered.cookie, "");
        assert.equal(
          (
            await request("auth/login", "POST", {
              email: input.email,
              password: input.password,
            })
          ).status,
          403,
        );
        const token = emailToken(input.email);
        assert.equal(
          (await request("auth/verify", "POST", { token })).status,
          200,
        );
        assert.equal(
          (await request("auth/verify", "POST", { token })).status,
          400,
        );
        const logged = await request("auth/login", "POST", {
          email: input.email,
          password: input.password,
        });
        assert.equal(logged.status, 200);
        assert.equal(logged.data.user.emailVerified, true);
        return { ...logged, status: registered.status };
      };
      const password = randomBytes(18).toString("base64");
      const adminEmail = "owner-" + randomUUID() + "@example.test";
      const customerEmail = "buyer-" + randomUUID() + "@example.test";
      await t.test("Catálogo real e páginas servidos", async () => {
        const r = await request("products");
        assert.equal(r.status, 200);
        assert.equal(
          r.data.products.length,
          JSON.parse(readFileSync("data/catalog.json", "utf8")).length,
        );
        assert.ok(r.data.products.length > 100);
        assert.equal(
          r.data.products.find((p) => p.id === "travesseiro-espuma-latex")
            .source.page,
          4,
        );
        assert.equal(
          r.data.products.find((p) => p.id === "travesseiro-soneca").source
            .page,
          15,
        );
        assert.ok(
          r.data.products.every(
            (p) => p.priceCents === null && p.stock === null,
          ),
        );
        assert.ok(
          r.data.products.find((p) => p.id === "base-sommier-bau-camurca")
            .colors.length === 4,
        );
        const home = await fetch(origin);
        assert.equal(home.status, 200);
        assert.equal((await fetch(origin + "/catalogos")).status, 404);
        assert.equal(
          (await fetch(origin + "/catalogos/comercial.pdf")).status,
          404,
        );
        assert.match(await home.text(), /Móveis, colchões/);
        assert.match(
          home.headers.get("content-security-policy"),
          /frame-ancestors 'none'/,
        );
      });
      await t.test("Painel protegido e origem externa bloqueada", async () => {
        assert.equal((await request("admin/dashboard")).status, 401);
        assert.equal(
          (
            await request(
              "auth/register",
              "POST",
              { name: "Invalid", email: "bad@example.test", password },
              {},
              { Origin: "https://attacker.example" },
            )
          ).status,
          403,
        );
      });
      await t.test(
        "Registro exige confirmação, token é de uso único e sessão é protegida",
        async () => {
          assert.equal(
            (
              await request("auth/register", "POST", {
                name: "Cliente",
                email: customerEmail,
                password: "weak",
              })
            ).status,
            400,
          );
          const admin = await registerVerified({
            name: "Equipe VL",
            email: adminEmail,
            password,
          });
          assert.equal(admin.status, 201);
          assert.equal(admin.data.user.role, "customer");
          adminCookie = admin.cookie;
          assert.match(admin.headers.get("set-cookie"), /HttpOnly/);
          assert.match(admin.headers.get("set-cookie"), /SameSite=lax/);
          const customer = await registerVerified({
            name: "Cliente Teste",
            email: customerEmail,
            password,
          });
          assert.equal(customer.status, 201);
          customerCookie = customer.cookie;
          otherCookie = (
            await registerVerified({
              name: "Outro Cliente",
              email: "other-" + randomUUID() + "@example.test",
              password,
            })
          ).cookie;
          assert.equal(
            (await request("admin/dashboard", "GET", undefined, customerCookie))
              .status,
            403,
          );
        },
      );
      await t.test(
        "Login e promoção local, sem cadastro público de administrador",
        async () => {
          assert.equal(
            (
              await request("auth/login", "POST", {
                email: customerEmail,
                password: "wrong",
              })
            ).status,
            401,
          );
          const r = await request("auth/login", "POST", {
            email: customerEmail,
            password,
          });
          assert.equal(r.status, 200);
          customerCookie = r.cookie;
          execFileSync(process.execPath, ["scripts/admin.mjs", adminEmail], {
            env: { ...process.env, DB_PATH: join(dir, "store.sqlite") },
            stdio: "pipe",
          });
          assert.equal(
            (await request("admin/dashboard", "GET", undefined, adminCookie))
              .status,
            200,
          );
        },
      );
      await t.test(
        "Backup privado: visitante e cliente bloqueados, download restaurável para o admin",
        async () => {
          assert.equal((await request("admin/backup")).status, 401);
          assert.equal(
            (await request("admin/backup", "GET", undefined, customerCookie))
              .status,
            403,
          );
          assert.equal(
            (
              await request("admin/backup", "POST", {}, adminCookie, {
                Origin: "https://outside.example.test",
              })
            ).status,
            403,
          );
          const response = await fetch(origin + "/api/admin/backup", {
            method: "POST",
            headers: { Origin: origin, Cookie: adminCookie },
          });
          assert.equal(response.status, 200);
          assert.equal(response.headers.get("cache-control"), "no-store");
          assert.equal(
            response.headers.get("content-type"),
            "application/gzip",
          );
          assert.match(
            response.headers.get("content-disposition"),
            /attachment; filename="vl-moveis-/,
          );
          const archive = join(dir, "download.tar.gz");
          const { writeFileSync, mkdirSync } = await import("node:fs");
          writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
          const restoredDir = join(dir, "restored");
          mkdirSync(restoredDir);
          execFileSync("tar", ["-xzf", archive, "-C", restoredDir]);
          const restored = new DatabaseSync(join(restoredDir, "store.sqlite"), {
            readOnly: true,
          });
          assert.ok(
            restored
              .prepare("SELECT id FROM users WHERE email=?")
              .get(adminEmail),
          );
          restored.close();
          const status = await request(
            "admin/backup",
            "GET",
            undefined,
            adminCookie,
          );
          assert.equal(status.data.count, 1);
          assert.ok(status.data.lastBackupAt);
        },
      );
      let p;
      await t.test(
        "Sacola persistente, sem variações inexistentes",
        async () => {
          p = (await request("products")).data.products[0];
          const line = {
            productId: p.id,
            color: p.colors[0].name,
            size: p.sizes[0],
            quantity: 2,
          };
          assert.equal(
            (await request("cart", "PUT", [line], customerCookie)).status,
            200,
          );
          assert.equal(
            (await request("cart", "GET", undefined, customerCookie)).data
              .items[0].quantity,
            2,
          );
          assert.equal(
            (
              await request(
                "cart",
                "PUT",
                [{ ...line, color: "nonexistent" }],
                customerCookie,
              )
            ).status,
            400,
          );
        },
      );
      await t.test(
        "Produto sem preço não permite um pedido de valor inventado",
        async () => {
          const r = await request(
            "orders",
            "POST",
            {
              items: [
                {
                  productId: p.id,
                  color: p.colors[0].name,
                  size: p.sizes[0],
                  quantity: 1,
                },
              ],
              delivery: "pickup-sepetiba",
            },
            customerCookie,
          );
          assert.equal(r.status, 409);
        },
      );
      await t.test("Administra preços e quantidades reais", async () => {
        p = { ...p, priceCents: 10000, stock: 3, discountPercent: 10 };
        assert.equal(
          (await request("admin/products", "PUT", p, adminCookie)).status,
          200,
        );
        assert.equal(
          (await request("admin/products", "PUT", p, customerCookie)).status,
          403,
        );
      });
      let orderId;
      await t.test(
        "Pedido calcula preço no servidor e reserva estoque",
        async () => {
          const r = await request(
            "orders",
            "POST",
            {
              items: [
                {
                  productId: p.id,
                  color: p.colors[0].name,
                  size: p.sizes[0],
                  quantity: 2,
                  priceCents: 1,
                },
              ],
              delivery: "pickup-sepetiba",
            },
            customerCookie,
          );
          assert.equal(r.status, 200);
          orderId = r.data.order.id;
          assert.equal(r.data.order.total, 18000);
          const next = await request(
            "orders",
            "POST",
            {
              items: [
                {
                  productId: p.id,
                  color: p.colors[0].name,
                  size: p.sizes[0],
                  quantity: 2,
                },
              ],
              delivery: "pickup-sepetiba",
            },
            otherCookie,
          );
          assert.equal(next.status, 409);
          assert.equal(
            (
              await request(
                "admin/products/" + p.id,
                "DELETE",
                undefined,
                adminCookie,
                { Origin: origin },
              )
            ).status,
            409,
          );
        },
      );
      await t.test(
        "Descontos de produto e pedido são autorizados e calculados no servidor",
        async () => {
          assert.equal(
            (
              await request(
                "admin/products",
                "PUT",
                { ...p, discountPercent: 91 },
                adminCookie,
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await request(
                "admin/orders/" + orderId + "/discount",
                "PATCH",
                { discountCents: 500 },
                customerCookie,
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await request(
                "admin/orders/" + orderId + "/discount",
                "PATCH",
                { discountCents: 18000 },
                adminCookie,
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await request(
                "admin/orders/" + orderId + "/discount",
                "PATCH",
                { discountCents: 500 },
                adminCookie,
              )
            ).status,
            200,
          );
          assert.equal(
            (await request("orders", "GET", undefined, customerCookie)).data
              .orders[0].total,
            17500,
          );
        },
      );
      await t.test("Cliente só enxerga seus próprios pedidos", async () => {
        const own = await request("orders", "GET", undefined, customerCookie);
        assert.equal(own.data.orders.length, 1);
        assert.equal(
          (await request("orders", "GET", undefined, otherCookie)).data.orders
            .length,
          0,
        );
        assert.equal(
          (
            await request(
              "admin/orders/" + orderId,
              "PATCH",
              { status: "paid" },
              customerCookie,
            )
          ).status,
          403,
        );
      });
      await t.test(
        "Recebimento idempotente baixa estoque e lança caixa uma única vez",
        async () => {
          assert.equal(
            (
              await request(
                "admin/orders/" + orderId,
                "PATCH",
                { status: "completed" },
                adminCookie,
              )
            ).status,
            409,
          );
          assert.equal(
            (
              await request(
                "admin/orders/" + orderId,
                "PATCH",
                { status: "paid" },
                adminCookie,
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await request(
                "admin/orders/" + orderId,
                "PATCH",
                { status: "paid" },
                adminCookie,
              )
            ).status,
            200,
          );
          const r = await request(
            "admin/dashboard",
            "GET",
            undefined,
            adminCookie,
          );
          assert.equal(r.data.products.find((x) => x.id === p.id).stock, 1);
          assert.equal(r.data.cash.length, 1);
          assert.equal(r.data.cash[0].amount, 17500);
          assert.equal(
            (
              await request(
                "admin/orders/" + orderId + "/discount",
                "PATCH",
                { discountCents: 0 },
                adminCookie,
              )
            ).status,
            409,
          );
        },
      );
      await t.test(
        "Avaliações reais com compra confirmada e sem duplicação",
        async () => {
          assert.equal(
            (
              await request(
                "reviews",
                "POST",
                {
                  productId: p.id,
                  stars: 5,
                  text: "Avaliação de teste automatizado.",
                },
                customerCookie,
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await request(
                "reviews",
                "POST",
                { productId: p.id, stars: 5, text: "Duplicada" },
                customerCookie,
              )
            ).status,
            409,
          );
          const r = await request("reviews?productId=" + p.id);
          assert.equal(r.data.reviews.length, 1);
          assert.equal(r.data.reviews[0].verified, 1);
        },
      );
      await t.test("Chat preserva histórico e isola conversas", async () => {
        assert.equal(
          (
            await request(
              "chat",
              "POST",
              { text: "Olá, preciso de ajuda." },
              customerCookie,
            )
          ).status,
          200,
        );
        const u = (await request("auth/me", "GET", undefined, customerCookie))
          .data.user;
        assert.equal(
          (
            await request(
              "admin/chat/" + u.id,
              "POST",
              { text: "Olá! Vamos ajudar." },
              adminCookie,
            )
          ).status,
          200,
        );
        const r = await request("chat", "GET", undefined, customerCookie);
        assert.equal(r.data.messages.length, 2);
        assert.equal(
          (await request("chat", "GET", undefined, otherCookie)).data.messages
            .length,
          0,
        );
      });
      await t.test("Frete não inventa preço nem prazo de entrega", async () => {
        assert.equal(
          (await request("shipping", "POST", { cep: "invalid" })).status,
          400,
        );
        const r = await request("shipping", "POST", { cep: "23545353" });
        assert.equal(r.status, 200);
        assert.equal(
          r.data.options.find((o) => o.id === "quote").priceCents,
          null,
        );
      });
      await t.test(
        "Campanhas recusam URLs externas e são publicadas na vitrine",
        async () => {
          const promotion = {
            id: randomUUID(),
            title: "Campanha verdadeira de teste",
            subtitle: "Teste isolado",
            cta: "Explorar",
            href: "https://attacker.example",
            active: true,
          };
          assert.equal(
            (await request("admin/promotions", "PUT", promotion, adminCookie))
              .status,
            400,
          );
          promotion.href = "/catalogo";
          assert.equal(
            (await request("admin/promotions", "PUT", promotion, adminCookie))
              .status,
            200,
          );
          assert.equal((await request("products")).data.promotions.length, 1);
        },
      );
      await t.test("Despesas e trilha de auditoria persistem", async () => {
        assert.equal(
          (
            await request(
              "admin/cash",
              "POST",
              { direction: "out", amount: 5000, label: "Despesa de teste" },
              adminCookie,
            )
          ).status,
          200,
        );
        const r = await request(
          "admin/dashboard",
          "GET",
          undefined,
          adminCookie,
        );
        assert.equal(r.data.cash.length, 2);
        assert.ok(
          (await request("admin/audit", "GET", undefined, adminCookie)).data
            .events.length >= 5,
        );
      });
      await t.test(
        "Conector de estoque verifica assinatura, validade e repetição",
        async () => {
          const payload = { eventId: randomUUID(), productId: p.id, stock: 7 };
          const timestamp = String(Date.now());
          const signature =
            "sha256=" +
            createHmac("sha256", secret)
              .update(timestamp + "." + JSON.stringify(payload))
              .digest("hex");
          assert.equal(
            (
              await request("integrations/inventory", "POST", payload, "", {
                "x-vl-timestamp": timestamp,
                "x-vl-signature": "sha256=" + "0".repeat(64),
              })
            ).status,
            401,
          );
          const first = await request(
            "integrations/inventory",
            "POST",
            payload,
            "",
            { "x-vl-timestamp": timestamp, "x-vl-signature": signature },
          );
          assert.equal(first.status, 200);
          assert.equal(first.data.duplicate, false);
          const second = await request(
            "integrations/inventory",
            "POST",
            payload,
            "",
            { "x-vl-timestamp": timestamp, "x-vl-signature": signature },
          );
          assert.equal(second.data.duplicate, true);
          const stale = String(Date.now() - 600000);
          assert.equal(
            (
              await request("integrations/inventory", "POST", payload, "", {
                "x-vl-timestamp": stale,
                "x-vl-signature": signature,
              })
            ).status,
            401,
          );
        },
      );
      await t.test(
        "Estoque geral soma medidas diferentes no mesmo pedido",
        async () => {
          const r = await request(
            "orders",
            "POST",
            {
              items: [
                {
                  productId: p.id,
                  color: p.colors[0].name,
                  size: p.sizes[0],
                  quantity: 4,
                },
                {
                  productId: p.id,
                  color: p.colors[0].name,
                  size: p.sizes[1],
                  quantity: 4,
                },
              ],
              delivery: "pickup-sepetiba",
            },
            customerCookie,
          );
          assert.equal(r.status, 409);
        },
      );
      await t.test(
        "Pedidos concorrentes não vendem além do estoque e cancelamento libera reserva",
        async () => {
          const input = {
            items: [
              {
                productId: p.id,
                color: p.colors[0].name,
                size: p.sizes[0],
                quantity: 4,
              },
            ],
            delivery: "pickup-sepetiba",
          };
          const pair = await Promise.all([
            request("orders", "POST", input, customerCookie),
            request("orders", "POST", input, otherCookie),
          ]);
          assert.deepEqual(pair.map((r) => r.status).sort(), [200, 409]);
          const pending = pair.find((r) => r.status === 200).data.order.id;
          const current = (
            await request("admin/dashboard", "GET", undefined, adminCookie)
          ).data.products.find((x) => x.id === p.id);
          assert.equal(
            (
              await request(
                "admin/products",
                "PUT",
                { ...current, stock: 3 },
                adminCookie,
              )
            ).status,
            409,
          );
          assert.equal(
            (
              await request(
                "admin/orders/" + pending,
                "PATCH",
                { status: "cancelled" },
                adminCookie,
              )
            ).status,
            200,
          );
          assert.equal(
            (await request("orders", "POST", input, customerCookie)).status,
            200,
          );
        },
      );
      await t.test(
        "Fotos e textos não aceitam caminhos externos ou produtos sem dados válidos",
        async () => {
          const current = (
            await request("admin/dashboard", "GET", undefined, adminCookie)
          ).data.products.find((x) => x.id === p.id);
          assert.equal(
            (
              await request(
                "admin/products",
                "PUT",
                {
                  ...current,
                  images: ["https://attacker.example/tracking.png"],
                },
                adminCookie,
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await request(
                "admin/products",
                "PUT",
                {
                  ...current,
                  variantInventory: { unknown: { stock: 5, priceCents: 5 } },
                },
                adminCookie,
              )
            ).status,
            400,
          );
        },
      );
      await t.test(
        "Corpos grandes e login repetido são limitados",
        async () => {
          assert.equal(
            (
              await request("auth/login", "POST", {
                email: customerEmail,
                password: "x".repeat(65000),
              })
            ).status,
            413,
          );
          const address = "blocked-" + randomUUID() + "@example.test";
          for (let i = 0; i < 10; i++)
            assert.equal(
              (
                await request("auth/login", "POST", {
                  email: address,
                  password: "wrong",
                })
              ).status,
              401,
            );
          assert.equal(
            (
              await request("auth/login", "POST", {
                email: address,
                password: "wrong",
              })
            ).status,
            429,
          );
        },
      );
      await t.test(
        "Recuperação de senha expira, oculta existência e revoga sessões",
        async () => {
          const unknown = await request("auth/forgot-password", "POST", {
            email: "missing@example.test",
          });
          const known = await request("auth/forgot-password", "POST", {
            email: customerEmail,
          });
          assert.equal(unknown.status, 200);
          assert.equal(known.data.message, unknown.data.message);
          const old = emailToken(customerEmail, "redefinir-senha");
          const direct = new DatabaseSync(join(dir, "store.sqlite"));
          direct
            .prepare("UPDATE email_tokens SET expires=0 WHERE purpose='reset'")
            .run();
          direct.close();
          assert.equal(
            (
              await request("auth/reset-password", "POST", {
                token: old,
                password: password + "new",
              })
            ).status,
            400,
          );
          await request("auth/forgot-password", "POST", {
            email: customerEmail,
          });
          const token = emailToken(customerEmail, "redefinir-senha");
          assert.equal(
            (
              await request("auth/reset-password", "POST", {
                token,
                password: password + "new",
              })
            ).status,
            200,
          );
          assert.equal(
            (await request("auth/me", "GET", undefined, customerCookie)).data
              .user,
            null,
          );
          assert.equal(
            (
              await request("auth/login", "POST", {
                email: customerEmail,
                password,
              })
            ).status,
            401,
          );
          const next = await request("auth/login", "POST", {
            email: customerEmail,
            password: password + "new",
          });
          assert.equal(next.status, 200);
          customerCookie = next.cookie;
          assert.equal(
            (await request("auth/reset-password", "POST", { token, password }))
              .status,
            400,
          );
        },
      );
      await t.test("Logout revoga a sessão", async () => {
        assert.equal(
          (await request("auth/logout", "POST", {}, customerCookie)).status,
          200,
        );
        assert.equal(
          (await request("auth/me", "GET", undefined, customerCookie)).data
            .user,
          null,
        );
        assert.equal(
          (await request("cart", "GET", undefined, customerCookie)).status,
          401,
        );
      });
    } catch (e) {
      console.error("Diagnostics: Next process exit code", proc.exitCode);
      throw e;
    } finally {
      proc.kill("SIGTERM");
      await new Promise((resolve) => {
        if (proc.exitCode !== null) return resolve();
        proc.once("exit", resolve);
        setTimeout(() => {
          proc.kill("SIGKILL");
          resolve();
        }, 4000).unref();
      });
      rmSync(dir, { recursive: true, force: true });
    }
  },
);
