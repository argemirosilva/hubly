import mysql from 'mysql2/promise';

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
    
    console.log('✅ Conectado ao banco de dados');
    
    // Corrigir horaInicio inválido para HH:mm (sem segundos)
    console.log('🔧 Corrigindo horaInicio inválido...');
    const [result1] = await connection.execute(`
      UPDATE agendamentos 
      SET horaInicio = '09:00'
      WHERE horaInicio IS NULL 
         OR horaInicio = '' 
         OR horaInicio = 'NaN'
         OR LENGTH(CAST(horaInicio AS CHAR)) < 5
    `);
    console.log(`✅ horaInicio corrigido: ${result1.affectedRows} registros`);
    
    // Corrigir horaFim inválido para HH:mm (sem segundos)
    console.log('🔧 Corrigindo horaFim inválido...');
    const [result2] = await connection.execute(`
      UPDATE agendamentos 
      SET horaFim = '10:00'
      WHERE horaFim IS NULL 
         OR horaFim = '' 
         OR horaFim = 'NaN'
         OR LENGTH(CAST(horaFim AS CHAR)) < 5
    `);
    console.log(`✅ horaFim corrigido: ${result2.affectedRows} registros`);
    
    // Remover segundos: HH:mm:ss -> HH:mm
    console.log('🔧 Removendo segundos de horaInicio...');
    const [result3] = await connection.execute(`
      UPDATE agendamentos 
      SET horaInicio = SUBSTRING(horaInicio, 1, 5)
      WHERE LENGTH(CAST(horaInicio AS CHAR)) >= 8 
        AND horaInicio LIKE '%:%:%'
    `);
    console.log(`✅ Segundos removidos de horaInicio: ${result3.affectedRows} registros`);
    
    console.log('🔧 Removendo segundos de horaFim...');
    const [result4] = await connection.execute(`
      UPDATE agendamentos 
      SET horaFim = SUBSTRING(horaFim, 1, 5)
      WHERE LENGTH(CAST(horaFim AS CHAR)) >= 8 
        AND horaFim LIKE '%:%:%'
    `);
    console.log(`✅ Segundos removidos de horaFim: ${result4.affectedRows} registros`);
    
    console.log('\n✅ ✅ ✅ Agendamentos corrigidos com sucesso!');
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
