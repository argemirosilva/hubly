import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const migrations = [
  `ALTER TABLE users 
   ADD COLUMN IF NOT EXISTS pushToken TEXT,
   ADD COLUMN IF NOT EXISTS pushTokenPlatform ENUM('ios','android','web'),
   ADD COLUMN IF NOT EXISTS pushTokenUpdatedAt TIMESTAMP,
   ADD COLUMN IF NOT EXISTS notifNovoAgendamento BOOLEAN DEFAULT TRUE,
   ADD COLUMN IF NOT EXISTS notifConfirmacao BOOLEAN DEFAULT TRUE,
   ADD COLUMN IF NOT EXISTS notifCancelamento BOOLEAN DEFAULT TRUE,
   ADD COLUMN IF NOT EXISTS notifLembrete BOOLEAN DEFAULT TRUE,
   ADD COLUMN IF NOT EXISTS notifPagamento BOOLEAN DEFAULT TRUE,
   ADD COLUMN IF NOT EXISTS notifComissao BOOLEAN DEFAULT TRUE`,
];

for (const sql of migrations) {
  try {
    await conn.execute(sql);
    console.log('✅ Migration aplicada com sucesso');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('⏭️  Coluna já existe, pulando');
    } else {
      console.error('❌ Erro:', e.message);
      process.exit(1);
    }
  }
}

await conn.end();
console.log('✅ Migration de push token e preferências de notificação concluída');
