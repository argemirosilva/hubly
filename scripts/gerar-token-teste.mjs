import 'dotenv/config';
import mysql2 from 'mysql2/promise';
import crypto from 'crypto';

const conn = await mysql2.createConnection(process.env.DATABASE_URL);

// Pegar um agendamento futuro ou recente
const [rows] = await conn.execute(
  'SELECT id, empresaId FROM agendamentos WHERE status NOT IN ("cancelado") ORDER BY id DESC LIMIT 1'
);
const ag = rows[0];
console.log('Agendamento:', ag);

// Gerar token
const token = crypto.randomBytes(32).toString('hex');
// expiresAt como timestamp MySQL (datetime)
const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

await conn.execute(
  'INSERT INTO tokens_confirmacao (token, agendamentoId, empresaId, expiresAt) VALUES (?, ?, ?, ?)',
  [token, ag.id, ag.empresaId, expiresAt]
);

const origin = process.env.APP_PUBLIC_URL ?? 'https://hubly.orizontech.com.br';
const link = `${origin}/confirmar/${token}`;
console.log('\n✅ Link de confirmação gerado:');
console.log(link);

await conn.end();
