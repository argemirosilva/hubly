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
    
    // Remover segundos usando TIME_FORMAT
    console.log('🔧 [1/2] Removendo segundos de horaInicio usando TIME_FORMAT...');
    try {
      const [result1] = await connection.execute(`
        UPDATE agendamentos 
        SET horaInicio = TIME_FORMAT(STR_TO_DATE(horaInicio, '%H:%i:%s'), '%H:%i')
        WHERE horaInicio IS NOT NULL
      `);
      console.log(`   ✅ ${result1.affectedRows} registros atualizados\n`);
    } catch (e) {
      console.log(`   ❌ Erro: ${e.message}\n`);
    }
    
    // Remover segundos de horaFim usando TIME_FORMAT
    console.log('🔧 [2/2] Removendo segundos de horaFim usando TIME_FORMAT...');
    try {
      const [result2] = await connection.execute(`
        UPDATE agendamentos 
        SET horaFim = TIME_FORMAT(STR_TO_DATE(horaFim, '%H:%i:%s'), '%H:%i')
        WHERE horaFim IS NOT NULL
      `);
      console.log(`   ✅ ${result2.affectedRows} registros atualizados\n`);
    } catch (e) {
      console.log(`   ❌ Erro: ${e.message}\n`);
    }
    
    // Verificar resultado final
    console.log('📊 Verificando resultado final...');
    const [finalHoraInicio] = await connection.execute(`
      SELECT DISTINCT horaInicio FROM agendamentos ORDER BY horaInicio
    `);
    const [finalHoraFim] = await connection.execute(`
      SELECT DISTINCT horaFim FROM agendamentos ORDER BY horaFim
    `);
    
    console.log('   Todos os valores de horaInicio:');
    finalHoraInicio.forEach(r => console.log(`     - "${r.horaInicio}"`));
    
    console.log('\n   Todos os valores de horaFim:');
    finalHoraFim.forEach(r => console.log(`     - "${r.horaFim}"`));
    
    console.log('\n✅ ✅ ✅ Agendamentos corrigidos com sucesso!');
    console.log('   Formato final: HH:mm (sem segundos)');
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
