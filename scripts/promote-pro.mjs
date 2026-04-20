/**
 * Script para promover uma empresa para o plano PRO diretamente no banco.
 * Uso: node scripts/promote-pro.mjs [empresaId]
 * Se empresaId não for passado, lista todas as empresas.
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida. Execute: DATABASE_URL=... node scripts/promote-pro.mjs");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

const empresaId = process.argv[2] ? parseInt(process.argv[2]) : null;

if (!empresaId) {
  // Listar empresas e planos
  const [rows] = await conn.execute(
    `SELECT e.id, e.nome, COALESCE(s.planType, 'FREE') as planType, COALESCE(s.status, 'none') as status
     FROM empresas e
     LEFT JOIN subscriptions s ON s.empresaId = e.id
     ORDER BY e.id
     LIMIT 20`
  );
  console.log("\n=== Empresas e Planos ===");
  console.table(rows);
  console.log("\nPara promover para PRO: node scripts/promote-pro.mjs <empresaId>");
} else {
  // Verificar se já tem subscription
  const [existing] = await conn.execute(
    `SELECT id, planType, status FROM subscriptions WHERE empresaId = ? LIMIT 1`,
    [empresaId]
  );

  if (existing.length > 0) {
    // Atualizar para PRO
    await conn.execute(
      `UPDATE subscriptions SET planType = 'PRO', status = 'active' WHERE empresaId = ?`,
      [empresaId]
    );
    console.log(`✅ Empresa ${empresaId} promovida para PRO (subscription atualizada)`);
  } else {
    // Criar subscription PRO
    await conn.execute(
      `INSERT INTO subscriptions (empresaId, planType, status, createdAt, updatedAt)
       VALUES (?, 'PRO', 'active', NOW(), NOW())`,
      [empresaId]
    );
    console.log(`✅ Empresa ${empresaId} promovida para PRO (nova subscription criada)`);
  }
}

await conn.end();
