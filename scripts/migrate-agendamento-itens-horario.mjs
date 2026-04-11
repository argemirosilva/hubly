import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

try {
  // Verificar se as colunas já existem
  const [cols] = await conn.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'agendamento_itens' 
     AND COLUMN_NAME IN ('horaInicio', 'horaFim')`
  );

  const existentes = cols.map(c => c.COLUMN_NAME);

  if (!existentes.includes('horaInicio')) {
    await conn.execute(`ALTER TABLE agendamento_itens ADD COLUMN horaInicio VARCHAR(5) NULL`);
    console.log('✅ Coluna horaInicio adicionada');
  } else {
    console.log('ℹ️  horaInicio já existe');
  }

  if (!existentes.includes('horaFim')) {
    await conn.execute(`ALTER TABLE agendamento_itens ADD COLUMN horaFim VARCHAR(5) NULL`);
    console.log('✅ Coluna horaFim adicionada');
  } else {
    console.log('ℹ️  horaFim já existe');
  }

  console.log('✅ Migration concluída');
} finally {
  await conn.end();
}
