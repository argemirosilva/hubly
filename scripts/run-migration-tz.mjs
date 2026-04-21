import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

const conn = await mysql.createConnection(url);

const sqls = [
  // Migration 0050: add timezone field
  "ALTER TABLE `empresas` ADD `timezone` varchar(50) DEFAULT 'America/Sao_Paulo' NOT NULL;",
  // Unique index for deduplication
  "CREATE INDEX idx_hist_dedup ON historico_envios_automacao (empresaId, automacaoId, agendamentoId);",
];

for (const sql of sqls) {
  try {
    await conn.execute(sql);
    console.log(`✅ ${sql.slice(0, 80)}...`);
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEYNAME') {
      console.log(`⏭️ Já existe: ${sql.slice(0, 80)}...`);
    } else {
      console.error(`❌ Erro: ${e.message}`);
    }
  }
}

await conn.end();
console.log('Done.');
