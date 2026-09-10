import { is, Table } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "../drizzle/schema";
import { getDb } from "../server/db";

const db = await getDb();
if (!db) throw new Error("PostgreSQL indisponível");
const failures: { table: string; code: string }[] = [];
let checked = 0, rows = 0;
for (const value of Object.values(schema)) {
  if (!is(value, Table)) continue;
  const table = getTableConfig(value as any).name;
  try {
    const data = await db.select().from(value as any);
    rows += data.length;
    checked++;
  } catch (error: any) {
    // Valores e SQL com parâmetros não devem aparecer nos relatórios.
    failures.push({ table, code: error.cause?.code ?? error.code ?? error.constructor.name });
  }
}
console.log(JSON.stringify({ checked, rows, failures }));
process.exit(failures.length ? 1 : 0);
