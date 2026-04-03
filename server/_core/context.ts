import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifySystemSession, SYSTEM_COOKIE_NAME } from "./system-auth";
import { parse as parseCookies } from "cookie";
import { getDb } from "../db";
import { systemUsers, empresas } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  systemUser?: { id: number; nome: string; email: string; empresaId: number } | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Tentar autenticação via system_user (email/senha) primeiro
  try {
    const cookies = parseCookies(opts.req.headers.cookie || "");
    const systemToken = cookies[SYSTEM_COOKIE_NAME];
    const systemSession = await verifySystemSession(systemToken);
    if (systemSession) {
      // Buscar dados atualizados do system_user
      const db = await getDb();
      if (db) {
        const [su] = await db.select({
          id: systemUsers.id,
          nome: systemUsers.nome,
          email: systemUsers.email,
          empresaId: systemUsers.empresaId,
          ativo: systemUsers.ativo,
        }).from(systemUsers).where(eq(systemUsers.id, systemSession.systemUserId)).limit(1);

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
              email: su.email,
              loginMethod: "email",
              role: "user" as const,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastSignedIn: new Date(),
            };
            return {
              req: opts.req,
              res: opts.res,
              user,
              systemUser: { id: su.id, nome: su.nome, email: su.email, empresaId: su.empresaId },
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
