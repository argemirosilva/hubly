/**
 * Migration: adicionar servicoNome na tabela historico_envios_automacao
 */
import mysql from 'mysql2/promise';
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL não encontrada');
  process.exit(1);
}
const conn = await mysql.createConnection(DATABASE_URL);
try {
  const [rows] = await conn.execute(`SHOW COLUMNS FROM historico_envios_automacao LIKE 'servicoNome'`);
  if (rows.length > 0) {
    console.log('✅ Coluna servicoNome já existe em historico_envios_automacao — nada a fazer.');
  } else {
    await conn.execute(`ALTER TABLE historico_envios_automacao ADD COLUMN servicoNome VARCHAR(255) NULL AFTER enviarEm`);
    console.log('✅ Coluna servicoNome adicionada com sucesso em historico_envios_automacao.');
  }
} finally {
  await conn.end();
}
