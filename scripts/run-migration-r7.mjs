import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const conn = await mysql.createConnection(DATABASE_URL);

try {
  // Índice único para prevenir duplicatas na importação de agendamentos
  await conn.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_contas_receber_origem_unica
    ON contas_receber (empresaId, origem_receber, origemId)
  `).catch(err => {
    if (err.code === 'ER_DUP_KEYNAME') {
      console.log('Índice idx_contas_receber_origem_unica já existe');
    } else {
      throw err;
    }
  });
  console.log('R7: Índice único de deduplicação criado com sucesso');
} finally {
  await conn.end();
}
