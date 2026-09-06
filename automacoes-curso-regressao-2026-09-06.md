# Regressão — automação de curso em lembrete de agendamento

## Evidência encontrada

Na empresa ativa há duas automações de **24 horas antes**:

- **Agendado amanhã**: regra geral, sem condição de segmentação no fluxo.
- **Curso agen. amanhã**: regra específica com a condição `{ tipo: "por_categoria", valor: "Curso" }`.

O agendador aplica o filtro compartilhado de automações apenas quando encontra uma condição `por_servico`. Como a regra de curso foi configurada por categoria, ela era ignorada pelo filtro e considerada compatível com qualquer agendamento. Por isso, uma cliente de atendimento normal recebia a mensagem geral e a mensagem específica de curso.

## Correção necessária

O filtro compartilhado precisa reconhecer `por_categoria`, consultar as categorias reais dos serviços do agendamento e bloquear a automação quando nenhuma categoria corresponder. A verificação deve ser aplicada no pré-registro da fila e novamente antes do envio, preservando a proteção já existente contra registros antigos ou alterados.

## Ação preventiva aplicada na fila

O agendamento de curso `1980002` tinha duas pendências para o mesmo horário: a regra geral **Agendado amanhã** e a regra **Curso agen. amanhã**. A pendência geral foi cancelada e a regra específica foi mantida agendada. Nenhuma mensagem foi enviada durante essa correção.
