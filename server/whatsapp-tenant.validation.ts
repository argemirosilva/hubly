import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), replica: vi.fn(), sockets: [] as any[] }));
vi.mock('./db', () => ({ getDb: mocks.getDb }));
vi.mock('./replica-mode', () => ({ isReplicaMode: mocks.replica }));
vi.mock('./runtime-config', () => ({ getPublicAppUrl: () => 'https://hubly.orizontech.com.br' }));
vi.mock('@whiskeysockets/baileys', async importOriginal => {
  const actual = await importOriginal<any>();
  return { ...actual, fetchLatestBaileysVersion: async () => ({ version: [2, 3000, 1] }),
    default: (options: any) => {
      const socket = { options, ev: new EventEmitter(), user: { id: '5511000000000:1@s.whatsapp.net' },
        sendMessage: vi.fn().mockResolvedValue({ key: { id: 'fake' } }),
        logout: vi.fn().mockResolvedValue(undefined), end: vi.fn() };
      mocks.sockets.push(socket); return socket;
    } };
});
import { waManager, useDbAuthState } from './whatsapp';
import { routedSendMessage, routedSendMedia, invalidatePlanCache } from './whatsapp-router';

const A = 999991, B = 999992;
const schema = 'hubly_wa_validation_' + randomUUID().replaceAll('-', '');
let admin: Pool, pool: Pool, db: ReturnType<typeof drizzle>;
let baseline: string[];
async function fingerprints() {
  return Promise.all(['wa_session','wa_connection_log','empresas','assinaturas'].map(async table =>
    (await admin.query(`SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'[]')) AS h FROM public.${table} t`)).rows[0].h));
}
async function fire(socket: any, name: string, payload: any) {
  for (const listener of socket.ev.listeners(name)) await listener(payload);
}
async function counts() {
  return (await pool.query('SELECT "empresaId",count(*)::int AS n FROM wa_session GROUP BY "empresaId" ORDER BY "empresaId"')).rows;
}

describe('WhatsApp: registro por empresa', () => {
  it('não compartilha estado entre empresas', () => {
    expect(waManager.forEmpresa(A)).not.toBe(waManager.forEmpresa(B));
    expect(waManager.forEmpresa(A)).toBe(waManager.forEmpresa(A));
    expect(waManager.forEmpresa(A).getState().status).toBe('disconnected');
  });
  it.each([0, -1, NaN, 1.5])('recusa empresa inválida %s', id => {
    expect(() => waManager.forEmpresa(id)).toThrow();
  });
  it('mantém bloqueio da réplica no manager', async () => {
    mocks.replica.mockReturnValue(true);
    await expect(waManager.forEmpresa(A).connect()).rejects.toThrow(/réplica/);
    expect(await waManager.forEmpresa(A).sendMessage('5511000000000', 'fixture')).toBe(false);
    expect(mocks.sockets).toHaveLength(0);
  });
});

