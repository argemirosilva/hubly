# Plano de Implementação: Taxas Adicionais Customizáveis

## 1. Visão Geral
O objetivo é permitir que profissionais adicionem "taxas" aos agendamentos (ex: taxa de deslocamento), funcionando de forma análoga ao "desconto" atual.
A taxa será agregada ao valor do agendamento, aumentando o valor em aberto (diferente do desconto que reduz).
A taxa da maquininha de cartão já existe e é tratada separadamente, não será afetada por esta implementação.

## 2. Alterações no Banco de Dados (Drizzle Schema)

### 2.1. Nova Tabela: `taxas_config`
Tabela para armazenar as taxas pré-configuradas pela empresa/profissional.

```typescript
export const taxasConfig = mysqlTable("taxas_config", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  nome: varchar("nome", { length: 100 }).notNull(), // Ex: "Taxa de Deslocamento"
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  tipo: mysqlEnum("tipo", ["fixo", "percentual"]).default("fixo").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TaxaConfig = typeof taxasConfig.$inferSelect;
export type InsertTaxaConfig = typeof taxasConfig.$inferInsert;
```

### 2.2. Nova Tabela: `agendamento_taxas`
Como um agendamento pode ter múltiplas taxas (diferente do desconto que é um campo único), precisamos de uma tabela relacional.

```typescript
export const agendamentoTaxas = mysqlTable("agendamento_taxas", {
  id: int("id").autoincrement().primaryKey(),
  agendamentoId: int("agendamentoId").notNull(),
  taxaConfigId: int("taxaConfigId"), // Opcional, caso a taxa seja inserida manualmente sem config prévia
  nome: varchar("nome", { length: 100 }).notNull(), // Copiado da config ou digitado manualmente
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(), // Valor calculado no momento da aplicação
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AgendamentoTaxa = typeof agendamentoTaxas.$inferSelect;
export type InsertAgendamentoTaxa = typeof agendamentoTaxas.$inferInsert;
```

*Alternativa mais simples (escolhida para esta primeira versão):* Adicionar um campo `taxaAdicional` diretamente na tabela `agendamentos`, assim como o `desconto`. Isso simplifica muito o cálculo e a UI inicial, mantendo a paridade exata com o desconto.

### 2.3. Alteração na Tabela: `agendamentos` (Decisão Final)
Vamos adicionar um campo de taxa total no agendamento, mantendo a simplicidade atual do sistema.

```typescript
// Em agendamentos
taxaAdicional: decimal("taxaAdicional", { precision: 10, scale: 2 }).default("0"),
```

E vamos criar a tabela `taxas_config` para o usuário pré-configurar as taxas, mas no agendamento salvaremos apenas o valor consolidado em `taxaAdicional` (podendo a UI permitir somar múltiplas taxas no frontend antes de salvar).

## 3. Alterações no Backend (tRPC & db.ts)

### 3.1. Atualizar Consultas (`db.ts`)
- Em `getAgendamentosByEmpresa` e similares:
  - Incluir `taxaAdicional` na query.
  - Atualizar o cálculo de `emAberto`: `Math.max(0, valorTotal + taxaAdicional - desconto - totalPago)`.

### 3.2. Novo Endpoint no Router
- Criar CRUD para `taxasConfig` no `routers.ts`.
- Criar mutation `updateTaxaAdicional` (similar a `updateDesconto`).

### 3.3. Atualizar Cálculo de Comissões
- No arquivo `routers.ts` (linha ~1539), onde calcula o desconto:
  ```typescript
  const descontoAg = parseFloat(String(agendamento.desconto ?? 0));
  const taxaAdAg = parseFloat(String(agendamento.taxaAdicional ?? 0));
  // Decidir se a taxa adicional compõe a base de comissão. Geralmente NÃO (ex: taxa de deslocamento é custo, não comissionável).
  // Se não compõe, o valor base da comissão continua sendo apenas o valor dos serviços.
  ```

## 4. Alterações no Frontend (React)

### 4.1. Nova Tela de Configuração
- Criar página `Taxas.tsx` (similar a `MeiosPagamento.tsx`) em Configurações para gerenciar as taxas pré-definidas.

### 4.2. Modal de Agendamento (`AgendamentoDetalheModal.tsx`)
- Na seção de totais, abaixo de "Desconto", adicionar a linha "Taxas Adicionais".
- Implementar a mesma lógica de edição inline (`editandoTaxa`, `taxaEdit`).
- Opcional: Um botão "+" que abre um dropdown com as taxas pré-configuradas. Ao selecionar, soma o valor no input de edição.
- Atualizar o cálculo visual de `emAberto` no modal.

## 5. Próximos Passos Imediatos
1. Criar migration do Drizzle com o novo campo e a nova tabela.
2. Atualizar o `schema.ts`.
3. Rodar `pnpm db:push` ou gerar migration.
4. Implementar as funções no `db.ts` e `routers.ts`.
5. Atualizar o frontend.
