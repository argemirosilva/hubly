# Tarefas de Implementação

## Bug A — Leitura de Comprovante por IA

- [x] 1. Corrigir validação do input `lerComprovante` no backend
  - [x] 1.1 Em `server/routers.ts`, alterar `imageUrl: z.string().url()` para aceitar data URLs base64 (usar `z.string().min(1)` ou validação customizada)
  - [x] 1.2 Verificar que URLs HTTP/HTTPS continuam sendo aceitas
- [x] 2. Corrigir fluxo de upload no frontend
  - [x] 2.1 Em `client/src/components/AgendamentoDetalheModal.tsx`, remover tentativa de fetch para `/api/upload`
  - [x] 2.2 Converter imagem para base64 via FileReader e enviar diretamente na mutation `lerComprovante`
  - [x] 2.3 Manter tratamento de erro quando IA retorna `valido: false`

## Bug B — Contagem Dupla de Sessões

- [x] 3. Corrigir handler de conclusão de agendamento
  - [x] 3.1 Em `server/routers.ts`, no bloco `if (data.status === "concluido")` do `agendamentos.update`, buscar itens do agendamento via `getItensByAgendamento(id)`
  - [x] 3.2 Verificar se algum item possui `pacoteClienteItemId` preenchido (vínculo com pacote já existente)
  - [x] 3.3 Se existir vínculo, pular o abatimento automático de sessão
  - [x] 3.4 Se NÃO existir vínculo, manter o abatimento automático existente (preservação do comportamento para agendamentos sem pacote)

## Bug C — Botão de Edição no PacoteCard

- [x] 4. Adicionar funcionalidade de edição na página Pacotes
  - [x] 4.1 Em `client/src/pages/Pacotes.tsx`, adicionar prop `onEditar` ao componente `PacoteCard`
  - [x] 4.2 Renderizar botão de edição (ícone Pencil) no `PacoteCard` para pacotes ativos
  - [x] 4.3 Adicionar estado para modal de edição na página `Pacotes` (pacoteEditarId, editarPacoteForm)
  - [x] 4.4 Implementar modal de edição com campos: nome, valor, forma de pagamento, parcelas, data de vencimento, observações e quantidades dos itens
  - [x] 4.5 Conectar modal à mutation `trpc.pacotes.editarPacote` existente

## Verificação

- [x] 5. Validar correções
  - [x] 5.1 Verificar que upload de comprovante funciona com imagem base64 (sem erro de validação)
  - [x] 5.2 Verificar que agendamento vinculado a pacote não causa contagem dupla ao concluir
  - [x] 5.3 Verificar que agendamento SEM vínculo continua abatendo automaticamente na conclusão
  - [x] 5.4 Verificar que botão de edição aparece no PacoteCard e o modal funciona corretamente
  - [x] 5.5 Verificar que edição em ClienteDetalhe continua funcionando normalmente
