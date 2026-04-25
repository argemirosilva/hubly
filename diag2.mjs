import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('\n=== TODAS as comissões da Julia Alves (profissionalId=120001) ===');
const [todas] = await conn.execute(`
  SELECT c.id, c.agendamentoId, c.valorServico, c.valorComissao, c.paga, c.pagaEm, c.createdAt,
         cl.nome as clienteNome, a.data as dataAgendamento
  FROM comissoes c
  LEFT JOIN agendamentos a ON a.id = c.agendamentoId
  LEFT JOIN clientes cl ON cl.id = a.clienteId
  WHERE c.profissionalId = 120001
  ORDER BY c.id
`);
console.log('Comissões Julia:', JSON.stringify(todas, null, 2));

console.log('\n=== Agendamentos da Maria Eduarda Franco ===');
const [ags] = await conn.execute(`
  SELECT a.id, a.data, a.status, a.valorTotal, a.desconto, cl.nome as clienteNome
  FROM agendamentos a
  LEFT JOIN clientes cl ON cl.id = a.clienteId
  WHERE cl.nome LIKE '%Maria Eduarda Franco%'
  ORDER BY a.id
`);
console.log('Agendamentos:', JSON.stringify(ags, null, 2));

console.log('\n=== Comissões da Maria Isabella (profissionalId=1) ===');
const [comMaria] = await conn.execute(`
  SELECT c.id, c.agendamentoId, c.valorServico, c.valorComissao, c.paga, c.createdAt,
         cl.nome as clienteNome, a.data, a.desconto, a.valorTotal
  FROM comissoes c
  LEFT JOIN agendamentos a ON a.id = c.agendamentoId
  LEFT JOIN clientes cl ON cl.id = a.clienteId
  WHERE c.profissionalId = 1
  ORDER BY c.id
`);
console.log('Comissões Maria Isabella:', JSON.stringify(comMaria, null, 2));

await conn.end();
