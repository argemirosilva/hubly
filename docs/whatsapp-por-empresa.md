# WhatsApp Solo/Plus por empresa — 08/09/2026

## Publicado

O Baileys agora possui um gerenciador independente por empresa: socket, QR Code,
estado, reconexão, credenciais e chaves criptográficas não são compartilhados.
O roteador de texto/mídia usa a empresa do envio. PRO continua usando Z-API;
nenhuma credencial Z-API foi alterada.

As rotas obtêm a empresa pela sessão autenticada, não por um ID fornecido pelo
cliente. Conectar, desconectar, resetar e consultar logs exigem permissão de
configuração. Falha ao consultar o plano não expõe outra conexão como fallback.

## Banco

- `wa_session`: empresaId obrigatório, chave primária composta (empresaId, id),
  vínculo com empresas e comparação exata das chaves criptográficas (collation C).
- `wa_connection_log`: empresaId por evento; consulta e retenção dos 200 logs
  mais recentes limitadas à própria empresa.
- Logs globais antigos foram preservados com empresaId NULL e não aparecem
  para empresas individuais. Não houve atribuição arbitrária de histórico.
- Não existiam credenciais globais no banco. A migração abortaria se existissem,
  exigindo identificar seu proprietário antes de qualquer alteração.

## Arquivos alterados/criados

- `server/whatsapp.ts`: registro por empresa, persistência e limpeza isoladas,
  BufferJSON do Baileys, gravações serializadas e proteção contra callbacks antigos.
- `server/whatsapp-router.ts`: texto e mídia selecionam o gerenciador da empresa.
- `server/routers.ts`: empresa autenticada, permissões de configuração,
  logs filtrados e desconexão da empresa no fluxo de exclusão.
- `server/scheduler.ts`: removida consulta ociosa de conexão global; verificação
  real continua no roteador de cada envio. Regras de automação não foram alteradas.
- `drizzle/schema.ts`: modelo da sessão e dos logs por empresa.
- `drizzle-postgres/whatsapp-por-empresa.sql`: migração aplicada.
- `server/whatsapp-tenant.validation.ts` e `server/whatsapp-tenant.test.ts`: testes.
- `scripts/validate-whatsapp-tenants.mjs`: auditoria autenticada de implantação.

## Validação

- TypeScript e build concluídos sem erros.
- Suite geral: 495 aprovados; 27 ignorados (26 testes de banco opt-in e um
  teste preexistente). Os oito testes de banco desta alteração foram executados
  separadamente, junto com seis testes puros: 14/14 aprovados.
- Duas empresas fictícias, SOLO e PLUS, com PostgreSQL real em schema isolado:
  mesmo ID de credencial armazenado separadamente, restauração correta de buffers,
  exclusão de chaves/reset/desconexão sem atingir a outra empresa, QR e socket
  separados, envio pelo socket correto e bloqueio de callbacks antigos.
- WhatsApp externo foi simulado nesses testes: nenhuma mensagem real foi enviada.
- Schema de testes removido. Hashes das tabelas reais preservados.
- Após publicar, API HTTPS autenticada verificada para empresas 60002 e 90001:
  estado próprio Baileys, nenhum QR alheio, logs globais antigos ocultos.
- API sem autenticação rejeitada. Empresa autenticada e permissão são resolvidas
  no servidor, sem seleção de empresa por parâmetro de conexão.
- Hash do .env e dados reais conferidos antes/depois, sem alterações.

## Limites

O modo réplica permanece ativo: automações e conexões Baileys não foram ativadas.
O pareamento de cada telefone por QR Code ainda precisa ser feito quando a operação
local for liberada. Isso é necessário para comprovar autenticação no WhatsApp real;
os testes de isolamento não substituem esse pareamento.

Somente a aplicação Hubly-3010 foi reiniciada. Não houve reinicialização do Windows,
mudança de credenciais, sincronização do Manus ou implementação de mensagens recebidas.

## Repetir testes

Diretório: `C:\orizontech\hubly`.

```powershell
node C:\orizontech\hubly\node_modules\vitest\vitest.mjs run
$env:HUBLY_WA_DB_VALIDATION='1'
node C:\orizontech\hubly\node_modules\vitest\vitest.mjs run --config C:\orizontech\hubly-postgres-migration\whatsapp-tenant-validation.config.mjs
```

Backup anterior: `C:\orizontech\hubly-postgres-migration\artifacts\before-whatsapp-tenant-20260908.dump`.
Fontes/backend anteriores: `C:\orizontech\hubly-postgres-migration\whatsapp-tenant-before`.
Auditoria: `C:\orizontech\hubly-postgres-migration\whatsapp-tenant-deployment.json`.

Referência de persistência: [implementação oficial Baileys](https://github.com/WhiskeySockets/Baileys/blob/master/src/Utils/use-multi-file-auth-state.ts).
