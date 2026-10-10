import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

export function localEmailMode(origin: string) {
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(origin).hostname,
  );
  return (
    local &&
    (process.env.EMAIL_MODE === "local" ||
      (!process.env.RESEND_API_KEY && process.env.NODE_ENV === "development"))
  );
}
export function mailAvailable(origin: string) {
  return (
    localEmailMode(origin) ||
    !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
  );
}
export async function sendAccountEmail(
  to: string,
  purpose: "verify" | "reset",
  token: string,
  origin: string,
) {
  const url = new URL(
    purpose === "verify" ? "/confirmar-email" : "/redefinir-senha",
    origin,
  );
  url.searchParams.set("token", token);
  const subject =
    purpose === "verify"
      ? "Confirme seu e-mail — VL Móveis"
      : "Redefina sua senha — VL Móveis";
  const text = `${purpose === "verify" ? "Confirme seu endereço de e-mail para ativar sua conta na VL Móveis." : "Você solicitou uma nova senha para sua conta na VL Móveis."}\n\n${url.toString()}\n\n${purpose === "verify" ? "Este link vale por 24 horas." : "Este link vale por 30 minutos."} Se não foi você, ignore esta mensagem.`;
  if (localEmailMode(origin)) {
    const directory = resolve(
      process.env.EMAIL_PREVIEW_DIR || "data/emails-local",
    );
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(
      resolve(directory, randomUUID() + ".json"),
      JSON.stringify({
        to,
        subject,
        text,
        createdAt: new Date().toISOString(),
      }),
      { mode: 0o600, flag: "wx" },
    );
    return;
  }
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    throw new Error("Email is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      text,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Email delivery failed");
}
