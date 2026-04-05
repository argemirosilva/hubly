/**
 * Migração de unificação: system_users → profissionais
 *
 * 1. Adiciona campos de acesso na tabela profissionais
 * 2. Para cada system_user COM profissionalId vinculado:
 *    - Copia passwordHash, grupoId, avatarUrl, temAcesso=true para o profissional existente
 * 3. Para cada system_user SEM profissionalId:
 *    - Cria um novo registro em profissionais com isProfissional=false, temAcesso=true
 * 4. Atualiza a tabela system_users para apontar para o novo profissionalId (compatibilidade)
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não encontrada");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

try {
  console.log("=== Iniciando migração de unificação ===\n");

  // 1. Aplicar ALTER TABLE (adicionar campos)
  console.log("1. Adicionando campos de acesso na tabela profissionais...");
  const alterStatements = [
    "ALTER TABLE `profissionais` ADD COLUMN IF NOT EXISTS `isProfissional` boolean DEFAULT true NOT NULL",
    "ALTER TABLE `profissionais` ADD COLUMN IF NOT EXISTS `temAcesso` boolean DEFAULT false NOT NULL",
    "ALTER TABLE `profissionais` ADD COLUMN IF NOT EXISTS `passwordHash` varchar(255)",
    "ALTER TABLE `profissionais` ADD COLUMN IF NOT EXISTS `grupoId` int",
    "ALTER TABLE `profissionais` ADD COLUMN IF NOT EXISTS `ultimoAcesso` timestamp NULL",
    "ALTER TABLE `profissionais` ADD COLUMN IF NOT EXISTS `criadoPorId` int",
  ];

  for (const sql of alterStatements) {
    try {
      await conn.execute(sql);
      console.log(`  ✓ ${sql.substring(0, 60)}...`);
    } catch (e) {
      // Ignora erro se coluna já existe
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log(`  ~ Coluna já existe, pulando...`);
      } else {
        throw e;
      }
    }
  }

  // 2. Buscar todos os system_users
  console.log("\n2. Buscando usuários do sistema...");
  const [systemUsers] = await conn.execute("SELECT * FROM system_users");
  console.log(`  Encontrados: ${systemUsers.length} usuários`);

  let fundidos = 0;
  let criados = 0;

  for (const su of systemUsers) {
    if (su.profissionalId) {
      // Fundir com profissional existente
      await conn.execute(
        `UPDATE profissionais SET
          temAcesso = true,
          passwordHash = ?,
          grupoId = ?,
          avatarUrl = COALESCE(avatarUrl, ?),
          ultimoAcesso = ?,
          criadoPorId = ?
        WHERE id = ?`,
        [su.passwordHash, su.grupoId, su.avatarUrl, su.ultimoAcesso, su.criadoPorId, su.profissionalId]
      );
      console.log(`  ✓ Fundido: ${su.nome} (system_user ${su.id} → profissional ${su.profissionalId})`);
      fundidos++;
    } else {
      // Criar novo profissional com isProfissional=false
      const [result] = await conn.execute(
        `INSERT INTO profissionais
          (empresaId, nome, email, telefone, corCalendario, ativo, isProfissional, temAcesso, passwordHash, grupoId, avatarUrl, ultimoAcesso, criadoPorId)
        VALUES (?, ?, ?, ?, '#6b7280', true, false, true, ?, ?, ?, ?, ?)`,
        [su.empresaId, su.nome, su.email, su.telefone ?? null, su.passwordHash, su.grupoId, su.avatarUrl, su.ultimoAcesso, su.criadoPorId]
      );
      const newProfId = result.insertId;

      // Atualizar system_user com o novo profissionalId para compatibilidade
      await conn.execute(
        "UPDATE system_users SET profissionalId = ? WHERE id = ?",
        [newProfId, su.id]
      );
      console.log(`  ✓ Criado: ${su.nome} (system_user ${su.id} → novo profissional ${newProfId}, isProfissional=false)`);
      criados++;
    }
  }

  console.log(`\n=== Migração concluída ===`);
  console.log(`  Registros fundidos: ${fundidos}`);
  console.log(`  Novos registros criados: ${criados}`);
  console.log(`  Total migrado: ${fundidos + criados}`);

} catch (err) {
  console.error("Erro na migração:", err);
  process.exit(1);
} finally {
  await conn.end();
}
