import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sanitizeSyncRecord } from "./sync-catalog";

type SqlRow = Record<string, unknown>;

const TABLES_SEM_DADOS_SENSIVEIS = new Set([
  "users",
  "system_users",
  "convites_usuario",
  "push_subscriptions",
  "tokens_confirmacao",
  "google_calendar_tokens",
  "google_calendar_tokens_usuario",
  "wa_session",
  "wa_connection_log",
  "subscriptions",
  "assinaturas",
]);

const FILTROS_FILHOS: Record<string, string> = {
  agendamento_itens: "`agendamentoId` IN (SELECT `id` FROM `agendamentos` WHERE `empresaId` = {empresaId})",
  agendamento_pagamentos: "`agendamentoId` IN (SELECT `id` FROM `agendamentos` WHERE `empresaId` = {empresaId})",
  agendamento_pessoas: "`agendamentoId` IN (SELECT `id` FROM `agendamentos` WHERE `empresaId` = {empresaId})",
  pacotes_modelos_itens: "`modeloId` IN (SELECT `id` FROM `pacotes_modelos` WHERE `empresaId` = {empresaId})",
  pacotes_clientes_itens: "`pacoteClienteId` IN (SELECT `id` FROM `pacotes_clientes` WHERE `empresaId` = {empresaId})",
  profissionalservicos: "`profissionalId` IN (SELECT `id` FROM `profissionais` WHERE `empresaId` = {empresaId})",
  profissional_tipos: "`profissionalId` IN (SELECT `id` FROM `profissionais` WHERE `empresaId` = {empresaId})",
  permissoes: "`profissionalId` IN (SELECT `id` FROM `profissionais` WHERE `empresaId` = {empresaId})",
  permissoes_individuais: "`profissionalId` IN (SELECT `id` FROM `profissionais` WHERE `empresaId` = {empresaId})",
  membros_grupo: "`profissionalId` IN (SELECT `id` FROM `profissionais` WHERE `empresaId` = {empresaId})",
  permissoes_grupo: "`grupoId` IN (SELECT `id` FROM `grupos_permissoes` WHERE `empresaId` = {empresaId})",
  pipeline_colunas: "`pipelineId` IN (SELECT `id` FROM `pipelines` WHERE `empresaId` = {empresaId})",
  pipeline_cartoes: "`colunaId` IN (SELECT `pc`.`id` FROM `pipeline_colunas` pc INNER JOIN `pipelines` p ON p.`id` = pc.`pipelineId` WHERE p.`empresaId` = {empresaId})",
  chamado_mensagens: "`chamadoId` IN (SELECT `id` FROM `chamados` WHERE `empresaId` = {empresaId})",
  taxas_parcela: "`meioPagamentoId` IN (SELECT `id` FROM `meios_pagamento` WHERE `empresaId` = {empresaId})",
  marketing_metricas: "`postId` IN (SELECT `id` FROM `marketing_posts` WHERE `empresaId` = {empresaId})",
};

function extrairLinhas(resultado: unknown): SqlRow[] {
  if (resultado && typeof resultado === "object" && "rows" in resultado) return (resultado as { rows: SqlRow[] }).rows;
  if (Array.isArray(resultado) && Array.isArray(resultado[0])) return resultado[0] as SqlRow[];
  return Array.isArray(resultado) ? resultado as SqlRow[] : [];
}

function escaparNome(nome: string): string {
  return '"' + nome.replaceAll('"', '""') + '"';
}

export function valorSql(valor: unknown): string {
  if (valor === null || valor === undefined) return "NULL";
  if (typeof valor === "number") return Number.isFinite(valor) ? String(valor) : "NULL";
  if (typeof valor === "boolean") return valor ? "TRUE" : "FALSE";
  if (valor instanceof Date) return `'${valor.toISOString()}'`;
  if (Buffer.isBuffer(valor)) return `decode('${valor.toString("hex")}', 'hex')`;
  const texto = typeof valor === "object" ? JSON.stringify(valor) : String(valor);
  if (texto.includes('\0')) throw new Error("Texto contém caractere NUL inválido no PostgreSQL");
  return `'${texto.replaceAll("'", "''")}'`;
}

function insertsDaTabela(tabela: string, linhas: SqlRow[]): string[] {
  if (!linhas.length) return [];
  const colunas = Object.keys(linhas[0]!);
  const cabecalho = `INSERT INTO ${escaparNome(tabela)} (${colunas.map(escaparNome).join(", ")}) VALUES`;
  const tamanhoLote = 200;
  const comandos: string[] = [];
  for (let indice = 0; indice < linhas.length; indice += tamanhoLote) {
    const lote = linhas.slice(indice, indice + tamanhoLote);
    const valores = lote.map(linha => `(${colunas.map(coluna => valorSql(linha[coluna])).join(", ")})`).join(",\n");
    comandos.push(`${cabecalho}\n${valores};`);
  }
  return comandos;
}

