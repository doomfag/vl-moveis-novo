import { chromium, expect } from "@playwright/test";
import sharp from "sharp";
import { spawn, execFileSync } from "node:child_process";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
const dir = mkdtempSync(join(tmpdir(), "vl-browser-")),
  origin = "http://localhost:3102";
const artifacts = resolve(
  process.env.VL_ARTIFACTS_DIR || "/workspace/vl-moveis-validation",
);
mkdirSync(artifacts, { recursive: true });
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3102",
  ],
  {
    env: {
      ...process.env,
      APP_ORIGIN: origin,
      DB_PATH: join(dir, "store.sqlite"),
      EMAIL_MODE: "local",
      EMAIL_PREVIEW_DIR: join(dir, "emails"),
      RESEND_API_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
for (const stream of [server.stdout, server.stderr])
  stream.on("data", (b) => {
    logs = (logs + b.toString()).slice(-10000);
  });
let browser;
const uploaded = [];
const results = [];
try {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(origin + "/api/health")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  if (!(await fetch(origin + "/api/health")).ok)
    throw new Error("Production server did not start");
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    locale: "pt-BR",
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error")
      errors.push(msg.text() + " at " + msg.location().url);
  });
  const check = async (name, fn) => {
    await fn();
    results.push(name);
    console.log("PASS", name);
  };
  await check(
    "Home de produção: hidratação, imagens e CSP com nonce",
    async () => {
      const response = await page.goto(origin);
      await expect(
        page.getByRole("heading", { name: "Móveis, colchões e eletros" }),
      ).toBeVisible();
      const csp = response.headers()["content-security-policy"];
      if (
        !csp.includes("'nonce-") ||
        csp.includes("script-src 'self' 'unsafe-inline'")
      )
        throw new Error("Missing script nonce policy");
      await page.locator(".product-card").first().waitFor();
      await page.screenshot({
        path: join(artifacts, "home-desktop.png"),
        fullPage: true,
      });
      const broken = await page
        .locator("img")
        .evaluateAll(
          (images) =>
            images.filter((i) => i.complete && i.naturalWidth === 0).length,
        );
      if (broken) throw new Error("Broken product images");
    },
  );
  await check(
    "Banner alterna fotos automaticamente, sem selo, setas ou botão de pausa",
    async () => {
      await page.clock.install();
      await page.goto(origin);
      const hero = page.locator(".hero");
      await hero
        .getByRole("button", { name: "Ver destaque 1", exact: true })
        .click();
      await expect(hero.locator(".hero-pause")).toHaveCount(0);
      const original = await hero
        .locator(".hero-image img")
        .getAttribute("src");
      await expect(hero.locator(".hero-stamp")).toHaveCount(0);
      await expect(
        hero.getByRole("button", { name: "Próximo destaque", exact: true }),
      ).toHaveCount(0);
      await expect(page.locator("footer .social svg circle")).toHaveCount(2);
      await page.clock.fastForward(7200);
      await expect(hero.locator(".hero-image img")).not.toHaveAttribute(
        "src",
        original,
      );
      await page.clock.fastForward(7200);
      await expect(hero.locator(".hero-image img")).toHaveAttribute(
        "src",
        original,
      );
    },
  );
  await check(
    "Ajuda: filtros, busca sem acentos, respostas e crediário pelo WhatsApp",
    async () => {
      await page.goto(origin + "/ajuda");
      await expect(
        page.getByRole("heading", { name: "Ajuda e perguntas frequentes" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Pagamento", exact: true })
        .click();
      await expect(page.locator(".help-questions details")).toHaveCount(5);
      await page
        .getByRole("searchbox", { name: "Buscar na ajuda" })
        .fill("crediario");
      await expect(page.locator(".help-questions details")).toHaveCount(3);
      await page
        .locator("summary")
        .filter({ hasText: "Vocês têm cartão da loja e crediário?" })
        .click();
      await expect(page.locator("details[open]")).toContainText("até 36 vezes");
      await expect(page.locator("details[open]")).toContainText("SPC e Serasa");
      await expect(page.locator("details[open] a")).toHaveAttribute(
        "href",
        /^https:\/\/wa\.me\/5521990015722\?text=/,
      );
      await page
        .getByRole("searchbox", { name: "Buscar na ajuda" })
        .fill("xxxxxxxxx");
      await expect(
        page.locator(".help-content").getByRole("status"),
      ).toContainText("Nenhuma pergunta encontrada");
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("searchbox", { name: "Buscar na ajuda" }).fill("");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      if (overflow) throw new Error("Ajuda excede largura do celular");
      await page.setViewportSize({ width: 1440, height: 1080 });
    },
  );
  await check(
    "Ajuda para escolher usa fotos e características do modelo selecionado",
    async () => {
      await page.goto(origin);
      const guide = page.locator(".product-guide");
      await expect(guide).toBeVisible();
      await guide
        .getByRole("button", { name: "Travesseiros", exact: true })
        .click();
      const options = guide.locator("select option");
      if ((await options.count()) < 2)
        throw new Error("Missing pillow options");
      const value = await options.nth(1).getAttribute("value");
      await guide.locator("select").selectOption(value);
      const name = await options.nth(1).textContent();
      await expect(
        guide.getByRole("heading", { name, exact: true }),
      ).toBeVisible();
      const photo = await guide.locator("img").getAttribute("src");
      await guide
        .getByRole("link", { name: "Ver produto", exact: true })
        .click();
      await expect(page.locator(".gallery-main img")).toHaveAttribute(
        "src",
        photo,
      );
      await page.goto(origin);
      await expect(page.locator(".credit-section")).toContainText(
        "até 36 vezes",
      );
      await expect(page.locator(".credit-section")).toContainText(
        "não são contratadas pelo site",
      );
    },
  );
  await check("Busca, categoria e comparação funcionam", async () => {
    await page
      .getByRole("textbox", { name: "Buscar produtos" })
      .fill("Exclusive Gel");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page.locator(".product-card")).toHaveCount(1);
    await page
      .getByRole("checkbox", { name: "Comparar produto", exact: true })
      .check();
    await page.goto(origin + "/catalogo?categoria=Bases%20e%20camas");
    await page
      .locator(".product-card")
      .first()
      .getByRole("checkbox", { name: "Comparar produto", exact: true })
      .check();
    await page.goto(origin + "/comparar");
    await expect(page.locator(".comparison thead th")).toHaveCount(3);
  });
  await check(
    "Troca de cor muda a fotografia real e sacola preserva variação",
    async () => {
      await page.goto(origin + "/produto/base-sommier-bau-camurca");
      const old = await page.locator(".gallery-main img").getAttribute("src");
      await page
        .getByRole("button", { name: "Selecionar cor Marrom", exact: true })
        .click();
      const next = await page.locator(".gallery-main img").getAttribute("src");
      if (old === next || !next.includes("comercial-76"))
        throw new Error("Color did not change photograph");
      await page
        .getByRole("button", { name: "Salvar na sacola para orçamento" })
        .click();
      await page.goto(origin + "/sacola");
      await expect(page.locator(".cart-line")).toHaveCount(1);
      await expect(page.locator(".cart-line")).toContainText("Marrom");
      const link = await page
        .getByRole("link", { name: "Pedir orçamento da sacola" })
        .getAttribute("href");
      if (!link.startsWith("https://wa.me/5521990015722?text="))
        throw new Error("Wrong WhatsApp link");
    },
  );
  await check(
    "Comparação explica Soneca e Pluma, preço ausente e prioridade de algodão",
    async () => {
      await page.goto(origin + "/catalogo?categoria=Travesseiros");
      // Remove previous comparison choices and select the exact two pillow models.
      await page.goto(origin + "/comparar");
      await page
        .getByRole("button", { name: "Limpar comparação", exact: true })
        .click();
      await expect(
        page.getByRole("heading", {
          name: "0 produtos lado a lado",
          exact: true,
        }),
      ).toBeVisible();
      await page.goto(origin + "/catalogo?categoria=Travesseiros");
      for (const name of ["Travesseiro Soneca", "Travesseiro Pluma"]) {
        const card = page
          .locator(".product-card")
          .filter({ has: page.getByRole("link", { name, exact: true }) });
        await card
          .getByRole("checkbox", { name: "Comparar produto", exact: true })
          .check();
      }
      await page.goto(origin + "/comparar");
      await expect(
        page.getByRole("checkbox", { name: "Mostrar apenas diferenças" }),
      ).not.toBeChecked();
      await expect(page.locator(".comparison-assessment")).toContainText(
        "Custo-benefício depende dos preços",
      );
      await expect(page.locator(".comparison")).toContainText("100% algodão");
      await expect(page.locator(".comparison")).toContainText(
        "TNT 100% polipropileno",
      );
      await expect(page.locator(".comparison")).toContainText(
        "Fibra siliconada",
      );
      await page
        .getByRole("combobox", { name: "Prioridade da comparação" })
        .selectOption("cotton");
      await expect(page.locator(".comparison-assessment")).toContainText(
        "Travesseiro Pluma:",
      );
      await page.goto(origin + "/produto/travesseiro-aman");
      await page
        .getByRole("button", { name: "Ampliar foto do produto" })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Foto ampliada do produto" }),
      ).toBeVisible();
      const width = await page
        .locator(".photo-zoom img")
        .evaluate((i) => i.naturalWidth);
      if (width < 2000)
        throw new Error("Original Aman photo resolution was not recovered");
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("dialog", { name: "Foto ampliada do produto" }),
      ).not.toBeVisible();
    },
  );
  await check(
    "Banner no celular mostra as duas fotos inteiras sem sobrepor o texto",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const theme of ["light", "dark"]) {
        await page.emulateMedia({ colorScheme: theme });
        await page.goto(origin);
        for (const index of [1, 2]) {
          await page
            .getByRole("button", { name: "Ver destaque " + index, exact: true })
            .click();
          const image = page.locator(".hero-image img");
          await expect(image).toHaveCSS("object-fit", "contain");
          await expect
            .poll(() => image.evaluate((i) => i.complete && i.naturalWidth > 0))
            .toBe(true);
          const photo = await page.locator(".hero-image").boundingBox();
          const content = await page.locator(".hero-content").boundingBox();
          expect(photo.y).toBeGreaterThanOrEqual(
            content.y + content.height - 1,
          );
          await page.locator(".hero").screenshot({
            path: join(artifacts, `hero-mobile-${theme}-${index}.png`),
          });
        }
      }
      await page.emulateMedia({ colorScheme: "light" });
      await page.setViewportSize({ width: 1440, height: 1080 });
    },
  );
  const email = "browser-" + randomUUID() + "@example.test",
    password = randomBytes(18).toString("base64");
  await check(
    "Cadastro e conta funcionam no navegador de produção",
    async () => {
      await page.goto(origin + "/conta");
      await page
        .getByRole("button", { name: "Criar conta", exact: true })
        .click();
      await page.getByLabel("Seu nome", { exact: true }).fill("Teste da loja");
      await page.getByLabel("E-mail", { exact: true }).fill(email);
      await page.getByLabel("Senha", { exact: true }).fill(password);
      await page.getByLabel("Confirmar senha", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Criar minha conta" }).click();
      await expect(page.locator(".auth-notice")).toContainText(
        "aguardando confirmação",
      );
      const pending = await context.request.get(origin + "/api/auth/me");
      if ((await pending.json()).user !== null)
        throw new Error("Unverified account received session");
      const messages = readdirSync(join(dir, "emails"))
        .map((name) =>
          JSON.parse(readFileSync(join(dir, "emails", name), "utf8")),
        )
        .filter((m) => m.to === email);
      const link = messages[0].text.match(/https?:\/\/[^\s]+/)[0];
      await page.goto(link);
      await page
        .getByRole("button", { name: "Confirmar e-mail", exact: true })
        .click();
      await expect(
        page.getByRole("status").filter({ hasText: "E-mail confirmado" }),
      ).toBeVisible();
      await page
        .getByRole("link", { name: "Ir para minha conta", exact: true })
        .click();
      await page.getByLabel("E-mail", { exact: true }).fill(email);
      await page.getByLabel("Senha", { exact: true }).fill(password);
      await page
        .getByRole("button", { name: "Entrar na minha conta", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Olá, Teste." }),
      ).toBeVisible();
      await page.goto(origin + "/sacola");
      await expect(page.locator(".cart-line")).toHaveCount(1);
    },
  );
  await check("Atendimento envia mensagem real ao servidor", async () => {
    await page.getByRole("button", { name: "Abrir atendimento" }).click();
    await page
      .getByRole("textbox", { name: "Mensagem", exact: true })
      .fill("Olá, tenho interesse nesta base.");
    await page
      .getByRole("button", { name: "Enviar mensagem", exact: true })
      .click();
    await expect(page.locator(".message.customer")).toContainText(
      "Olá, tenho interesse nesta base.",
    );
    await page
      .getByRole("button", { name: "Fechar chat", exact: true })
      .click();
  });
  execFileSync(process.execPath, ["scripts/admin.mjs", email], {
    env: { ...process.env, DB_PATH: join(dir, "store.sqlite") },
    stdio: "pipe",
  });
  await check(
    "Admin edita produto e foto enviada é servida sem reiniciar",
    async () => {
      await page.goto(origin + "/admin");
      await page
        .getByRole("button", { name: "Produtos e estoque", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Editar Base Sommier Baú Camurça",
          exact: true,
        })
        .click();
      await page.getByLabel("Preço em reais", { exact: true }).fill("1000");
      await page
        .getByLabel("Desconto no produto (%)", { exact: true })
        .fill("10");
      await page.getByLabel("Quantidade em estoque", { exact: true }).fill("3");
      const response = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/admin/upload") &&
          r.request().method() === "POST",
      );
      await page
        .locator(".image-editor input[type=file]")
        .setInputFiles("public/catalogo/comercial-73.webp");
      const upload = await response;
      const result = await upload.json();
      if (!upload.ok()) throw new Error("Image upload failed");
      uploaded.push(result.url.split("/").pop());
      const image = await page.request.get(origin + result.url);
      if (!image.ok())
        throw new Error("Uploaded image unavailable on live production server");
      await page
        .getByRole("button", { name: "Salvar produto", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    },
  );
  await check(
    "Pedido pelo navegador e baixa de estoque/caixa pelo painel",
    async () => {
      await page.goto(origin + "/sacola");
      await page
        .getByRole("button", { name: "Enviar pedido à loja", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Pedido recebido pela loja." }),
      ).toBeVisible();
      await page.goto(origin + "/admin");
      await page.getByRole("button", { name: /^Pedidos e clientes/ }).click();
      await page
        .getByLabel("Desconto no pedido (R$)", { exact: true })
        .fill("50");
      await page
        .getByRole("button", { name: "Aplicar desconto", exact: true })
        .click();
      await expect(page.locator(".admin-table")).toContainText("850,00");
      page.once("dialog", (d) => d.accept());
      await page
        .getByRole("button", { name: "Pagamento recebido", exact: true })
        .click();
      await expect(page.locator(".admin-table .status.paid")).toHaveCount(1);
      await page
        .getByRole("button", { name: "Fluxo de caixa", exact: true })
        .click();
      await expect(page.locator(".metric").first()).toContainText("850,00");
    },
  );
  await check("Admin baixa backup pelo painel", async () => {
    await page.goto(origin + "/admin");
    await page.getByRole("button", { name: "Backup", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Backup dos dados da loja" }),
    ).toBeVisible();
    const downloadReady = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar backup agora" }).click();
    const downloaded = await downloadReady;
    if (!downloaded.suggestedFilename().endsWith(".tar.gz"))
      throw new Error("Invalid backup download");
    await expect(page.locator(".admin-content p[role=status]")).toContainText(
      "Cópia preparada para download",
    );
  });
  await check(
    "Admin responde atendimento com histórico e publica campanha",
    async () => {
      await page
        .getByRole("button", { name: "Atendimento", exact: true })
        .click();
      await page.locator(".admin-chat aside button").first().click();
      await expect(page.locator(".admin-conversation .message")).toHaveCount(1);
      await page
        .getByRole("textbox", { name: "Resposta ao cliente" })
        .fill("Olá! Vamos confirmar a disponibilidade.");
      await page
        .getByRole("button", { name: "Enviar resposta", exact: true })
        .click();
      await expect(page.locator(".admin-conversation .message")).toHaveCount(2);
      await page
        .getByRole("button", { name: "Banners e campanhas", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Criar banner", exact: true })
        .click();
      await page
        .getByLabel("Título", { exact: true })
        .fill("Sua casa, seu conforto.");
      await page
        .getByLabel("Texto de apoio", { exact: true })
        .fill("Campanha de validação isolada.");
      await page.getByLabel("Publicar campanha na página inicial").check();
      await page
        .getByRole("button", { name: "Salvar campanha", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.goto(origin);
      await expect(
        page.getByRole("heading", { name: "Sua casa, seu conforto." }),
      ).toBeVisible();
    },
  );
  const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
      locale: "pt-BR",
    }),
    mobilePage = await mobile.newPage();
  await check(
    "Celular: menu, produto, imagens e ausência de rolagem horizontal",
    async () => {
      await mobilePage.goto(origin);
      await mobilePage.screenshot({
        path: join(artifacts, "home-mobile.png"),
        fullPage: true,
      });
      await mobilePage.getByRole("button", { name: "Abrir menu" }).click();
      await expect(
        mobilePage.getByRole("navigation", { name: "Categorias" }),
      ).toBeVisible();
      await mobilePage
        .getByRole("navigation", { name: "Categorias" })
        .getByRole("link", { name: "Travesseiros", exact: true })
        .click();
      await expect(mobilePage.locator(".product-card")).toHaveCount(14);
      for (const route of [
        "/",
        "/catalogo",
        "/produto/base-sommier-bau-camurca",
        "/conta",
        "/sacola",
      ]) {
        await mobilePage.goto(origin + route);
        await mobilePage.waitForTimeout(150);
        const overflow = await mobilePage.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        );
        if (overflow) throw new Error("Horizontal overflow on " + route);
      }
      await mobilePage.goto(origin + "/produto/base-sommier-bau-camurca");
      await mobilePage
        .getByRole("button", { name: "Selecionar cor Marrom", exact: true })
        .click();
      await mobilePage.screenshot({
        path: join(artifacts, "product-mobile.png"),
        fullPage: true,
      });
    },
  );
  await check("Desktop, notebook e TV: layout se adapta", async () => {
    for (const width of [768, 1024, 1920, 2560]) {
      await page.setViewportSize({ width, height: 1080 });
      await page.goto(origin);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      if (overflow) throw new Error("Horizontal overflow at " + width);
    }
  });
  await check(
    "Celular: temas claro e escuro preservam fotos, contraste e consulta de entrega",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const theme of ["light", "dark"]) {
        await page.emulateMedia({ colorScheme: theme });
        await page.goto(origin);
        await expect(page.locator('meta[name="darkreader-lock"]')).toHaveCount(
          1,
        );
        await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute(
          "content",
          "light dark",
        );
        const colors = await page.evaluate(() => ({
          body: getComputedStyle(document.body).backgroundColor,
          text: getComputedStyle(document.body).color,
          imageBackground: getComputedStyle(
            document.querySelector(".product-image"),
          ).backgroundColor,
          blend: getComputedStyle(document.querySelector(".product-image img"))
            .mixBlendMode,
          filter: getComputedStyle(document.querySelector(".product-image img"))
            .filter,
        }));
        expect(colors.body).toBe(
          theme === "light" ? "rgb(255, 255, 255)" : "rgb(25, 29, 25)",
        );
        expect(colors.text).toBe(
          theme === "light" ? "rgb(32, 34, 31)" : "rgb(242, 243, 239)",
        );
        expect(colors.imageBackground).toBe("rgb(255, 255, 255)");
        expect(colors.blend).toBe("normal");
        expect(colors.filter).toBe("none");
        await page.screenshot({
          path: join(artifacts, `home-mobile-${theme}.png`),
          fullPage: true,
        });
        await page.goto(origin + "/produto/travesseiro-aman");
        await page
          .getByRole("textbox", { name: "CEP para entrega" })
          .fill("23550740");
        await page
          .getByRole("button", { name: "Consultar", exact: true })
          .click();
        await expect(page.locator(".shipping-result")).toContainText(
          "Confirmamos prazo, disponibilidade e valor",
        );
        const contrast = await page
          .locator(".shipping-result p")
          .evaluate((element) => {
            const luminance = (color) => {
              const values = color
                .match(/\d+/g)
                .slice(0, 3)
                .map(Number)
                .map((n) => {
                  const v = n / 255;
                  return v <= 0.04045
                    ? v / 12.92
                    : ((v + 0.055) / 1.055) ** 2.4;
                });
              return (
                values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722
              );
            };
            const text = luminance(getComputedStyle(element).color);
            const bg = luminance(
              getComputedStyle(element.closest(".shipping-box"))
                .backgroundColor,
            );
            return (Math.max(text, bg) + 0.05) / (Math.min(text, bg) + 0.05);
          });
        expect(contrast).toBeGreaterThanOrEqual(4.5);
        await expect(page.locator(".gallery-main > img")).toHaveCSS(
          "mix-blend-mode",
          "normal",
        );
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        );
        expect(overflow).toBe(false);
        await page.screenshot({
          path: join(artifacts, `product-mobile-${theme}.png`),
          fullPage: true,
        });
      }
      await page.emulateMedia({ colorScheme: "light" });
    },
  );
  await check(
    "Modo escuro forçado do Chrome mantém toda a área da foto branca",
    async () => {
      const forcedBrowser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
        headless: true,
        args: ["--enable-features=WebContentsForceDark"],
      });
      try {
        const forcedPage = await forcedBrowser.newPage({
          viewport: { width: 390, height: 844 },
          colorScheme: "dark",
        });
        await forcedPage.goto(origin);
        const photo = forcedPage.locator(".product-image").first();
        await expect(photo).toHaveCSS("color-scheme", "light only");
        const bytes = await photo.screenshot({
          path: join(artifacts, "product-photo-chrome-forced-dark.png"),
        });
        const { data, info } = await sharp(bytes)
          .raw()
          .toBuffer({ resolveWithObject: true });
        const offset = ((info.height - 8) * info.width + 8) * info.channels;
        expect([...data.subarray(offset, offset + 3)]).toEqual([255, 255, 255]);
      } finally {
        await forcedBrowser.close();
      }
    },
  );
  if (process.env.VL_DARKREADER_SCRIPT) {
    await check(
      "Motor Dark Reader respeita o tema nativo e não transforma as fotos",
      async () => {
        await page.goto(origin);
        const code = readFileSync(process.env.VL_DARKREADER_SCRIPT, "utf8");
        await page.evaluate((source) => {
          const script = document.createElement("script");
          script.nonce = document.querySelector("script[nonce]").nonce;
          script.textContent = source;
          document.head.append(script);
          window.DarkReader.enable({
            brightness: 100,
            contrast: 90,
            sepia: 10,
          });
        }, code);
        await expect(page.locator("html")).not.toHaveAttribute(
          "data-darkreader-mode",
          "dynamic",
        );
        await expect(page.locator("style.darkreader")).toHaveCount(0);
        await expect(page.locator(".product-image img").first()).toHaveCSS(
          "filter",
          "none",
        );
        await expect(page.locator("body")).toHaveCSS(
          "background-color",
          "rgb(255, 255, 255)",
        );
      },
    );
  }
  await check(
    "Recuperação de senha no celular conclui troca e permite novo login",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(origin + "/recuperar-senha");
      await page.getByLabel("E-mail", { exact: true }).fill(email);
      await page.getByRole("button", { name: "Enviar instruções" }).click();
      await expect(page.locator(".auth-notice")).toBeVisible();
      const mail = readdirSync(join(dir, "emails"))
        .map((name) =>
          JSON.parse(readFileSync(join(dir, "emails", name), "utf8")),
        )
        .find((m) => m.to === email && m.text.includes("/redefinir-senha"));
      if (!mail) throw new Error("Recovery email missing");
      await page.goto(mail.text.match(/https?:\/\/[^\s]+/)[0]);
      await page
        .getByLabel("Nova senha", { exact: true })
        .fill(password + "new");
      await page
        .getByLabel("Confirmar nova senha", { exact: true })
        .fill(password + "new");
      await page.getByRole("button", { name: "Salvar nova senha" }).click();
      await expect(page.locator(".auth-notice")).toContainText(
        "Senha atualizada",
      );
      await page.goto(origin + "/conta");
      await page.getByLabel("E-mail", { exact: true }).fill(email);
      await page.getByLabel("Senha", { exact: true }).fill(password + "new");
      await page
        .getByRole("button", { name: "Entrar na minha conta", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Olá, Teste." }),
      ).toBeVisible();
    },
  );
  if (errors.length)
    throw new Error("Browser errors: " + [...new Set(errors)].join(" | "));
  console.log(
    `Browser validation: ${results.length} checks passed; no browser errors.`,
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await new Promise((r) => {
    if (server.exitCode !== null) return r();
    server.once("exit", r);
    setTimeout(() => {
      server.kill("SIGKILL");
      r();
    }, 4000).unref();
  });
  for (const name of uploaded)
    if (/^[a-f0-9-]{36}\.webp$/.test(name))
      rmSync(resolve("public/catalogo", name), { force: true });
  rmSync(dir, { recursive: true, force: true });
}
