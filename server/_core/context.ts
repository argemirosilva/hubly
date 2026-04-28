import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifySystemSession, SYSTEM_COOKIE_NAME } from "./system-auth";
import { verifyOrizonToken, ORIZON_COOKIE_NAME } from "./orizon-auth";
import { parse as parseCookies } from "cookie";
import { getDb } from "../db";
import { profissionais, empresas } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  // No modelo unificado, systemUser é um registro da tabela profissionais com temAcesso=true
  systemUser?: {
    id: number;
    nome: string;
    email: string;
    empresaId: number;
    isProfissional: boolean;
    // profissionalId = id do próprio registro (o usuário É o profissional)
    profissionalId: number | null;
  } | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Tentar autenticação via Painel Orizontech (cookie orizon_session)
  try {
    const cookies = parseCookies(opts.req.headers.cookie || "");
    const orizonToken = cookies[ORIZON_COOKIE_NAME];
    const isOrizonAdmin = await verifyOrizonToken(orizonToken);
    if (isOrizonAdmin) {
      user = {
        id: -9999,
        openId: "orizon_admin",
        name: "Orizontech Admin",
        email: "contato@orizontech.com.br",
        loginMethod: "email",
        role: "admin" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        pushToken: null,
        pushTokenPlatform: null,
        pushTokenUpdatedAt: null,
        notifNovoAgendamento: false,
        notifConfirmacao: false,
        notifCancelamento: false,
        notifLembrete: false,
        notifPagamento: false,
        notifComissao: false,
      };
      return { req: opts.req, res: opts.res, user };
    }
  } catch {
    // Falha silenciosa
  }

  // Tentar autenticação via system_user (email/senha) primeiro
  try {
    const cookies = parseCookies(opts.req.headers.cookie || "");
    const systemToken = cookies[SYSTEM_COOKIE_NAME];
    const systemSession = await verifySystemSession(systemToken);
    if (systemSession) {
      // Buscar dados atualizados do profissional (modelo unificado)
      const db = await getDb();
      if (db) {
        const [su] = await db.select({
          id: profissionais.id,
          nome: profissionais.nome,
          email: profissionais.email,
          empresaId: profissionais.empresaId,
          isProfissional: profissionais.isProfissional,
          ativo: profissionais.ativo,
        }).from(profissionais).where(eq(profissionais.id, systemSession.systemUserId)).limit(1);

        if (su && su.ativo) {
          // Buscar o owner da empresa para retornar como User
          const [empresa] = await db.select({ id: empresas.id })
            .from(empresas).where(eq(empresas.id, su.empresaId)).limit(1);

          if (empresa) {
            // Criar um User sintético para o system_user
            user = {
              id: -su.id, // ID negativo para diferenciar de usuários OAuth
              openId: `system_user_${su.id}`,
              name: su.nome,
              email: su.email ?? "",
              loginMethod: "email",
              role: "user" as const,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastSignedIn: new Date(),
              pushToken: null,
              pushTokenPlatform: null,
              pushTokenUpdatedAt: null,
              notifNovoAgendamento: true,
              notifConfirmacao: true,
              notifCancelamento: true,
              notifLembrete: true,
              notifPagamento: true,
              notifComissao: true,
            };
            return {
              req: opts.req,
              res: opts.res,
              user,
              systemUser: {
                id: su.id,
                nome: su.nome,
                email: su.email ?? "",
                empresaId: su.empresaId,
                isProfissional: su.isProfissional ?? false,
                // No modelo unificado: profissionalId = id do próprio registro se isProfissional=true
                profissionalId: su.isProfissional ? su.id : null,
              },
            };
          }
        }
      }
    }
  } catch (error) {
    // Falha silenciosa - tentar OAuth
  }

  // Tentar autenticação via OAuth (Manus)
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
