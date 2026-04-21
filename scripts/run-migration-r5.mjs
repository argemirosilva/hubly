import mysql from 'mysql2/promise';
const url = process.env.DATABASE_URL;
const conn = await mysql.createConnection(url);
const sqls = [
  "ALTER TABLE `contas_pagar` ADD COLUMN `meioPagamentoId` int",
  "ALTER TABLE `contas_receber` ADD COLUMN `meioPagamentoId` int",
];
for (const s of sqls) {
  try { await conn.execute(s); console.log('OK:', s.substring(0, 60)); }
  catch (e) { console.log('SKIP:', e.message.substring(0, 80)); }
}
await conn.end();
console.log('Migration R5 done');
