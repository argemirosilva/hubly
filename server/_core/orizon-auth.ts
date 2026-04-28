/**
 * Autenticação independente do Painel Orizontech.
 * Não depende do Manus OAuth — usa credenciais hardcoded + JWT próprio.
 */
import type { Application } from "express";
import { SignJWT, jwtVerify } from "jose";
import { getSessionCookieOptions } from "./cookies";

export const ORIZON_COOKIE_NAME = "orizon_session";
const ORIZON_EMAIL = "contato@orizontech.com.br";
const ORIZON_SENHA = "Remoto!123";

function getSecret() {
  return new TextEncoder().encode(
    (process.env.JWT_SECRET || "fallback-orizon-secret") + "_orizon"
  );
}

export async function createOrizonToken(): Promise<string> {
  return new SignJWT({ type: "orizon_admin" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime("12h")
    .sign(getSecret());
}

export async function verifyOrizonToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return payload.type === "orizon_admin";
  } catch {
    return false;
  }
}

export function registerOrizonAuthRoutes(app: Application) {
  // POST /api/orizontech/login
  app.post("/api/orizontech/login", async (req, res) => {
    const { email, senha } = req.body ?? {};
    if (email !== ORIZON_EMAIL || senha !== ORIZON_SENHA) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }
    const token = await createOrizonToken();
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(ORIZON_COOKIE_NAME, token, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 12, // 12h
      httpOnly: true,
    });
    return res.json({ success: true });
  });

  // POST /api/orizontech/logout
  app.post("/api/orizontech/logout", (req, res) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(ORIZON_COOKIE_NAME, cookieOptions);
    return res.json({ success: true });
  });

  // GET /api/orizontech/me — verifica se a sessão ainda é válida
  app.get("/api/orizontech/me", async (req, res) => {
    const { parse: parseCookies } = await import("cookie");
    const cookies = parseCookies(req.headers.cookie || "");
    const valid = await verifyOrizonToken(cookies[ORIZON_COOKIE_NAME]);
    if (!valid) return res.status(401).json({ error: "Não autenticado" });
    return res.json({ ok: true });
  });
}
