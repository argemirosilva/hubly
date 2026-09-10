# Integracoes locais do Hubly — 08/09/2026

## Arquitetura aplicada

Interface -> backend Hubly (3010) -> LM Studio local (1234/v1).
Modelo: `google/gemma-4-12b-qat`, compartilhado com a OrizonAI.
A API da OrizonAI (3000) trabalha com projetos, pipelines e chaves por projeto;
os projetos existentes pertencem a AMPARA. Nenhum deles foi alterado ou reutilizado.
O adaptador direto preserva mensagens, historico e contratos de resposta do Hubly.
Ha uma chamada ativa por vez no Hubly e no maximo oito aguardando. Isso nao
coordena a fila da OrizonAI: o uso simultaneo da GPU pode aumentar a latencia.

`runtime-local.json` define o dominio publico, endpoint e modelo, sem secrets.
A credencial existente do LM Studio e lida no backend do arquivo operacional
da OrizonAI; nao foi copiada, trocada ou enviada ao navegador. O arquivo precisa
continuar acessivel a conta da tarefa Hubly-3010. O .env do Hubly foi preservado.
Falhas da IA local nao causam fallback para OpenAI ou Manus. Geracao de imagens
nao e suportada pelo Gemma; a rota informa explicitamente essa limitacao.

## Integracoes verificadas

- Stripe LIVE: endpoint do Hubly atualizado para
  `https://hubly.orizontech.com.br/api/stripe/webhook`, preservando eventos e
  identidade do endpoint. Endpoint Supabase de outro sistema nao foi alterado.
  Teste sintetico assinado aceito e requisicao sem assinatura rejeitada.
  A entrega de um evento real do Stripe ainda nao foi validada.
- Z-API: instancia existente conectada; atualizacao dos webhooks para
  `https://hubly.orizontech.com.br/api/zapi/webhook` aceita pelo provedor.
  Nenhuma mensagem enviada. Recebimento real de status ainda precisa de teste.
- Google: as duas contas salvas renovaram acesso e consultaram a lista de
  agendas com HTTP 200. Nao foram criados eventos. Novos logins usam callbacks
  do dominio publico, inclusive sobre a antiga GOOGLE_REDIRECT_URI local.
- Baileys: sem sessao salva; exige pareamento pelo telefone.
- Modo replica mantido: automacoes locais continuam bloqueadas para evitar
  duplicidade enquanto a execucao remota na Manus nao for desativada.

## Pendencias e limites

1. Desligar/confirmar as automacoes na Manus antes de liberar as locais.
2. Parear o WhatsApp via QR, caso esse modo seja utilizado.
3. Confirmar no Google Cloud os callbacks `/api/google/callback` e
   `/api/google/user-callback` do dominio publico para novos consentimentos.
4. Escolher um servico de geracao de imagens, se necessario; nao usar uma
   chave OpenAI silenciosamente quando a IA local estiver selecionada.
5. Armazenamento privado/uploads Manus depende de credenciais indisponiveis
   ou de uma migracao especifica de arquivos e controles de acesso locais.
6. Push requer configuracao segura de chaves VAPID; os fallbacks antigos em
   codigo nao devem ser tratados como uma configuracao privada de producao.
7. Nao executar sincronizacao fiel destrutiva da Manus depois de assumir
   operacoes locais independentes, pois ela pode sobrescrever dados novos.

## Arquivos desta alteracao

- runtime-local.json
- server/runtime-config.ts e server/runtime-config.test.ts
- server/local-ai.ts e server/local-ai.test.ts
- server/openai.ts e server/_core/llm.ts
- server/routers/iaMarketing.ts
- server/google-calendar.ts e server/google-calendar-usuario.ts
- server/google-oauth-callback.ts e server/google-oauth-user-callback.ts
- server/routers.ts, server/routers/pacotes.ts e server/scheduler.ts
- server/whatsapp-router.ts e server/whatsapp-router.test.ts
- server/zapi.test.ts

## Validacao e rollback

TypeScript aprovado; suite de 466 testes aprovada (1 ignorado), mais 2 testes
de configuracao adicionados posteriormente e aprovados. Inferencia real de
texto e JSON com dados sinteticos aprovada. Build aprovado.
Somente o processo Hubly foi reiniciado para publicar; Windows, banco,
OrizonAI e LM Studio nao foram reiniciados.

Backup do backend anterior:
`C:/orizontech/hubly-postgres-migration/backend-before-integrations-20260908-171107.js`.
Para reverter a publicacao, restaurar esse bundle em dist/index.js e reiniciar
somente a tarefa Hubly-3010. Isso nao reverte alteracoes externas: o webhook
Stripe anterior era `https://agendei-app-bkct9rps.manus.space/api/stripe/webhook`.
Nao reativar automacoes de duas instalacoes simultaneamente.
