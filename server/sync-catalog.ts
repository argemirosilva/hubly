export type SyncEntity = {
  name: string;
  table: string;
  description: string;
};

const catalog: SyncEntity[] = [
  ["users", "users", "Usuários administrativos saneados"],
  ["companies", "empresas", "Empresas"],
  ["professionals", "profissionais", "Profissionais saneados"],
  ["permissions", "permissoes", "Permissões de profissional"],
  ["clients", "clientes", "Clientes"],
  ["services", "servicos", "Serviços"],
  ["professional_services", "profissionalServicos", "Vínculos profissional-serviço"],
  ["appointments", "agendamentos", "Agendamentos"],
  ["appointment_items", "agendamento_itens", "Itens de agendamento"],
  ["appointment_payments", "agendamento_pagamentos", "Pagamentos de agendamento"],
  ["agenda_blocks", "bloqueios_agenda", "Bloqueios de agenda"],
  ["commissions", "comissoes", "Comissões"],
  ["notifications", "notificacoes", "Notificações"],
  ["automations", "automacoes", "Automações"],
  ["automation_history", "historico_envios_automacao", "Histórico de automações"],
  ["records", "prontuarios", "Prontuários"],
  ["status_colors", "cores_status", "Cores de status"],
  ["permission_groups", "grupos_permissoes", "Grupos de permissões"],
  ["group_permissions", "permissoes_grupo", "Permissões de grupo"],
  ["group_members", "membros_grupo", "Membros de grupo"],
  ["user_invites", "convites_usuario", "Convites saneados"],
  ["system_users", "system_users", "Usuários internos saneados"],
  ["pipelines", "pipelines", "Pipelines"],
  ["pipeline_columns", "pipeline_colunas", "Colunas de Pipeline"],
  ["pipeline_cards", "pipeline_cartoes", "Cartões de Pipeline"],
  ["pipeline_snapshots", "pipeline_snapshots", "Snapshots de Pipeline"],
  ["financial_scores", "score_financeiro", "Scores financeiros"],
  ["financial_alerts", "alertas_financeiros", "Alertas financeiros"],
  ["client_analysis", "analise_clientes", "Análises de clientes"],
  ["client_insights", "insights_clientes", "Insights de clientes"],
  ["package_models", "pacotes_modelos", "Modelos de pacote"],
  ["package_model_items", "pacotes_modelos_itens", "Itens de modelo de pacote"],
  ["client_packages", "pacotes_clientes", "Pacotes de clientes"],
  ["client_package_items", "pacotes_clientes_itens", "Itens de pacote"],
  ["client_package_payments", "pacotes_clientes_pagamentos", "Pagamentos de pacote"],
  ["package_notifications", "notificacoes_pacotes", "Notificações de pacote"],
  ["subscriptions", "subscriptions", "Assinaturas saneadas"],
  ["usage_tracker", "usage_tracker", "Uso de planos"],
  ["usage_alerts", "usage_alerts", "Alertas de uso"],
  ["professional_types", "tipos_profissional", "Tipos de profissional"],
  ["professional_type_links", "profissional_tipos", "Vínculos de tipo profissional"],
  ["expense_categories", "categorias_despesa", "Categorias de despesa"],
  ["accounts_payable", "contas_pagar", "Contas a pagar"],
  ["accounts_receivable", "contas_receber", "Contas a receber"],
  ["individual_permissions", "permissoes_individuais", "Permissões individuais"],
  ["payment_methods", "meios_pagamento", "Meios de pagamento"],
  ["installment_fees", "taxas_parcela", "Taxas de parcelamento"],
  ["dashboard_config", "dashboard_config", "Configurações de dashboard"],
  ["plans", "planos", "Planos"],
  ["subscriptions_details", "assinaturas", "Detalhes de assinaturas saneados"],
  ["knowledge_base", "base_conhecimento", "Base de conhecimento"],
  ["support_tickets", "chamados", "Chamados"],
  ["support_messages", "chamado_mensagens", "Mensagens de chamados"],
  ["client_credits", "creditos_cliente", "Créditos de cliente"],
  ["appointment_people", "agendamento_pessoas", "Pessoas do agendamento"],
  ["automation_exclusions", "automacoes_excluidas", "Exclusões de automação"],
  ["fee_config", "taxas_config", "Configurações de taxa"],
  ["marketing_posts", "marketing_posts", "Posts de Marketing"],
  ["calendar_events", "google_calendar_eventos", "Eventos sincronizados de calendário"],
  ["marketing_content_types", "marketing_tipos_conteudo", "Tipos de conteúdo"],
  ["marketing_metrics", "marketing_metricas", "Métricas de Marketing"],
  ["marketing_hidden_types", "marketing_tipos_ocultos", "Tipos ocultos de Marketing"],
].map(([name, table, description]) => ({ name, table, description }));

export const SYNC_ENTITIES = Object.freeze(catalog);
const byName = new Map(SYNC_ENTITIES.map(entity => [entity.name, entity]));

export function getSyncEntity(name: string): SyncEntity | undefined {
  return byName.get(name);
}

const sensitiveKey = /(password|senha|secret|segredo|token|apikey|api_key|session|sessao|cookie|authorization|credential|credencial|push|webhook|qrcode|qr_code|instanceid|instance_id|chave)/i;

/** Remove credenciais e material de autenticação de uma linha antes da exportação. */
export function sanitizeSyncRecord(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (sensitiveKey.test(key)) continue;
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = sanitizeSyncRecord(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
