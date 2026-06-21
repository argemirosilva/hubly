/**
 * Router do Console SQL administrativo.
 *
 * Permite ao OWNER do sistema executar consultas e migrations diretamente no
 * banco de produção, a partir da interface do Hubly. Isto resolve o cenário em
 * que a DATABASE_URL só existe no ambiente de produção (WebDev) e não pode ser
 * acessada de fora.
 *
 * SEGURANÇA:
 *  - Acesso restrito exclusivamente ao owner (OWNER_OPEN_ID) ou usuário id=1.
 *  - Todo SQL executado é registrado em log no console do servidor.
 *  - Há uma trava opcional por palavra-chave para operações destrutivas.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { sql as drizzleSql } from "drizzle-orm";

// ─── Guard: apenas o owner do sistema pode acessar ───────────────────────────
async function assertOwner(userId: number, userOpenId?: string) {
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  // Aceitar owner por openId direto
  if (ownerOpenId && userOpenId && userOpenId === ownerOpenId) return;
  // Caso contrário, validar no banco (id=1 é sempre o owner inicial)
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
  const rows = await db.execute(
    drizzleSql`SELECT id, openId FROM users WHERE id = ${userId} LIMIT 1`
  );
  const arr = rows[0] as unknown as Array<{ id: number; openId: string }>;
  if (!arr?.length) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
  const u = arr[0];
  if (u.id !== 1 && (!ownerOpenId || u.openId !== ownerOpenId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Console restrito ao administrador do sistema" });
  }
}

// Detecta se o SQL contém comandos destrutivos que exigem confirmação extra
function isDestructive(sqlText: string): boolean {
  const t = sqlText.trim().toLowerCase();
  return /\b(drop\s+table|drop\s+database|truncate|delete\s+from)\b/.test(t);
}

type QueryResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  affectedRows?: number;
  executionMs: number;
};

export const dbConsoleRouter = router({
  /**
   * Executa um SQL arbitrário no banco de produção.
   * Suporta SELECT (retorna linhas) e statements (INSERT/UPDATE/ALTER/etc).
   */
  executar: protectedProcedure
    .input(
      z.object({
        sql: z.string().min(1, "SQL vazio").max(20000),
        confirmarDestrutivo: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }): Promise<QueryResult> => {
      await assertOwner(ctx.user.id, ctx.user.openId);

      const sqlText = input.sql.trim();

      // Trava de segurança para comandos destrutivos
      if (isDestructive(sqlText) && !input.confirmarDestrutivo) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Este comando é destrutivo (DROP/TRUNCATE/DELETE). Marque a confirmação para prosseguir.",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Log de auditoria
      console.log(`[dbConsole] owner=${ctx.user.id} executando SQL:`, sqlText.slice(0, 500));

      const start = Date.now();
      try {
        const result = await db.execute(drizzleSql.raw(sqlText));
        const executionMs = Date.now() - start;

        // mysql2 retorna [rows, fields] para SELECT; para statements retorna ResultSetHeader
        const raw = result as unknown;
        let rows: Record<string, unknown>[] = [];
        let affectedRows: number | undefined;

        if (Array.isArray(raw)) {
          const first = raw[0];
          if (Array.isArray(first)) {
            // SELECT: first é o array de linhas
            rows = first as Record<string, unknown>[];
          } else if (first && typeof first === "object" && "affectedRows" in (first as object)) {
            // Statement: ResultSetHeader
            affectedRows = (first as { affectedRows: number }).affectedRows;
          } else if (first && typeof first === "object") {
            // Algumas versões retornam diretamente as linhas
            rows = raw as Record<string, unknown>[];
          }
        }

        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

        return {
          columns,
          rows: rows.slice(0, 500), // limite de segurança na resposta
          rowCount: rows.length,
          affectedRows,
          executionMs,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[dbConsole] Erro ao executar SQL:", msg);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Erro SQL: ${msg}` });
      }
    }),

  /**
   * Atalho: lista os usuários cadastrados (campos não sensíveis).
   */
  listarUsuarios: protectedProcedure.query(async ({ ctx }) => {
    await assertOwner(ctx.user.id, ctx.user.openId);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const result = await db.execute(
      drizzleSql`SELECT id, openId, name, email, role, createdAt FROM users ORDER BY id ASC LIMIT 500`
    );
    const raw = result as unknown as unknown[];
    const rows = (Array.isArray(raw[0]) ? raw[0] : raw) as Record<string, unknown>[];
    return { rows, total: rows.length };
  }),

  /**
   * Atalho: aplica a migration do Calendário Editorial de Marketing.
   * Idempotente — verifica a existência de cada coluna antes de criar.
   */
  migrarCalendarioEditorial: protectedProcedure.mutation(async ({ ctx }) => {
    await assertOwner(ctx.user.id, ctx.user.openId);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

    const colunas: { nome: string; ddl: string }[] = [
      { nome: "plataforma", ddl: "ADD COLUMN `plataforma` VARCHAR(20) DEFAULT 'instagram'" },
      { nome: "formato", ddl: "ADD COLUMN `formato` VARCHAR(20) DEFAULT 'feed'" },
      { nome: "statusProducao", ddl: "ADD COLUMN `statusProducao` VARCHAR(20) DEFAULT 'planejado'" },
      { nome: "dataPublicacao", ddl: "ADD COLUMN `dataPublicacao` VARCHAR(10) DEFAULT NULL" },
      { nome: "horarioPublicacao", ddl: "ADD COLUMN `horarioPublicacao` VARCHAR(5) DEFAULT NULL" },
      { nome: "responsavelId", ddl: "ADD COLUMN `responsavelId` INT DEFAULT NULL" },
      { nome: "responsavelNome", ddl: "ADD COLUMN `responsavelNome` VARCHAR(120) DEFAULT NULL" },
    ];

    const aplicadas: string[] = [];
    const jaExistiam: string[] = [];

    for (const col of colunas) {
      // Verifica se a coluna já existe
      const check = await db.execute(
        drizzleSql`SELECT COLUMN_NAME FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'marketing_posts'
            AND COLUMN_NAME = ${col.nome} LIMIT 1`
      );
      const rawCheck = check as unknown as unknown[];
      const existing = (Array.isArray(rawCheck[0]) ? rawCheck[0] : rawCheck) as unknown[];
      if (existing && existing.length > 0) {
        jaExistiam.push(col.nome);
        continue;
      }
      await db.execute(drizzleSql.raw(`ALTER TABLE \`marketing_posts\` ${col.ddl}`));
      aplicadas.push(col.nome);
    }

    return {
      success: true,
      aplicadas,
      jaExistiam,
      message: `Migration concluída. Colunas criadas: ${aplicadas.length}, já existentes: ${jaExistiam.length}.`,
    };
  }),
});
