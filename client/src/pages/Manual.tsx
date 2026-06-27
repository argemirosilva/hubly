import { useState } from "react";
import {
  Calendar, Users, DollarSign, Zap,
  Bell, Settings, ChevronRight,
  CheckCircle2, Lock, MessageSquare, HelpCircle, BookOpen, Search, X,
  UserCog, Package, Star, Kanban, Brain,
} from "lucide-react";
import { Input } from "@/components/ui/input";

/* ─── Types ─────────────────────────────────────────────── */
interface Section {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  intro: string;
  topics: {
    title: string;
    steps: string[];
    tip?: string;
    warning?: string;
  }[];
}

/* ─── Content ────────────────────────────────────────────── */
const SECTIONS: Section[] = [
  {
    id: "primeiros-passos",
    icon: <CheckCircle2 size={20} />,
    title: "Começando do Zero",
    subtitle: "Tudo que você precisa fazer antes de abrir o sistema para a equipe",
    color: "oklch(45% 0.18 155)",
    intro: "Antes de usar o sistema no dia a dia, você precisa configurar algumas coisas básicas. Não se preocupe — é simples e rápido! Siga os passos abaixo na ordem e você estará pronto em poucos minutos.",
    topics: [
      {
        title: "1. Configure os dados do seu negócio",
        steps: [
          "No menu do lado esquerdo, clique em Configurações.",
          "Preencha o nome do seu salão ou clínica, telefone e endereço.",
          "Defina o horário de funcionamento (ex: das 8h às 18h).",
          "Se quiser, faça o upload do seu logotipo.",
          "Clique em Salvar.",
        ],
        tip: "O nome e o logo aparecem na página de agendamento online que seus clientes acessam. Vale a pena deixar bonito!",
      },
      {
        title: "2. Cadastre os serviços que você oferece",
        steps: [
          "No menu lateral, clique em Serviços.",
          "Clique no botão Novo Serviço.",
          "Coloque o nome do serviço (ex: Corte Feminino), quanto tempo dura e o preço.",
          "Se quiser, defina a comissão do profissional para esse serviço (ex: 40%).",
          "Salve.",
        ],
        tip: "Quanto mais completo você preencher, melhor o sistema vai funcionar. A duração é importante para o calendário não sobrepor horários.",
      },
      {
        title: "3. Cadastre os profissionais",
        steps: [
          "Clique em Equipe e Permissões no menu.",
          "Clique em Novo Profissional.",
          "Preencha o nome e as especialidades.",
          "Salve.",
        ],
        tip: "Cada profissional terá sua própria coluna no calendário, facilitando a visualização da agenda.",
      },
      {
        title: "4. Crie os usuários do sistema",
        steps: [
          "Ainda em Equipe e Permissões, clique na aba Usuários.",
          "Clique em Novo Usuário.",
          "Coloque o nome, e-mail e uma senha (mínimo 6 caracteres).",
          "Escolha o grupo de permissão (ex: Recepcionista, Profissional).",
          "Salve.",
        ],
        tip: "Cada pessoa que vai usar o sistema precisa de um usuário próprio com e-mail e senha. Assim você sabe quem fez o quê.",
        warning: "O e-mail precisa ser único — não pode repetir o mesmo e-mail em dois usuários diferentes.",
      },
    ],
  },
  {
    id: "agendamentos",
    icon: <Calendar size={20} />,
    title: "Agendamentos",
    subtitle: "Como marcar, confirmar, cancelar e acompanhar os atendimentos",
    color: "oklch(45% 0.060 55)",
    intro: "O módulo de agendamentos é onde tudo acontece. Aqui você marca os horários dos clientes, acompanha o que está confirmado, o que foi cancelado e o que está aguardando confirmação.",
    topics: [
      {
        title: "Como marcar um novo agendamento",
        steps: [
          "Clique no botão Novo Agendamento (geralmente no canto superior direito).",
          "Escolha o cliente — se ele ainda não estiver cadastrado, clique em + Novo Cliente para cadastrá-lo na hora.",
          "Selecione o serviço desejado.",
          "Escolha o profissional que vai atender.",
          "Escolha a data e o horário.",
          "Clique em Confirmar Agendamento.",
        ],
        tip: "Você também pode clicar diretamente em um horário vazio no Calendário — o sistema já preenche a data, hora e profissional automaticamente!",
      },
      {
        title: "O que é um pré-agendamento?",
        steps: [
          "Quando um cliente agenda pelo link de agendamento online, ele cria um pré-agendamento.",
          "Esse pré-agendamento fica aguardando a sua confirmação.",
          "Vá em Agendamentos e clique na aba Pré-agendamentos.",
          "Clique em Confirmar para aceitar ou Cancelar para recusar.",
          "Você também pode confirmar direto no modal de edição: abra o agendamento e clique no botão azul Confirmar agendamento que aparece no rodapé.",
        ],
        tip: "O cliente recebe uma notificação quando você confirma ou cancela o pré-agendamento dele. Pagar a reserva não confirma automaticamente o agendamento — a confirmação deve ser feita manualmente.",
        warning: "Se você não confirmar dentro do prazo configurado no momento do agendamento, o pré-agendamento é cancelado automaticamente e o horário fica livre. O prazo é definido no momento da criação e não muda mesmo que você altere as configurações depois.",
      },
      {
        title: "Agendamento sem profissional definido",
        steps: [
          "Ao criar ou editar um agendamento, o campo de profissional é opcional.",
          "Se nenhum profissional for selecionado, o agendamento fica com status Sem profissional.",
          "Um aviso amarelo aparece no modal de edição quando o agendamento não tem profissional.",
          "Para filtrar apenas os agendamentos sem profissional, use o filtro Sem profissional na listagem.",
          "No calendário, esses agendamentos exibem um ícone de alerta para facilitar a identificação.",
        ],
        tip: "Quando você atribuir um profissional a um agendamento que estava sem profissional, o sistema envia automaticamente uma mensagem ao cliente informando quem fará o atendimento.",
      },
      {
        title: "Como cancelar ou remarcar",
        steps: [
          "Abra o agendamento clicando sobre ele na lista ou no calendário.",
          "Para cancelar: clique em Cancelar e confirme. Se a cliente já tiver pago algum valor, o sistema vai perguntar automaticamente se você deseja converter esse valor em crédito para uso futuro.",
          "Para remarcar: clique em Editar, mude a data ou hora e salve.",
          "Status Remarcado: use o botão roxo Remarcado quando a cliente pediu para remarcar e você já entrou em contato. Assim você sabe que não precisa mais correr atrás dela.",
        ],
        tip: "O status Remarcado é diferente de Cancelado: ele indica que a situação já foi tratada e um novo agendamento está a caminho. Remarcações contam como penalidade leve no escore da cliente (peso menor que cancelamentos).",
      },
      {
        title: "Registrar se o cliente veio ou faltou",
        steps: [
          "Abra o agendamento.",
          "Clique em Compareceu se o cliente chegou.",
          "Ou clique em Faltou se ele não apareceu.",
        ],
        tip: "Esses registros ficam no histórico do cliente e ajudam nas análises do sistema.",
      },
      {
        title: "Registrar atraso da cliente",
        steps: [
          "Ao concluir um atendimento, o sistema exibe um seletor de pontualidade no modal de conclusão.",
          "Selecione a opção que melhor descreve o horário de chegada: Chegou no horário, Atrasou 15 min, Atrasou 30 min, Atrasou 1h ou Atrasou +1h30.",
          "O atraso é salvo no histórico do agendamento e aparece como um badge laranja (+Xmin) na aba Histórico do perfil da cliente.",
          "O escore de pontualidade da cliente é atualizado automaticamente: atrasos acima de 15 min reduzem a pontuação.",
        ],
        tip: "O contador de atrasos aparece no Score do Cliente no formato X/Y (ex: 2/10), mostrando quantos atendimentos tiveram atraso em relação ao total. Fica em laranja quando há atrasos registrados.",
      },
      {
        title: "Sinal recebido fora do prazo (reativar agendamento cancelado)",
        steps: [
          "Quando um pré-agendamento exige sinal e o cliente não paga dentro do prazo, o sistema cancela o agendamento automaticamente.",
          "Se o cliente pagar o sinal depois do prazo, você não precisa criar um novo agendamento do zero.",
          "Abra o agendamento cancelado — ele ainda aparece na lista com o status Cancelado.",
          "Na seção Alterar status, procure o botão verde Sinal Recebido.",
          "Um painel vai abrir mostrando o valor do sinal original já preenchido. Você pode ajustar o valor se necessário.",
          "Adicione uma observação opcional, por exemplo: cliente pagou via PIX após o prazo.",
          "Clique em Confirmar Recebimento.",
          "O agendamento volta automaticamente para o status Agendado e o valor do sinal é registrado no financeiro como pagamento parcial.",
          "Uma anotação interna é salva com a data, hora e nome de quem confirmou o recebimento.",
        ],
        tip: "O botão Sinal Recebido só aparece em agendamentos com status Cancelado que tinham um valor de sinal configurado. Se o agendamento foi cancelado por outro motivo (sem sinal), esse botão não será exibido.",
        warning: "Essa ação não reenvia mensagens automáticas ao cliente. Se quiser notificar o cliente sobre a reativação, envie uma mensagem manualmente pelo WhatsApp.",
      },
    ],
  },
  {
    id: "calendario",
    icon: <Calendar size={20} />,
    title: "Calendário",
    subtitle: "Veja a agenda de todos os profissionais de uma vez",
    color: "oklch(45% 0.20 30)",
    intro: "O Calendário é a visão mais completa da sua agenda. Você vê todos os profissionais lado a lado, com os horários ocupados e livres, e pode criar agendamentos direto por aqui.",
    topics: [
      {
        title: "Navegar pelo calendário",
        steps: [
          "Use as setas para ir para o dia seguinte ou anterior.",
          "Clique em Hoje para voltar à data atual.",
          "Você pode alternar entre a visão do dia inteiro ou da semana.",
        ],
      },
      {
        title: "Visão diária com grade de horários",
        steps: [
          "Na visão mensal, clique em qualquer dia que tenha agendamentos para abrir a visão diária.",
          "A visão diária exibe uma grade de horários (05:00 até 22:00) com cada atendimento posicionado no seu horário exato.",
          "Cada agendamento mostra o horário, nome do cliente, serviço e profissional.",
          "Bloqueios de agenda aparecem em cinza na grade.",
          "Clique em qualquer agendamento para abrir o modal de detalhes.",
          "Use o botão + Novo no canto superior direito da visão diária para criar um agendamento direto naquele dia.",
        ],
        tip: "A visão diária é ótima para ter uma noção clara de como o dia vai ficar, especialmente em dias movimentados com vários profissionais.",
      },
      {
        title: "Criar agendamento pelo calendário",
        steps: [
          "Clique em qualquer horário vazio na coluna do profissional desejado.",
          "O formulário já abre com a data, hora e profissional preenchidos.",
          "Complete os demais campos e confirme.",
        ],
      },
      {
        title: "O que significa cada cor?",
        steps: [
          "Azul: agendamento confirmado.",
          "Amarelo ou laranja: pré-agendamento aguardando sua confirmação.",
          "Verde: cliente compareceu e foi atendido.",
          "Vermelho: cancelado ou cliente faltou.",
          "Cinza listrado: bloqueio de agenda (horário indisponível).",
        ],
      },
      {
        title: "Bloqueios aparecem no calendário?",
        steps: [
          "Sim! Quando um bloqueio é aprovado, ele aparece no calendário como um horário cinza.",
          "Esse horário fica bloqueado e não pode receber novos agendamentos.",
          "Para solicitar um bloqueio, vá em Bloqueios no menu lateral.",
        ],
      },
    ],
  },
  {
    id: "bloqueios",
    icon: <Lock size={20} />,
    title: "Bloqueios de Agenda",
    subtitle: "Quando um profissional não pode atender em determinado horário",
    color: "oklch(45% 0.18 30)",
    intro: "Às vezes um profissional precisa de um horário livre — para uma consulta médica, um treinamento, férias ou qualquer outro motivo. O sistema de bloqueios serve exatamente para isso: reservar um período como indisponível, sem que novos agendamentos possam ser marcados nele.",
    topics: [
      {
        title: "Como solicitar um bloqueio",
        steps: [
          "No menu lateral, clique em Bloqueios.",
          "Clique no botão Solicitar Bloqueio.",
          "Escolha o profissional, a data, o horário de início e fim.",
          "Escreva o motivo (ex: Consulta médica, Treinamento).",
          "Se for um bloqueio que se repete toda semana ou todo mês, ative a opção de recorrência.",
          "Clique em Solicitar.",
        ],
        tip: "O administrador receberá uma notificação para aprovar ou recusar o bloqueio. Enquanto isso, o status fica como Pendente.",
      },
      {
        title: "Quem pode aprovar um bloqueio?",
        steps: [
          "Somente o dono da conta ou usuários com permissão de Aprovar/recusar bloqueios podem aprovar.",
          "O dono da conta pode aprovar o próprio bloqueio diretamente.",
          "Outros profissionais precisam aguardar a aprovação.",
        ],
        tip: "Isso garante que nenhum horário seja bloqueado sem o conhecimento de quem gerencia a agenda.",
      },
      {
        title: "O que acontece depois da aprovação?",
        steps: [
          "O bloqueio aprovado aparece no calendário como um horário cinza.",
          "Nenhum agendamento pode ser marcado nesse período.",
          "Se o bloqueio for recusado, o profissional recebe uma notificação com o motivo.",
        ],
      },
      {
        title: "Bloqueios recorrentes",
        steps: [
          "Ao criar um bloqueio, você pode marcar a opção de recorrência.",
          "Semanal: o bloqueio se repete toda semana no mesmo dia e horário.",
          "Mensal: o bloqueio se repete todo mês na mesma data e horário.",
        ],
        tip: "Útil para folgas fixas semanais ou compromissos mensais recorrentes.",
      },
      {
        title: "Relatório de bloqueios",
        steps: [
          "Vá em Bloqueios no menu e clique em Ver Relatório.",
          "Você verá quantos bloqueios foram aprovados, recusados e ainda estão pendentes no mês.",
          "Também há um gráfico mostrando os motivos mais comuns de bloqueio.",
        ],
      },
    ],
  },
  {
    id: "clientes",
    icon: <Users size={20} />,
    title: "Clientes",
    subtitle: "Cadastro, histórico e tudo sobre seus clientes",
    color: "oklch(45% 0.18 300)",
    intro: "Aqui ficam todos os seus clientes cadastrados. Você pode ver o histórico de atendimentos de cada um, adicionar anotações, fotos e muito mais.",
    topics: [
      {
        title: "Cadastrar um novo cliente",
        steps: [
          "Clique em Clientes no menu lateral.",
          "Clique em Novo Cliente.",
          "Preencha o nome, telefone, e-mail e data de nascimento.",
          "Adicione observações se necessário (ex: alergia a determinado produto).",
          "Salve.",
        ],
        tip: "O telefone é essencial para as mensagens automáticas de WhatsApp funcionarem.",
      },
      {
        title: "Ver o histórico de um cliente",
        steps: [
          "Na lista de clientes, clique no nome do cliente.",
          "A aba Histórico mostra todos os atendimentos anteriores.",
          "Você vê data, serviço, profissional e se o cliente compareceu ou faltou.",
        ],
      },
      {
        title: "Adicionar anotações ou fotos (prontuário)",
        steps: [
          "Abra o perfil do cliente.",
          "Clique na aba Prontuário.",
          "Escreva suas anotações — alergias, preferências, observações do atendimento.",
          "Para fotos, clique em Adicionar Foto.",
        ],
        tip: "O prontuário é visível apenas para usuários com permissão. Ótimo para manter informações sigilosas seguras.",
      },
      {
        title: "Análise inteligente do cliente",
        steps: [
          "Abra o perfil do cliente e role até a seção Análise IA.",
          "Veja a classificação automática: Cliente Fiel, Em Crescimento, Em Risco de Perda, etc.",
          "Leia o resumo com dicas sobre como tratar esse cliente.",
        ],
        tip: "A análise é gerada automaticamente. Muito útil para saber em quem focar nas ações de fidelização.",
      },
      {
        title: "Score do Cliente",
        steps: [
          "O Score do Cliente é uma pontuação de 0 a 100 calculada automaticamente com base no histórico de atendimentos.",
          "Ele aparece no perfil da cliente como um anel com a pontuação e uma classificação: Excelente, Bom, Regular, Baixo ou Crítico.",
          "Os fatores avaliados são: Conclusão (taxa de atendimentos concluídos), Frequência (regularidade das visitas), Gasto (valor total investido), Confiabilidade (baixo cancelamento e faltas), Recência (última visita) e Pontualidade (atrasos registrados).",
          "Cada fator aparece como uma barra de progresso com a pontuação parcial (ex: 8/10).",
          "Os indicadores no rodapé mostram: Total, Concluídos, Cancelados, Faltas e Atrasos (no formato X/Y, ex: 2/10).",
          "O contador de Atrasos fica em laranja quando há atrasos registrados, facilitando a identificação rápida.",
        ],
        tip: "O Score ajuda a priorizar clientes nas ações de fidelização: clientes com score baixo podem precisar de um contato especial, enquanto clientes com score alto merecem recompensas e atenção diferenciada.",
      },
      {
        title: "Sistema de Crédito do Cliente",
        steps: [
          "O crédito pode ser gerado de três formas: automaticamente quando a cliente paga mais do que o total do agendamento, ao cancelar um agendamento com valor já pago, ou manualmente pelo perfil da cliente.",
          "Exemplo automático: o serviço custa R$80 e a cliente paga R$100 — os R$20 a mais ficam registrados como crédito.",
          "🔴 Cancelamento com sinal pago: ao cancelar um agendamento que já tem pagamento registrado, o sistema exibe automaticamente um popup perguntando se você deseja converter o valor pago em crédito para a cliente. Clique em 'Sim, deixar como crédito' e o valor é salvo instantaneamente no perfil dela.",
          "🟢 Adicionar crédito manual: abra o perfil da cliente → aba Créditos → clique no botão verde '+ Adicionar crédito' → informe o valor e o motivo (ex: 'Sinal do agendamento cancelado em 24/05') → clique em Confirmar.",
          "O crédito fica vinculado ao perfil da cliente e pode ser usado em qualquer agendamento futuro.",
          "Ao abrir um agendamento com saldo em aberto, se a cliente tiver crédito disponível, um aviso verde aparece na seção de Pagamento.",
          "Clique em Usar crédito para aplicar automaticamente o saldo disponível como pagamento do agendamento.",
          "Para ver o saldo e o histórico completo de movimentações, abra o perfil da cliente e clique na aba Créditos.",
          "Se quiser devolver o valor em dinheiro, clique em Devolver em dinheiro na aba Créditos e informe o valor.",
          "Toda movimentação (crédito gerado, uso em agendamento, devolução) fica registrada no histórico com data e descrição.",
          "📲 Notificação automática: ao gerar um crédito (manual ou por pagamento a maior), o sistema envia automaticamente uma mensagem WhatsApp para a cliente informando o valor adicionado e o saldo total disponível.",
          "A mensagem é enviada para o WhatsApp ou telefone cadastrado no perfil da cliente. Se a cliente não tiver telefone cadastrado, a notificação não será enviada.",
          "O envio fica registrado no histórico de Automações > Histórico de Envios com o nome 'Notificação de Crédito', onde você pode acompanhar o status (enviado ou falhou).",
        ],
        tip: "O saldo de crédito também aparece como um KPI no perfil da cliente e como badge verde na listagem de Clientes, facilitando a identificação rápida de quem tem saldo disponível. No módulo Financeiro, uma seção 'Créditos em Aberto' mostra o total do passivo de créditos da empresa e a lista de clientes com saldo pendente.",
        warning: "A devolução em dinheiro é apenas um registro no sistema. O pagamento físico ao cliente deve ser feito manualmente por você. A notificação WhatsApp requer que o WhatsApp esteja conectado nas Configurações.",
      },
      {
        title: "Editar e Remover Movimentações de Crédito",
        steps: [
          "Na aba Créditos do perfil da cliente, cada linha do histórico possui dois botões: lápis (editar) e lixeira (remover).",
          "Ao clicar no lápis, um modal abre com os campos Valor e Descrição da movimentação para correção.",
          "Ao salvar a edição, o saldo total da cliente é recalculado automaticamente com base no novo valor.",
          "Ao clicar na lixeira, uma confirmação é exibida antes de excluir o registro permanentemente.",
          "Após a exclusão, o saldo é recalculado e o histórico é atualizado imediatamente.",
          "Use a edição para corrigir valores lançados incorretamente sem precisar remover e recriar o registro.",
        ],
        tip: "Somente movimentações do tipo 'crédito' (geradas manualmente ou por pagamento a maior) e 'devolução' podem ser editadas. Movimentações do tipo 'uso' (aplicadas em agendamento) são somente leitura para manter a integridade do histórico financeiro.",
        warning: "A exclusão de uma movimentação é permanente e não pode ser desfeita. Verifique o valor antes de confirmar.",
      },
      {
        title: "Reserva com Múltiplas Pessoas",
        steps: [
          "Um agendamento pode ter várias pessoas vinculadas — por exemplo, uma mãe que agenda para si e para a filha no mesmo horário.",
          "Para vincular pessoas a uma reserva, abra o agendamento e role até a seção Pessoas da Reserva.",
          "Clique em Adicionar Pessoa, busque a cliente pelo nome e selecione-a. Se não estiver cadastrada, cadastre primeiro na tela de Clientes.",
          "Uma das pessoas é definida como Contato Principal — ela é quem recebe todas as mensagens automáticas (lembretes, confirmações, pós-atendimento).",
          "Para trocar o contato principal, clique na estrela ao lado da pessoa desejada na lista.",
          "Se nenhuma pessoa for marcada como principal, as automações continuam sendo enviadas para o cliente original do agendamento.",
          "Para remover uma pessoa da reserva, clique no ícone de lixeira ao lado do nome dela.",
          "Agendamentos antigos sem pessoas vinculadas continuam funcionando normalmente — a funcionalidade é totalmente opcional.",
        ],
        tip: "Use esta funcionalidade para grupos, casais ou famílias que chegam juntas. O contato principal é quem recebe os lembretes de WhatsApp, então escolha quem é o responsável pela comunicação do grupo.",
        warning: "Cada pessoa adicionada deve já estar cadastrada como cliente no sistema. O campo de busca mostra apenas clientes da sua empresa.",
      },
    ],
  },
  {
    id: "equipe-permissoes",
    icon: <UserCog size={20} />,
    title: "Equipe e Permissões",
    subtitle: "Controle quem pode fazer o quê no sistema",
    color: "oklch(45% 0.060 55)",
    intro: "Aqui você gerencia toda a sua equipe: profissionais, usuários do sistema e os grupos de permissão. Cada pessoa pode ter acesso diferente — por exemplo, uma recepcionista pode criar agendamentos, mas não ver o financeiro.",
    topics: [
      {
        title: "O que são grupos de permissão?",
        steps: [
          "Um grupo é como um cargo no sistema. Exemplos: Recepcionista, Profissional, Gerente.",
          "Cada grupo tem um conjunto de permissões — o que pode ver, criar, editar ou excluir.",
          "Quando você cria um usuário, você atribui ele a um grupo.",
          "Assim, todos os usuários do mesmo grupo têm as mesmas permissões automaticamente.",
        ],
        tip: "É muito mais fácil gerenciar permissões por grupo do que configurar uma por uma para cada pessoa.",
      },
      {
        title: "O grupo Administradores é especial",
        steps: [
          "O grupo Administradores tem acesso total ao sistema — sem nenhuma restrição.",
          "Esse grupo não pode ser editado nem excluído. Ele é protegido.",
          "O dono da conta é automaticamente colocado nesse grupo.",
        ],
        warning: "Só adicione pessoas de total confiança ao grupo Administradores, pois elas terão acesso a tudo, incluindo financeiro e configurações.",
      },
      {
        title: "Criar um novo grupo",
        steps: [
          "Clique em Equipe e Permissões no menu.",
          "Vá para a aba Grupos.",
          "Clique em Novo Grupo.",
          "Dê um nome (ex: Recepcionista) e escolha uma cor.",
          "Ative ou desative as permissões que esse grupo deve ter.",
          "Salve.",
        ],
      },
      {
        title: "O que é escopo de visibilidade?",
        steps: [
          "Ao configurar um grupo, você pode definir o que os membros enxergam.",
          "Próprio: o usuário só vê os próprios dados (agendamentos, notificações, calendário, financeiro).",
          "Todos: o usuário vê os dados de todos os profissionais da empresa.",
          "O escopo pode ser configurado separadamente para: Notificações, Agenda, Calendário e Financeiro.",
          "Cada um desses escopos tem seu próprio toggle Próprio/Todos na seção Escopo de Visibilidade do grupo.",
        ],
        tip: "Exemplo: uma profissional com escopo Financeiro = Próprio só vê a receita e comissões dela. Uma gerente com escopo Financeiro = Todos vê o consolidado da empresa.",
      },
      {
        title: "Quais permissões existem no sistema?",
        steps: [
          "Atendimentos: ver, criar, editar, concluir, remarcar e cancelar agendamentos.",
          "Clientes: ver, cadastrar, editar, ver histórico, ver prontuário, editar prontuário e excluir.",
          "Agenda e Bloqueios: solicitar bloqueio, aprovar ou recusar bloqueios, ver bloqueios de todos.",
          "Financeiro: acessar módulo, ver comissões, editar comissões, marcar como pago, ver receita, ver custos, ver relatórios.",
          "Profissionais: ver, cadastrar, editar, gerenciar permissões e excluir.",
          "Serviços: ver, cadastrar, editar e excluir.",
          "Pacotes: ver, criar e editar, excluir.",
          "Automações: ver, criar, editar, ativar ou desativar, e excluir.",
          "Relatórios e Dashboard: acessar dashboard, ver métricas, ver relatórios e exportar.",
          "Sistema e Usuários: receber notificações, ver configurações, editar configurações, ver usuários e cadastrar usuários.",
        ],
      },
    ],
  },
  {
    id: "notificacoes",
    icon: <Bell size={20} />,
    title: "Notificações",
    subtitle: "Fique por dentro de tudo que acontece no sistema",
    color: "oklch(45% 0.18 60)",
    intro: "As notificações são os avisos do sistema para você. Quando um cliente agenda online, quando um bloqueio precisa de aprovação, quando um pacote está vencendo — tudo aparece aqui. Você não precisa ficar verificando o sistema o tempo todo; ele te avisa!",
    topics: [
      {
        title: "Como acessar as notificações",
        steps: [
          "Clique no ícone de sino no menu lateral ou na barra superior.",
          "Um número vermelho no sino indica quantas notificações não lidas você tem.",
          "Clique para abrir a lista completa.",
        ],
      },
      {
        title: "Aprovar ou recusar um bloqueio direto da notificação",
        steps: [
          "Quando um profissional solicita um bloqueio, você recebe uma notificação.",
          "Na própria notificação, há dois botões: Aprovar e Recusar.",
          "Clique em Aprovar para liberar o bloqueio diretamente.",
          "Clique em Recusar para abrir uma caixa onde você escreve o motivo da recusa.",
          "Não precisa ir até a tela de Bloqueios — tudo acontece aqui mesmo!",
        ],
        tip: "O profissional recebe uma notificação informando se o bloqueio foi aprovado ou recusado.",
      },
      {
        title: "Remover uma notificação",
        steps: [
          "No computador: passe o mouse sobre a notificação e clique no X que aparece.",
          "No celular: deslize a notificação para a esquerda para removê-la.",
        ],
      },
      {
        title: "Limpar todas as notificações de uma vez",
        steps: [
          "No topo da tela de Notificações, clique no botão Limpar tudo.",
          "Todas as notificações serão removidas.",
        ],
        warning: "Essa ação não pode ser desfeita. Certifique-se de ter lido tudo antes de limpar.",
      },
      {
        title: "Limpeza automática",
        steps: [
          "O sistema remove automaticamente notificações com mais de 30 dias.",
          "Isso acontece todos os dias de madrugada, sem que você precise fazer nada.",
          "Assim a lista não fica entupida de avisos antigos.",
        ],
      },
    ],
  },
  {
    id: "pacotes",
    icon: <Package size={20} />,
    title: "Pacotes",
    subtitle: "Venda combos de serviços com sessões pré-pagas",
    color: "oklch(45% 0.18 200)",
    intro: "Pacotes são combos de serviços que o cliente paga antecipado e vai usando ao longo do tempo. Por exemplo: um pacote de 10 hidratações, ou um combo de escova mais manicure. É ótimo para fidelizar clientes e garantir receita recorrente.",
    topics: [
      {
        title: "Criar um pacote",
        steps: [
          "Clique em Pacotes no menu lateral.",
          "Clique em Novo Pacote.",
          "Dê um nome ao pacote (ex: Combo Beleza Total).",
          "Adicione os serviços incluídos e a quantidade de sessões de cada um.",
          "Defina o preço do pacote e a validade em dias.",
          "Salve.",
        ],
        tip: "Pacotes são ótimos para serviços recorrentes. Clientes que compram pacotes tendem a voltar com mais frequência.",
      },
      {
        title: "Vender um pacote para um cliente",
        steps: [
          "Na tela de Pacotes, clique em Vender Pacote.",
          "Selecione o cliente e o pacote desejado.",
          "Confirme a venda.",
          "O pacote fica registrado no histórico do cliente com os créditos disponíveis.",
        ],
      },
      {
        title: "Usar o pacote em um agendamento",
        steps: [
          "Ao criar um agendamento para um cliente com pacote ativo, o sistema mostra os créditos disponíveis.",
          "Selecione o pacote para descontar o serviço automaticamente.",
          "O saldo de sessões é atualizado após o uso.",
        ],
        tip: "O sistema avisa automaticamente quando um pacote está perto de vencer ou com poucas sessões restantes.",
        warning: "Pacotes vencidos não podem ser utilizados. Fique de olho na validade!",
      },
      {
        title: "Alertas automáticos de pacotes",
        steps: [
          "O sistema verifica automaticamente os pacotes ativos a cada 6 horas.",
          "Se um pacote vencer em até 7 dias, você recebe uma notificação.",
          "Se restar apenas 1 ou 2 sessões, você também recebe um aviso.",
          "Esses alertas aparecem na tela de Notificações.",
        ],
      },
      {
        title: "Modelos de pacotes e como ocultar",
        steps: [
          "Na aba Modelos da tela de Pacotes, você cria os modelos que serão usados para vender pacotes.",
          "Para ocultar um modelo que não quer mais usar, clique no ícone de lixeira.",
          "O modelo não é excluído — ele fica oculto e pode ser resgatado depois.",
          "Para ver os modelos ocultos, clique em Ver modelos ocultos no final da lista.",
          "Para reativar um modelo oculto, clique em Restaurar ao lado dele.",
        ],
        tip: "Ocultar é melhor do que excluir: você pode resgatar o modelo se precisar no futuro.",
      },
    ],
  },
  {
    id: "financeiro",
    icon: <DollarSign size={20} />,
    title: "Financeiro",
    subtitle: "Controle de receitas, custos e comissões da equipe",
    color: "oklch(45% 0.18 140)",
    intro: "O módulo financeiro ajuda você a acompanhar a saúde do seu negócio: quanto está entrando, quanto está saindo e quanto cada profissional tem a receber de comissão.",
    topics: [
      {
        title: "Registrar uma receita",
        steps: [
          "Vá em Financeiro no menu lateral.",
          "Clique em Nova Receita.",
          "Informe o valor, a descrição, a data e a categoria.",
          "Salve.",
        ],
      },
      {
        title: "Registrar um custo ou despesa",
        steps: [
          "Vá em Financeiro no menu lateral.",
          "Clique em Novo Custo.",
          "Informe o valor, a descrição, a data e a categoria.",
          "Salve.",
        ],
      },
      {
        title: "Comissões — como funciona?",
        steps: [
          "Quando você conclui um atendimento, o sistema verifica se a profissional já tem percentual configurado e se o pagamento já foi registrado.",
          "Se ambos estiverem preenchidos, a comissão é registrada automaticamente sem abrir nenhum modal.",
          "Se faltar alguma informação, o modal de comissão abre para você preencher.",
          "O percentual já vem preenchido automaticamente (do serviço ou do profissional).",
          "Escolha a forma de pagamento: Dinheiro, PIX, Cartão, etc.",
          "Veja o valor calculado antes de confirmar.",
          "Clique em Registrar Comissão.",
        ],
        tip: "O percentual configurado no serviço tem prioridade. Se não houver no serviço, o sistema usa o percentual do profissional. Quando tudo já está configurado, a comissão é registrada na hora sem precisar de nenhuma ação extra.",
      },
      {
        title: "Ver comissões a pagar",
        steps: [
          "Vá em Financeiro e clique em Comissões a Pagar.",
          "Você vê o que cada profissional tem a receber.",
          "Quando pagar, clique em Marcar como Pago para registrar.",
        ],
        tip: "Cada profissional só vê as próprias comissões. Apenas administradores veem as comissões de todos.",
      },
      {
        title: "Fluxo de Caixa — Receita, Despesas e Saldo",
        steps: [
          "Na tela principal do Financeiro você vê 3 números: Receita do Mês, Despesas e Saldo.",
          "A Receita do Mês mostra o total real dos pagamentos registrados nos agendamentos concluídos ou pagos no mês atual.",
          "Despesas mostra o total de custos lançados manualmente no período.",
          "Saldo é a diferença entre Receita e Despesas.",
          "Abaixo dos 3 números principais, você encontra detalhes como comissões a pagar e outras informações secundárias.",
        ],
        tip: "A receita mostrada vem diretamente dos pagamentos registrados nos agendamentos, não de lançamentos manuais. Isso garante que o número reflita o que realmente entrou no caixa.",
      },
      {
        title: "Controle de visibilidade financeira por grupo",
        steps: [
          "Em Equipe e Permissões, ao editar um grupo, você encontra a seção Escopo de Visibilidade.",
          "O campo Financeiro pode ser configurado como Próprio ou Todos.",
          "Próprio: a profissional vê apenas os dados financeiros dela (receita dos próprios atendimentos, comissões próprias).",
          "Todos: a profissional vê os dados consolidados de toda a empresa.",
          "Administradores sempre vêem tudo, independente dessa configuração.",
        ],
        tip: "Configure como Próprio para profissionais que não devem ver o financeiro geral da empresa. Use Todos apenas para gerentes ou administradores.",
      },
      {
        title: "Relatórios financeiros",
        steps: [
          "Vá em Financeiro e clique em Relatórios.",
          "Filtre por período, profissional ou categoria.",
          "Você pode exportar os dados se precisar.",
        ],
      },
      {
        title: "Usando o Financeiro no celular",
        steps: [
          "A tela de Financeiro é totalmente responsiva para uso em dispositivos móveis.",
          "Os cards de resumo (Créditos em Aberto, Total devolvido) se reorganizam automaticamente em 2 colunas no mobile.",
          "Os filtros de período das comissões ficam empilhados: primeiro os botões (Mês atual / Mês anterior / Últimos 30 dias), depois os campos de data em linha separada.",
          "Nos cards de profissional, os badges de valor pendente e pago ficam em linha própria abaixo do nome, evitando sobreposição com o valor total.",
        ],
        tip: "Se algo parecer sobreposto ou cortado no celular, tente girar o dispositivo para paisagem ou use a versão desktop para operações mais complexas.",
      },
    ],
  },
  {
    id: "automacoes",
    icon: <Zap size={20} />,
    title: "Automações",
    subtitle: "Mensagens automáticas que trabalham por você",
    color: "oklch(45% 0.18 60)",
    intro: "As automações são mensagens que o sistema envia sozinho, sem você precisar fazer nada. Cada automação tem um gatilho — o evento que a dispara — e uma mensagem personalizada que vai para o cliente via WhatsApp. O sistema roda 24h por dia, todos os dias, enquanto o WhatsApp estiver conectado.",
    topics: [
      {
        title: "Guia completo de gatilhos: quando cada automação é executada",
        steps: [
          "━━━ GATILHOS DE EVENTO (disparam imediatamente quando algo acontece) ━━━",
          "🟢 AGENDAMENTO CRIADO — Dispara no momento em que um novo agendamento é criado com status 'Agendado'. Ideal para enviar confirmação imediata ao cliente com data, hora e serviço.",
          "🟡 PRÉ-AGENDAMENTO CRIADO — Dispara quando um agendamento é criado com status 'Pré-agendado' (aguardando confirmação). Se não houver automação para este gatilho, o sistema usa 'Agendamento criado' como fallback. Ideal para solicitar reserva ou pagamento de sinal.",
          "✅ AGENDAMENTO CONFIRMADO — Dispara quando o status muda para 'Confirmado', seja pela atendente no painel OU pelo cliente ao clicar no link de confirmação. Ideal para enviar cardápio, instruções de preparo ou mensagem de boas-vindas.",
          "❌ AGENDAMENTO CANCELADO (pela atendente) — Dispara quando a atendente muda o status para 'Cancelado' no painel interno. Ideal para avisar o cliente e oferecer reagendamento.",
          "❌ CANCELAMENTO PELO CLIENTE — Dispara quando o cliente clica em 'Não poderei comparecer' na página de confirmação do link enviado por WhatsApp. Diferente do cancelamento pela atendente — este é iniciado pelo próprio cliente. Ideal para lamentar a ausência e oferecer um novo horário.",
          "🏁 AGENDAMENTO CONCLUÍDO — Dispara quando a atendente marca o status como 'Concluído' após o atendimento. Ideal para pedir avaliação, enviar instruções pós-atendimento ou oferecer próximo agendamento.",
          "💳 RESERVA PAGA — Dispara quando o pagamento de reserva/sinal é registrado no sistema. Ideal para confirmar o recebimento e tranquilizar o cliente.",
          "💰 CRÉDITO GERADO — Dispara quando um crédito é adicionado à conta do cliente (ex: cancelamento com devolução em crédito). Ideal para informar o valor disponível para uso.",
          "👩 PROFISSIONAL ATRIBUÍDO — Dispara quando um profissional é vinculado ao agendamento. Ideal para apresentar a profissional ao cliente.",
          "━━━ GATILHOS DE TEMPO (disparam em horários específicos) ━━━",
          "⏰ DIAS ANTES DO AGENDAMENTO — Dispara X dias antes da data do agendamento, no horário configurado. Exemplo: 1 dia antes às 09h = lembrete na véspera.",
          "⏰ HORAS ANTES DO AGENDAMENTO — Dispara X horas antes do horário do agendamento. Exemplo: 2 horas antes = lembrete no dia com link de confirmação.",
          "⏰ HORAS APÓS O AGENDAMENTO — Dispara X horas depois do horário de término do agendamento. Exemplo: 2 horas após = mensagem de acompanhamento pós-atendimento.",
          "⏰ DIAS DEPOIS DO AGENDAMENTO — Dispara X dias após a data do agendamento. Exemplo: 7 dias depois = lembrete para remarcar.",
          "━━━ GATILHOS ESPECIAIS ━━━",
          "🎂 ANIVERSÁRIO DO MÊS — Dispara no dia 1º do mês em que o cliente faz aniversário. Cada cliente recebe no máximo 1 mensagem por ano. Requer data de nascimento cadastrada no perfil do cliente.",
          "📦 PACOTE VENCENDO — Dispara quando um pacote ativo está próximo do vencimento (última sessão ou data de expiração). Ideal para oferecer renovação.",
          "📅 DATA FIXA — Dispara em uma data e hora específica do ano (ex: 24 de dezembro às 10h). Ideal para mensagens sazonais como Natal, Ano Novo ou promoções especiais.",
        ],
        tip: "Dica de fluxo completo: crie uma automação 'Horas antes' com link de confirmação → outra 'Agendamento confirmado' → outra 'Agendamento concluído' com mensagem de agradecimento. Assim o cliente é acompanhado do início ao fim!",
      },
      {
        title: "Variáveis disponíveis nas mensagens",
        steps: [
          "Use variáveis entre chaves duplas para personalizar cada mensagem automaticamente:",
          "{{nome_cliente}} — Nome completo do cliente (ex: Ana Julia de Lion)",
          "{{primeiro_nome}} — Apenas o primeiro nome (ex: Ana)",
          "{{data}} — Data do agendamento no formato DD/MM/AAAA (ex: 27/04/2026)",
          "{{hora}} — Horário de início e fim (ex: 14:00 – 16:30)",
          "{{servico}} — Nome do serviço principal (ex: Maquiagem Social)",
          "{{profissional}} — Nome da profissional responsável (ex: Maria Alves)",
          "{{empresa}} — Nome da empresa (ex: Studio Maria Alves)",
          "{{valor}} — Valor final do agendamento já com desconto aplicado (ex: R$ 350,00)",
          "{{valor_reserva}} — Valor do sinal/reserva cobrado (ex: R$ 100,00)",
          "{{link_confirmacao}} — Link único para o cliente confirmar ou cancelar o agendamento pela página personalizada",
          "{{link_agendamento}} — Link do portal de agendamento online da empresa",
          "{{observacoes}} — Observações internas do agendamento",
        ],
        tip: "O {{link_confirmacao}} é gerado automaticamente com token de segurança válido por 48h. Ao clicar, o cliente vê os detalhes do agendamento e pode confirmar ou cancelar.",
        warning: "Se o agendamento tiver desconto de 100%, o {{valor}} mostrará R$ 0,00 — exatamente o que o cliente pagará.",
      },
      {
        title: "Criar uma automação do zero",
        steps: [
          "Vá em Automações no menu lateral.",
          "Clique em Nova Automação.",
          "Escolha o tipo de gatilho (evento, horas antes, dias antes, etc.).",
          "Configure os detalhes do gatilho (qual evento, quantas horas/dias, horário de disparo).",
          "Escreva a mensagem usando as variáveis disponíveis.",
          "Opcionalmente, adicione condições de filtro (por serviço, profissional ou tag do cliente).",
          "Ative a automação e clique em Salvar.",
        ],
        tip: "Os templates já vêm com gatilho e mensagem pré-configurados. É a forma mais rápida de começar — edite apenas o texto!",
      },
      {
        title: "Templates prontos disponíveis",
        steps: [
          "Na tela de Automações, clique em Templates para ver os modelos prontos.",
          "Lembrete de confirmação (24h antes) — envia link de confirmação no dia anterior.",
          "Agradecimento por confirmar — enviado quando o cliente confirma pelo link.",
          "Cancelamento pela atendente — avisa o cliente quando a atendente cancela pelo painel.",
          "Cancelamento pelo cliente — resposta automática quando o cliente cancela pelo link.",
          "Agradecimento pós-atendimento — enviado quando o agendamento é marcado como Concluído, agradecendo a visita e convidando para retornar.",
          "Reserva paga — confirma o recebimento do sinal.",
          "Crédito gerado — informa o cliente sobre crédito disponível na conta.",
          "Profissional atribuído — apresenta a profissional ao cliente.",
          "Aniversário do mês — mensagem especial no mês do aniversário.",
          "Clique em um template para usá-lo como base e personalize o texto.",
        ],
        tip: "Os templates já vêm ativados por padrão. Edite a mensagem antes de publicar para garantir que o texto está com a sua cara!",
      },
      {
        title: "Confirmação automática por proximidade",
        steps: [
          "Nas automações do tipo Horas antes do agendamento, há uma seção Confirmação Automática no painel lateral do editor.",
          "Ative o toggle Confirmar automaticamente se o cliente não responder.",
          "Escolha o tempo: 1h, 2h, 4h, 6h, 12h ou 24h antes do agendamento.",
          "Quando o horário configurado chegar e o cliente ainda não tiver confirmado, o sistema confirma o agendamento automaticamente.",
          "Por padrão, essa opção vem desabilitada — você precisa ativar manualmente em cada automação.",
        ],
        tip: "Útil para evitar cancelamentos por falta de resposta. Configure junto com a automação de lembrete de confirmação para um fluxo completo.",
        warning: "A confirmação automática só funciona se a automação estiver ativa. Desativar a automação também desativa a confirmação automática.",
      },
      {
        title: "Testar uma automação antes de ativar",
        steps: [
          "Na lista de automações, clique no ícone de envio (seta) ao lado da automação que deseja testar.",
          "O modal de teste abre com o número de WhatsApp da empresa já preenchido automaticamente.",
          "Confirme ou altere o número e clique em Enviar Teste.",
          "O botão exibe um indicador de carregamento enquanto o envio está sendo processado.",
          "Você receberá a mensagem no WhatsApp com o prefixo [TESTE] para identificar que é um envio de teste.",
        ],
        tip: "Os envios de teste ficam registrados no Histórico. Use o filtro Apenas testes para visualizá-los separadamente e validar o conteúdo das mensagens.",
        warning: "O link de confirmação enviado em testes aponta para o domínio real do Hubly (hubly.orizontech.com.br). Ao clicar, você verá a página de confirmação exatamente como o cliente veria.",
      },
      {
        title: "Fila de envios (Caixa de Saída)",
        steps: [
          "Vá em Automações e clique em Caixa de Saída.",
          "Você vê todas as mensagens enviadas ou agendadas, com data, cliente, serviço e status.",
          "Status possíveis: Pendente (aguardando envio), Enviado (entregue ao WhatsApp), Falhou (erro no envio), Cancelado (agendamento deletado antes do envio ou automação desativada).",
          "A coluna Serviço mostra qual serviço gerou o envio — útil para agendamentos com múltiplos serviços.",
          "Para reenviar uma mensagem com status Falhou ou Cancelado, abra o agendamento, vá em Mensagens Enviadas e clique em Reenviar.",
        ],
        tip: "Mensagens com status Falhou ou Cancelado podem ser reenviadas manualmente. O sistema gera um novo link de confirmação automaticamente se o original tiver expirado.",
        warning: "Se você desativar uma automação, todos os envios pendentes dela são cancelados imediatamente. Para reativar os envios, você precisará reenviá-los manualmente.",
      },
      {
        title: "Automação de aniversário",
        steps: [
          "O gatilho Aniversário do mês dispara no dia 1º do mês em que o cliente faz aniversário.",
          "Cada cliente recebe no máximo 1 mensagem por ano, mesmo que o sistema rode várias vezes.",
          "Certifique-se de que a data de nascimento do cliente está cadastrada para que o gatilho funcione.",
          "A mensagem é enviada para todos os clientes da empresa que fazem aniversário naquele mês.",
        ],
        tip: "Combine com um cupom de desconto para aumentar o retorno dos clientes no mês do aniversário!",
      },
      {
        title: "Histórico de envios e filtros",
        steps: [
          "Vá em Automações e clique na aba Histórico.",
          "Você vê todos os envios realizados: data, cliente, automação, status e tipo.",
          "Status no histórico: Enviado (verde), Falhou (vermelho), Cancelado (cinza) e Pendente (amarelo).",
          "Cancelado significa que o envio foi interrompido antes de sair — por exclusão do agendamento ou desativação da automação.",
          "Para ver apenas os envios de teste, clique no botão Apenas testes no canto superior direito da aba.",
          "Você pode filtrar o histórico por status usando os filtros disponíveis.",
          "Clique em qualquer envio para ver a mensagem completa que foi enviada.",
        ],
        tip: "Use o filtro de status Cancelado para identificar mensagens que não chegaram ao cliente por causa de uma automação desativada, e reenvie manualmente se necessário.",
      },
      {
        title: "Automações do Sistema vs. Automações Personalizadas",
        steps: [
          "Na tela de Automações, as mensagens estão divididas em duas seções: Minhas Automações e Automações do Sistema.",
          "Automações do Sistema são os templates padrão criados automaticamente quando você cadastrou a empresa.",
          "Elas aparecem separadas no final da lista, com visual diferenciado.",
          "Você pode ativar, desativar, editar ou excluir as automações do sistema como qualquer outra.",
          "Se excluir uma automação do sistema, ela não será recriada automaticamente.",
        ],
        tip: "As automações do sistema já vem com gatilhos e mensagens prontos. Edite apenas o texto para personalizar com a sua linguagem antes de ativar.",
      },
      {
        title: "Alerta de WhatsApp desconectado",
        steps: [
          "Quando o WhatsApp está desconectado, um alerta amarelo aparece no topo da tela de Automações.",
          "O alerta avisa que as mensagens não serão enviadas enquanto o WhatsApp estiver desconectado.",
          "Clique no botão Reconectar no alerta para ir direto à tela de WhatsApp e escanear o QR Code.",
          "Após reconectar, o alerta desaparece automaticamente e os envios pendentes voltam a funcionar.",
        ],
        warning: "Mensagens agendadas para o período em que o WhatsApp ficou desconectado ficam com status Cancelado ou Falhou. Você pode reenviá-las manualmente pelo histórico do agendamento.",
      },
      {
        title: "Importante: o que acontece ao deletar um agendamento",
        steps: [
          "Ao deletar um agendamento, todas as mensagens agendadas para ele são canceladas automaticamente.",
          "Isso evita que o cliente receba mensagens de um agendamento que não existe mais.",
          "Se quiser cancelar sem deletar, mude o status para Cancelado — isso dispara a automação de cancelamento e mantém o histórico.",
        ],
        warning: "Deletar é permanente e não pode ser desfeito. Prefira cancelar (mudar status) para manter o histórico e disparar a automação de cancelamento.",
      },
    ],
  },
  {
    id: "pipeline",
    icon: <Kanban size={20} />,
    title: "Pipeline",
    subtitle: "Acompanhe o progresso dos seus clientes em um quadro visual",
    color: "oklch(45% 0.060 55)",
    intro: "O Pipeline é um quadro Kanban que permite acompanhar a jornada dos seus clientes em colunas personalizadas. Cada empresa tem um único pipeline, que pode ser editado mas não excluído — garantindo continuidade no acompanhamento.",
    topics: [
      {
        title: "O que é o Pipeline?",
        steps: [
          "O Pipeline é um quadro visual com colunas que representam etapas do atendimento.",
          "Cada cartão representa um cliente ou oportunidade em andamento.",
          "Você arrasta os cartões de uma coluna para outra conforme o cliente avança na jornada.",
          "Cada empresa tem exatamente um pipeline — ele é criado automaticamente e não pode ser excluído.",
        ],
        tip: "O pipeline é ideal para acompanhar clientes em processos mais longos, como tratamentos estéticos com múltiplas sessões ou pacotes de serviços.",
      },
      {
        title: "Gerenciar as colunas do pipeline",
        steps: [
          "Clique no ícone de configurações (engrenagem) no canto superior direito do pipeline.",
          "Adicione novas colunas clicando em + Nova Coluna.",
          "Dê um nome e escolha uma cor para cada coluna.",
          "Reordene as colunas arrastando-as para a posição desejada.",
          "Para excluir uma coluna, clique no ícone de lixeira ao lado dela — atenção: os cartões da coluna também serão removidos.",
        ],
        warning: "Excluir uma coluna remove todos os cartões dentro dela. Mova os cartões para outra coluna antes de excluir.",
      },
      {
        title: "Criar e mover cartões",
        steps: [
          "Clique no botão + no topo de qualquer coluna para criar um novo cartão.",
          "Preencha o título, vincule um cliente e adicione um lembrete se necessário.",
          "Para mover um cartão, arraste-o para a coluna de destino.",
          "Clique em um cartão para editar os detalhes ou alterar o status (Em andamento, Congelado, Cancelado, Concluído).",
        ],
        tip: "Use o campo de lembrete para definir uma data de follow-up. O sistema exibirá um alerta quando o prazo se aproximar.",
      },
      {
        title: "Editar o nome do pipeline",
        steps: [
          "Clique no ícone de lápis ao lado do nome do pipeline no topo da página.",
          "Digite o novo nome e confirme.",
          "O nome é atualizado imediatamente para todos os usuários da empresa.",
        ],
      },
    ],
  },
  {
    id: "whatsapp",
    icon: <MessageSquare size={20} />,
    title: "WhatsApp",
    subtitle: "Conecte seu WhatsApp para enviar mensagens automáticas",
    color: "oklch(45% 0.18 155)",
    intro: "O sistema pode enviar mensagens pelo WhatsApp automaticamente — confirmações, lembretes, aniversários e muito mais. O modo de conexão depende do seu plano: planos Solo e Plus usam conexão via QR Code; o plano Pro usa uma API dedicada, mais robusta e estável.",
    topics: [
      {
        title: "Planos Solo e Plus: conectar via QR Code",
        steps: [
          "Clique em WhatsApp no menu lateral.",
          "Clique em Conectar WhatsApp.",
          "Abra o WhatsApp no celular, vá em Dispositivos Vinculados e escaneie o QR Code exibido na tela.",
          "Aguarde o status ficar verde — isso significa que está conectado.",
          "A conexão fica ativa em segundo plano mesmo após fechar a tela.",
        ],
        warning: "Prefira usar o número do WhatsApp Business da empresa. Se a conexão cair, basta acessar a tela de WhatsApp e escanear o QR Code novamente.",
      },
      {
        title: "Plano Pro: API dedicada (Z-API)",
        steps: [
          "No plano Pro, a conexão é feita via API dedicada (Z-API) — mais robusta e estável.",
          "Após a confirmação do pagamento, a equipe Hubly recebe uma notificação automática e configura a instância Z-API em até 24h úteis.",
          "Quando a instância estiver pronta, acesse Configurações → WhatsApp e escaneie o QR Code exibido na tela.",
          "Uma vez conectado, a API mantém a sessão de forma muito mais confiável.",
          "Se a sessão cair (status session: false), basta escanear o QR Code novamente — o celular pode estar online mesmo sem sessão ativa.",
        ],
        tip: "A API dedicada do plano Pro oferece maior estabilidade, sem risco de desconexão inesperada e sem dependência do celular ligado o tempo todo. O campo smartphoneConnected indica se o celular está online; session indica se a sessão do WhatsApp Web está ativa.",
      },
      {
        title: "A conexão fica ativa?",
        steps: [
          "Sim! Uma vez conectado, o WhatsApp fica ativo em segundo plano.",
          "Mesmo que você feche a tela de WhatsApp, a conexão continua funcionando.",
          "O sistema envia um alerta automático caso a conexão caia, para que você possa reconectar rapidamente.",
          "Se cair, acesse a tela de WhatsApp e siga as instruções de reconexão.",
        ],
      },
      {
        title: "Quantas mensagens posso enviar por mês?",
        steps: [
          "Solo: 100 notificações por mês.",
          "Plus: 400 notificações por mês.",
          "Pro: 1.000 notificações por mês.",
          "O contador de uso aparece na tela de WhatsApp e na página de Assinatura.",
          "Ao atingir o limite mensal, o sistema para de enviar mensagens automáticas até o início do próximo mês.",
        ],
        tip: "As notificações são consumidas pelas automações ativas (confirmações, lembretes, aniversários etc.). O sistema verifica o teto antes de cada envio e bloqueia automaticamente quando o limite é atingido. Acompanhe o uso para não ser surpreendido.",
      },
      {
        title: "Enviar mensagem manual para um cliente",
        steps: [
          "Vá em WhatsApp e clique em Nova Mensagem.",
          "Selecione o cliente ou informe o número.",
          "Digite a mensagem e clique em Enviar.",
        ],
      },
    ],
  },
  {
    id: "assinatura",
    icon: <Star size={20} />,
    title: "Assinatura e Planos",
    subtitle: "Trial, planos, upgrade, cancelamento e reativação",
    color: "oklch(45% 0.060 55)",
    intro: "O Hubly oferece três planos: Solo, Plus e Pro. Toda conta nova começa com 7 dias de trial gratuito com acesso completo a todos os recursos (incluindo IA). Após o trial, assine um plano para continuar usando o Hubly.",
    topics: [
      {
        title: "Período de teste gratuito (Trial)",
        steps: [
          "Toda nova conta começa automaticamente com 7 dias de trial gratuito com acesso total a todos os recursos, incluindo IA Marketing, IA Financeira e IA Clientes.",
          "Não é necessário cadastrar cartão durante o trial.",
          "No painel, um badge no topo mostra quantos dias restam (ex: Trial · 5d).",
          "Na página de Assinatura, você vê a data exata de vencimento e o que acontece ao final.",
          "O sistema envia notificações diárias avisando sobre o prazo e orientando sobre como assinar.",
          "Ao final do trial sem assinatura, a conta é suspensa: seus dados ficam preservados, mas não é possível criar novos registros até assinar um plano.",
        ],
        tip: "Aproveite o trial para configurar tudo: serviços, profissionais, automações e o link de agendamento online.",
      },
      {
        title: "Comparação dos planos",
        steps: [
          "Plus (R$ 149/mês): até 5 profissionais, 400 notificações WhatsApp, múltiplos caixas e IA financeira.",
          "Pro (R$ 299/mês): até 20 profissionais, 1.000 notificações WhatsApp via API dedicada, IA completa.",
          "Todos os planos pagos têm opção mensal ou anual (desconto de ~17% no anual).",
        ],
        tip: "No plano Pro, o WhatsApp usa uma API dedicada mais robusta — maior estabilidade e sem dependência do celular ligado.",
      },
      {
        title: "Como assinar ou fazer upgrade",
        steps: [
          "Clique em Assinatura no menu lateral.",
          "Clique em Ver Planos ou Fazer Upgrade.",
          "Escolha o plano e a periodicidade (mensal ou anual).",
          "Clique em Contratar e conclua o pagamento na tela segura do Stripe.",
          "O plano é ativado imediatamente após a confirmação do pagamento.",
          "Após o pagamento, a tela de sucesso exibe os recursos desbloqueados e os próximos passos.",
          "Para o plano Pro: um card de onboarding WhatsApp aparece na tela de sucesso com os 3 passos para ativar a API dedicada.",
        ],
        tip: "No plano Pro, a equipe Hubly recebe uma notificação automática ao confirmar o pagamento e configura a instância Z-API em até 24h úteis.",
      },
      {
        title: "Limite de profissionais (seats) por plano",
        steps: [
          "Cada plano tem um limite de profissionais ativos: Solo (1), Plus (5), Pro (20).",
          "Ao atingir o limite, o sistema bloqueia o cadastro de novos profissionais até o upgrade.",
          "O contador de profissionais ativos aparece na página de Assinatura.",
          "Profissionais inativos não contam para o limite.",
        ],
        warning: "Se você precisar adicionar mais profissionais do que o plano permite, faça upgrade antes de tentar o cadastro.",
      },
      {
        title: "Cancelar a assinatura",
        steps: [
          "Acesse Assinatura no menu lateral.",
          "Role até a seção de ações e clique em Cancelar assinatura.",
          "Um diálogo de confirmação aparece explicando o que acontece após o cancelamento.",
          "Confirme para ser redirecionado ao portal do Stripe e concluir o cancelamento.",
          "O acesso continua ativo até o fim do período já pago.",
        ],
        warning: "Após o cancelamento, não será possível criar novos agendamentos, clientes, profissionais ou lançamentos financeiros. Os dados existentes são mantidos.",
      },
      {
        title: "Reativar após cancelamento",
        steps: [
          "Acesse Assinatura no menu lateral.",
          "Um banner vermelho indica que a assinatura está cancelada.",
          "Clique em Reativar assinatura para ser levado à página de planos.",
          "Escolha um plano e conclua o pagamento normalmente.",
          "O acesso é restaurado imediatamente após a confirmação.",
        ],
      },
      {
        title: "O que acontece quando atinge o limite?",
        steps: [
          "Quando você chega a 80% do limite, um alerta aparece no topo da tela.",
          "Ao atingir 100%, não será possível cadastrar novos registros daquele tipo.",
          "Faça upgrade na página de Planos para ampliar os limites.",
        ],
        warning: "Fique de olho nos alertas! Atingir o limite pode impedir novos cadastros de clientes ou agendamentos.",
      },
    ],
  },
  {
    id: "ia-insights",
    icon: <Brain size={20} />,
    title: "IA e Insights",
    subtitle: "Inteligência artificial para clientes e financeiro",
    color: "oklch(45% 0.20 280)",
    intro: "O Hubly conta com inteligência artificial integrada para ajudar você a tomar decisões melhores e criar conteúdo de marketing. Disponível nos planos Plus (IA Financeira) e Pro (IA Completa + IA Marketing), além do trial gratuito com acesso total.",
    topics: [
      {
        title: "Insights de Clientes",
        steps: [
          "Acesse IA e Insights no menu lateral (visível apenas para administradores).",
          "A aba Clientes mostra uma análise automática da sua base: clientes fiéis, bons pagadores, inativos e em risco de perda.",
          "Cada cliente recebe uma classificação: Cliente Fiel, Em Crescimento, Em Risco de Perda, Bom Pagador, etc.",
          "Clique em um insight para ver o detalhe e marcar como lido.",
          "Use o botão Marcar todos como lidos para limpar os alertas pendentes.",
        ],
        tip: "Os insights são gerados automaticamente com base no histórico de agendamentos. Quanto mais dados no sistema, mais precisas as análises.",
      },
      {
        title: "IA Financeira (Plus e Pro)",
        steps: [
          "A aba Financeiro mostra um Score Financeiro de 0 a 100 calculado automaticamente.",
          "O score é baseado em: regularidade de receita, controle de despesas, crescimento mensal e saúde do fluxo de caixa.",
          "Abaixo do score, você vê os motivos da pontuação e dicas de melhoria personalizadas.",
          "Alertas proativos aparecem quando o sistema detecta anomalias: queda de receita, aumento de despesas ou meses abaixo da média.",
          "Clique em Recalcular análise para atualizar o score com os dados mais recentes.",
        ],
        tip: "Leia os alertas proativos com atenção — eles identificam padrões que podem passar despercebidos no dia a dia.",
      },
      {
        title: "Chat com a IA",
        steps: [
          "Tanto na aba de Clientes quanto na de Financeiro há um chat integrado com a IA.",
          "Faça perguntas em português sobre seus dados: Quais clientes não voltam há mais de 60 dias? ou Qual foi meu melhor mês do ano?",
          "A IA responde com base nos dados reais da sua empresa.",
          "O histórico do chat é salvo durante a sessão.",
        ],
        tip: "Use o chat para explorar os dados de forma conversacional. Exemplos: Quem são meus clientes em risco?, Qual serviço gera mais receita?, Como está meu fluxo de caixa nos últimos 3 meses?",
      },
      {
        title: "Quem pode acessar a IA?",
        steps: [
          "O menu de IA e Insights é visível apenas para usuários com perfil de Administrador.",
          "Trial (7 dias): acesso total a toda a IA — IA Financeira, IA Clientes e IA Marketing.",
          "Plano Solo: sem acesso a nenhum recurso de IA.",
          "Plano Plus: acesso à IA Financeira (Score Financeiro, alertas e chat financeiro).",
          "Plano Pro: acesso completo — IA Financeira + IA Clientes + IA Marketing & Redes Sociais.",
          "Ao tentar acessar um recurso de IA fora do plano, o sistema exibe um banner de upgrade com link para a página de planos.",
        ],
        tip: "O bloqueio é feito tanto no servidor quanto na interface. Mesmo que o menu apareça, as análises só são geradas se o plano tiver o recurso habilitado.",
      },
    ],
  },
  {
    id: "configuracoes",
    icon: <Settings size={20} />,
    title: "Configurações",
    subtitle: "Personalize o sistema para o seu negócio",
    color: "oklch(45% 0.050 55)",
    intro: "Nas Configurações você ajusta tudo sobre o seu negócio: nome, horários, cores, link de agendamento online e muito mais.",
    topics: [
      {
        title: "Dados do negócio",
        steps: [
          "Preencha o nome, telefone, endereço e CNPJ.",
          "Faça upload do logotipo.",
          "Defina o horário de funcionamento.",
          "Salve as alterações.",
        ],
      },
      {
        title: "Link de agendamento online",
        steps: [
          "Você pode ter um link personalizado para seus clientes agendarem online.",
          "Exemplo: hubly.manus.space/agendar/meu-salao",
          "Defina o seu link nas configurações.",
          "Compartilhe esse link no Instagram, WhatsApp ou onde preferir.",
        ],
        tip: "O link de agendamento online é gratuito e está incluído em todos os planos.",
      },
      {
        title: "Configurar reserva de horário",
        steps: [
          "Defina se quer cobrar um valor de reserva ao agendar online.",
          "Configure o percentual do valor adiantado (ex: 30% do serviço).",
          "Defina em quantas horas o pré-agendamento expira se não for confirmado.",
        ],
      },
      {
        title: "Personalizar as cores do sistema",
        steps: [
          "Na seção Aparência, escolha a cor principal do sistema.",
          "As cores são aplicadas nos botões e destaques.",
          "Salve para aplicar.",
        ],
      },
    ],
  },
  {
    id: "suporte",
    icon: <HelpCircle size={20} />,
    title: "Precisa de Ajuda?",
    subtitle: "O assistente de suporte está sempre disponível",
    color: "oklch(45% 0.18 30)",
    intro: "Se você tiver alguma dúvida sobre como usar o sistema, o assistente de suporte está aqui para ajudar. É como ter um especialista disponível 24 horas por dia, 7 dias por semana.",
    topics: [
      {
        title: "Como acessar o suporte",
        steps: [
          "Role até o final do menu lateral e clique em Suporte.",
          "O chat de suporte abre na lateral da tela.",
          "Digite sua dúvida em português e pressione Enter.",
          "O assistente responde em segundos, com base no manual e nas funcionalidades do sistema.",
        ],
        tip: "Pode perguntar qualquer coisa! O assistente entende perguntas do tipo: Como cancelo um agendamento? ou Onde vejo as comissões?",
      },
      {
        title: "O que o suporte consegue responder?",
        steps: [
          "Como usar qualquer funcionalidade do sistema.",
          "O que significa cada tela, botão ou status.",
          "Como configurar automações, permissões e pacotes.",
          "Dúvidas sobre planos e assinatura.",
          "Qualquer problema ou dificuldade no uso do dia a dia.",
        ],
      },
    ],
  },
];

