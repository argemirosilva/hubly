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
    
    // Passo 1: Corrigir valores vazios/nulos/inválidos em horaInicio
    console.log('🔧 [1/4] Corrigindo horaInicio inválido (NULL, vazio, NaN)...');
    try {
      const [result1] = await connection.execute(`
        UPDATE agendamentos 
        SET horaInicio = '09:00'
        WHERE horaInicio IS NULL 
           OR TRIM(horaInicio) = '' 
           OR horaInicio = 'NaN'
           OR CHAR_LENGTH(TRIM(CAST(horaInicio AS CHAR))) < 4
      `);
      console.log(`   ✅ ${result1.affectedRows} registros corrigidos`);
    } catch (e) {
      console.log(`   ⚠️  Erro nesta etapa (pode ser normal): ${e.message}`);
    }
    
    // Passo 2: Corrigir valores vazios/nulos/inválidos em horaFim
    console.log('🔧 [2/4] Corrigindo horaFim inválido (NULL, vazio, NaN)...');
    try {
      const [result2] = await connection.execute(`
        UPDATE agendamentos 
        SET horaFim = '10:00'
        WHERE horaFim IS NULL 
           OR TRIM(horaFim) = '' 
           OR horaFim = 'NaN'
           OR CHAR_LENGTH(TRIM(CAST(horaFim AS CHAR))) < 4
      `);
      console.log(`   ✅ ${result2.affectedRows} registros corrigidos`);
    } catch (e) {
      console.log(`   ⚠️  Erro nesta etapa (pode ser normal): ${e.message}`);
    }
    
    // Passo 3: Remover segundos de horaInicio (HH:mm:ss -> HH:mm)
    console.log('🔧 [3/4] Removendo segundos de horaInicio...');
    try {
      const [result3] = await connection.execute(`
        UPDATE agendamentos 
        SET horaInicio = SUBSTRING(horaInicio, 1, 5)
        WHERE CHAR_LENGTH(CAST(horaInicio AS CHAR)) >= 8 
          AND horaInicio LIKE '%:%:%'
      `);
      console.log(`   ✅ ${result3.affectedRows} registros corrigidos`);
    } catch (e) {
      console.log(`   ⚠️  Erro nesta etapa (pode ser normal): ${e.message}`);
    }
    
    // Passo 4: Remover segundos de horaFim (HH:mm:ss -> HH:mm)
    console.log('🔧 [4/4] Removendo segundos de horaFim...');
    try {
      const [result4] = await connection.execute(`
        UPDATE agendamentos 
        SET horaFim = SUBSTRING(horaFim, 1, 5)
        WHERE CHAR_LENGTH(CAST(horaFim AS CHAR)) >= 8 
          AND horaFim LIKE '%:%:%'
      `);
      console.log(`   ✅ ${result4.affectedRows} registros corrigidos`);
    } catch (e) {
      console.log(`   ⚠️  Erro nesta etapa (pode ser normal): ${e.message}`);
    }
    
    console.log('\n✅ ✅ ✅ Agendamentos corrigidos com sucesso!');
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
