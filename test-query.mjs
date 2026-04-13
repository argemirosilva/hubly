import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
const conn = await mysql.createConnection(DATABASE_URL);

console.log('Testando query com ORDER BY data, horaInicio...');
try {
  const [rows] = await conn.execute(
    `SELECT id, data, horaInicio, horaFim FROM agendamentos WHERE empresaId = ? AND data >= ? AND data <= ? ORDER BY data, horaInicio LIMIT 5`,
    [1, '2026-05-01', '2026-05-31']
  );
  console.log('✅ Query funcionou! Resultados:', rows.length);
  rows.forEach(r => console.log(`  ID=${r.id} data=${r.data} horaInicio=${r.horaInicio}`));
} catch (e) {
  console.error('❌ Erro na query:', e.message);
  console.error('   Código:', e.code);
}

console.log('\nTestando query SEM ORDER BY...');
try {
  const [rows2] = await conn.execute(
    `SELECT id, data, horaInicio FROM agendamentos WHERE empresaId = ? AND data >= ? AND data <= ? LIMIT 5`,
    [1, '2026-05-01', '2026-05-31']
  );
  console.log('✅ Query sem ORDER BY funcionou! Resultados:', rows2.length);
} catch (e) {
  console.error('❌ Erro:', e.message);
}

console.log('\nVerificando tipo da coluna horaInicio...');
try {
  const [cols] = await conn.execute(`DESCRIBE agendamentos`);
  const col = cols.find(c => c.Field === 'horaInicio');
  console.log('horaInicio tipo:', col?.Type, 'null:', col?.Null, 'default:', col?.Default);
  const colData = cols.find(c => c.Field === 'data');
  console.log('data tipo:', colData?.Type, 'null:', colData?.Null);
} catch (e) {
  console.error('❌ Erro:', e.message);
}

console.log('\nVerificando valores de horaInicio em maio...');
try {
  const [vals] = await conn.execute(
    `SELECT id, data, horaInicio, HEX(horaInicio) as hex_hora FROM agendamentos WHERE data BETWEEN '2026-05-01' AND '2026-05-31' LIMIT 5`
  );
  vals.forEach(r => console.log(`  ID=${r.id} data=${r.data} horaInicio=${r.horaInicio} hex=${r.hex_hora}`));
} catch (e) {
  console.error('❌ Erro:', e.message);
}

await conn.end();
