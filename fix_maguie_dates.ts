import Stripe from 'stripe';
import { getDb } from './server/db';
import { assinaturas } from '../agendei/drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  
  // Buscar assinatura no Stripe com datas completas
  const sub = await stripe.subscriptions.retrieve('sub_1TPOlMLUFOvpH4vDsVXLPvc0');
  
  const periodoInicio = new Date(sub.current_period_start * 1000);
  const periodoFim = new Date(sub.current_period_end * 1000);
  const startDate = new Date(sub.start_date * 1000);
  
  console.log('Dados do Stripe:');
  console.log('  start_date:', startDate.toLocaleDateString('pt-BR'));
  console.log('  current_period_start:', periodoInicio.toLocaleDateString('pt-BR'));
  console.log('  current_period_end:', periodoFim.toLocaleDateString('pt-BR'));
  console.log('  status:', sub.status);
  
  // Atualizar no banco
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  
  await db.update(assinaturas).set({
    periodoInicio,
    periodoFim,
  }).where(eq(assinaturas.empresaId, 1));
  
  console.log('\nBanco atualizado com sucesso!');
  console.log('  periodoInicio:', periodoInicio.toLocaleDateString('pt-BR'));
  console.log('  periodoFim:', periodoFim.toLocaleDateString('pt-BR'));
  
  // Verificar resultado
  const [row] = await db.select().from(assinaturas).where(eq(assinaturas.empresaId, 1)).limit(1);
  console.log('\nRegistro atualizado:', JSON.stringify(row, null, 2));
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
