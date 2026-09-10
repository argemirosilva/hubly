# Armazenamento local do Hubly

O runtime-local.json seleciona D:/hubly sem alterar credenciais ou .env.

Estrutura:

- public/: logos, capas e avatares publicados pelo sistema.
- private/: anexos de clientes, separados por empresa e cliente.
- shared/: midias de automacoes, separadas por empresa.
- metadata/: tipo, tamanho e hash de cada arquivo; nunca servido por HTTP.
- backups/: reservado para copias de seguranca; nunca servido por HTTP.

O Windows permite acesso ao diretorio apenas a SYSTEM e Administradores.
O Node da tarefa Hubly-3010 executa como SYSTEM. Nao e necessario compartilhar
a unidade na rede nem abrir uma nova porta. Os arquivos passam pela porta 3010.

Os contratos storagePut/storageGet continuam retornando key/url.
Novos uploads sao gravados localmente, com limite de 16 MB e sem sobrescrita.
Prontuarios exigem sessao e empresa correta; o administrador Orizon conserva
acesso global. O upload tambem verifica se o cliente pertence a empresa.
Logos/capas/avatares sao publicos. Midias destinadas a provedores de mensagens
usam links assinados com a chave JWT existente, sem expor a chave. Esses links
sao compartilhamentos: quem recebe o link completo pode abrir a midia.
Nao ha expiracao desses links para preservar automacoes agendadas; a exclusao
do arquivo ou a rotacao planejada da chave revoga o acesso.

Nao ha listagem publica de diretorios. Traversal, caminhos absolutos, links,
junctions e nomes reservados Windows sao bloqueados. Respostas usam no-store,
nosniff e CSP sandbox; documentos sao baixados como anexos.

Arquivos antigos NAO foram apagados nem transferidos automaticamente.
URLs anteriores da Manus permanecem no banco e precisam de migracao especifica
de download, validacao e atualizacao das referencias. Nao existe fallback
silencioso para Manus para novos uploads quando o armazenamento local esta ativo.

A pasta backups, sozinha, NAO constitui rotina automatica de backup. Incluir
D:/hubly e o PostgreSQL numa politica de backup fora deste servidor.

Validacoes: testes de gravacao/leitura, igualdade dos bytes, anexos protegidos,
isolamento entre empresas, assinatura de midia, nao sobrescrita, tamanho e
traversal. Os testes usam arquivos sinteticos e nao alteram cadastros reais.

Rollback: restaurar o bundle anterior salvo em
C:/orizontech/hubly-postgres-migration e reiniciar somente Hubly-3010.
Nao apagar D:/hubly: novos arquivos e URLs locais dependem dele. Uma reversao
do backend deve manter o leitor local ou migrar essas URLs antes.