describe.skipIf(process.env.HUBLY_WA_DB_VALIDATION !== '1')('WhatsApp: isolamento no PostgreSQL', () => {
  beforeAll(async () => {
    const config = JSON.parse(readFileSync('database-postgres.local.json', 'utf8'));
    admin = new Pool(config); baseline = await fingerprints();
    if (!/^hubly_wa_validation_[a-f0-9]{32}$/.test(schema)) throw new Error('Schema inseguro');
    await admin.query(`CREATE SCHEMA "${schema}"`);
    pool = new Pool({ ...config, options: '-c search_path=' + schema });
    for (const table of ['empresas','subscriptions','wa_connection_log']) {
      await pool.query(`CREATE TABLE "${table}" (LIKE public."${table}" INCLUDING ALL)`);
    }
    await pool.query('ALTER TABLE wa_connection_log ADD COLUMN IF NOT EXISTS "empresaId" integer');
    await pool.query('CREATE TABLE wa_session ("empresaId" integer NOT NULL REFERENCES empresas(id), id varchar(200) NOT NULL, data text NOT NULL, "updatedAt" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("empresaId",id))');
    db = drizzle(pool);
  });
  afterAll(async () => {
    try { if (admin && baseline) expect(await fingerprints()).toEqual(baseline); }
    finally {
      if (pool) await pool.end();
      if (admin) {
        if (!/^hubly_wa_validation_[a-f0-9]{32}$/.test(schema)) throw new Error('Schema inseguro');
        await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        expect((await admin.query('SELECT 1 FROM pg_namespace WHERE nspname=$1',[schema])).rowCount).toBe(0);
        await admin.end();
      }
    }
  });
  beforeEach(async () => {
    mocks.getDb.mockResolvedValue(db); mocks.replica.mockReturnValue(false);
    await waManager.forEmpresa(A).resetSession(); await waManager.forEmpresa(B).resetSession();
    mocks.sockets.length = 0;
    await pool.query('TRUNCATE wa_session, wa_connection_log, subscriptions, empresas CASCADE');
    await pool.query('INSERT INTO empresas (id,nome,"ownerId") VALUES ($1,\'Fixture A\',1),($2,\'Fixture B\',2)',[A,B]);
    await pool.query('INSERT INTO subscriptions ("empresaId","planType") VALUES ($1,\'SOLO\'),($2,\'PLUS\')',[A,B]);
    invalidatePlanCache(A); invalidatePlanCache(B);
  });
  afterEach(async () => {
    await waManager.forEmpresa(A).resetSession(); await waManager.forEmpresa(B).resetSession();
    // Aguarda somente as inserções de log lançadas pelos callbacks simulados.
    await new Promise(resolve => setTimeout(resolve, 50));
  });
  it('mesmo id creds em duas empresas e buffers restaurados corretamente', async () => {
    const a = await useDbAuthState(A), b = await useDbAuthState(B);
    a.state.creds.noiseKey.private = Buffer.from([1,2,3]);
    b.state.creds.noiseKey.private = Buffer.from([4,5,6]);
    await Promise.all([a.saveCreds(),b.saveCreds()]);
    const restoredA = await useDbAuthState(A), restoredB = await useDbAuthState(B);
    expect(Buffer.from(restoredA.state.creds.noiseKey.private)).toEqual(Buffer.from([1,2,3]));
    expect(Buffer.from(restoredB.state.creds.noiseKey.private)).toEqual(Buffer.from([4,5,6]));
    expect(await counts()).toEqual([{empresaId:A,n:1},{empresaId:B,n:1}]);
  });
  it('leitura e exclusão de chaves não atravessam empresas', async () => {
    const a=await useDbAuthState(A), b=await useDbAuthState(B);
    await a.state.keys.set({session:{same:Buffer.from([1])}});
    await b.state.keys.set({session:{same:Buffer.from([2])}});
    await a.state.keys.set({session:{same:null}});
    expect((await a.state.keys.get('session',['same'])).same).toBeUndefined();
    expect(Buffer.from((await b.state.keys.get('session',['same'])).same)).toEqual(Buffer.from([2]));
  });
  it('clearSession só limpa sua empresa e bloqueia gravação tardia', async () => {
    const a=await useDbAuthState(A), b=await useDbAuthState(B);
    await a.saveCreds();await b.saveCreds();await a.clearSession();await a.saveCreds();
    expect(await counts()).toEqual([{empresaId:B,n:1}]);
  });
  it('reset sem socket carregado limpa somente a empresa', async () => {
    await (await useDbAuthState(A)).saveCreds(); await (await useDbAuthState(B)).saveCreds();
    await waManager.forEmpresa(A).resetSession();
    expect(await counts()).toEqual([{empresaId:B,n:1}]);
  });
  it('QR, estado, envio e desconexão independentes em Solo e Plus', async () => {
    await waManager.forEmpresa(A).connect(); await waManager.forEmpresa(B).connect();
    const [a,b]=mocks.sockets;
    await fire(a,'connection.update',{qr:'fixture-qr-A'});await fire(b,'connection.update',{qr:'fixture-qr-B'});
    expect(waManager.forEmpresa(A).getState().qrDataUrl).not.toBe(waManager.forEmpresa(B).getState().qrDataUrl);
    await fire(a,'connection.update',{connection:'open'});await fire(b,'connection.update',{connection:'open'});
    expect(await routedSendMessage(A,'5511000000000','fixture A')).toBe(true);
    expect(await routedSendMedia(B,'5511000000000','https://example.org/fixture.jpg')).toBe(true);
    expect(a.sendMessage).toHaveBeenCalledTimes(1);expect(b.sendMessage).toHaveBeenCalledTimes(1);
    await fire(a,'creds.update',{});await fire(b,'creds.update',{});
    await waManager.forEmpresa(A).disconnect();
    expect(a.logout).toHaveBeenCalledTimes(1);expect(b.logout).not.toHaveBeenCalled();
    expect(waManager.forEmpresa(B).getState().status).toBe('connected');
    expect(await counts()).toEqual([{empresaId:B,n:1}]);
    await new Promise(resolve=>setTimeout(resolve,50));
    const log=(await pool.query('SELECT DISTINCT "empresaId" FROM wa_connection_log ORDER BY "empresaId"')).rows;
    expect(log).toEqual([{empresaId:A},{empresaId:B}]);
  });
  it('não usa sessão alheia quando apenas uma empresa está conectada', async () => {
    await waManager.forEmpresa(B).connect();await fire(mocks.sockets[0],'connection.update',{connection:'open'});
    expect(await routedSendMessage(A,'5511000000000','fixture')).toBe(false);
    expect(mocks.sockets[0].sendMessage).not.toHaveBeenCalled();
  });
  it('callback antigo não ressuscita QR ou conexão após reset', async () => {
    await waManager.forEmpresa(A).connect();const a=mocks.sockets[0];
    const oldListener=a.ev.listeners('connection.update')[0];
    await waManager.forEmpresa(A).resetSession();await oldListener({connection:'open',qr:'stale'});
    expect(waManager.forEmpresa(A).getState().status).toBe('disconnected');
  });
  it('banco ausente não cria credenciais temporárias sem persistência', async () => {
    mocks.getDb.mockResolvedValueOnce(null);
    await expect(useDbAuthState(A)).rejects.toThrow(/Banco indisponível/);
  });
});