/* ─── Component ──────────────────────────────────────────── */
export default function Manual() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const current = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0];

  const filteredSections = search.trim()
    ? SECTIONS.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.subtitle.toLowerCase().includes(search.toLowerCase()) ||
          s.topics.some(
            (t) =>
              t.title.toLowerCase().includes(search.toLowerCase()) ||
              t.steps.some((step) => step.toLowerCase().includes(search.toLowerCase()))
          )
      )
    : SECTIONS;

  return (
    <div className="flex h-full" style={{ background: "var(--background)" }}>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          shrink-0 flex flex-col border-r
          ${mobileMenuOpen ? "fixed inset-y-0 left-0 z-50 w-72" : "hidden md:flex w-64"}
        `}
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {/* Sidebar header */}
        <div className="px-5 py-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "oklch(45% 0.060 55)", color: "white" }}
              >
                <BookOpen size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold">Manual do Sistema</p>
                <p className="text-xs text-muted-foreground">Guia completo de uso</p>
              </div>
            </div>
            <button
              className="md:hidden p-1 rounded"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar no manual..."
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {filteredSections.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum resultado encontrado.</p>
          )}
          {filteredSections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5"
              style={{
                background: activeSection === section.id ? section.color + "18" : "transparent",
                color: activeSection === section.id ? section.color : "var(--muted-foreground)",
                fontWeight: activeSection === section.id ? 600 : 400,
              }}
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: activeSection === section.id ? section.color : "var(--muted)",
                  color: activeSection === section.id ? "white" : "var(--muted-foreground)",
                }}
              >
                {section.icon}
              </span>
              <span className="text-sm leading-tight">{section.title}</span>
              {activeSection === section.id && (
                <ChevronRight size={14} className="ml-auto shrink-0" />
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-[11px] text-muted-foreground">Dúvidas? Use o chat de Suporte</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div
          className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b md:hidden"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg"
            style={{ background: "var(--muted)" }}
          >
            <BookOpen size={16} />
          </button>
          <span className="text-sm font-semibold">{current.title}</span>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Section header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: current.color, color: "white" }}
              >
                {current.icon}
              </div>
              <div>
                <h1 className="text-xl font-bold">{current.title}</h1>
                <p className="text-sm text-muted-foreground">{current.subtitle}</p>
              </div>
            </div>
            <p
              className="text-sm leading-relaxed px-4 py-3 rounded-xl"
              style={{ background: current.color + "10", color: "var(--foreground)" }}
            >
              {current.intro}
            </p>
          </div>

          {/* Topics */}
          <div className="space-y-6">
            {current.topics.map((topic, i) => (
              <div
                key={i}
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: "var(--border)" }}
              >
                {/* Topic header */}
                <div
                  className="px-5 py-3 border-b"
                  style={{
                    background: current.color + "0d",
                    borderColor: current.color + "30",
                  }}
                >
                  <h2 className="text-sm font-semibold" style={{ color: current.color }}>
                    {topic.title}
                  </h2>
                </div>

                {/* Steps */}
                <div className="px-5 py-4" style={{ background: "var(--card)" }}>
                  <ol className="space-y-2.5">
                    {topic.steps.map((step, j) => (
                      <li key={j} className="flex gap-3 text-sm">
                        <span
                          className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
                          style={{ background: current.color + "20", color: current.color }}
                        >
                          {j + 1}
                        </span>
                        <span className="leading-relaxed text-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>

                  {/* Tip */}
                  {topic.tip && (
                    <div
                      className="mt-4 flex gap-2.5 px-3 py-2.5 rounded-lg text-sm"
                      style={{ background: "oklch(62% 0.18 155 / 10%)", color: "oklch(35% 0.14 155)" }}
                    >
                      <span className="shrink-0 font-bold">💡</span>
                      <span className="leading-relaxed">{topic.tip}</span>
                    </div>
                  )}

                  {/* Warning */}
                  {topic.warning && (
                    <div
                      className="mt-3 flex gap-2.5 px-3 py-2.5 rounded-lg text-sm"
                      style={{ background: "oklch(58% 0.22 25 / 10%)", color: "oklch(40% 0.18 25)" }}
                    >
                      <span className="shrink-0 font-bold">⚠️</span>
                      <span className="leading-relaxed">{topic.warning}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Navigation footer */}
          <div className="flex justify-between mt-10 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
            {(() => {
              const idx = SECTIONS.findIndex((s) => s.id === activeSection);
              const prev = SECTIONS[idx - 1];
              const next = SECTIONS[idx + 1];
              return (
                <>
                  {prev ? (
                    <button
                      onClick={() => setActiveSection(prev.id)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronRight size={14} className="rotate-180" />
                      <span>{prev.title}</span>
                    </button>
                  ) : <div />}
                  {next ? (
                    <button
                      onClick={() => setActiveSection(next.id)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>{next.title}</span>
                      <ChevronRight size={14} />
                    </button>
                  ) : <div />}
                </>
              );
            })()}
          </div>
        </div>
      </main>
    </div>
  );
}
