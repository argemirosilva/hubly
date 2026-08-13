# Plano de Acesso Master para Suporte

## Diagnóstico atual

O Hubly possui uma sessão administrativa global do painel Orizon, mas **não possui impersonation por empresa**. O painel global não seleciona uma empresa-alvo, não cria um contexto temporário de suporte e não mantém trilha de auditoria das ações realizadas dentro da conta de uma cliente.

> O acesso de suporte não deve exigir a senha da cliente, mas também não deve transformar um administrador global em um usuário comum da empresa sem controles adicionais.

## Proposta de implementação

### 1. Identificação da empresa-alvo

Criar uma tela administrativa com busca por empresa, cliente proprietária, e-mail ou domínio. A administradora de suporte seleciona a empresa e informa um motivo obrigatório para o atendimento.

### 2. Sessão temporária de suporte

Criar a tabela `suporte_sessoes_acesso` com:

| Campo | Finalidade |
|---|---|
| `id` | Identificador da sessão de suporte |
| `admin_user_id` | Administradora global que iniciou o acesso |
| `empresa_id` | Empresa acessada temporariamente |
| `motivo` | Justificativa registrada antes do acesso |
| `iniciada_em` / `expira_em` / `encerrada_em` | Janela limitada de acesso, sugerida em 30 minutos |
| `ip` / `user_agent` | Rastreabilidade operacional |
| `consentimento` | Registro de consentimento quando a política comercial exigir |

O token da sessão deve carregar somente o ID da sessão e expirar automaticamente. O backend resolve a empresa-alvo a partir desse ID, nunca de um parâmetro enviado livremente pelo navegador.

### 3. Auditoria de ações

Criar `suporte_auditoria` para registrar leitura e alterações relevantes: agendamentos, pagamentos, clientes, automações, configurações e exportações. Cada registro deve conter a ação, o recurso afetado, valores anteriores e posteriores quando aplicável, data/hora e sessão de suporte.

### 4. Experiência segura

Enquanto estiver em suporte, a interface deve exibir uma faixa fixa: **“Modo suporte — Empresa X — expira às HH:MM”**, com botão claro de encerrar. Operações financeiras, exclusões, exportação de dados e mudanças de plano devem exigir uma segunda confirmação e aparecer destacadas na auditoria.

### 5. Princípios de segurança

As credenciais do painel global devem ser migradas para variáveis de ambiente/segredo gerenciado antes da ativação desse recurso. O acesso master deve ser restrito a contas explicitamente autorizadas, possuir expiração curta, não permitir que a senha da cliente seja vista ou alterada e manter auditoria imutável.

## Sequência recomendada

1. Migrar credenciais administrativas para segredo gerenciado.
2. Criar as duas tabelas de sessão e auditoria.
3. Implementar procedures exclusivas de administrador global.
4. Exibir o seletor de empresas e a faixa de modo suporte.
5. Cobrir expiração, isolamento por empresa, auditoria e encerramento com testes.