/**
 * Exporta a estrutura completa do Hubly e apenas os dados que pertencem à empresa.
 * Credenciais de serviços, tokens, sessões, usuários globais e dados de cobrança
 * não são exportados para que o arquivo possa ser transferido com segurança.
 */
export async function gerarExportacaoSqlEmpresa(empresaId: number): Promise<{ conteudo: string; tabelasComDados: number; registros: number }> {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");

  const idSeguro = Math.trunc(empresaId);
  if (idSeguro <= 0) throw new Error("Empresa inválida");

  const resultadoTabelas = await db.execute(sql`
    SELECT table_name AS "tableName"
    FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const todasTabelas = extrairLinhas(resultadoTabelas).map(linha => String(linha.tableName));

  const resultadoDiretas = await db.execute(sql`
    SELECT DISTINCT table_name AS "tableName"
    FROM information_schema.columns
    WHERE table_schema = current_schema() AND column_name = 'empresaId'
  `);
  const tabelasDiretas = new Set(extrairLinhas(resultadoDiretas).map(linha => String(linha.tableName)));

  const linhas: string[] = [
    "-- Hubly — exportação de estrutura e dados da empresa",
    `-- Empresa ID: ${idSeguro}`,
    `-- Gerado em: ${new Date().toISOString()}`,
    "-- Compatibilidade: PostgreSQL 17+",
    "-- Dados sensíveis de integração, sessões, tokens, usuários globais e cobrança Stripe não são incluídos.",
    "SET standard_conforming_strings = on;",
    "BEGIN;",
    "",
    "-- ESTRUTURA COMPLETA DO HUBLY",
  ];

  const config = JSON.parse(readFileSync("database-postgres.local.json", "utf8"));
  const { stdout } = await promisify(execFile)("C:/Program Files/PostgreSQL/17/bin/pg_dump.exe", [
    "--no-password", "--host", config.host, "--port", String(config.port), "--username", config.user,
    "--dbname", config.database, "--schema-only", "--no-owner", "--no-privileges", "--schema", "public",
  ], { maxBuffer: 10 * 1024 * 1024, windowsHide: true });
  linhas.push(stdout.replace("CREATE SCHEMA public;", "CREATE SCHEMA IF NOT EXISTS public;"), "SET search_path = public;", "CREATE EXTENSION IF NOT EXISTS unaccent;");

  linhas.push("-- DADOS DA EMPRESA", "");
  const consultas: Array<{ tabela: string; filtro: string }> = [
    { tabela: "empresas", filtro: `\`id\` = ${idSeguro}` },
    ...[...tabelasDiretas]
      .filter(tabela => !TABLES_SEM_DADOS_SENSIVEIS.has(tabela))
      .map(tabela => ({ tabela, filtro: `\`empresaId\` = ${idSeguro}` })),
    ...Object.entries(FILTROS_FILHOS)
      .filter(([tabela]) => todasTabelas.includes(tabela) && !TABLES_SEM_DADOS_SENSIVEIS.has(tabela))
      .map(([tabela, filtro]) => ({ tabela, filtro: filtro.replaceAll("{empresaId}", String(idSeguro)) })),
  ];

  const tabelasProcessadas = new Set<string>();
  let registros = 0;
  for (const { tabela, filtro } of consultas) {
    if (tabelasProcessadas.has(tabela) || !todasTabelas.includes(tabela)) continue;
    tabelasProcessadas.add(tabela);
    const resultado = await db.execute(sql.raw(`SELECT * FROM ${escaparNome(tabela)} WHERE ${filtro.replaceAll('`', '"')}`));
    const dados = extrairLinhas(resultado).map(sanitizeSyncRecord);
    registros += dados.length;
    linhas.push(...insertsDaTabela(tabela, dados));
    if (dados.length) linhas.push("");
  }

  const identities = await db.execute(sql`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND is_identity='YES'`);
  for (const identity of identities.rows) {
    const tabela = String(identity.table_name), coluna = String(identity.column_name);
    linhas.push(`SELECT setval(pg_get_serial_sequence(${valorSql('public.' + escaparNome(tabela))}, ${valorSql(coluna)}), GREATEST(COALESCE(MAX(${escaparNome(coluna)}),0)+1,1), false) FROM ${escaparNome(tabela)};`);
  }
  linhas.push("COMMIT;", "-- FIM DA EXPORTAÇÃO");
  return { conteudo: linhas.join("\n"), tabelasComDados: tabelasProcessadas.size, registros };
}
