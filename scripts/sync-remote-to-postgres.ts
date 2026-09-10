import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import pg from "pg";
import { SYNC_ENTITIES, sanitizeSyncRecord } from "../server/sync-catalog";

// Encerrada por decisão operacional em 10/09/2026: o banco local é a fonte oficial.
// Bloquear antes de ler a configuração, acessar a origem ou conectar ao banco.
throw new Error("MANUS_SYNC_DISABLED: sincronização com o Manus desativada. O banco local é a fonte oficial; nenhuma importação foi executada.");

const sourceArg = process.argv.find(arg => arg.startsWith("--source="))?.slice("--source=".length);
const allowLocalDeletions = process.argv.includes("--allow-local-deletions");
const dryRun = process.argv.includes('--dry-run');
// Mapeamentos comprovados ao migrar logos: preservar apenas se a origem não mudou.
const logoMappings: any[] = fs.existsSync('D:/hubly/backups')
  ? fs.readdirSync('D:/hubly/backups').filter(name => /^maria-logo-\d+\.json$/.test(name))
    .map(name => JSON.parse(fs.readFileSync('D:/hubly/backups/' + name, 'utf8'))) : [];
const base = (sourceArg ?? process.env.HUBLY_REMOTE_BASE_URL ?? "").replace(/\/$/, "");
const key = process.env.HUBLY_REMOTE_INTEGRATION_KEY ?? process.env.REMOTE_INTEGRATION_KEY ?? "";
// O dominio personalizado agora aponta para o proprio destino local.
if (base !== "https://hubly.manus.space" || key.indexOf(".") < 1) throw new Error("Use --source=https://hubly.manus.space; origem antiga aponta para o destino local");
const config = JSON.parse(fs.readFileSync("database-postgres.local.json", "utf8"));
if (config.database !== "hubly" || config.port !== 5433 || config.host !== "localhost") throw new Error("Destino PostgreSQL inesperado");
const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"';
async function api(method: string, pathname: string, body = "") {
  const timestamp = new Date().toISOString();
  const signature = crypto.createHmac("sha256", key.slice(key.indexOf(".") + 1)).update([method, pathname, timestamp, body].join("\n")).digest("hex");
  const res = await fetch(base + pathname, { method, redirect: "error", headers: {
    authorization: `Bearer ${key}`, "x-hubly-timestamp": timestamp, "x-hubly-signature": `sha256=${signature}`,
    ...(body ? { "content-type": "application/json" } : {}),
  }, ...(body ? { body } : {}), signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`API oficial respondeu HTTP ${res.status}`);
  return res.json();
}
const health = await api("GET", "/api/integrations/v1/health");
if (health.apiVersion !== "v1") throw new Error("Versão remota incompatível");
const schema = await api("GET", "/api/integrations/v1/schema");
const names = new Set(schema.entities.map((e: any) => e.name));
if (names.size !== SYNC_ENTITIES.length || SYNC_ENTITIES.some(e => !names.has(e.name))) throw new Error("Catálogo remoto divergente");
const snapshot = await api("POST", "/api/integrations/v1/bootstrap", "{}");
if (!snapshot.snapshotId) throw new Error("Snapshot inválido");
const downloaded = new Map<string, Record<string, any>[]>();
for (const entity of SYNC_ENTITIES) {
  const rows: Record<string, any>[] = [], ids = new Set<number>();
  let after = 0;
  for (;;) {
    const page = await api("GET", `/api/integrations/v1/bootstrap/${encodeURIComponent(snapshot.snapshotId)}/${encodeURIComponent(entity.name)}?after=${after}&limit=500`);
    if (!Array.isArray(page.records) || typeof page.hasMore !== "boolean") throw new Error(`Página inválida: ${entity.name}`);
    for (const row of page.records) {
      const id = Number(row.id);
      if (!Number.isSafeInteger(id) || id <= after || ids.has(id)) throw new Error(`ID/cursor inválido: ${entity.name}`);
      ids.add(id); rows.push(sanitizeSyncRecord(row));
    }
    if (!page.hasMore) break;
    const next = Number(page.nextCursor);
    if (!Number.isSafeInteger(next) || next <= after) throw new Error(`Cursor sem avanço: ${entity.name}`);
    after = next;
  }
  downloaded.set(entity.name, rows);
}
const db = new pg.Client(config);
await db.connect();
const report: { entity: string; remote: number; local: number; matchedFields: number }[] = [];
const deletedLocalOnly: { entity: string; count: number }[] = [];
const changes: { entity: string; added: number; updated: number; removed: number; fields: string[] }[] = [];
let preservedLocalLogos = 0;
try {
  await db.query("BEGIN");
  await db.query("SELECT pg_advisory_xact_lock(70831001)");
  await db.query("SET LOCAL TIME ZONE 'UTC'");
  await db.query("SET LOCAL lock_timeout = '5s'");
  // Impede gravacoes concorrentes durante a reconciliacao; leituras continuam.
  await db.query(`LOCK TABLE ${SYNC_ENTITIES.map(e => quote(e.table.toLowerCase())).join(',')} IN SHARE ROW EXCLUSIVE MODE`);
  for (const entity of SYNC_ENTITIES) {
    const rows = downloaded.get(entity.name)!;
    const localOnly = Number((await db.query(`SELECT COUNT(*) total FROM ${quote(entity.table.toLowerCase())} WHERE NOT (id = ANY($1::bigint[]))`, [rows.map(r => r.id)])).rows[0].total);
    if (localOnly > 0 && !allowLocalDeletions && !dryRun) throw new Error(`Reconciliacao interrompida: ${entity.name} possui ${localOnly} registros somente locais; confirmar preservacao antes de sincronizar`);
    if (localOnly > 0) deletedLocalOnly.push({ entity: entity.name, count: localOnly });
  }
  for (const entity of SYNC_ENTITIES) {
    const table = entity.table.toLowerCase(), rows = downloaded.get(entity.name)!;
    const change = { entity: entity.name, added: 0, updated: 0,
      removed: deletedLocalOnly.find(e => e.entity === entity.name)?.count ?? 0, fields: [] as string[] };
    const columns = (await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1", [table])).rows;
    const types = new Map(columns.map(c => [c.column_name, c.data_type]));
    if (!types.has("id")) throw new Error(`Tabela não encontrada: ${table}`);
    const convert = (name: string, value: any) => {
      if (value === null || value === undefined) return null;
      if (types.get(name) === "boolean") {
        if (![true,false,0,1,"0","1"].includes(value)) throw new Error(`Booleano inválido: ${table}.${name}`);
        return value === true || value === 1 || value === "1";
      }
      if (typeof value === "object") return JSON.stringify(value);
      return value;
    };
    for (const row of rows) {
      if (entity.name === 'companies') {
        const mapping = logoMappings.find(m => m.empresaId === row.id && m.previousUrl === row.logoUrl);
        if (mapping) {
          const current = (await db.query('SELECT "logoUrl" FROM empresas WHERE id=$1', [row.id])).rows[0];
          if (current?.logoUrl === mapping.newUrl) { row.logoUrl = mapping.newUrl; preservedLocalLogos++; }
        }
      }
      const fields = Object.keys(row).filter(k => types.has(k));
      const existing = (await db.query(`SELECT id FROM ${quote(table)} WHERE id=$1`, [row.id])).rowCount;
      if (existing) {
        const checks = fields.map((k,i) => `(${quote(k)} IS NOT DISTINCT FROM $${i+2}) AS ${quote(k)}`);
        const equality = (await db.query(`SELECT ${checks.join(',')} FROM ${quote(table)} WHERE id=$1`, [row.id,...fields.map(k=>convert(k,row[k]))])).rows[0];
        const differing = fields.filter(k=>equality[k] !== true);
        if (differing.length) { change.updated++; change.fields = [...new Set([...change.fields,...differing])]; }
        else continue; // Evita regravar linhas idênticas.
      } else change.added++;
      if (dryRun) continue;
      if (existing) {
        const updates = fields.filter(k => k !== "id");
        if (updates.length) await db.query(`UPDATE ${quote(table)} SET ${updates.map((k,i)=>quote(k)+'=$'+(i+1)).join(',')} WHERE id=$${updates.length+1}`, [...updates.map(k=>convert(k,row[k])),row.id]);
      } else {
        await db.query(`INSERT INTO ${quote(table)} (${fields.map(quote).join(',')}) VALUES (${fields.map((_,i)=>'$'+(i+1)).join(',')})`,fields.map(k=>convert(k,row[k])));
      }
    }
    if (change.added || change.updated || change.removed) changes.push(change);
    if (dryRun) continue;
    // Todas as páginas de todas as entidades já foram recebidas antes da transação.
    await db.query(`DELETE FROM ${quote(table)} WHERE NOT (id = ANY($1::bigint[]))`, [rows.map(r=>r.id)]);
    let matchedFields = 0;
    for (const row of rows) {
      const fields = Object.keys(row).filter(k=>types.has(k));
      // Igualdade no PostgreSQL compara JSON, datas e números pelos seus tipos reais.
      const checks = fields.map((k,i)=> `${quote(k)} IS NOT DISTINCT FROM $${i+2}`);
      const result = await db.query(`SELECT (${checks.join(' AND ')}) AS matches FROM ${quote(table)} WHERE id=$1`, [row.id,...fields.map(k=>convert(k,row[k]))]);
      if (result.rows[0]?.matches !== true) throw new Error(`Dados públicos divergentes: ${entity.name}`);
      matchedFields += fields.length;
    }
    const local = Number((await db.query(`SELECT COUNT(*) total FROM ${quote(table)}`)).rows[0].total);
    if (local !== rows.length) throw new Error(`Contagem divergente: ${entity.name}`);
    const sequence = (await db.query("SELECT pg_get_serial_sequence($1,'id') name",['public.'+quote(table)])).rows[0].name;
    if (sequence) {
      const next = (await db.query(`SELECT COALESCE(MAX(id),0)+1 next FROM ${quote(table)}`)).rows[0].next;
      const current = (await db.query(`SELECT last_value, is_called FROM ${sequence}`)).rows[0];
      const currentNext = BigInt(current.last_value) + (current.is_called ? 1n : 0n);
      if (BigInt(next) > currentNext) await db.query('SELECT setval($1,$2,false)', [sequence,next]);
    }
    report.push({entity:entity.name, remote:rows.length,local,matchedFields});
  }
  if (dryRun) {
    await db.query('ROLLBACK');
    console.log(JSON.stringify({dryRun:true,entities:downloaded.size,remoteRecords:[...downloaded.values()].reduce((s,r)=>s+r.length,0),changes,preservedLocalLogos,localOnly:deletedLocalOnly}));
  } else {
    await db.query("COMMIT");
    console.log(JSON.stringify({entities:report.length,remoteRecords:report.reduce((s,r)=>s+r.remote,0),localRecords:report.reduce((s,r)=>s+r.local,0),matchedFields:report.reduce((s,r)=>s+r.matchedFields,0),mismatches:0,changes,preservedLocalLogos,deletedLocalOnly}));
  }
} catch(error:any) {
  await db.query("ROLLBACK");
  console.error(JSON.stringify({error:error.code??error.message,rolledBack:true}));
  process.exitCode=1;
} finally { await db.end(); }
