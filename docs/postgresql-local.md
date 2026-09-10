# PostgreSQL local do Hubly

A instalação local utiliza PostgreSQL 17 em localhost:5433, banco hubly. A configuração está em database-postgres.local.json. O arquivo .env e suas credenciais foram preservados: DATABASE_URL nele continua apontando para o MySQL para os utilitários históricos, mas não é a conexão utilizada pela aplicação migrada.

Desde 10/09/2026, a instalação local atende https://hubly.orizontech.com.br e é a fonte oficial dos dados. O marcador .hubly-replica-mode foi arquivado, liberando as rotinas locais. O responsável confirmou que os envios no Manus foram desativados.

A sincronização de banco com o Manus foi encerrada por solicitação do responsável. A automação horária permanece pausada e os dois comandos sync-remote-to-local.ts e sync-remote-to-postgres.ts estão bloqueados antes de qualquer acesso remoto ou conexão ao banco. Credenciais e backups foram preservados. Não reativar essa importação: ela pode sobrescrever dados da operação local. A API local de integração com outros consumidores não foi desativada.

## Comandos no PowerShell

Executar no diretório C:\orizontech\hubly:

```powershell
Set-Location 'C:\orizontech\hubly'
node --env-file='C:\orizontech\hubly\.env' --import tsx 'C:\orizontech\hubly\scripts\postgres-smoke.ts'
node --env-file='C:\orizontech\hubly\.env' --import tsx 'C:\orizontech\hubly\scripts\postgres-write-check.ts'
```

Os comandos acima são validações locais, não sincronizações. O teste de escrita termina em rollback, sem manter registros de teste; sequences podem avançar, comportamento normal do PostgreSQL.

## Migrations e exportação

O histórico PostgreSQL fica em drizzle-postgres e na tabela drizzle.__drizzle_migrations. O histórico MySQL em drizzle e public.__drizzle_migrations foi preservado como legado. A migration inicial PostgreSQL contém a estrutura efetivamente importada, incluindo índices, checks e triggers. A configuração do Drizzle aponta para o novo banco.

A exportação por empresa agora gera SQL PostgreSQL e requer o pg_dump 17 já instalado. A restauração deve ocorrer em banco vazio; o arquivo contém a estrutura completa, filtros por empresa e sequences reposicionadas. Campos confidenciais são removidos da exportação por empresa.

Os antigos utilitários .mjs que importam mysql2 continuam sendo utilitários MySQL. Não utilizá-los para administrar o PostgreSQL. Os antigos comandos de sincronização com o Manus foram desativados.

## Retorno ao MySQL

Os dados e o serviço MySQL foram preservados. O inventário, snapshot, código original e manifest de arquivos alterados ficam em C:\orizontech\hubly-postgres-migration. Um retorno da aplicação exige avaliar escritas posteriores no PostgreSQL antes de restaurar os arquivos originais; a cópia antiga não recebe automaticamente essas escritas. Não reiniciar o servidor para isso.

Referências técnicas: https://www.postgresql.org/docs/17/sql-createtable.html e https://orm.drizzle.team/docs/get-started-postgresql.
