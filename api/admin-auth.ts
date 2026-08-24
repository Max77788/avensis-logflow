import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const COOKIE = "avensis_mega_admin";
const maxAge = 60 * 60 * 12;

function secret() {
  return process.env.MEGA_ADMIN_SESSION_SECRET || process.env.MEGA_ADMIN_PASSWORD || "";
}

function signature(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function validSession(req: VercelRequest) {
  const raw = String(req.headers.cookie || "").split(";").map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw || !secret()) return false;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return false;
  const expected = signature(payload);
  const actual = Buffer.from(sig);
  const expectedBytes = Buffer.from(expected);
  return actual.length === expectedBytes.length && crypto.timingSafeEqual(actual, expectedBytes) && Number(payload) > Date.now();
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return res.status(200).json({ authenticated: validSession(req), role: "admin" });
  }
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
    return res.status(200).json({ authenticated: false });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const configuredUsername = process.env.MEGA_ADMIN_USERNAME || "";
  const configuredPassword = process.env.MEGA_ADMIN_PASSWORD || "";
  if (!configuredUsername || !configuredPassword || username !== configuredUsername || password !== configuredPassword) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const expiry = String(Date.now() + maxAge * 1000);
  const token = `${expiry}.${signature(expiry)}`;
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`);
  return res.status(200).json({ authenticated: true, role: "admin" });
}
