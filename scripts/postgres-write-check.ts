import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../server/db";
import { empresas, clientes, coresStatus, automacoes, contasReceber } from "../drizzle/schema";

const db = await getDb();
if (!db) throw new Error("Banco indisponível");
const rollback = new Error("validation_rollback");
const checks: string[] = [];
try {
  await db.transaction(async tx => {
    const [company] = await tx.insert(empresas).values({ nome: "Verificação transitória PostgreSQL", ownerId: 0 }).returning({ id: empresas.id });
    assert.ok(Number.isSafeInteger(company.id)); checks.push("identity_returning");
    const [client] = await tx.insert(clientes).values({ empresaId: company.id, nome: "Ávila", ativo: true }).returning();
    assert.equal(client.ativo, true); checks.push("boolean");
    const found = await tx.select().from(clientes).where(eq(clientes.nome, "avila"));
    assert.ok(found.some(row => row.id === client.id)); checks.push("unicode_case_accent");
    const [updated] = await tx.update(clientes).set({ nome: "Ávila atualizado" }).where(eq(clientes.id, client.id)).returning();
    assert.equal(updated.nome, "Ávila atualizado"); checks.push("update");
    await tx.insert(coresStatus).values({ empresaId: company.id }).onConflictDoUpdate({ target: coresStatus.empresaId, set: { empresaId: company.id } });
    await tx.insert(coresStatus).values({ empresaId: company.id }).onConflictDoUpdate({ target: coresStatus.empresaId, set: { empresaId: company.id } });
    assert.equal((await tx.select().from(coresStatus).where(eq(coresStatus.empresaId, company.id))).length, 1); checks.push("upsert_unique");
    const [automation] = await tx.insert(automacoes).values({ empresaId: company.id, nome: "Verificação", corpoMensagem: "Validação sem envio", tipoGatilho: "evento", eventosAdicionais: JSON.stringify(["agendamento_criado"]) }).returning();
    const json = await tx.select().from(automacoes).where(sql`${automacoes.id} = ${automation.id} AND ${automacoes.eventosAdicionais}::jsonb @> jsonb_build_array(${'agendamento_criado'}::text)`);
    assert.equal(json.length, 1); checks.push("json_membership");
    const [payment] = await tx.insert(contasReceber).values({ empresaId: company.id, descricao: "Verificação financeira", valor: "123.45", dataVencimento: "2026-09-07" }).returning();
    assert.equal(payment.valor, "123.45"); checks.push("decimal_exact");
    const deleted = await tx.delete(clientes).where(eq(clientes.id, client.id));
    assert.equal(deleted.rowCount, 1); checks.push("delete_rowCount");
    throw rollback;
  });
} catch (error: any) {
  if (error !== rollback) { console.error(JSON.stringify({ failed: true, checks, code: error.cause?.code ?? error.code ?? error.message, table: error.cause?.table, column: error.cause?.column })); process.exit(1); }
}
const remaining = await db.select({ id: empresas.id }).from(empresas).where(eq(empresas.nome, "Verificação transitória PostgreSQL"));
assert.equal(remaining.length, 0); checks.push("rollback_no_test_records");
console.log(JSON.stringify({ passed: checks.length, checks }));
process.exit(0);
