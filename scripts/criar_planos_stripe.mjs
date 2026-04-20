import Stripe from 'stripe';
import mysql from 'mysql2/promise';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db = await mysql.createConnection(process.env.DATABASE_URL);

const planos = [
  {
    nome: 'Essencial',
    descricao: 'Para profissionais autônomos e pequenos negócios que estão começando.',
    precoMensal: 9700,   // R$ 97,00
    precoAnual: 97000,   // R$ 970,00 (2 meses grátis)
    apiWhatsapp: 'baileys',
    limiteUsuarios: 2,
    limiteAgendamentosMes: 150,
    temIaFinanceira: false,
    temIaClientes: false,
    temPortalPublico: true,
    temAutomacoes: true,
    temPipeline: false,
    slaSuporteHoras: 48,
    ordem: 1,
    recursos: [
      'Agenda completa',
      'Portal público de agendamento',
      'Automações de WhatsApp',
      'Gestão de clientes',
      'Relatórios básicos',
      'WhatsApp (requer dispositivo conectado)',
    ],
  },
  {
    nome: 'Profissional',
    descricao: 'Para negócios em crescimento que precisam de mais controle e automação.',
    precoMensal: 19700,  // R$ 197,00
    precoAnual: 197000,  // R$ 1.970,00 (2 meses grátis)
    apiWhatsapp: 'zapi',
    limiteUsuarios: 5,
    limiteAgendamentosMes: 500,
    temIaFinanceira: true,
    temIaClientes: false,
    temPortalPublico: true,
    temAutomacoes: true,
    temPipeline: true,
    slaSuporteHoras: 24,
    ordem: 2,
    recursos: [
      'Tudo do Essencial',
      'WhatsApp sempre conectado (sem precisar de dispositivo aberto)',
      'Pipeline de vendas',
      'IA Financeira',
      'Relatórios avançados',
      'Até 5 usuários',
      'Suporte prioritário (24h)',
    ],
  },
  {
    nome: 'Premium',
    descricao: 'Para negócios consolidados que precisam de IA, múltiplos usuários e suporte VIP.',
    precoMensal: 39700,  // R$ 397,00
    precoAnual: 397000,  // R$ 3.970,00 (2 meses grátis)
    apiWhatsapp: 'zapi',
    limiteUsuarios: 20,
    limiteAgendamentosMes: 9999,
    temIaFinanceira: true,
    temIaClientes: true,
    temPortalPublico: true,
    temAutomacoes: true,
    temPipeline: true,
    slaSuporteHoras: 4,
    ordem: 3,
    recursos: [
      'Tudo do Profissional',
      'IA para análise de clientes',
      'Usuários ilimitados',
      'Agendamentos ilimitados',
      'Suporte VIP (4h)',
      'Onboarding personalizado',
    ],
  },
];

console.log('Criando planos no Stripe e no banco de dados...\n');

for (const plano of planos) {
  // 1. Criar produto no Stripe
  const product = await stripe.products.create({
    name: `Hubly ${plano.nome}`,
    description: plano.descricao,
    metadata: { plano: plano.nome.toLowerCase(), apiWhatsapp: plano.apiWhatsapp },
  });
  console.log(`✓ Produto criado: ${product.id} (${plano.nome})`);

  // 2. Criar preço mensal
  const priceMensal = await stripe.prices.create({
    product: product.id,
    unit_amount: plano.precoMensal,
    currency: 'brl',
    recurring: { interval: 'month' },
    nickname: `${plano.nome} - Mensal`,
    metadata: { ciclo: 'mensal', plano: plano.nome.toLowerCase() },
  });
  console.log(`✓ Preço mensal: ${priceMensal.id} (R$ ${plano.precoMensal / 100}/mês)`);

  // 3. Criar preço anual
  const priceAnual = await stripe.prices.create({
    product: product.id,
    unit_amount: plano.precoAnual,
    currency: 'brl',
    recurring: { interval: 'year' },
    nickname: `${plano.nome} - Anual`,
    metadata: { ciclo: 'anual', plano: plano.nome.toLowerCase() },
  });
  console.log(`✓ Preço anual: ${priceAnual.id} (R$ ${plano.precoAnual / 100}/ano)`);

  // 4. Inserir no banco de dados
  const [result] = await db.execute(
    `INSERT INTO planos (nome, descricao, precoMensal, precoAnual, stripeProductId, stripePriceIdMensal, stripePriceIdAnual, apiWhatsapp, limiteUsuarios, limiteAgendamentosMes, temIaFinanceira, temIaClientes, temPortalPublico, temAutomacoes, temPipeline, slaSuporteHoras, ordem, ativo, recursos)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?)`,
    [
      plano.nome,
      plano.descricao,
      (plano.precoMensal / 100).toFixed(2),
      (plano.precoAnual / 100).toFixed(2),
      product.id,
      priceMensal.id,
      priceAnual.id,
      plano.apiWhatsapp,
      plano.limiteUsuarios,
      plano.limiteAgendamentosMes,
      plano.temIaFinanceira ? 1 : 0,
      plano.temIaClientes ? 1 : 0,
      plano.temPortalPublico ? 1 : 0,
      plano.temAutomacoes ? 1 : 0,
      plano.temPipeline ? 1 : 0,
      plano.slaSuporteHoras,
      plano.ordem,
      JSON.stringify(plano.recursos),
    ]
  );
  console.log(`✓ Plano salvo no banco (id: ${result.insertId})\n`);
}

await db.end();
console.log('✅ Todos os planos criados com sucesso!');
