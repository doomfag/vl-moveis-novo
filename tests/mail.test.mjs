import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  sendAccountEmail,
  localEmailMode,
  mailAvailable,
} from "../lib/mail.ts";

test("E-mail: Resend recebe destinatário, remetente e link correto, sem fallback público local", async () => {
  const saved = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_MODE: process.env.EMAIL_MODE,
  };
  const originalFetch = globalThis.fetch;
  try {
    process.env.EMAIL_MODE = "local";
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    assert.equal(localEmailMode("https://loja.example.test"), false);
    assert.equal(mailAvailable("https://loja.example.test"), false);
    assert.equal(localEmailMode("http://localhost:3000"), true);
    const key = randomBytes(32).toString("hex"),
      token = randomBytes(32).toString("hex");
    process.env.RESEND_API_KEY = key;
    process.env.EMAIL_FROM = "VL Móveis <contato@example.test>";
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(url, "https://api.resend.com/emails");
      assert.equal(options.headers.Authorization, "Bearer " + key);
      const data = JSON.parse(options.body);
      assert.equal(data.from, process.env.EMAIL_FROM);
      assert.deepEqual(data.to, ["cliente@example.test"]);
      assert.ok(
        data.text.includes(
          "https://loja.example.test/confirmar-email?token=" + token,
        ),
      );
      assert.ok(data.text.includes("24 horas"));
      return new Response(JSON.stringify({ id: "test-message" }), {
        status: 200,
      });
    };
    await sendAccountEmail(
      "cliente@example.test",
      "verify",
      token,
      "https://loja.example.test",
    );
    assert.equal(calls, 1);
    globalThis.fetch = async (url, options) => {
      const data = JSON.parse(options.body);
      assert.equal(data.from, process.env.EMAIL_FROM);
      assert.equal(data.subject, "Redefina sua senha — VL Móveis");
      assert.ok(
        data.text.includes(
          "https://vlmoveis.net.br/redefinir-senha?token=" + token,
        ),
      );
      assert.ok(data.text.includes("30 minutos"));
      return new Response(JSON.stringify({ id: "reset-test" }), {
        status: 200,
      });
    };
    process.env.EMAIL_FROM = "VL Móveis <contato@vlmoveis.net.br>";
    await sendAccountEmail(
      "cliente@example.test",
      "reset",
      token,
      "https://vlmoveis.net.br",
    );
    globalThis.fetch = async () => new Response("Rejected", { status: 403 });
    await assert.rejects(
      sendAccountEmail(
        "cliente@example.test",
        "verify",
        token,
        "https://loja.example.test",
      ),
      /delivery failed/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
