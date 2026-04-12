import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

const conn = await mysql.createConnection(url);

try {
  // Verificar se colunas já existem
  const [cols] = await conn.execute("SHOW COLUMNS FROM `users` LIKE 'notif%'");
  console.log('Colunas notif* existentes:', cols.length);

  if (cols.length === 0) {
    console.log('Adicionando colunas de preferências de notificação...');
    await conn.execute(`
      ALTER TABLE \`users\`
        ADD COLUMN \`notifNovoAgendamento\` boolean DEFAULT true,
        ADD COLUMN \`notifConfirmacao\` boolean DEFAULT true,
        ADD COLUMN \`notifCancelamento\` boolean DEFAULT true,
        ADD COLUMN \`notifLembrete\` boolean DEFAULT true,
        ADD COLUMN \`notifPagamento\` boolean DEFAULT true,
        ADD COLUMN \`notifComissao\` boolean DEFAULT true
    `);
    console.log('Colunas adicionadas com sucesso!');
  } else {
    console.log('Colunas ja existem, nenhuma alteracao necessaria.');
    cols.forEach(c => console.log(' -', c.Field));
  }
} catch (err) {
  console.error('Erro:', err.message);
} finally {
  await conn.end();
}
