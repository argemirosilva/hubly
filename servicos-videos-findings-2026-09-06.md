# Achados dos vídeos — Serviços

## Vídeo 1 — Tipo de profissional não refletido nos grupos de Serviços

A usuária abre **Serviços**, acessa **Tipos de Profissional**, edita o tipo **Manicure** para **Julia** e salva. A alteração aparece corretamente dentro da própria janela de tipos, porém o agrupamento da página de Serviços continua exibindo **MANICURE**, inclusive após atualizar o navegador.

**Problema observado:** a página de Serviços está agrupando ou exibindo a categoria de um serviço com uma fonte de dados antiga ou independente do cadastro de tipos profissionais. A edição do tipo profissional não atualiza o título do agrupamento correspondente.

## Vídeo 2 — Solicitação de alteração de categoria em lote

A usuária demonstra que precisa abrir cada serviço individualmente para alterar o campo **Categoria / Tipo**. Ela quer selecionar diversos serviços, inclusive de categorias diferentes, para transferi-los de uma só vez para um tipo profissional único, sem repetir a edição item por item.

**Solicitação de melhoria:** criar seleção múltipla na lista de Serviços e uma ação em lote para alterar a categoria/tipo profissional dos serviços selecionados. A função deve permitir selecionar serviços pertencentes a grupos diferentes e mostrar claramente a quantidade selecionada antes de confirmar a mudança.

## Validação da implementação publicada

Na sessão autenticada, a página Serviços exibiu o modo **Selecionar**. Foram selecionados, sem salvar alterações, um serviço de **Cabeleireiro** e outro de **Maquiadora**. O sistema exibiu corretamente **Alterar tipo (2)** e abriu um diálogo explicando que os dois serviços serão movidos para o mesmo tipo profissional. A alteração foi cancelada antes da confirmação, preservando os dados existentes.
