import { getDb } from './server/db.js';
import { automacoes, pipelineColunas, pipelines } from './drizzle/schema.js';
import { eq, and } from 'drizzle-orm';

const db = await getDb();
if (!db) { console.error('DB indisponível'); process.exit(1); }

const empresaId = 1; // Maguie

// Pipelines
const pips = await db.select().from(pipelines).where(eq(pipelines.empresaId, empresaId));
console.log('Pipelines:', pips.map(p => ({ id: p.id, nome: p.nome })));

if (pips.length > 0) {
  // Colunas do primeiro pipeline
  const cols = await db.select().from(pipelineColunas).where(eq(pipelineColunas.pipelineId, pips[0].id));
  console.log('\nColunas do pipeline', pips[0].nome, ':');
  for (const c of cols) {
    console.log(`  - [${c.id}] "${c.nome}" | statusVinculo: ${(c as any).statusVinculo ?? 'null'}`);
  }
}

// Automações de evento ativas
const autos = await db.select({ id: automacoes.id, nome: automacoes.nome, evento: automacoes.evento, tipoGatilho: automacoes.tipoGatilho, ativo: automacoes.ativo })
  .from(automacoes)
  .where(and(eq(automacoes.empresaId, empresaId), eq(automacoes.ativo, true)));

console.log('\nAutomações de evento ativas:');
for (const a of autos.filter(a => a.tipoGatilho === 'evento')) {
  console.log(`  - [${a.id}] "${a.nome}" | evento: ${a.evento}`);
}

process.exit(0);
