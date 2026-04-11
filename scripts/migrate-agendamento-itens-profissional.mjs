/**
 * Migration: adicionar profissionalId na tabela agendamento_itens
 * Permite que cada serviço de um agendamento tenha um profissional diferente.
 */
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL não encontrada');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

try {
  // Verificar se a coluna já existe
  const [rows] = await connection.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'agendamento_itens' AND COLUMN_NAME = 'profissionalId'"
  );

  if (rows.length > 0) {
    console.log('✅ Coluna profissionalId já existe em agendamento_itens — nada a fazer.');
  } else {
    await connection.execute(
      'ALTER TABLE agendamento_itens ADD COLUMN profissionalId INT NULL AFTER servicoId'
    );
    console.log('✅ Coluna profissionalId adicionada com sucesso em agendamento_itens.');
  }
} catch (err) {
  console.error('❌ Erro na migration:', err);
  process.exit(1);
} finally {
  await connection.end();
}
