import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
const origin = "http://localhost:3104";
test(
  "Proprietário exige e-mail configurado no servidor e confirmado; papel persiste após reinício",
  { timeout: 60000 },
  async () => {
    const dir = mkdtempSync(join(tmpdir(), "vl-owner-")),
      owner = "owner@example.test",
      password = randomUUID() + "aA1";
    let server;
    const start = async () => {
      server = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "start",
          "--hostname",
          "127.0.0.1",
          "--port",
          "3104",
        ],
        {
          env: {
            ...process.env,
            DB_PATH: join(dir, "store.sqlite"),
            CATALOG_UPLOAD_DIR: join(dir, "photos"),
            APP_ORIGIN: origin,
            EMAIL_MODE: "local",
            RESEND_API_KEY: "",
            EMAIL_PREVIEW_DIR: join(dir, "emails"),
            STORE_OWNER_EMAIL: owner,
          },
          stdio: "ignore",
        },
      );
      for (let i = 0; i < 100; i++) {
        try {
          if ((await fetch(origin + "/api/health")).ok) return;
        } catch {}
        await new Promise((r) => setTimeout(r, 150));
      }
      throw new Error("Owner test server not ready");
    };
    const request = (path, data, cookie) =>
      fetch(origin + "/api/" + path, {
        method: data ? "POST" : "GET",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
      });
    const register = async (email) => {
      assert.equal(
        (
          await request("auth/register", {
            name: "Owner Test",
            email,
            password,
          })
        ).status,
        201,
      );
      const file = readdirSync(join(dir, "emails"))
        .map((f) => JSON.parse(readFileSync(join(dir, "emails", f), "utf8")))
        .find((v) => v.to === email);
      const url = file.text.match(/http[^\s]+/)[0];
      return new URL(url).searchParams.get("token");
    };
    const login = async (email) => {
      const r = await request("auth/login", { email, password });
      assert.equal(r.status, 200);
      return r.headers.get("set-cookie").split(";")[0];
    };
    const stop = async () => {
      if (server.exitCode === null) {
        await new Promise((r) => {
          server.once("exit", r);
          server.kill("SIGTERM");
        });
      }
    };
    try {
      await start();
      const token = await register(owner);
      assert.equal(
        (await request("auth/login", { email: owner, password })).status,
        403,
      );
      const otherToken = await register("other@example.test");
      assert.equal(
        (await request("auth/verify", { token: otherToken })).status,
        200,
      );
      const otherCookie = await login("other@example.test");
      assert.equal(
        (await request("admin/dashboard", undefined, otherCookie)).status,
        403,
      );
      assert.equal((await request("auth/verify", { token })).status, 200);
      const ownerCookie = await login(owner);
      assert.equal(
        (await request("admin/dashboard", undefined, ownerCookie)).status,
        200,
      );
      const upload = await fetch(origin + "/api/admin/upload", {
        method: "POST",
        headers: { Origin: origin, Cookie: ownerCookie },
        body: (() => {
          const form = new FormData();
          form.append(
            "file",
            new Blob([readFileSync("public/logo-vl.png")], {
              type: "image/png",
            }),
            "logo.png",
          );
          return form;
        })(),
      });
      assert.equal(upload.status, 200);
      const { url } = await upload.json();
      assert.ok(readdirSync(join(dir, "photos")).length === 1);
      await stop();
      await start();
      assert.equal(
        (await request("admin/dashboard", undefined, ownerCookie)).status,
        200,
      );
      assert.equal((await fetch(origin + url)).status, 200);
    } finally {
      if (server) await stop();
      rmSync(dir, { recursive: true, force: true });
    }
  },
);
