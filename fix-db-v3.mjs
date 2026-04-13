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
    connection = await mysql.createConnection(DATABASE_URL);
    console.log('✅ Conectado ao banco de dados\n');
    
    // Passo 1: Identificar e corrigir valores inválidos em horaInicio
    console.log('🔧 [1/2] Limpando horaInicio inválido...');
    try {
      // Primeiro, buscar todos os valores únicos de horaInicio para diagnóstico
      const [rows] = await connection.execute(`
        SELECT DISTINCT horaInicio, COUNT(*) as count 
        FROM agendamentos 
        GROUP BY horaInicio 
        ORDER BY horaInicio
      `);
      console.log('   Valores únicos em horaInicio:');
      rows.forEach(row => {
        const val = row.horaInicio === null ? 'NULL' : `"${row.horaInicio}"`;
        console.log(`   - ${val}: ${row.count} registros`);
      });
      
      // Agora corrigir: qualquer coisa que não seja HH:mm vira 09:00
      const [result1] = await connection.execute(`
        UPDATE agendamentos 
        SET horaInicio = '09:00'
        WHERE horaInicio IS NULL 
           OR horaInicio NOT REGEXP '^[0-2][0-9]:[0-5][0-9]$'
      `);
      console.log(`   ✅ ${result1.affectedRows} registros corrigidos\n`);
    } catch (e) {
      console.log(`   ⚠️  Erro: ${e.message}\n`);
    }
    
    // Passo 2: Identificar e corrigir valores inválidos em horaFim
    console.log('🔧 [2/2] Limpando horaFim inválido...');
    try {
      // Primeiro, buscar todos os valores únicos de horaFim para diagnóstico
      const [rows] = await connection.execute(`
        SELECT DISTINCT horaFim, COUNT(*) as count 
        FROM agendamentos 
        GROUP BY horaFim 
        ORDER BY horaFim
      `);
      console.log('   Valores únicos em horaFim:');
      rows.forEach(row => {
        const val = row.horaFim === null ? 'NULL' : `"${row.horaFim}"`;
        console.log(`   - ${val}: ${row.count} registros`);
      });
      
      // Agora corrigir: qualquer coisa que não seja HH:mm vira 10:00
      const [result2] = await connection.execute(`
        UPDATE agendamentos 
        SET horaFim = '10:00'
        WHERE horaFim IS NULL 
           OR horaFim NOT REGEXP '^[0-2][0-9]:[0-5][0-9]$'
      `);
      console.log(`   ✅ ${result2.affectedRows} registros corrigidos\n`);
    } catch (e) {
      console.log(`   ⚠️  Erro: ${e.message}\n`);
    }
    
    console.log('✅ ✅ ✅ Agendamentos corrigidos com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixAgendamentos();
