import type { Application } from "express";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { getDb } from "../db";
import { profissionais, empresas } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
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

      // Buscar na tabela unificada profissionais (temAcesso=true)
      const [user] = await db
        .select()
        .from(profissionais)
        .where(eq(profissionais.email, email.toLowerCase().trim()))
        .limit(1);

      if (!user || !user.temAcesso) {
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }

      if (!user.ativo) {
        return res.status(403).json({ error: "Usuário inativo. Contate o administrador." });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }

      // Verificar senha
      const senhaCorreta = await bcrypt.compare(senha, user.passwordHash);
      if (!senhaCorreta) {
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }

      // Atualizar último acesso
      await db.update(profissionais).set({ ultimoAcesso: new Date() }).where(eq(profissionais.id, user.id));

      // Criar token de sessão
      const token = await createSystemSessionToken({
        systemUserId: user.id,
        empresaId: user.empresaId,
        nome: user.nome,
        email: user.email!,
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

  // POST /api/auth/register - Cadastro de novo usuário (cria empresa + profissional owner)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { nome, email, senha } = req.body;
      if (!nome || !email || !senha) {
        return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
      }
      if (senha.length < 6) {
        return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
      }

      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Banco de dados indisponível" });

      // Verificar se email já existe
      const [existing] = await db.select({ id: profissionais.id })
        .from(profissionais)
        .where(eq(profissionais.email, email.toLowerCase().trim()))
        .limit(1);

      if (existing) {
        return res.status(409).json({ error: "Este e-mail já está cadastrado" });
      }

      const passwordHash = await bcrypt.hash(senha, 10);

      // Criar empresa temporária (onboarding irá completar)
      const [empresaResult] = await db.insert(empresas).values({
        nome: `Empresa de ${nome}`,
        tipo: "salao",
        ownerId: 0, // será atualizado após criar o profissional
        onboardingConcluido: false,
      });
      const empresaId = empresaResult.insertId;

      // Criar profissional owner
      const [profResult] = await db.insert(profissionais).values({
        empresaId,
        nome,
        email: email.toLowerCase().trim(),
        passwordHash,
        temAcesso: true,
        isOwner: true,
        isProfissional: false, // não aparece na agenda por padrão
        ativo: true,
      });
      const profId = profResult.insertId;

      // Atualizar ownerId da empresa
      await db.update(empresas).set({ ownerId: profId }).where(eq(empresas.id, empresaId));

      // Criar token de sessão
      const token = await createSystemSessionToken({
        systemUserId: profId,
        empresaId,
        nome,
        email: email.toLowerCase().trim(),
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(SYSTEM_COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });

      return res.json({
        success: true,
        user: { id: profId, nome, email: email.toLowerCase().trim(), empresaId },
        onboardingPendente: true,
      });
    } catch (error) {
      console.error("[SystemAuth] Register error:", error);
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

      // Verificar status do onboarding
      const db = await getDb();
      let onboardingConcluido = true;
      if (db) {
        const [empresa] = await db.select({ onboardingConcluido: empresas.onboardingConcluido })
          .from(empresas)
          .where(eq(empresas.id, session.empresaId))
          .limit(1);
        onboardingConcluido = empresa?.onboardingConcluido ?? true;
      }

      return res.json({
        id: session.systemUserId,
        nome: session.nome,
        email: session.email,
        empresaId: session.empresaId,
        onboardingConcluido,
      });
    } catch {
      return res.status(401).json({ error: "Não autenticado" });
    }
  });
}
