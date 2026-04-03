import { useState } from "react";
import { Link } from "wouter";
import {
  Calendar, Users, UserCheck, Scissors, DollarSign, Zap,
  Kanban, Brain, Download, Settings, ChevronRight,
  CheckCircle2, ArrowRight, Lock, Globe, BarChart2,
  MessageSquare, HelpCircle, BookOpen, Search, Menu, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/* ─── Types ─────────────────────────────────────────────── */
interface Step {
  text: string;
}

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
    title: "Primeiros Passos",
    subtitle: "Configure o sistema antes de começar",
    color: "oklch(45% 0.18 155)",
    intro: "Antes de usar o sistema no dia a dia, é importante configurar as informações da sua empresa, cadastrar seus serviços e profissionais. Siga esta ordem para uma configuração tranquila.",
    topics: [
      {
        title: "Configurar os dados da empresa",
        steps: [
          "No menu lateral, clique em Configurações.",
          "Preencha o nome do salão, telefone, endereço e horário de funcionamento.",
          "Faça o upload do logotipo se desejar.",
          "Clique em Salvar para confirmar.",
        ],
        tip: "O nome e logotipo aparecem no portal de agendamento online que seus clientes acessam.",
      },
      {
        title: "Cadastrar serviços",
        steps: [
          "Vá em Serviços no menu lateral.",
          "Clique em Novo Serviço.",
          "Informe o nome, duração (em minutos), preço e categoria.",
          "Defina o percentual de comissão padrão do serviço (ex: 40%). Esse valor será preenchido automaticamente ao concluir um agendamento.",
          "Salve o serviço.",
        ],
        tip: "O percentual de comissão do serviço tem prioridade sobre o percentual do profissional. Se não definido no serviço, o sistema usa o percentual do profissional.",
      },
      {
        title: "Cadastrar profissionais",
        steps: [
          "Vá em Profissionais no menu lateral.",
          "Clique em Novo Profissional.",
          "Informe o nome, especialidades e percentual de comissão.",
          "Salve o profissional.",
        ],
      },
      {
        title: "Criar usuários do sistema",
        steps: [
          "Vá em Usuários no menu lateral.",
          "Clique em Novo Usuário.",
          "Informe nome, e-mail e senha (mínimo 6 caracteres).",
          "Atribua um grupo de permissão (Administrador, Recepcionista, etc.).",
          "Salve o usuário.",
        ],
        tip: "Cada colaborador que precisar acessar o sistema deve ter um usuário cadastrado com e-mail e senha próprios.",
      },
    ],
  },
  {
    id: "agendamentos",
    icon: <Calendar size={20} />,
    title: "Agendamentos",
    subtitle: "Gerencie toda a agenda do salão",
    color: "oklch(45% 0.18 264)",
    intro: "O módulo de agendamentos é o coração do Agendei. Aqui você cria, confirma, cancela e acompanha todos os atendimentos do salão.",
    topics: [
      {
        title: "Criar um novo agendamento",
        steps: [
          "Clique no botão Novo Agendamento no canto superior direito.",
          "Selecione o cliente (ou cadastre um novo clicando em + Novo Cliente).",
          "Escolha o serviço desejado.",
          "Selecione o profissional responsável.",
          "Escolha a data e o horário disponível.",
          "Clique em Confirmar Agendamento.",
        ],
        tip: "Você também pode criar um agendamento clicando diretamente em um horário vazio no Calendário.",
      },
      {
        title: "Confirmar um pré-agendamento",
        steps: [
          "Vá em Agendamentos no menu lateral.",
          "Clique na aba Pré-agendamentos.",
          "Localize o pré-agendamento pendente.",
          "Clique em Confirmar para aprovar ou Cancelar para recusar.",
        ],
        tip: "Pré-agendamentos são criados quando o cliente agenda pelo portal online. Eles ficam pendentes por 24 horas aguardando sua confirmação.",
        warning: "Se não confirmado em 24 horas, o pré-agendamento é cancelado automaticamente e o horário é liberado.",
      },
      {
        title: "Cancelar ou remarcar um agendamento",
        steps: [
          "Abra o agendamento clicando sobre ele na lista ou no calendário.",
          "Para cancelar: clique em Cancelar e confirme a ação.",
          "Para remarcar: clique em Editar, altere a data/hora e salve.",
        ],
      },
      {
        title: "Registrar comparecimento ou falta",
        steps: [
          "Abra o agendamento.",
          "Clique em Compareceu para registrar que o cliente chegou.",
          "Ou clique em Faltou para registrar ausência.",
        ],
        tip: "Esses registros alimentam o histórico do cliente e as análises de IA.",
      },
    ],
  },
  {
    id: "calendario",
    icon: <Calendar size={20} />,
    title: "Calendário",
    subtitle: "Visualize a agenda de forma clara",
    color: "oklch(45% 0.20 30)",
    intro: "O Calendário oferece uma visão completa da agenda do salão, com colunas por profissional e cores por status de agendamento.",
    topics: [
      {
        title: "Navegar pelo calendário",
        steps: [
          "Use as setas para avançar ou voltar entre semanas.",
          "Clique em Hoje para voltar à data atual.",
          "Alterne entre visualização Semanal e Diária usando os botões no topo.",
        ],
      },
      {
        title: "Criar agendamento pelo calendário",
        steps: [
          "Clique em qualquer horário vazio na coluna do profissional desejado.",
          "O formulário de novo agendamento abrirá com a data, hora e profissional já preenchidos.",
          "Complete os demais campos e confirme.",
        ],
      },
      {
        title: "Entender as cores dos agendamentos",
        steps: [
          "Azul: agendamento confirmado.",
          "Amarelo/laranja: pré-agendamento aguardando confirmação.",
          "Verde: cliente compareceu.",
          "Vermelho: cancelado ou falta.",
          "Cinza: bloqueio de agenda.",
        ],
      },
      {
        title: "Solicitar bloqueio de agenda",
        steps: [
          "Vá em Bloqueios no menu lateral.",
          "Clique em Solicitar Bloqueio.",
          "Informe o profissional, data, horário de início e fim, e o motivo.",
          "Aguarde a aprovação do administrador.",
        ],
        tip: "Bloqueios aprovados aparecem no calendário como horários indisponíveis.",
      },
    ],
  },
  {
    id: "clientes",
    icon: <Users size={20} />,
    title: "Clientes",
    subtitle: "Gerencie o relacionamento com seus clientes",
    color: "oklch(45% 0.18 300)",
    intro: "O módulo de clientes centraliza todas as informações sobre cada pessoa que frequenta o salão, incluindo histórico de atendimentos, prontuários e análises de IA.",
    topics: [
      {
        title: "Cadastrar um novo cliente",
        steps: [
          "Vá em Clientes no menu lateral.",
          "Clique em Novo Cliente.",
          "Preencha nome, telefone, e-mail e data de nascimento.",
          "Adicione observações ou tags se necessário.",
          "Salve o cadastro.",
        ],
        tip: "O telefone é importante para as automações de WhatsApp funcionarem corretamente.",
      },
      {
        title: "Ver histórico de um cliente",
        steps: [
          "Na lista de clientes, clique no nome do cliente.",
          "A aba Histórico mostra todos os agendamentos anteriores.",
          "Você pode ver data, serviço, profissional e status de cada atendimento.",
        ],
      },
      {
        title: "Adicionar prontuário ou foto",
        steps: [
          "Abra o perfil do cliente.",
          "Clique na aba Prontuário.",
          "Adicione anotações sobre o atendimento, alergias, preferências, etc.",
          "Para fotos, clique em Adicionar Foto e faça o upload.",
        ],
        tip: "Prontuários são visíveis apenas para usuários com permissão de acesso.",
      },
      {
        title: "Ver análise IA do cliente",
        steps: [
          "Abra o perfil do cliente.",
          "Role até a seção Análise IA.",
          "Veja a classificação do cliente (Principal, Em crescimento, Inativo, etc.).",
          "Leia o resumo gerado automaticamente com insights sobre o comportamento do cliente.",
        ],
        tip: "A análise é gerada automaticamente quando você usa a função Analisar Clientes em IA Clientes.",
      },
    ],
  },
  {
    id: "financeiro",
    icon: <DollarSign size={20} />,
    title: "Financeiro",
    subtitle: "Controle receitas, custos e comissões",
    color: "oklch(45% 0.18 155)",
    intro: "O módulo financeiro permite acompanhar a saúde financeira do salão, registrar receitas e despesas, e calcular as comissões dos profissionais.",
    topics: [
      {
        title: "Registrar uma receita",
        steps: [
          "Vá em Financeiro no menu lateral.",
          "Clique em Nova Receita.",
          "Informe o valor, descrição, data e categoria.",
          "Associe a um profissional se for comissão.",
          "Salve o registro.",
        ],
      },
      {
        title: "Registrar um custo",
        steps: [
          "Vá em Financeiro no menu lateral.",
          "Clique em Novo Custo.",
          "Informe o valor, descrição, data e categoria.",
          "Salve o registro.",
        ],
      },
      {
        title: "Registrar comissão ao concluir atendimento",
        steps: [
          "Ao clicar em Concluído em um agendamento, o sistema abre automaticamente o modal de comissão.",
          "O percentual já vem preenchido com o valor configurado no serviço (ou no profissional, como fallback).",
          "Selecione o tipo de pagamento: Dinheiro, PIX, Cartão Débito, Cartão Crédito ou Outro.",
          "Informe o custo de reposição de produtos, se houver (opcional).",
          "Veja a prévia do cálculo antes de confirmar.",
          "Clique em Registrar Comissão ou Pular se não quiser registrar agora.",
        ],
        tip: "O percentual de comissão do serviço tem prioridade sobre o do profissional. Configure o percentual em Serviços para que seja preenchido automaticamente.",
      },
      {
        title: "Ver comissões dos profissionais",
        steps: [
          "Na tela de Financeiro, vá para a aba Comissões.",
          "Selecione o período desejado.",
          "Veja o valor de comissão calculado para cada profissional.",
        ],
        tip: "O percentual de comissão pode ser definido tanto no cadastro do profissional quanto no cadastro do serviço. O serviço tem prioridade.",
      },
      {
        title: "Usar a IA Financeira",
        steps: [
          "Vá em IA Financeira no menu lateral (grupo IA Inteligente).",
          "Clique em Calcular Score para gerar a análise.",
          "Veja a nota de 0 a 100 e o status (Saudável, Atenção ou Risco).",
          "Leia os alertas proativos gerados automaticamente.",
          "Use o chat para fazer perguntas sobre os dados financeiros do salão.",
        ],
      },
    ],
  },
  {
    id: "automacoes",
    icon: <Zap size={20} />,
    title: "Automações",
    subtitle: "Envie mensagens automáticas no momento certo",
    color: "oklch(45% 0.20 75)",
    intro: "As automações permitem enviar mensagens de WhatsApp automaticamente para os clientes com base em eventos do salão, como confirmação de agendamento, aniversário ou lembrete.",
    topics: [
      {
        title: "Criar uma automação",
        steps: [
          "Vá em Automações no menu lateral.",
          "Clique em Nova Automação.",
          "Dê um nome para a automação.",
          "No canvas, adicione um nó de Gatilho (o que dispara a mensagem).",
          "Adicione um nó de Ação (Enviar WhatsApp) e escreva a mensagem.",
          "Conecte os nós arrastando da saída de um para a entrada do outro.",
          "Ative a automação com o toggle no topo.",
        ],
        tip: "Use variáveis como {{nome_cliente}}, {{servico}}, {{data}}, {{hora}} e {{profissional}} para personalizar as mensagens.",
      },
      {
        title: "Tipos de gatilho disponíveis",
        steps: [
          "Agendamento criado: dispara quando um novo agendamento é feito.",
          "Agendamento confirmado: dispara na confirmação.",
          "Agendamento cancelado: dispara no cancelamento.",
          "Aniversário: dispara no mês do aniversário do cliente.",
          "Data fixa: dispara em uma data específica (ex: Natal).",
          "Dias antes do evento: dispara X dias antes do agendamento.",
        ],
      },
      {
        title: "Adicionar um delay (atraso)",
        steps: [
          "No canvas, adicione um nó de Delay entre o gatilho e a ação.",
          "Defina quantas horas ou dias de espera.",
          "Conecte: Gatilho > Delay > Ação.",
        ],
        tip: "Use delay para enviar um lembrete 24h antes do agendamento, por exemplo.",
      },
      {
        title: "Ver mensagens enviadas",
        steps: [
          "Em Automações, clique na aba Caixa de Saída.",
          "Veja todas as mensagens disparadas com nome do cliente, telefone, data e status.",
        ],
      },
    ],
  },
  {
    id: "pipeline",
    icon: <Kanban size={20} />,
    title: "Pipeline",
    subtitle: "Organize leads e oportunidades no Kanban",
    color: "oklch(45% 0.18 264)",
    intro: "O Pipeline é um quadro Kanban para organizar leads, oportunidades de venda ou qualquer fluxo de trabalho que precise de acompanhamento visual.",
    topics: [
      {
        title: "Criar um pipeline",
        steps: [
          "Vá em Pipeline no menu lateral.",
          "Clique em Configurar.",
          "Clique em + Novo Pipeline e dê um nome.",
          "Adicione colunas clicando em + Nome da coluna.",
          "Salve as configurações.",
        ],
      },
      {
        title: "Criar um cartão",
        steps: [
          "No board do pipeline, clique em + no topo de uma coluna.",
          "Informe o título do cartão.",
          "Adicione detalhes, lembrete e vincule um cliente se necessário.",
          "Defina o status: Em andamento, Congelado, Cancelado ou Concluído.",
          "Salve o cartão.",
        ],
      },
      {
        title: "Mover cartões entre colunas",
        steps: [
          "Arraste o cartão para a coluna desejada.",
          "O cartão é salvo automaticamente na nova posição.",
        ],
      },
    ],
  },
  {
    id: "ia-inteligente",
    icon: <Brain size={20} />,
    title: "IA Inteligente",
    subtitle: "Análises automáticas com inteligência artificial",
    color: "oklch(45% 0.18 300)",
    intro: "O módulo de IA Inteligente usa inteligência artificial para analisar os dados do seu salão e gerar insights valiosos sobre finanças e comportamento dos clientes.",
    topics: [
      {
        title: "Calcular o Score Financeiro",
        steps: [
          "Vá em IA Financeira no menu lateral.",
          "Clique em Calcular Score.",
          "Aguarde alguns segundos enquanto a IA analisa os dados.",
          "Veja a nota de 0 a 100 e o status: Saudável (verde), Atenção (amarelo) ou Risco (vermelho).",
          "Leia a explicação detalhada com os pontos fortes e fracos.",
        ],
        tip: "O score é calculado com base em 10 fatores: receita, comissões, ticket médio, taxa de conversão, entre outros.",
      },
      {
        title: "Usar o chat financeiro",
        steps: [
          "Na página IA Financeira, use o chat no lado direito.",
          "Faça perguntas como: 'Qual mês teve mais receita?' ou 'Quais serviços geram mais lucro?'",
          "A IA responde com base nos dados reais do seu salão.",
        ],
      },
      {
        title: "Analisar clientes com IA",
        steps: [
          "Vá em IA Clientes no menu lateral.",
          "Clique em Analisar Clientes.",
          "Aguarde a análise ser concluída.",
          "Veja o ranking de clientes por classificação: Principal, Bom pagador, Em crescimento, Em queda, Inativo, Risco.",
          "Clique em um cliente para ver o resumo detalhado.",
        ],
        warning: "São necessários pelo menos 3 clientes com histórico de 30 dias para gerar a análise.",
      },
    ],
  },
  {
    id: "importacao-zandu",
    icon: <Download size={20} />,
    title: "Importação Zandu",
    subtitle: "Migre seus dados do Zandu para o Agendei",
    color: "oklch(45% 0.18 30)",
    intro: "Se você usava o Zandu antes, pode importar todos os seus dados para o Agendei em poucos minutos. O processo é simples e seguro.",
    topics: [
      {
        title: "Obter o token de API do Zandu",
        steps: [
          "Acesse o Zandu (pro.zandu.com.br).",
          "Vá em Ferramentas > API (no menu superior direito).",
          "Clique em + Novo Token.",
          "Copie o token gerado.",
        ],
        tip: "O token começa com letras e números e tem cerca de 30 caracteres.",
      },
      {
        title: "Importar dados no Agendei",
        steps: [
          "No Agendei, vá em Configurações > Importação Zandu.",
          "Cole o token de API do Zandu.",
          "Selecione o tipo de dado a importar: Clientes, Serviços, Profissionais ou Agendamentos.",
          "Clique em Visualizar para ver um preview dos dados.",
          "Confirme a importação clicando em Importar.",
        ],
        warning: "Importe sempre nesta ordem: 1. Clientes, 2. Serviços, 3. Profissionais, 4. Agendamentos. Importar agendamentos antes dos outros dados causará erros.",
      },
      {
        title: "Verificar o resultado da importação",
        steps: [
          "Após a importação, veja o resumo com quantos registros foram importados com sucesso, quantos eram duplicados e quantos tiveram erro.",
          "Registros duplicados são ignorados automaticamente.",
          "Em caso de erro, verifique se os dados dependentes foram importados antes.",
        ],
      },
    ],
  },
  {
    id: "portal-cliente",
    icon: <Globe size={20} />,
    title: "Portal do Cliente",
    subtitle: "Agendamento online para seus clientes",
    color: "oklch(45% 0.18 155)",
    intro: "O Portal do Cliente é uma página pública onde seus clientes podem agendar online, sem precisar ligar ou mandar mensagem.",
    topics: [
      {
        title: "Acessar o link do portal",
        steps: [
          "Vá em Configurações no menu lateral.",
          "Na seção Portal do Cliente, copie o link público.",
          "Compartilhe o link com seus clientes via WhatsApp, Instagram ou site.",
        ],
      },
      {
        title: "Como o cliente agenda online",
        steps: [
          "O cliente acessa o link do portal.",
          "Escolhe o serviço desejado.",
          "Seleciona o profissional de preferência (ou qualquer disponível).",
          "Escolhe a data e o horário disponível.",
          "Informa nome e telefone.",
          "Confirma o agendamento.",
        ],
        tip: "O agendamento feito pelo portal entra como pré-agendamento e precisa ser confirmado por você no sistema.",
      },
    ],
  },
  {
    id: "pacotes",
    icon: <BarChart2 size={20} />,
    title: "Pacotes",
    subtitle: "Venda combinações de serviços com desconto",
    color: "oklch(45% 0.18 30)",
    intro: "O módulo de Pacotes permite criar combinações de serviços que podem ser vendidas juntas com preço especial. É ideal para fidelizar clientes e aumentar o ticket médio.",
    topics: [
      {
        title: "Criar um pacote de serviços",
        steps: [
          "Vá em Pacotes no menu lateral.",
          "Clique em Novo Pacote.",
          "Informe o nome do pacote e o preço total.",
          "Adicione os serviços incluídos no pacote e a quantidade de cada um.",
          "Defina a validade do pacote em dias.",
          "Salve o pacote.",
        ],
        tip: "Pacotes são ótimos para serviços recorrentes como escova + hidratação ou combo de estética.",
      },
      {
        title: "Vender um pacote para um cliente",
        steps: [
          "No perfil do cliente ou na tela de Pacotes, clique em Vender Pacote.",
          "Selecione o cliente e o pacote desejado.",
          "Confirme a venda.",
          "O pacote fica registrado no histórico do cliente com os créditos disponíveis.",
        ],
      },
      {
        title: "Usar créditos do pacote em um agendamento",
        steps: [
          "Ao criar um agendamento para um cliente que possui pacote ativo, o sistema exibe os créditos disponíveis.",
          "Selecione o pacote para descontar o serviço automaticamente.",
          "O saldo de créditos é atualizado após o uso.",
        ],
        tip: "Pacotes expirados não podem ser utilizados. Verifique a validade antes de vender.",
      },
    ],
  },
  {
    id: "whatsapp",
    icon: <MessageSquare size={20} />,
    title: "WhatsApp",
    subtitle: "Integração com WhatsApp Business",
    color: "oklch(45% 0.18 155)",
    intro: "O módulo de WhatsApp permite integrar o sistema com sua conta do WhatsApp Business para envio de mensagens automáticas e manuais diretamente pelo painel.",
    topics: [
      {
        title: "Configurar a integração com WhatsApp",
        steps: [
          "Vá em WhatsApp no menu lateral.",
          "Clique em Conectar WhatsApp.",
          "Escaneie o QR Code com o celular onde está o WhatsApp Business da empresa.",
          "Aguarde a conexão ser estabelecida (status fica verde).",
        ],
        warning: "Use apenas o WhatsApp Business da empresa. Não conecte o WhatsApp pessoal para evitar bloqueios.",
      },
      {
        title: "Enviar mensagem manual para um cliente",
        steps: [
          "Vá em WhatsApp no menu lateral.",
          "Clique em Nova Mensagem.",
          "Selecione o cliente ou informe o número do telefone.",
          "Digite a mensagem e clique em Enviar.",
        ],
        tip: "As mensagens enviadas ficam registradas no histórico do cliente.",
      },
      {
        title: "Configurar mensagens automáticas",
        steps: [
          "As mensagens automáticas são configuradas no módulo de Automações.",
          "Crie uma automação com o gatilho desejado (ex: Agendamento Confirmado).",
          "Adicione a ação Enviar WhatsApp e escreva a mensagem.",
          "Ative a automação para começar a enviar automaticamente.",
        ],
      },
    ],
  },
  {
    id: "assinatura",
    icon: <Lock size={20} />,
    title: "Assinatura e Planos",
    subtitle: "Gerencie seu plano e recursos disponíveis",
    color: "oklch(45% 0.18 264)",
    intro: "O sistema oferece diferentes planos com recursos e limites distintos. Você pode visualizar seu plano atual, fazer upgrade e acompanhar o uso dos recursos diretamente pelo painel.",
    topics: [
      {
        title: "Ver o plano atual",
        steps: [
          "O plano atual é exibido no header do sistema (canto superior direito no mobile).",
          "Para ver os detalhes completos, vá em Assinatura no menu lateral.",
          "Veja os recursos incluídos e os limites do seu plano.",
        ],
        tip: "O sistema exibe um alerta automático quando você atingir 80% do limite de qualquer recurso do seu plano.",
      },
      {
        title: "Fazer upgrade de plano",
        steps: [
          "Vá em Assinatura no menu lateral.",
          "Clique em Ver Planos.",
          "Escolha o plano desejado (SOLO, PLUS ou PRO).",
          "Clique em Contratar e será redirecionado para o checkout seguro.",
          "Após o pagamento, o plano é ativado automaticamente.",
        ],
        tip: "Use o cartão 4242 4242 4242 4242 para testar o checkout em ambiente de testes.",
      },
      {
        title: "Alertas de limite de plano",
        steps: [
          "O sistema monitora automaticamente o uso de recursos como clientes, agendamentos e profissionais.",
          "Quando você atingir 80% do limite, um alerta aparece no topo da tela.",
          "Clique no alerta para ver qual recurso está próximo do limite.",
          "Clique em Fazer Upgrade para ampliar os limites.",
        ],
        warning: "Ao atingir 100% do limite, não será possível cadastrar novos registros até fazer upgrade do plano.",
      },
    ],
  },
  {
    id: "suporte",
    icon: <HelpCircle size={20} />,
    title: "Suporte",
    subtitle: "Tire dúvidas e obtenha ajuda",
    color: "oklch(45% 0.18 30)",
    intro: "O sistema possui um assistente de suporte integrado que responde dúvidas sobre o uso do sistema em tempo real, sem precisar sair da plataforma.",
    topics: [
      {
        title: "Acessar o chat de suporte",
        steps: [
          "No menu lateral, role até o final e clique em Suporte (ícone de fone de ouvido).",
          "O painel de chat de suporte abre na lateral.",
          "Digite sua dúvida e pressione Enter ou clique em Enviar.",
          "O assistente responde com base no manual e nas funcionalidades do sistema.",
        ],
        tip: "O suporte está disponível 24 horas por dia, 7 dias por semana, sem espera.",
      },
      {
        title: "Tipos de dúvidas que o suporte responde",
        steps: [
          "Como usar qualquer funcionalidade do sistema.",
          "Explicações sobre relatórios e dados do dashboard.",
          "Orientações sobre configuração de automações.",
          "Dúvidas sobre planos e assinatura.",
          "Problemas com agendamentos, clientes ou financeiro.",
        ],
      },
    ],
  },
  {
    id: "configuracoes",
    icon: <Settings size={20} />,
    title: "Configurações",
    subtitle: "Personalize o sistema para o seu salão",
    color: "oklch(45% 0.10 250)",
    intro: "Na tela de Configurações você ajusta todas as preferências do sistema: dados da empresa, horários, cores, integrações e muito mais.",
    topics: [
      {
        title: "Dados da empresa",
        steps: [
          "Informe nome do salão, telefone, endereço e CNPJ.",
          "Faça upload do logotipo.",
          "Defina o horário de funcionamento (início e fim do expediente).",
          "Salve as alterações.",
        ],
      },
      {
        title: "Configurar reserva de horário",
        steps: [
          "Na seção Reserva de Horário, defina o percentual de adiantamento cobrado.",
          "Defina o tempo de expiração do pré-agendamento (padrão: 24 horas).",
          "Salve as configurações.",
        ],
      },
      {
        title: "Personalizar cores do sistema",
        steps: [
          "Na seção Aparência, escolha a cor principal do sistema.",
          "As cores são aplicadas em botões, destaques e elementos interativos.",
          "Salve para aplicar.",
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
          s.topics.some(
            (t) =>
              t.title.toLowerCase().includes(search.toLowerCase()) ||
              t.steps.some((step) => step.toLowerCase().includes(search.toLowerCase()))
          )
      )
    : SECTIONS;

  return (
    <div className="flex h-full" style={{ background: "var(--background)" }}>
      {/* Sidebar */}
      <aside
        className={`
          shrink-0 flex flex-col border-r
          ${mobileMenuOpen ? "fixed inset-0 z-50 w-72" : "hidden md:flex w-64"}
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
                style={{ background: "oklch(45% 0.18 264)", color: "white" }}
              >
                <BookOpen size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold">Manual do Sistema</p>
                <p className="text-xs text-muted-foreground">Sistema de Agendamento</p>
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
              <span className="text-sm">{section.title}</span>
              {activeSection === section.id && (
                <ChevronRight size={14} className="ml-auto" />
              )}
            </button>
          ))}
        </nav>

        {/* Help CTA */}
        <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div
            className="rounded-xl p-3 text-xs"
            style={{ background: "oklch(45% 0.18 264 / 10%)" }}
          >
            <p className="font-medium mb-1" style={{ color: "oklch(45% 0.18 264)" }}>
              Ainda com duvidas?
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Use o chat de suporte (botao azul no canto da tela) para falar com a assistente IA.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div
          className="sticky top-0 z-10 flex items-center gap-3 px-6 py-4 border-b"
          style={{
            background: "var(--background)",
            borderColor: "var(--border)",
          }}
        >
          <button
            className="md:hidden p-1.5 rounded-lg border"
            style={{ borderColor: "var(--border)" }}
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={16} />
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Manual</span>
            <ChevronRight size={14} />
            <span className="font-medium" style={{ color: "var(--foreground)" }}>
              {current.title}
            </span>
          </div>
        </div>

        {/* Content */}
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
                <h1 className="text-2xl font-bold">{current.title}</h1>
                <p className="text-sm text-muted-foreground">{current.subtitle}</p>
              </div>
            </div>
            <p
              className="text-sm leading-relaxed rounded-xl px-4 py-3 mt-4"
              style={{
                background: current.color + "10",
                color: "var(--foreground)",
                borderLeft: `3px solid ${current.color}`,
              }}
            >
              {current.intro}
            </p>
          </div>

          {/* Topics */}
          <div className="space-y-6">
            {current.topics.map((topic, ti) => (
              <div
                key={ti}
                className="rounded-2xl border overflow-hidden"
                style={{ borderColor: "var(--border)" }}
              >
                {/* Topic header */}
                <div
                  className="px-5 py-4 flex items-center gap-3"
                  style={{ background: "var(--muted)" }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: current.color, color: "white" }}
                  >
                    {ti + 1}
                  </div>
                  <h2 className="font-semibold text-sm">{topic.title}</h2>
                </div>

                {/* Steps */}
                <div className="px-5 py-4 space-y-2.5">
                  {topic.steps.map((step, si) => (
                    <div key={si} className="flex items-start gap-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium shrink-0 mt-0.5"
                        style={{
                          background: current.color + "18",
                          color: current.color,
                        }}
                      >
                        {si + 1}
                      </div>
                      <p className="text-sm leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>

                {/* Tip */}
                {topic.tip && (
                  <div
                    className="mx-5 mb-4 rounded-xl px-4 py-3 text-xs leading-relaxed"
                    style={{
                      background: "oklch(55% 0.18 155 / 8%)",
                      color: "oklch(35% 0.14 155)",
                      border: "1px solid oklch(55% 0.18 155 / 20%)",
                    }}
                  >
                    <span className="font-semibold">Dica: </span>
                    {topic.tip}
                  </div>
                )}

                {/* Warning */}
                {topic.warning && (
                  <div
                    className="mx-5 mb-4 rounded-xl px-4 py-3 text-xs leading-relaxed"
                    style={{
                      background: "oklch(55% 0.20 30 / 8%)",
                      color: "oklch(40% 0.18 30)",
                      border: "1px solid oklch(55% 0.20 30 / 20%)",
                    }}
                  >
                    <span className="font-semibold">Atencao: </span>
                    {topic.warning}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Navigation between sections */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
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
                      <ArrowRight size={14} className="rotate-180" />
                      {prev.title}
                    </button>
                  ) : <div />}
                  {next ? (
                    <button
                      onClick={() => setActiveSection(next.id)}
                      className="flex items-center gap-2 text-sm font-medium transition-colors"
                      style={{ color: current.color }}
                    >
                      {next.title}
                      <ArrowRight size={14} />
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
