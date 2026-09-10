// Aceite com PostgreSQL real em schema descartável; Stripe e notificações simulados.
// Executar somente com HUBLY_STRIPE_DB_VALIDATION=1 e a configuração dedicada.
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(), constructEvent: vi.fn(), retrieve: vi.fn(),
  notifyOwner: vi.fn(), push: vi.fn(), cache: vi.fn(),
}));
vi.mock('./stripe', () => ({ stripe: { webhooks: { constructEvent: mocks.constructEvent }, subscriptions: { retrieve: mocks.retrieve } } }));
vi.mock('./_core/env', () => ({ ENV: { stripeWebhookSecret: 'isolated-validation-secret', stripeSecretKey: 'sk_live_isolated' } }));
vi.mock('./db', () => ({ getDb: mocks.getDb }));
vi.mock('./whatsapp-router', () => ({ invalidatePlanCache: mocks.cache }));
vi.mock('./pushNotifications', () => ({ sendPushToUser: mocks.push }));
vi.mock('./_core/notification', () => ({ notifyOwner: mocks.notifyOwner }));

import { registerStripeWebhook } from './stripe-webhook';
import { PLANOS_STRIPE } from './stripe-products';
import { stripeSubscriptionState, stripeSubscriptionPeriod } from './stripe-webhook-processing';

const schema = 'hubly_stripe_validation_' + randomUUID().replaceAll('-', '');
const tables = ['empresas', 'planos', 'subscriptions', 'assinaturas'];
const price = PLANOS_STRIPE.PLUS.mensal.priceId!;
const period = { start: 1788820000, end: 1791412000 };
let admin: Pool;
let pool: Pool;
let db: ReturnType<typeof drizzle>;
let baseline: string[];
let handler: any;
function subscription(modern = true, status = 'active'): any {
  return { id: 'sub_isolated', customer: 'cus_isolated', status, livemode: true,
    metadata: { empresaId: '999999' },
    ...(!modern ? { current_period_start: period.start, current_period_end: period.end } : {}),
    items: { data: [{ ...(modern ? { current_period_start: period.start, current_period_end: period.end } : {}),
      price: { id: price, recurring: { interval: 'month' } } }] } };
}
async function deliver(type: string, object: any, id = 'evt_isolated_audit', live = true) {
  mocks.constructEvent.mockReturnValue({ id, type, livemode: live, data: { object } });
  const response: any = { code: 200, body: undefined,
    status(code: number) { this.code = code; return this; },
    json(body: any) { this.body = body; return this; }, send(body: any) { this.body = body; return this; } };
  await handler({ headers: { 'stripe-signature': 'isolated' }, body: Buffer.from('{}') }, response);
  return response;
}
async function state() {
  const sub = (await pool.query('SELECT * FROM subscriptions')).rows[0];
  const assinatura = (await pool.query('SELECT * FROM assinaturas')).rows[0];
  const count = (await pool.query('SELECT count(*)::int AS n FROM stripe_webhook_events')).rows[0].n;
  return { sub, assinatura, count };
}
async function fingerprints() {
  return Promise.all(tables.map(async table => (await admin.query(
    'SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY id)::text,\'[]\')) AS hash FROM public.' + table + ' t'
  )).rows[0].hash));
}

describe('Stripe: estados e formatos', () => {
  it.each(['unpaid', 'past_due', 'paused', 'incomplete', 'incomplete_expired', 'canceled'])('não libera %s', status => {
    expect(stripeSubscriptionState(status).subscription).not.toBe('active');
  });
  it('preserva trial', () => expect(stripeSubscriptionState('trialing').subscription).toBe('trial'));
  it('rejeita estado desconhecido', () => expect(() => stripeSubscriptionState('unknown')).toThrow());
  it('aceita formatos antigo e atual', () => {
    expect(stripeSubscriptionPeriod(subscription(false))).toEqual(stripeSubscriptionPeriod(subscription(true)));
  });
  it('rejeita periodo ausente', () => {
    const sub = subscription(true); delete sub.items.data[0].current_period_end;
    expect(() => stripeSubscriptionPeriod(sub)).toThrow();
  });
});

