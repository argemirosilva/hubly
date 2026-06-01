/**
 * Script para corrigir os nomes das colunas da tabela google_calendar_tokens
 * O banco foi criado com snake_case mas o schema Drizzle usa camelCase
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL não encontrada');

// Parse da URL do TiDB
const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!match) throw new Error('URL inválida: ' + url);
const [, user, password, host, port, database] = match;

const conn = await mysql.createConnection({
  host, port: parseInt(port), user, password, database,
  ssl: { rejectUnauthorized: true },
});

console.log('Conectado ao banco. Verificando colunas...');

const [cols] = await conn.execute('SHOW COLUMNS FROM google_calendar_tokens');
console.log('Colunas atuais:', cols.map(c => c.Field).join(', '));

// Renomear colunas snake_case → camelCase
const renames = [
  ['empresa_id', 'empresaId', 'int NOT NULL'],
  ['access_token', 'accessToken', 'text NOT NULL'],
  ['refresh_token', 'refreshToken', 'text'],
  ['expires_at', 'expiresAt', 'timestamp NULL'],
  ['calendar_id', 'calendarId', "varchar(255) DEFAULT 'primary'"],
  ['created_at', 'createdAt', 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP'],
  ['updated_at', 'updatedAt', 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'],
];

for (const [oldName, newName, typeDef] of renames) {
  const exists = cols.find(c => c.Field === oldName);
  const alreadyRenamed = cols.find(c => c.Field === newName);
  if (alreadyRenamed) {
    console.log(`✓ ${newName} já existe, pulando`);
    continue;
  }
  if (!exists) {
    console.log(`⚠ ${oldName} não encontrada, pulando`);
    continue;
  }
  try {
    await conn.execute(`ALTER TABLE google_calendar_tokens CHANGE COLUMN \`${oldName}\` \`${newName}\` ${typeDef}`);
    console.log(`✓ Renomeado: ${oldName} → ${newName}`);
  } catch (err) {
    console.error(`✗ Erro ao renomear ${oldName}: ${err.message}`);
  }
}

// Remover coluna duplicada empresaId (que foi adicionada manualmente)
const [colsAfter] = await conn.execute('SHOW COLUMNS FROM google_calendar_tokens');
const hasDuplicate = colsAfter.filter(c => c.Field === 'empresaId').length > 1;
if (hasDuplicate) {
  console.log('Removendo coluna duplicada empresaId...');
  // Não é possível remover diretamente, mas podemos verificar
}

console.log('\nColunas finais:', colsAfter.map(c => c.Field).join(', '));

// Adicionar unique constraint em empresaId se não existir
try {
  await conn.execute('ALTER TABLE google_calendar_tokens ADD UNIQUE KEY IF NOT EXISTS `gct_empresaId_unique` (`empresaId`)');
  console.log('✓ Unique constraint em empresaId adicionada');
} catch (err) {
  console.log('⚠ Unique constraint:', err.message);
}

await conn.end();
console.log('\nConcluído!');
