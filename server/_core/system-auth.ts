import type { Application } from "express";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { getDb } from "../db";
import { systemUsers } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";

export const SYSTEM_COOKIE_NAME = "system_session";

function getSecret() {
  return new TextEncoder().encode(ENV.cookieSecret || "fallback-secret-key-change-me");
}

export async function createSystemSessionToken(payload: {
  systemUserId: number;
  empresaId: number;
  nome: string;
  email: string;
}): Promise<string> {
  const expiresInMs = 1000 * 60 * 60 * 24 * 30; // 30 dias
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
  return new SignJWT({
    systemUserId: payload.systemUserId,
    empresaId: payload.empresaId,
    nome: payload.nome,
    email: payload.email,
    type: "system_user",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSecret());
}

export async function verifySystemSession(token: string | undefined | null) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (payload.type !== "system_user") return null;
    return payload as {
      systemUserId: number;
      empresaId: number;
      nome: string;
      email: string;
      type: string;
    };
  } catch {
    return null;
  }
}

export function registerSystemAuthRoutes(app: Application) {
  // POST /api/auth/login - Login com email e senha
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, senha } = req.body;
      if (!email || !senha) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
      }

      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Banco de dados indisponível" });

      // Buscar usuário pelo email
      const [user] = await db
        .select()
        .from(systemUsers)
        .where(eq(systemUsers.email, email.toLowerCase().trim()))
        .limit(1);

      if (!user) {
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }

      if (!user.ativo) {
        return res.status(403).json({ error: "Usuário inativo. Contate o administrador." });
      }

      // Verificar senha
      const senhaCorreta = await bcrypt.compare(senha, user.passwordHash);
      if (!senhaCorreta) {
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }

      // Atualizar último acesso
      await db.update(systemUsers).set({ ultimoAcesso: new Date() }).where(eq(systemUsers.id, user.id));

      // Criar token de sessão
      const token = await createSystemSessionToken({
        systemUserId: user.id,
        empresaId: user.empresaId,
        nome: user.nome,
        email: user.email,
      });

      // Definir cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(SYSTEM_COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 dias
      });

      return res.json({
        success: true,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          empresaId: user.empresaId,
        },
      });
    } catch (error) {
      console.error("[SystemAuth] Login error:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // POST /api/auth/logout - Logout
  app.post("/api/auth/logout", (req, res) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(SYSTEM_COOKIE_NAME, cookieOptions);
    res.json({ success: true });
  });

  // GET /api/auth/me - Verificar sessão atual
  app.get("/api/auth/me", async (req, res) => {
    try {
      const { parse: parseCookies } = await import("cookie");
      const cookies = parseCookies(req.headers.cookie || "");
      const token = cookies[SYSTEM_COOKIE_NAME];
      const session = await verifySystemSession(token);
      if (!session) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      return res.json({
        id: session.systemUserId,
        nome: session.nome,
        email: session.email,
        empresaId: session.empresaId,
      });
    } catch {
      return res.status(401).json({ error: "Não autenticado" });
    }
  });
}