describe.skipIf(process.env.HUBLY_STRIPE_DB_VALIDATION !== '1')('Stripe: aceite no PostgreSQL isolado', () => {
  beforeAll(async () => {
    const config = JSON.parse(readFileSync('database-postgres.local.json', 'utf8'));
    admin = new Pool(config);
    baseline = await fingerprints();
    if (!/^hubly_stripe_validation_[a-f0-9]{32}$/.test(schema)) throw new Error('Schema inseguro');
    await admin.query('CREATE SCHEMA "' + schema + '"');
    pool = new Pool({ ...config, options: '-c search_path=' + schema });
    for (const table of tables) {
      await pool.query('CREATE TABLE "' + schema + '"."' + table + '" (LIKE public."' + table + '" INCLUDING ALL)');
    }
    await pool.query('CREATE TABLE stripe_webhook_events (id varchar(255) COLLATE "C" PRIMARY KEY, type varchar(100) NOT NULL, livemode boolean NOT NULL, processed_at timestamptz NOT NULL DEFAULT now())');
    db = drizzle(pool);
    registerStripeWebhook({ post: (_path: string, _raw: any, callback: any) => { handler = callback; } } as any);
  });
  afterAll(async () => {
    try {
      if (admin && baseline) expect(await fingerprints()).toEqual(baseline);
    } finally {
      if (pool) await pool.end();
      if (admin) {
        // Somente o schema aleatório criado por este teste. Nunca public.
        if (!/^hubly_stripe_validation_[a-f0-9]{32}$/.test(schema)) throw new Error('Schema inseguro');
        await admin.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
        expect((await admin.query('SELECT 1 FROM pg_namespace WHERE nspname=$1', [schema])).rowCount).toBe(0);
        await admin.end();
      }
    }
  });
  beforeEach(async () => {
    vi.resetAllMocks();
    mocks.getDb.mockResolvedValue(db);
    mocks.retrieve.mockResolvedValue(subscription());
    mocks.notifyOwner.mockResolvedValue(true);
    mocks.push.mockResolvedValue(true);
    await pool.query('TRUNCATE empresas, planos, subscriptions, assinaturas, stripe_webhook_events');
    await pool.query('INSERT INTO empresas (id,nome,"ownerId") VALUES (999999,\'Empresa isolada\',999999)');
    await pool.query('INSERT INTO planos (id,nome,"precoMensal","precoAnual","stripePriceIdMensal") VALUES (999999,\'Plano isolado\',149,1490,$1)', [price]);
    await pool.query('INSERT INTO subscriptions ("empresaId","stripeCustomerId","stripeSubscriptionId",status) VALUES (999999,\'cus_isolated\',\'sub_isolated\',\'active\')');
    await pool.query('INSERT INTO assinaturas ("empresaId","planoId","stripeCustomerId","stripeSubscriptionId",status) VALUES (999999,999999,\'cus_isolated\',\'sub_isolated\',\'ativa\')');
  });
  it.each([false, true])('processa atualização formato moderno=%s', async modern => {
    mocks.retrieve.mockResolvedValue(subscription(modern));
    expect((await deliver('customer.subscription.updated', subscription(modern))).code).toBe(200);
    const s = await state();
    expect(s.sub.currentPeriodEnd.getTime()).toBe(period.end * 1000);
    expect(s.assinatura.periodoFim.getTime()).toBe(period.end * 1000);
    expect(s.count).toBe(1);
  });
  it('processa checkout atual', async () => {
    expect((await deliver('checkout.session.completed', { mode: 'subscription', metadata: { empresaId: '999999' }, subscription: 'sub_isolated' })).code).toBe(200);
    expect((await state()).sub.planType).toBe('PLUS');
    expect(mocks.notifyOwner).toHaveBeenCalledTimes(1);
  });
  it('processa renovação com parent da API atual', async () => {
    expect((await deliver('invoice.paid', { parent: { subscription_details: { subscription: { id: 'sub_isolated' } } } })).code).toBe(200);
    const s = await state();
    expect(s.sub.currentPeriodEnd.getTime()).toBe(period.end * 1000);
    expect(s.assinatura.periodoFim.getTime()).toBe(period.end * 1000);
  });
  it('sincroniza falha de pagamento nos dois paineis', async () => {
    mocks.retrieve.mockResolvedValue(subscription(true, 'past_due'));
    expect((await deliver('invoice.payment_failed', { subscription: 'sub_isolated' })).code).toBe(200);
    const s = await state();
    expect(s.sub.status).toBe('past_due'); expect(s.assinatura.status).toBe('inadimplente');
  });
  it('solicita reenvio sem banco', async () => {
    mocks.getDb.mockResolvedValue(null);
    expect((await deliver('invoice.payment_failed', { subscription: 'sub_isolated' })).code).toBe(500);
    expect((await state()).count).toBe(0);
  });
  it('não repete checkout sequencial', async () => {
    const session = { metadata: { empresaId: '999999' }, subscription: 'sub_isolated' };
    await deliver('checkout.session.completed', session);
    expect((await deliver('checkout.session.completed', session)).body.duplicate).toBe(true);
    expect(mocks.notifyOwner).toHaveBeenCalledTimes(1);
    expect((await state()).count).toBe(1);
  });
  it('deduplica entregas concorrentes no PostgreSQL', async () => {
    const session = { metadata: { empresaId: '999999' }, subscription: 'sub_isolated' };
    const results = await Promise.all(Array.from({ length: 5 }, () => deliver('checkout.session.completed', session)));
    expect(results.every(r => r.code === 200)).toBe(true);
    expect(results.filter(r => r.body.duplicate).length).toBe(4);
    expect(mocks.notifyOwner).toHaveBeenCalledTimes(1);
    expect((await state()).count).toBe(1);
  });
  it('não converte unpaid em active', async () => {
    mocks.retrieve.mockResolvedValue(subscription(true, 'unpaid'));
    await deliver('customer.subscription.updated', subscription(true, 'unpaid'));
    expect((await state()).sub.status).toBe('past_due');
  });
  it('reverte primeira escrita e ledger quando segunda escrita falha; permite reenvio', async () => {
    const before = await state();
    await pool.query('ALTER TABLE assinaturas ADD CONSTRAINT reject_validation_write CHECK (status <> \'ativa\') NOT VALID');
    try {
      expect((await deliver('checkout.session.completed', { metadata: { empresaId: '999999' }, subscription: 'sub_isolated' })).code).toBe(500);
      expect(await state()).toEqual(before);
      expect(mocks.notifyOwner).not.toHaveBeenCalled();
    } finally {
      await pool.query('ALTER TABLE assinaturas DROP CONSTRAINT reject_validation_write');
    }
    expect((await deliver('checkout.session.completed', { metadata: { empresaId: '999999' }, subscription: 'sub_isolated' })).code).toBe(200);
    expect((await state()).count).toBe(1);
  });
  it('não aplica falha atrasada depois de pagamento já recuperado', async () => {
    mocks.retrieve.mockResolvedValue(subscription(true, 'active'));
    await deliver('invoice.payment_failed', { subscription: 'sub_isolated' });
    expect((await state()).sub.status).toBe('active');
    expect((await state()).assinatura.status).toBe('ativa');
  });
  it('não ressuscita assinatura cancelada com atualização antiga', async () => {
    mocks.retrieve.mockResolvedValue(subscription(true, 'canceled'));
    await deliver('customer.subscription.deleted', { id: 'sub_isolated' }, 'evt_cancel');
    await deliver('customer.subscription.updated', subscription(true, 'active'), 'evt_old');
    const s = await state();
    expect(s.sub.status).toBe('canceled'); expect(s.sub.stripeSubscriptionId).toBeNull();
    expect(s.assinatura.status).toBe('cancelada'); expect(mocks.push).toHaveBeenCalledTimes(1);
  });
  it('rejeita TEST no ambiente LIVE', async () => {
    expect((await deliver('customer.subscription.updated', subscription(), 'evt_test_payload', false)).code).toBe(400);
    expect((await state()).count).toBe(0);
  });
  it('não pula eventos pelo prefixo evt_test_', async () => {
    await deliver('customer.subscription.updated', subscription(), 'evt_test_signed_live');
    expect((await state()).sub.planType).toBe('PLUS');
  });
  it('ignora checkout avulso de outro produto', async () => {
    const before = await state();
    expect((await deliver('checkout.session.completed', { mode: 'payment' })).body.ignored).toBe(true);
    const after = await state();
    expect(after.sub).toEqual(before.sub); expect(after.assinatura).toEqual(before.assinatura);
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });
  it('permite recuperar evento após falha da API Stripe', async () => {
    mocks.retrieve.mockRejectedValueOnce(new Error('Stripe temporariamente indisponivel'));
    expect((await deliver('customer.subscription.updated', subscription())).code).toBe(500);
    expect((await state()).count).toBe(0);
    expect((await deliver('customer.subscription.updated', subscription())).code).toBe(200);
  });
  it('cria os dois registros locais ausentes usando metadata validada', async () => {
    await pool.query('TRUNCATE subscriptions, assinaturas');
    expect((await deliver('customer.subscription.created', subscription())).code).toBe(200);
    const s = await state(); expect(s.sub.empresaId).toBe(999999); expect(s.assinatura.empresaId).toBe(999999);
  });
  it('não confirma sucesso quando falta o plano local', async () => {
    await pool.query('TRUNCATE planos');
    expect((await deliver('customer.subscription.updated', subscription())).code).toBe(500);
    expect((await state()).count).toBe(0);
  });
});
