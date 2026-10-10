import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { db, publicUser } from "./db";
import type { User } from "./types";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function currentUser(req: NextRequest): User | null {
  const raw = req.cookies.get("vl_session")?.value;
  if (!raw || !/^[a-f0-9]{64}$/.test(raw)) return null;
  const r = db()
    .prepare(
      "SELECT u.id,u.name,u.email,u.role,u.email_verified_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND u.email_verified_at IS NOT NULL",
    )
    .get(tokenHash(raw), Date.now());
  return r ? publicUser(r) : null;
}
export function session(response: NextResponse, userId: string) {
  const token = randomBytes(32).toString("hex");
  db().prepare("DELETE FROM sessions WHERE expires<=?").run(Date.now());
  db()
    .prepare("INSERT INTO sessions VALUES(?,?,?)")
    .run(tokenHash(token), userId, Date.now() + 7 * 86400000);
  response.cookies.set("vl_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400,
  });
}
export function limited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  db().prepare("DELETE FROM limits WHERE expires<=?").run(now);
  db()
    .prepare(
      "INSERT INTO limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
    )
    .run(key, now + windowMs);
  const r = db().prepare("SELECT count FROM limits WHERE key=?").get(key) as {
    count: number;
  };
  return r.count > max;
}
