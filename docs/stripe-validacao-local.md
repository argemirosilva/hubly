# Stripe local — correção e validação em 08/09/2026

## Publicado

Hubly ativo na porta 3010, domínio https://hubly.orizontech.com.br.
Somente o serviço Hubly-3010 foi reiniciado; Windows e demais serviços não foram reiniciados.

### Alterações

- `server/stripe-webhook.ts`: corpo original e assinatura obrigatórios, sem bypass por prefixo de ID; modo TEST rejeitado em LIVE; HTTP 500 em falha processável.
- `server/stripe-webhook-processing.ts`: leitura do estado atual da assinatura na Stripe, períodos atuais nos itens e compatibilidade com formato antigo; faturas antigas e atuais; estados trial, inadimplência, suspensão e cancelamento; sincronização dos dois painéis em transação.
- `server/stripe-event-store.ts`: registro persistente por ID de evento, confirmado na mesma transação das assinaturas. Exclusão de eventos do catálogo de replicação é intencional.
- `drizzle-postgres/stripe-webhook-events.sql`: migração aditiva aplicada; tabela `public.stripe_webhook_events`, IDs com comparação exata (collation C), sem payload, dados de cartão ou credenciais.
- `drizzle.config.ts`: inclui a nova tabela no inventário de modelos.
- `server/stripe.ts`: não imprime fragmento da credencial no log.
- `server/routers.ts`: datas atuais nos detalhes e sucesso do checkout; retorno para o domínio configurado; metadata da empresa também na assinatura; consulta da sessão exige empresa correspondente.
- `server/stripe-webhook.validation.ts`, `server/stripe-webhook.test.ts`: testes puros e aceite com banco real isolado.
- `scripts/validate-stripe-deployment.mjs`: auditoria de implantação, sondagens sintéticas e configuração restrita ao endpoint Hubly.

Na Stripe, adicionados somente `invoice.paid` e `invoice.payment_failed` ao endpoint existente do Hubly. URL, identidade, credenciais e eventos anteriores preservados. O outro endpoint da conta foi comparado antes/depois e permaneceu inalterado.

## Evidências

- TypeScript: sem erros.
- Build: concluído; aviso de tamanho dos bundles de interface, sem falha.
- Suite geral: 489 aprovados; 19 ignorados (18 testes de banco opt-in, executados separadamente, e 1 teste preexistente).
- Aceite Stripe: 28 aprovados, incluindo 18 testes com PostgreSQL real em schema aleatório isolado. Estruturas temporárias removidas e ausência confirmada.
- Concorrência: cinco entregas simultâneas resultaram em uma aplicação e uma notificação.
- Atomicidade: falha forçada na segunda tabela reverteu também a primeira tabela e o evento; reenvio posterior funcionou.
- Ordem: falha de fatura atrasada não desfaz pagamento recuperado; atualização atrasada não reativa assinatura cancelada.
- Domínio público: evento sintético assinado, de checkout avulso sem operação financeira, percorreu o ledger; quatro reenvios foram identificados como duplicados. Sem assinatura, corpo adulterado e modo TEST foram rejeitados com HTTP 400.
- Linha sintética do ledger removida por seu ID exato. Nenhuma cobrança, cliente ou assinatura foi criado na Stripe.
- Assinatura real existente: consulta somente leitura confirmou LIVE, active e período válido nos itens.
- Hashes dos registros reais de subscriptions, assinaturas, empresas e planos, e hash do arquivo .env, iguais antes/depois da implantação.

## Como repetir

Diretório: `C:\orizontech\hubly`.

```powershell
node C:\orizontech\hubly\node_modules\vitest\vitest.mjs run
$env:HUBLY_STRIPE_DB_VALIDATION='1'
node C:\orizontech\hubly\node_modules\vitest\vitest.mjs run --config C:\orizontech\hubly-postgres-migration\stripe-validation.config.mjs
```

O aceite cria somente estruturas temporárias isoladas. Não gera pagamento. O script de implantação usa baseline específico da publicação: não repetir seu baseline nem habilitação sem revisar o contexto.

## Limites e riscos

- Não houve cobrança real nem novo evento financeiro entregue pela Stripe nesta rodada. Transporte foi testado com assinatura sintética e a lógica financeira com Stripe simulada + PostgreSQL real isolado; isso não equivale a um pagamento real ponta a ponta.
- Notificações de upgrade/cancelamento são best-effort após commit. Não são reenviadas por replay do evento. Uma parada entre commit e envio pode perder a notificação, mas não a atualização financeira. Não há promessa de entrega externa exatamente uma vez.
- Eventos consultam a assinatura atual sob lock transacional. Indisponibilidade da Stripe ou do banco retorna 500 para reenvio. Conflitos de vínculo, preço desconhecido de assinatura vinculada e múltiplos registros locais falham explicitamente e exigem conciliação, sem sobrescrever silenciosamente outra assinatura.
- Não apagar o ledger de eventos reais: isso remove a proteção persistente contra replay. Não sincronizá-lo a partir do Manus.
- Não foi executado `db:push` nem migração geral do projeto; apenas o SQL aditivo documentado.

Backup anterior: `C:\orizontech\hubly-postgres-migration\artifacts\before-stripe-fix-20260908.dump` (catálogo validado), e arquivos anteriores em `C:\orizontech\hubly-postgres-migration\stripe-before-fix`.
Auditoria: `C:\orizontech\hubly-postgres-migration\stripe-deployment-audit.json`.
Resultado dos testes: `C:\orizontech\hubly-postgres-migration\stripe-validation-results.json`.

Referências: [webhooks Stripe](https://docs.stripe.com/webhooks), [mudanças de formato Basil](https://docs.stripe.com/changelog/basil).
