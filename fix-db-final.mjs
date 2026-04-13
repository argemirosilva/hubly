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
    
    // Remover segundos de horaInicio: HH:mm:ss -> HH:mm
    console.log('🔧 [1/2] Removendo segundos de horaInicio (HH:mm:ss -> HH:mm)...');
    try {
      const [result1] = await connection.execute(`
        UPDATE agendamentos 
        SET horaInicio = SUBSTRING(horaInicio, 1, 5)
        WHERE horaInicio LIKE '%:%:%'
      `);
      console.log(`   ✅ ${result1.affectedRows} registros atualizados\n`);
    } catch (e) {
      console.log(`   ❌ Erro: ${e.message}\n`);
    }
    
    // Remover segundos de horaFim: HH:mm:ss -> HH:mm
    console.log('🔧 [2/2] Removendo segundos de horaFim (HH:mm:ss -> HH:mm)...');
    try {
      const [result2] = await connection.execute(`
        UPDATE agendamentos 
        SET horaFim = SUBSTRING(horaFim, 1, 5)
        WHERE horaFim LIKE '%:%:%'
      `);
      console.log(`   ✅ ${result2.affectedRows} registros atualizados\n`);
    } catch (e) {
      console.log(`   ❌ Erro: ${e.message}\n`);
    }
    
    // Verificar resultado final
    console.log('📊 Verificando resultado final...');
    const [finalHoraInicio] = await connection.execute(`
      SELECT DISTINCT horaInicio FROM agendamentos ORDER BY horaInicio LIMIT 10
    `);
    const [finalHoraFim] = await connection.execute(`
      SELECT DISTINCT horaFim FROM agendamentos ORDER BY horaFim LIMIT 10
    `);
    
    console.log('   Amostra de horaInicio:', finalHoraInicio.map(r => r.horaInicio).join(', '));
    console.log('   Amostra de horaFim:', finalHoraFim.map(r => r.horaFim).join(', '));
    
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
