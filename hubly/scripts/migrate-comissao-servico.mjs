import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const url = process.env.DATABASE_URL;
const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!match) { console.error('Invalid DATABASE_URL'); process.exit(1); }
const [, user, pass, host, port, db] = match;

const conn = await createConnection({
  host, port: parseInt(port), user, password: pass, database: db,
  ssl: { rejectUnauthorized: false }
});

try {
  await conn.execute("ALTER TABLE `servicos` ADD `percentualComissao` decimal(5,2) DEFAULT '0.00'");
  console.log('✅ Campo percentualComissao adicionado à tabela servicos!');
} catch (e) {
  if (e.code === 'ER_DUP_FIELDNAME') {
    console.log('ℹ️ Campo já existe, OK');
  } else {
    console.error('❌ Erro:', e.message);
  }
}

await conn.end();
