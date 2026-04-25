import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('\n=== BUG 1: Comissões da Julia Alves (profissional) ===');
const [profJulia] = await conn.execute(`
  SELECT id, nome FROM profissionais WHERE nome LIKE '%Julia%' OR nome LIKE '%Júlia%'
`);
console.log('Profissionais Julia:', JSON.stringify(profJulia, null, 2));

if (profJulia.length > 0) {
  const juliaId = profJulia[0].id;
  const [comissoesJulia] = await conn.execute(`
    SELECT c.id, c.agendamentoId, c.valorServico, c.valorComissao, c.paga, c.pagaEm, c.createdAt,
           cl.nome as clienteNome, a.data
    FROM comissoes c
    LEFT JOIN agendamentos a ON a.id = c.agendamentoId
    LEFT JOIN clientes cl ON cl.id = a.clienteId
    WHERE c.profissionalId = ?
    ORDER BY c.agendamentoId, c.id
  `, [juliaId]);
  console.log('Comissões da Julia:', JSON.stringify(comissoesJulia, null, 2));
}

console.log('\n=== BUG 2: Profissional Maria Isabella ===');
const [profMaria] = await conn.execute(`
  SELECT id, nome FROM profissionais WHERE nome LIKE '%Isabella%' OR nome LIKE '%Maria Isabella%'
`);
console.log('Profissionais Maria Isabella:', JSON.stringify(profMaria, null, 2));

if (profMaria.length > 0) {
  const mariaId = profMaria[0].id;
  const [comissoesMaria] = await conn.execute(`
    SELECT c.id, c.agendamentoId, c.valorServico, c.valorComissao, c.paga, c.createdAt,
           cl.nome as clienteNome, a.data, a.desconto, a.valorTotal
    FROM comissoes c
    LEFT JOIN agendamentos a ON a.id = c.agendamentoId
    LEFT JOIN clientes cl ON cl.id = a.clienteId
    WHERE c.profissionalId = ?
    ORDER BY c.agendamentoId, c.id
  `, [mariaId]);
  console.log('Comissões da Maria Isabella:', JSON.stringify(comissoesMaria, null, 2));
}

console.log('\n=== Agendamentos com desconto >= 100 ou valorTotal = 0 que geraram comissão ===');
const [agDesconto] = await conn.execute(`
  SELECT a.id, a.data, a.desconto, a.valorTotal, cl.nome as clienteNome,
         COUNT(c.id) as numComissoes, SUM(c.valorComissao) as totalComissoes
  FROM agendamentos a
  LEFT JOIN clientes cl ON cl.id = a.clienteId
  LEFT JOIN comissoes c ON c.agendamentoId = a.id
  WHERE (a.desconto >= 100 OR a.valorTotal = 0 OR a.valorTotal IS NULL)
  GROUP BY a.id
  HAVING numComissoes > 0
  LIMIT 20
`);
console.log('Agendamentos com desconto 100% que geraram comissão:', JSON.stringify(agDesconto, null, 2));

await conn.end();
