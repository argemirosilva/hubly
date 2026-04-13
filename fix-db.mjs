import { drizzle } from 'drizzle-orm/mysql2/promise';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não definida');
  process.exit(1);
}

async function fixAgendamentos() {
  let connection;
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    // Criar conexão
    connection = await mysql.createConnection(DATABASE_URL);
    const db = drizzle(connection);
    
    console.log('✅ Conectado ao banco de dados');
    
    // Corrigir horaInicio inválido para HH:mm (sem segundos)
    console.log('🔧 Corrigindo horaInicio inválido...');
    await connection.execute(`
      UPDATE agendamentos 
      SET horaInicio = '09:00'
      WHERE horaInicio IS NULL 
         OR horaInicio = '' 
         OR horaInicio = 'NaN'
         OR LENGTH(CAST(horaInicio AS CHAR)) < 5
    `);
    console.log('✅ horaInicio corrigido');
    
    // Corrigir horaFim inválido para HH:mm (sem segundos)
    console.log('🔧 Corrigindo horaFim inválido...');
    await connection.execute(`
      UPDATE agendamentos 
      SET horaFim = '10:00'
      WHERE horaFim IS NULL 
         OR horaFim = '' 
         OR horaFim = 'NaN'
         OR LENGTH(CAST(horaFim AS CHAR)) < 5
    `);
    console.log('✅ horaFim corrigido');
    
    // Remover segundos: HH:mm:ss -> HH:mm
    console.log('🔧 Removendo segundos de horaInicio...');
    await connection.execute(`
      UPDATE agendamentos 
      SET horaInicio = SUBSTRING(horaInicio, 1, 5)
      WHERE LENGTH(CAST(horaInicio AS CHAR)) >= 8 
        AND horaInicio LIKE '%:%:%'
    `);
    console.log('✅ Segundos removidos de horaInicio');
    
    console.log('🔧 Removendo segundos de horaFim...');
    await connection.execute(`
      UPDATE agendamentos 
      SET horaFim = SUBSTRING(horaFim, 1, 5)
      WHERE LENGTH(CAST(horaFim AS CHAR)) >= 8 
        AND horaFim LIKE '%:%:%'
    `);
    console.log('✅ Segundos removidos de horaFim');
    
    console.log('✅ ✅ ✅ Agendamentos corrigidos com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixAgendamentos();
