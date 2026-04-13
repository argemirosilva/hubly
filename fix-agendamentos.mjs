import { getDb } from './server/db.ts';
import { agendamentos } from './drizzle/schema.ts';
import { sql } from 'drizzle-orm';

async function fixAgendamentos() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('Banco de dados não disponível');
      process.exit(1);
    }

    console.log('🔍 Buscando agendamentos com horaInicio inválido...');
    
    // Buscar registros com horaInicio inválido
    const invalidRows = await db.execute(sql`
      SELECT id, horaInicio, horaFim FROM agendamentos 
      WHERE horaInicio IS NULL 
         OR horaInicio = '' 
         OR horaInicio = 'NaN'
         OR LENGTH(CAST(horaInicio AS CHAR)) < 5
      LIMIT 50
    `);

    console.log(`📊 Encontrados ${invalidRows.length} registros com horaInicio inválido`);
    
    if (invalidRows.length > 0) {
      console.log('Exemplos:');
      invalidRows.slice(0, 5).forEach(row => {
        console.log(`  ID: ${row.id}, horaInicio: "${row.horaInicio}", horaFim: "${row.horaFim}"`);
      });

      // Corrigir valores inválidos
      console.log('\n🔧 Corrigindo horaInicio inválido para "09:00:00"...');
      await db.execute(sql`
        UPDATE agendamentos 
        SET horaInicio = '09:00:00'
        WHERE horaInicio IS NULL 
           OR horaInicio = '' 
           OR horaInicio = 'NaN'
           OR LENGTH(CAST(horaInicio AS CHAR)) < 5
      `);
      console.log('✅ horaInicio corrigido');

      // Corrigir horaFim também
      console.log('🔧 Corrigindo horaFim inválido para "10:00:00"...');
      await db.execute(sql`
        UPDATE agendamentos 
        SET horaFim = '10:00:00'
        WHERE horaFim IS NULL 
           OR horaFim = '' 
           OR horaFim = 'NaN'
           OR LENGTH(CAST(horaFim AS CHAR)) < 5
      `);
      console.log('✅ horaFim corrigido');
    }

    // Normalizar formato de horas (garantir HH:mm:ss)
    console.log('\n🔧 Normalizando formato de horas...');
    await db.execute(sql`
      UPDATE agendamentos 
      SET horaInicio = CONCAT(horaInicio, ':00')
      WHERE LENGTH(CAST(horaInicio AS CHAR)) = 5 AND horaInicio LIKE '%:%'
    `);
    console.log('✅ Horas normalizadas');

    console.log('\n✨ Limpeza concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

fixAgendamentos();
