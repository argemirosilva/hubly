import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não definida');
  process.exit(1);
}

async function diagnoseData() {
  let connection;
  try {
    console.log('🔄 Conectando ao banco de dados...');
    connection = await mysql.createConnection(DATABASE_URL);
    console.log('✅ Conectado\n');
    
    // Diagnóstico 1: Dados inválidos em agendamentos.data
    console.log('📊 [1/3] Verificando dados inválidos em agendamentos.data...');
    const [invalidDates] = await connection.execute(`
      SELECT COUNT(*) as count FROM agendamentos 
      WHERE data IS NULL 
         OR data = '0000-00-00' 
         OR data NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    `);
    console.log(`   Registros com data inválida: ${invalidDates[0].count}\n`);
    
    // Diagnóstico 2: agendamentoId NULL em agendamento_itens
    console.log('📊 [2/3] Verificando agendamentoId NULL em agendamento_itens...');
    const [nullAgIds] = await connection.execute(`
      SELECT COUNT(*) as count FROM agendamento_itens 
      WHERE agendamentoId IS NULL OR agendamentoId = 0
    `);
    console.log(`   Registros com agendamentoId NULL/0: ${nullAgIds[0].count}\n`);
    
    // Diagnóstico 3: Verificar dados em maio-julho
    console.log('📊 [3/3] Verificando agendamentos em maio-julho 2026...');
    const [mayJulyData] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN data IS NULL THEN 1 ELSE 0 END) as null_data,
        SUM(CASE WHEN data = '0000-00-00' THEN 1 ELSE 0 END) as zero_data
      FROM agendamentos 
      WHERE data BETWEEN '2026-05-01' AND '2026-07-31'
    `);
    const row = mayJulyData[0];
    console.log(`   Total agendamentos: ${row.total}`);
    console.log(`   Com data NULL: ${row.null_data}`);
    console.log(`   Com data 0000-00-00: ${row.zero_data}\n`);
    
    // Diagnóstico 4: Amostra de dados em maio
    console.log('📊 [4/4] Amostra de agendamentos em maio...');
    const [sample] = await connection.execute(`
      SELECT id, data, horaInicio, horaFim, profissionalId
      FROM agendamentos 
      WHERE data BETWEEN '2026-05-01' AND '2026-05-31'
      LIMIT 5
    `);
    if (sample.length === 0) {
      console.log('   Nenhum agendamento encontrado em maio!');
    } else {
      sample.forEach((row, idx) => {
        console.log(`   [${idx+1}] ID=${row.id}, data=${row.data}, horaInicio=${row.horaInicio}, horaFim=${row.horaFim}, profId=${row.profissionalId}`);
      });
    }
    
    console.log('\n✅ Diagnóstico concluído');
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

diagnoseData();
