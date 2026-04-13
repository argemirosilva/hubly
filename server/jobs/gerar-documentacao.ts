/**
 * Gera documentação completa do projeto em Markdown
 * Estrutura: README, Arquitetura, Fluxos, Configurações, etc.
 * Retorna JSON com os arquivos para download
 */
export async function gerarDocumentacaoObsidian(): Promise<Record<string, string>> {
  const docs: Record<string, string> = {};

  // 1. README Principal
  docs['README.md'] = `# Hubly - Sistema de Agendamento Inteligente

## Visão Geral
Hubly é um sistema de agendamento inteligente para profissionais autônomos e pequenos negócios.

### Funcionalidades Principais
- Calendário inteligente com visualização por dia, semana e mês
- Agendamentos com confirmação automática via WhatsApp
- Leitura de comprovantes (imagem e PDF) com IA
- Sistema de notificações em tempo real
- Gestão de clientes e equipe
- Relatórios financeiros
- Integração com WhatsApp

### Stack Tecnológico
- **Frontend**: React 19 + Tailwind CSS 4 + TypeScript
- **Backend**: Express 4 + tRPC 11 + Node.js
- **Database**: MySQL/TiDB + Drizzle ORM
- **Auth**: Manus OAuth
- **Notificações**: Web Push Notifications + Service Worker
- **Armazenamento**: S3

---

## Arquitetura do Projeto

### Estrutura de Diretórios
\`\`\`
agendei/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas principais
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilidades e configurações
│   │   └── contexts/      # React contexts
│   ├── public/            # Assets estáticos
│   └── index.html         # HTML principal
├── server/                 # Backend Express
│   ├── routers.ts         # Procedimentos tRPC
│   ├── db.ts              # Query helpers
│   ├── jobs/              # Jobs agendados
│   ├── scheduler.ts       # Scheduler de jobs
│   └── _core/             # Framework core
├── drizzle/               # Schema e migrações
├── shared/                # Código compartilhado
└── storage/               # Helpers de S3
\`\`\`

### Camadas da Aplicação

#### 1. Frontend (React)
- **Páginas**: Dashboard, Calendário, Agendamentos, Clientes, Financeiro, Configurações
- **Componentes**: DashboardLayout, AgendamentoDetalheModal, NotificationStack, Map
- **Hooks**: useAuth, usePushNotifications, useNotification
- **Contexts**: Notificações, Autenticação

#### 2. Backend (Express + tRPC)
- **Autenticação**: OAuth via Manus
- **Procedimentos**: Públicos e protegidos
- **Jobs**: Notificações de agendamento, limpeza de dados
- **Webhooks**: Stripe, WhatsApp

#### 3. Database (MySQL/Drizzle)
- **Tabelas**: usuarios, empresas, agendamentos, clientes, pagamentos, profissionais
- **Relacionamentos**: Foreign keys, índices
- **Migrações**: Versionadas com Drizzle Kit

---

## Fluxos Principais

### 1. Novo Agendamento
1. Usuário clica no Calendário → Menu de contexto aparece
2. Seleciona "Novo Agendamento" → Modal de criação
3. Preenche dados: cliente, profissional, data, hora, serviço
4. Clica "Salvar" → tRPC envia para backend
5. Backend cria agendamento e envia link de confirmação via WhatsApp
6. Notificação push enviada para profissional

### 2. Confirmação de Agendamento (WhatsApp)
1. Cliente recebe link de confirmação no WhatsApp
2. Clica no link → Abre app e confirma agendamento
3. Backend atualiza status para "confirmado"
4. Notificações enviadas para dono e profissional
5. Lembretes automáticos 1 hora antes

### 3. Leitura de Comprovante
1. Usuário clica em "Adicionar Comprovante" no agendamento
2. Seleciona imagem ou PDF
3. Preview do PDF aparece em modal
4. Clica "Confirmar e Processar"
5. LLM analisa comprovante e extrai: valor, data, banco, tipo
6. Dados preenchidos automaticamente no formulário

### 4. Notificações
1. **Sistema de overlay**: Cards empilháveis na parte inferior
2. **Web Push**: Notificações do SO quando app está bloqueado
3. **Tipos**: Success (verde), Error (vermelho), Warning (amarelo), Info (azul)
4. **Auto-dismiss**: 5 segundos ou clique no X

---

## Configurações e Variáveis de Ambiente

### Variáveis Obrigatórias
\`\`\`
DATABASE_URL=mysql://user:pass@host/db
JWT_SECRET=seu-secret-aqui
VITE_APP_ID=seu-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VAPID_PUBLIC_KEY=seu-vapid-public
VAPID_PRIVATE_KEY=seu-vapid-private
\`\`\`

### Variáveis Opcionais
\`\`\`
VITE_APP_TITLE=Hubly
VITE_APP_LOGO=https://cdn.../logo.png
NODE_ENV=production
PORT=3000
\`\`\`

---

## Jobs Agendados

### 1. Notificações de Agendamento (a cada 5 minutos)
- Verifica agendamentos com horário 1 hora à frente
- Envia notificação push para profissional
- Marca como "notificacaoEnviada"

### 2. Limpeza de Dados (diária)
- Remove agendamentos antigos (>90 dias)
- Limpa sessões expiradas
- Arquiva dados para relatórios

---

## Endpoints Principais

### Autenticação
- \`POST /api/oauth/callback\` - Callback do OAuth
- \`GET /api/trpc/auth.me\` - Dados do usuário autenticado
- \`POST /api/trpc/auth.logout\` - Logout

### Agendamentos
- \`GET /api/trpc/agendamentos.listar\` - Lista agendamentos
- \`POST /api/trpc/agendamentos.criar\` - Cria novo agendamento
- \`PUT /api/trpc/agendamentos.atualizar\` - Atualiza agendamento
- \`DELETE /api/trpc/agendamentos.deletar\` - Deleta agendamento

### Notificações
- \`POST /api/trpc/push.subscribe\` - Subscribe a push notifications
- \`POST /api/trpc/push.unsubscribe\` - Unsubscribe
- \`POST /api/trpc/push.sendTest\` - Envia notificação de teste

### Webhooks
- \`POST /api/stripe/webhook\` - Webhook do Stripe
- \`POST /api/whatsapp/webhook\` - Webhook do WhatsApp

---

## Padrões e Convenções

### Naming
- Componentes React: PascalCase (\`AgendamentoDetalheModal.tsx\`)
- Funções/variáveis: camelCase (\`handleComprovanteUpload\`)
- Constantes: UPPER_SNAKE_CASE (\`CACHE_NAME\`)
- Arquivos: kebab-case (\`notificacoes-agendamento.ts\`)

### Estrutura de Componentes
\`\`\`tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  title: string;
  onClose: () => void;
}

export function MeuComponente({ title, onClose }: Props) {
  const [estado, setEstado] = useState('');

  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={onClose}>Fechar</Button>
    </div>
  );
}
\`\`\`

### Procedimentos tRPC
\`\`\`ts
export const appRouter = router({
  agendamentos: {
    listar: protectedProcedure
      .input(z.object({ data: z.string() }))
      .query(async ({ ctx, input }) => {
        return await db.query.agendamentos.findMany({
          where: eq(agendamentos.data, input.data),
        });
      }),
  },
});
\`\`\`

---

## Testes

### Vitest
- Localização: \`server/*.test.ts\`
- Comando: \`pnpm test\`
- Cobertura: Procedimentos tRPC, helpers de DB

### Exemplo de Teste
\`\`\`ts
import { describe, it, expect } from 'vitest';
import { logout } from './auth.logout';

describe('auth.logout', () => {
  it('deve fazer logout do usuário', async () => {
    const result = await logout({ userId: '123' });
    expect(result).toBe(true);
  });
});
\`\`\`

---

## Deployment

### Plataforma
- Hospedagem: Manus
- Domínios: hubly.manus.space, hubly.orizontech.com.br
- SSL: Automático

### Processo de Deploy
1. Criar checkpoint via \`webdev_save_checkpoint\`
2. Clicar "Publish" no Management UI
3. Aguardar build e deploy automático

---

## Troubleshooting

### Erro 404 em Agendamentos
- Verificar se a rota está registrada em \`App.tsx\`
- Confirmar que o componente existe em \`pages/\`

### Notificações não chegam
- Verificar permissões de notificação no navegador
- Confirmar que o Service Worker está registrado
- Testar com \`trpc.push.sendTest\`

### Comprovante não processa
- Verificar se o arquivo é válido (JPEG, PNG ou PDF)
- Confirmar que a chave LLM está configurada
- Checar logs do servidor

---

## Contato e Suporte
Para dúvidas sobre a arquitetura ou funcionamento, consulte a documentação ou abra uma issue no repositório.
`;

  // 2. Arquitetura
  docs['Arquitetura.md'] = `# Arquitetura do Hubly

## Visão Geral
Hubly segue uma arquitetura moderna de aplicação web com separação clara entre frontend, backend e banco de dados.

## Componentes Principais

### Frontend (React 19)
- **Framework**: React com Hooks
- **Styling**: Tailwind CSS 4
- **Roteamento**: Wouter
- **State Management**: React Query (tRPC)
- **UI Components**: shadcn/ui

### Backend (Express + tRPC)
- **Framework**: Express.js
- **RPC**: tRPC para type-safe APIs
- **Autenticação**: OAuth (Manus)
- **Validação**: Zod
- **Jobs**: Node-cron

### Database (MySQL/TiDB)
- **ORM**: Drizzle
- **Migrações**: Drizzle Kit
- **Relacionamentos**: Foreign keys

## Fluxo de Dados
1. Frontend envia requisição tRPC
2. Backend valida com Zod
3. Executa lógica de negócio
4. Consulta/atualiza database
5. Retorna dados tipados
6. Frontend atualiza UI

## Segurança
- OAuth para autenticação
- JWT para sessões
- HTTPS em produção
- CORS configurado
- Validação de entrada
- Proteção de dados sensíveis
`;

  // 3. Fluxos
  docs['Fluxos.md'] = `# Fluxos Principais do Hubly

## 1. Autenticação
\`\`\`
Usuário clica "Login"
  ↓
Redireciona para Manus OAuth
  ↓
Usuário autoriza
  ↓
Callback em /api/oauth/callback
  ↓
Cria sessão JWT
  ↓
Redireciona para Dashboard
\`\`\`

## 2. Novo Agendamento
\`\`\`
Calendário → Menu de contexto
  ↓
"Novo Agendamento"
  ↓
Modal de criação
  ↓
Preenche dados
  ↓
Clica "Salvar"
  ↓
tRPC envia para backend
  ↓
Backend cria agendamento
  ↓
Envia link via WhatsApp
  ↓
Notificação push para profissional
\`\`\`

## 3. Confirmação via WhatsApp
\`\`\`
Cliente recebe mensagem
  ↓
Clica no link de confirmação
  ↓
Abre app e confirma
  ↓
Backend atualiza status
  ↓
Notificações para dono e profissional
  ↓
Job agenda lembretes
\`\`\`

## 4. Leitura de Comprovante
\`\`\`
Clica "Adicionar Comprovante"
  ↓
Seleciona imagem ou PDF
  ↓
Preview em modal
  ↓
Clica "Confirmar"
  ↓
LLM analisa arquivo
  ↓
Extrai: valor, data, banco, tipo
  ↓
Preenche formulário automaticamente
\`\`\`

## 5. Notificações
\`\`\`
Evento disparado (novo agendamento, confirmação, etc)
  ↓
Sistema de overlay exibe card
  ↓
Web Push envia notificação do SO
  ↓
Auto-dismiss em 5 segundos
  ↓
Usuário pode clicar para ação
\`\`\`
`;

  // 4. Configurações
  docs['Configuracoes.md'] = `# Configurações do Hubly

## Variáveis de Ambiente

### Database
\`\`\`
DATABASE_URL=mysql://user:password@localhost:3306/agendei
\`\`\`

### Autenticação
\`\`\`
JWT_SECRET=seu-secret-super-seguro-aqui
VITE_APP_ID=seu-app-id-manus
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
\`\`\`

### Stripe
\`\`\`
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
\`\`\`

### Notificações
\`\`\`
VAPID_PUBLIC_KEY=seu-vapid-public
VAPID_PRIVATE_KEY=seu-vapid-private
\`\`\`

### App
\`\`\`
VITE_APP_TITLE=Hubly
VITE_APP_LOGO=https://cdn.../logo.png
NODE_ENV=production
PORT=3000
\`\`\`

## Configurações de Negócio

### Horários de Notificação
- Notificação 1 hora antes do agendamento
- Lembretes automáticos
- Configurável por usuário

### Limites
- Máximo de agendamentos por dia: sem limite
- Máximo de clientes: sem limite
- Máximo de profissionais: sem limite

### Integrações
- WhatsApp: Confirmação automática
- Stripe: Pagamentos online
- Google Maps: Localização de clientes
- LLM: Análise de comprovantes
`;

  // 5. Desenvolvimento
  docs['Desenvolvimento.md'] = `# Guia de Desenvolvimento

## Setup Local

### Pré-requisitos
- Node.js 22+
- pnpm
- MySQL/TiDB
- Git

### Instalação
\`\`\`bash
git clone <repo>
cd agendei
pnpm install
\`\`\`

### Variáveis de Ambiente
\`\`\`bash
cp .env.example .env.local
# Edite .env.local com suas credenciais
\`\`\`

### Executar Localmente
\`\`\`bash
pnpm dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
\`\`\`

## Workflow de Desenvolvimento

### 1. Criar Feature
\`\`\`bash
git checkout -b feature/nova-feature
\`\`\`

### 2. Atualizar Schema (se necessário)
\`\`\`bash
# Edite drizzle/schema.ts
pnpm drizzle-kit generate
# Revise a migração gerada
pnpm drizzle-kit migrate
\`\`\`

### 3. Implementar Backend
- Adicione query helper em \`server/db.ts\`
- Crie procedimento em \`server/routers.ts\`
- Escreva testes em \`server/*.test.ts\`

### 4. Implementar Frontend
- Crie componente em \`client/src/components/\`
- Use \`trpc.*.useQuery/useMutation\`
- Implemente loading/error states

### 5. Testar
\`\`\`bash
pnpm test
pnpm lint
\`\`\`

### 6. Commit e Push
\`\`\`bash
git add .
git commit -m "feat: descrição da feature"
git push origin feature/nova-feature
\`\`\`

## Comandos Úteis

\`\`\`bash
pnpm dev              # Inicia dev server
pnpm build            # Build para produção
pnpm test             # Executa testes
pnpm lint             # Verifica linting
pnpm type-check       # Verifica tipos TypeScript
pnpm drizzle-kit generate  # Gera migrações
pnpm drizzle-kit migrate   # Executa migrações
\`\`\`

## Debugging

### Frontend
- Abra DevTools (F12)
- Verifique console para erros
- Use React DevTools extension

### Backend
- Verifique logs do servidor
- Use \`console.log\` ou debugger
- Inspecione requisições tRPC

### Database
- Use cliente MySQL (Sequel Pro, DBeaver)
- Verifique queries executadas
- Analise índices e performance
`;

  return docs;
}
