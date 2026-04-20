import { createPool } from "/home/ubuntu/agendei/node_modules/.pnpm/mysql2@3.15.1/node_modules/mysql2/promise.js";

const pool = createPool(process.env.DATABASE_URL);

async function run() {
  const conn = await pool.getConnection();
  try {
    console.log("Conectado ao banco. Aplicando migration...");

    // Migration: colunas de status Z-API
    const migrations = [
      "ALTER TABLE `historico_envios_automacao` ADD COLUMN IF NOT EXISTS `zapiMessageId` varchar(255)",
      "ALTER TABLE `historico_envios_automacao` ADD COLUMN IF NOT EXISTS `messageStatus` enum('sent','delivered','read','failed') DEFAULT 'sent'",
      "ALTER TABLE `historico_envios_automacao` ADD COLUMN IF NOT EXISTS `messageStatusAt` timestamp NULL",
    ];

    for (const sql of migrations) {
      try {
        await conn.execute(sql);
        console.log("OK:", sql.substring(0, 80));
      } catch (e) {
        if (e.message.includes("Duplicate column")) {
          console.log("Coluna já existe (ok):", sql.substring(0, 80));
        } else {
          console.error("ERRO:", e.message);
        }
      }
    }

    // Verificar plano da empresa 1
    const [subs] = await conn.execute("SELECT id, empresaId, planType, status FROM subscriptions WHERE empresaId = 1 LIMIT 1");
    console.log("Subscription atual:", JSON.stringify(subs));

    if (subs.length === 0) {
      // Criar subscription PRO se não existir
      await conn.execute(
        "INSERT INTO subscriptions (empresaId, planType, status, billingCycle, createdAt, updatedAt) VALUES (1, 'PRO', 'active', 'monthly', NOW(), NOW())"
      );
      console.log("Subscription PRO criada para empresa 1");
    } else if (subs[0].planType !== 'PRO') {
      await conn.execute("UPDATE subscriptions SET planType = 'PRO', status = 'active', updatedAt = NOW() WHERE empresaId = 1");
      console.log("Empresa 1 promovida para PRO");
    } else {
      console.log("Empresa 1 já é PRO");
    }

    console.log("Migration concluída com sucesso!");
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch(e => {
  console.error("FALHA:", e.message);
  process.exit(1);
});
