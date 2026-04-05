# Documento de Requisitos de Bugfix

## Introdução

Este documento cobre três bugs inter-relacionados no sistema Hubly/Agendei que afetam a funcionalidade de pacotes de serviços e a leitura de comprovantes por IA. Os bugs impactam diretamente a operação financeira e administrativa do sistema.

**Bug A — Leitura de comprovante por IA não funciona:** O fluxo de upload de comprovante falha porque o endpoint `/api/upload` não existe no servidor, e o fallback (base64 data URL) é rejeitado pela validação Zod `z.string().url()` que não aceita URIs `data:`.

**Bug B — Pacotes não contabilizam sessões corretamente:** Quando um agendamento é criado vinculado a um pacote, a sessão é decrementada na criação. Porém, ao concluir o agendamento, o sistema decrementa novamente de forma automática (sem verificar se já foi vinculado), causando contagem dupla.

**Bug C — Pacotes por cliente sem opção de editar na página Pacotes:** Na página administrativa de Pacotes (`Pacotes.tsx`), o componente `PacoteCard` não possui botão de edição. A funcionalidade de edição existe apenas na página `ClienteDetalhe.tsx`, mas não na listagem geral de pacotes.

## Análise de Bugs

### Comportamento Atual (Defeito)

1.1 QUANDO o usuário faz upload de uma imagem de comprovante no modal de detalhes do agendamento ENTÃO o sistema tenta enviar para `/api/upload` que não existe, recebe erro, e no fallback converte para data URL que é rejeitada pela validação `z.string().url()` do Zod, resultando em erro "Erro ao ler comprovante"

1.2 QUANDO um agendamento é criado vinculado a um pacote (com `pacoteClienteItemId`) ENTÃO o sistema incrementa `quantidadeUsada` na criação do agendamento E novamente ao concluir o agendamento (no handler de `status === "concluido"`), causando decremento duplo das sessões do pacote

1.3 QUANDO o agendamento é concluído sem vínculo explícito com pacote (sem `pacoteClienteItemId`) ENTÃO o sistema busca automaticamente qualquer pacote ativo do cliente com o mesmo serviço e decrementa uma sessão, mesmo que o agendamento não tenha sido intencionalmente vinculado a um pacote

1.4 QUANDO o administrador visualiza a lista de pacotes por cliente na página Pacotes (aba "Pacotes por Cliente") ENTÃO não existe botão ou opção para editar um pacote existente no componente `PacoteCard`

### Comportamento Esperado (Correto)

2.1 QUANDO o usuário faz upload de uma imagem de comprovante ENTÃO o sistema SHALL aceitar a imagem (via upload para storage ou via data URL base64), enviar para a IA e retornar os dados extraídos (valor, data, banco, tipo) pré-preenchendo o formulário de pagamento

2.2 QUANDO um agendamento é criado vinculado a um pacote (com `pacoteClienteItemId`) ENTÃO o sistema SHALL decrementar a sessão apenas uma vez (na criação) e NÃO SHALL decrementar novamente ao concluir, evitando contagem dupla

2.3 QUANDO o agendamento é concluído ENTÃO o sistema SHALL verificar se o agendamento já possui vínculo com pacote (via `agendamentoItens.pacoteClienteItemId`) antes de tentar abater automaticamente, e SHALL pular o abatimento automático se já houver vínculo

2.4 QUANDO o administrador visualiza a lista de pacotes por cliente na página Pacotes ENTÃO o sistema SHALL exibir um botão de edição em cada pacote, permitindo alterar nome, valor, forma de pagamento, parcelas, data de vencimento, observações e quantidades dos itens

### Comportamento Inalterado (Prevenção de Regressão)

3.1 QUANDO o agendamento é criado SEM vínculo com pacote (sem `pacoteClienteItemId`) e depois concluído ENTÃO o sistema SHALL CONTINUAR A abater automaticamente a sessão do pacote ativo do cliente (se existir) apenas na conclusão

3.2 QUANDO o administrador cria ou edita modelos de pacotes ENTÃO o sistema SHALL CONTINUAR A funcionar normalmente com criação, edição e desativação de modelos

3.3 QUANDO o administrador abre um novo pacote para um cliente ENTÃO o sistema SHALL CONTINUAR A criar o pacote com todos os itens e notificar o dono

3.4 QUANDO o administrador edita pacotes na página ClienteDetalhe ENTÃO o sistema SHALL CONTINUAR A funcionar normalmente com a edição existente nessa página

3.5 QUANDO a IA retorna que a imagem não é um comprovante válido ENTÃO o sistema SHALL CONTINUAR A exibir mensagem de erro informando que a imagem não foi reconhecida

3.6 QUANDO o consumo manual de sessão é feito (botão "Usar sessão") ENTÃO o sistema SHALL CONTINUAR A decrementar corretamente e verificar conclusão do pacote
