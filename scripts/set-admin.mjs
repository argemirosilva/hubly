import "dotenv/config";
import mysql from "mysql2/promise";

const url = new URL(process.env.DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port) || 4000,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

console.log("🔧 Configurando Maria Isabella como administradora da Maguie...\n");

// 1. Verificar grupos existentes para a empresa 1
const [grupos] = await conn.execute(
  "SELECT id, nome FROM grupos_permissoes WHERE empresaId = 1"
);
console.log("Grupos existentes:", grupos);

let grupoAdminId = null;

// Procurar grupo admin existente
for (const g of grupos) {
  if (g.nome?.toLowerCase().includes("admin") || g.nome?.toLowerCase().includes("gerente") || g.nome?.toLowerCase().includes("proprietar")) {
    grupoAdminId = g.id;
    console.log("✅ Grupo admin encontrado:", g.nome, "ID:", g.id);
    break;
  }
}

// Se não existir, criar grupo Administrador
if (!grupoAdminId) {
  console.log("Criando grupo Administrador...");
  const [insertGrupo] = await conn.execute(
    "INSERT INTO grupos_permissoes (empresaId, nome, descricao, isDefault, createdAt, updatedAt) VALUES (1, 'Administrador', 'Acesso total ao sistema', 0, NOW(), NOW())"
  );
  grupoAdminId = insertGrupo.insertId;
  console.log("✅ Grupo Administrador criado com ID:", grupoAdminId);
}

// 2. Verificar se já existe permissão para este grupo
const [permExistente] = await conn.execute(
  "SELECT id FROM permissoes_grupo WHERE grupoId = ?", [grupoAdminId]
);

if (permExistente.length > 0) {
  // Atualizar todas as permissões para true
  await conn.execute(`
    UPDATE permissoes_grupo SET
      agendamentosVer=1, agendamentosCriar=1, agendamentosEditar=1,
      agendamentosCancelar=1, agendamentosRemarcar=1, agendamentosConfirmar=1,
      agendamentosConcluir=1, agendamentosVerTodos=1,
      clientesVer=1, clientesCriar=1, clientesEditar=1, clientesExcluir=1,
      clientesVerHistorico=1, clientesVerProntuario=1, clientesEditarProntuario=1, clientesVerContato=1,
      profissionaisVer=1, profissionaisCriar=1, profissionaisEditar=1, profissionaisExcluir=1,
      profissionaisGerenciarPermissoes=1,
      servicosVer=1, servicosCriar=1, servicosEditar=1, servicosExcluir=1,
      financeiroVer=1, financeiroVerComissoes=1, financeiroEditarComissoes=1,
      financeiroVerReceita=1, financeiroVerCustos=1, financeiroMarcarPago=1, financeiroVerRelatorios=1,
      agendaSolicitarBloqueio=1, agendaAprovarBloqueio=1, agendaVerBloqueiosTodos=1,
      automacoesVer=1, automacoesCriar=1, automacoesEditar=1, automacoesExcluir=1, automacoesAtivar=1,
      notificacoesVer=1,
      relatoriosVer=1, relatoriosExportar=1,
      configuracoesVer=1, configuracoesEditar=1,
      usuariosVer=1, usuariosConvidar=1, usuariosEditar=1, usuariosRemover=1,
      gruposVer=1, gruposCriar=1, gruposEditar=1, gruposExcluir=1,
      dashboardVer=1, dashboardVerMetricas=1,
      updatedAt=NOW()
    WHERE grupoId = ?
  `, [grupoAdminId]);
  console.log("✅ Permissões do grupo atualizadas para acesso total.");
} else {
  // Inserir todas as permissões como true
  await conn.execute(`
    INSERT INTO permissoes_grupo (
      grupoId,
      agendamentosVer, agendamentosCriar, agendamentosEditar,
      agendamentosCancelar, agendamentosRemarcar, agendamentosConfirmar,
      agendamentosConcluir, agendamentosVerTodos,
      clientesVer, clientesCriar, clientesEditar, clientesExcluir,
      clientesVerHistorico, clientesVerProntuario, clientesEditarProntuario, clientesVerContato,
      profissionaisVer, profissionaisCriar, profissionaisEditar, profissionaisExcluir,
      profissionaisGerenciarPermissoes,
      servicosVer, servicosCriar, servicosEditar, servicosExcluir,
      financeiroVer, financeiroVerComissoes, financeiroEditarComissoes,
      financeiroVerReceita, financeiroVerCustos, financeiroMarcarPago, financeiroVerRelatorios,
      agendaSolicitarBloqueio, agendaAprovarBloqueio, agendaVerBloqueiosTodos,
      automacoesVer, automacoesCriar, automacoesEditar, automacoesExcluir, automacoesAtivar,
      notificacoesVer,
      relatoriosVer, relatoriosExportar,
      configuracoesVer, configuracoesEditar,
      usuariosVer, usuariosConvidar, usuariosEditar, usuariosRemover,
      gruposVer, gruposCriar, gruposEditar, gruposExcluir,
      dashboardVer, dashboardVerMetricas,
      createdAt, updatedAt
    ) VALUES (
      ?,
      1,1,1,1,1,1,1,1,
      1,1,1,1,1,1,1,1,
      1,1,1,1,1,
      1,1,1,1,
      1,1,1,1,1,1,1,
      1,1,1,
      1,1,1,1,1,
      1,
      1,1,
      1,1,
      1,1,1,1,
      1,1,1,1,
      1,1,
      NOW(),NOW()
    )
  `, [grupoAdminId]);
  console.log("✅ Permissões de acesso total criadas para o grupo.");
}

// 3. Associar Maria Isabella ao grupo admin da empresa Maguie
const [updateResult] = await conn.execute(
  "UPDATE system_users SET empresaId = 1, grupoId = ?, ativo = 1 WHERE email = ?",
  [grupoAdminId, "mariaalvesacomercial@gmail.com"]
);
console.log("✅ Maria Isabella associada ao grupo admin. Linhas afetadas:", updateResult.affectedRows);

// 4. Verificar resultado final
const [maria] = await conn.execute(`
  SELECT su.id, su.nome, su.email, su.empresaId, su.grupoId, su.ativo,
         e.nome as empresa_nome, gp.nome as grupo_nome
  FROM system_users su
  LEFT JOIN empresas e ON e.id = su.empresaId
  LEFT JOIN grupos_permissoes gp ON gp.id = su.grupoId
  WHERE su.email = ?
`, ["mariaalvesacomercial@gmail.com"]);

console.log("\n🎉 Configuração concluída:");
console.log(JSON.stringify(maria[0], null, 2));

await conn.end();
