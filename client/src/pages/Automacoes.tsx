import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePermissoes } from "@/hooks/usePermissoes";
import { toast } from "sonner";
import {
  Zap, Calendar, Clock, Gift, MessageSquare, Bell, Mail,
  Plus, Trash2, Play, Pause, Settings, ChevronRight,
  ArrowRight, X, Save, Sparkles, Filter, Search,
  AlarmClock, Users, Tag, Check, CheckCircle, Edit2, Eye,
  History, Send, AlertCircle, RefreshCw, ChevronLeft, Phone,
  GitBranch, Loader2, ExternalLink, Activity, Radio, TrendingUp, UserPlus, UserX,
  Package, MousePointerClick, Info, AlertTriangle, Layers, DollarSign, Star, Maximize2, Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import VariableEditor, { type VariableEditorRef } from "@/components/VariableEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

//  Tipos

type NodeType = "trigger" | "condition" | "action" | "delay" | "end";

interface FlowNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  data: Record<string, any>;
  connections: string[];
}

interface FlowAutomacao {
  id?: number;
  nome: string;
  descricao?: string;
  ativo: boolean;
  nodes: FlowNode[];
  confirmacaoAutoAtivo?: boolean;
  confirmacaoAutoHorasAntes?: number;
}

//  Opções

const TRIGGER_OPTIONS = [
  { value: "evento_agendamento_criado", label: "Agendamento criado", icon: Calendar, color: "#6366f1", desc: "Dispara quando qualquer agendamento é criado. Também é usada automaticamente quando uma reserva é confirmada, caso não exista automação específica para 'Reserva paga'." },
  { value: "evento_agendamento_pre_agendado", label: "Pré-agendamento criado", icon: Calendar, color: "#8b5cf6", desc: "Dispara quando um pré-agendamento é criado (aguardando confirmação do salão)." },
  { value: "evento_agendamento_confirmado", label: "Agendamento confirmado", icon: Check, color: "#10b981", desc: "Dispara quando o status do agendamento muda para confirmado." },
  { value: "evento_agendamento_cancelado", label: "Agendamento cancelado", icon: X, color: "#ef4444", desc: "Dispara quando um agendamento é cancelado pelo salão ou pelo cliente." },
  { value: "evento_agendamento_concluido", label: "Agendamento concluído", icon: CheckCircle, color: "#0ea5e9", desc: "Dispara quando o atendimento é finalizado e marcado como concluído." },
  { value: "evento_cliente_criado", label: "Novo cliente cadastrado", icon: UserPlus, color: "#10b981", desc: "Dispara quando um novo cliente é cadastrado no sistema (manual ou via portal)." },
  { value: "evento_pre_agendamento_cancelado", label: "Pré-agendamento expirado", icon: UserX, color: "#f97316", desc: "Dispara quando um pré-agendamento expira sem ser confirmado." },
  { value: "evento_profissional_atribuido", label: "Profissional atribuído", icon: UserPlus, color: "#0ea5e9", desc: "Dispara quando um profissional é atribuído a um agendamento que estava sem profissional definido." },
  { value: "evento_reserva_paga", label: "Reserva paga", icon: Check, color: "#10b981", desc: "Dispara quando o cliente confirma o pagamento da reserva de um pré-agendamento." },
  { value: "evento_credito_gerado", label: "Crédito gerado", icon: DollarSign, color: "#10b981", desc: "Dispara quando um crédito é adicionado à conta do cliente (pagamento a maior, devolução, etc.)." },
  { value: "evento_pacote_renovado", label: "Pacote renovado", icon: RefreshCw, color: "#8b5cf6", desc: "Dispara quando um pacote de serviços é renovado para o cliente." },
  { value: "evento_pacote_vencendo", label: "Pacote vencendo", icon: Package, color: "#f59e0b", desc: "Dispara automaticamente quando um pacote está a 7 dias ou menos de vencer. Ideal para convidar o cliente a renovar." },
  { value: "evento_sessoes_acabando", label: "Sessões acabando", icon: Package, color: "#ef4444", desc: "Dispara automaticamente quando restam apenas 1 ou 2 sessões no pacote do cliente." },
  { value: "aniversario_mes", label: "Aniversário do mês", icon: Gift, color: "#ec4899", desc: "Dispara no mês de aniversário do cliente, no horário configurado." },
  { value: "data_fixa", label: "Data específica", icon: Calendar, color: "#8b5cf6", desc: "Dispara em uma data e horário específicos do calendário (ex: promoção de Natal)." },
  { value: "dias_antes_agendamento", label: "Dias antes do agendamento", icon: AlarmClock, color: "#0ea5e9", desc: "Dispara X dias antes do agendamento, no horário configurado. Ideal para lembretes." },
  { value: "horas_antes_agendamento", label: "Horas antes do agendamento", icon: AlarmClock, color: "#f97316", desc: "Dispara X horas antes do horário do agendamento. Ideal para lembrete de última hora." },
  { value: "horas_apos_agendamento", label: "Horas após o agendamento", icon: Clock, color: "#14b8a6", desc: "Dispara X horas após o horário do agendamento. Ideal para pedir avaliação ou feedback." },
  { value: "dias_depois_agendamento", label: "Dias depois do agendamento", icon: Clock, color: "#8b5cf6", desc: "Dispara X dias após o agendamento. Ideal para follow-up ou reagendamento." },
  { value: "manual_renovacao_pacote", label: "Manual: Renovação de pacote", icon: MousePointerClick, color: "#7c3aed", desc: "Não dispara automaticamente. Aparece como botão nas notificações de pacote para envio com 1 clique." },
  { value: "manual_mensagem_avulsa", label: "Manual: Mensagem avulsa", icon: MousePointerClick, color: "#7c3aed", desc: "Não dispara automaticamente. Template de mensagem para envio manual a qualquer momento." },
];

const ACTION_OPTIONS = [
  { value: "enviar_whatsapp", label: "Enviar WhatsApp", icon: MessageSquare, color: "#25d366" },
  { value: "enviar_email", label: "Enviar E-mail", icon: Mail, color: "#6366f1" },
  { value: "notificar_profissional", label: "Notificar profissional", icon: Bell, color: "#f59e0b" },
  { value: "cancelar_agendamento", label: "Cancelar agendamento", icon: X, color: "#ef4444" },
];

const CONDITION_OPTIONS = [
  { value: "por_profissional", label: "Filtrar por profissional", icon: Users, color: "#6366f1" },
  { value: "por_tag", label: "Filtrar por tag", icon: Tag, color: "#8b5cf6" },
  { value: "por_servico", label: "Filtrar por serviço", icon: Sparkles, color: "#ec4899" },
  { value: "por_categoria", label: "Filtrar por categoria", icon: Layers, color: "#0ea5e9" },
  { value: "por_valor", label: "Filtrar por valor do agendamento", icon: DollarSign, color: "#10b981" },
  { value: "por_tipo_cliente", label: "Filtrar por tipo de cliente", icon: Star, color: "#f59e0b" },
];

const VARIAVEIS_GRUPOS = [
  {
    grupo: "Agendamento",
    vars: [
      { var: "{{data}}", label: "data", desc: "Data do agendamento por extenso", exemplo: "Ex: segunda-feira, 07 de abril" },
      { var: "{{hora}}", label: "hora", desc: "Horário de início e fim do agendamento", exemplo: "Ex: 14:00 – 15:30" },
      { var: "{{servico}}", label: "serviço", desc: "Nome do serviço agendado", exemplo: "Ex: Escova progressiva" },
      { var: "{{profissional}}", label: "profissional", desc: "Nome da profissional que irá realizar o serviço", exemplo: "Ex: Maria" },
      { var: "{{valor}}", label: "valor", desc: "Valor total do serviço", exemplo: "Ex: R$ 150,00" },
      { var: "{{valor_reserva}}", label: "valor reserva", desc: "Valor calculado da reserva antecipada. Baseado no percentual configurado em Configurações × valor do serviço.", exemplo: "Ex: R$ 45,00 (30% de R$ 150,00)" },
      { var: "{{link_confirmacao}}", label: "link confirmação", desc: "Link único para o cliente confirmar o agendamento com 1 clique. Válido por 24h.", exemplo: "Ex: https://agendei.../confirmar/abc123" },
      { var: "{{link_agendamento}}", label: "link agendamento", desc: "Link do portal público de agendamento da sua empresa. Ideal para campanhas de reativação e convites.", exemplo: "Ex: https://agendei.../agendar/meu-salao" },
      { var: "{{link_agenda}}", label: "📅 adicionar à agenda", desc: "Link para o cliente salvar o compromisso direto no Google Calendar / Apple Calendar do celular. Ao clicar, abre a agenda com data, horário e serviço já preenchidos.", exemplo: "Ex: https://calendar.google.com/calendar/render?action=TEMPLATE&text=..." },
      { var: "{{observacoes}}", label: "observações", desc: "Observações registradas no agendamento (campo livre preenchido na criação do agendamento).", exemplo: "Ex: Cliente prefere produto sem amônia" },
    ],
  },
  {
    grupo: "Cliente",
    vars: [
      { var: "{{nome_cliente}}", label: "nome cliente", desc: "Nome completo da cliente", exemplo: "Ex: Ana Silva" },
      { var: "{{primeiro_nome}}", label: "primeiro nome", desc: "Primeiro nome da cliente (somente o primeiro)", exemplo: "Ex: Ana" },
      { var: "{{empresa}}", label: "empresa", desc: "Nome do seu salão/empresa", exemplo: "Ex: Studio Beléza" },
    ],
  },
  {
    grupo: "Pacote",
    vars: [
      { var: "{{pacote}}", label: "pacote", desc: "Nome do pacote do cliente (para gatilhos de pacote)", exemplo: "Ex: Pacote Manicure 8x" },
      { var: "{{nome_pacote}}", label: "nome pacote", desc: "Nome do pacote renovado (disponível no evento Pacote renovado)", exemplo: "Ex: Pacote Progressiva 5x" },
      { var: "{{sessoes_restantes}}", label: "sessões restantes", desc: "Quantidade de sessões ainda disponíveis no pacote", exemplo: "Ex: 2" },
      { var: "{{sessoes_total}}", label: "sessões total", desc: "Quantidade total de sessões do pacote", exemplo: "Ex: 8" },
      { var: "{{data_vencimento}}", label: "data vencimento", desc: "Data de vencimento do pacote renovado", exemplo: "Ex: 30/06/2025" },
      { var: "{{valor_pago}}", label: "valor pago", desc: "Valor total pago na renovação do pacote", exemplo: "Ex: R$ 350,00" },
      { var: "{{parcelas}}", label: "parcelas", desc: "Forma de pagamento parcelada ou valor único do pacote", exemplo: "Ex: 3x de R$ 116,67" },
    ],
  },
];
// Lista plana para compatibilidade com outros usos
const VARIAVEIS = VARIAVEIS_GRUPOS.flatMap(g => g.vars);

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

//  Validação de nós

function getNodeIncompleto(node: FlowNode): string[] {
  const campos: string[] = [];
  if (node.type === "trigger") {
    // Tipo é sempre obrigatório
    if (!node.data.tipo) { campos.push("Tipo de gatilho"); return campos; }
    // Campos adicionais dependem do tipo selecionado
    if (node.data.tipo === "data_fixa") {
      if (!node.data.dia) campos.push("Dia");
      if (!node.data.mes) campos.push("Mês");
    } else if (node.data.tipo === "horas_antes_agendamento") {
      if (!node.data.horas && node.data.horas !== 0) campos.push("Horas antes");
    } else if (node.data.tipo === "horas_apos_agendamento") {
      if (!node.data.horas && node.data.horas !== 0) campos.push("Horas após");
    } else if (node.data.tipo === "dias_antes_agendamento") {
      if (!node.data.dias && node.data.dias !== 0) campos.push("Dias antes");
    } else if (node.data.tipo === "dias_depois_agendamento") {
      if (!node.data.dias && node.data.dias !== 0) campos.push("Dias depois");
    }
    // Tipos de evento puro e aniversário não precisam de campos adicionais:
    // evento_agendamento_criado, evento_agendamento_confirmado, evento_agendamento_cancelado,
    // evento_pre_agendamento, evento_sessoes_acabando, aniversario_mes, etc.
  } else if (node.type === "action") {
    // Tipo de ação é obrigatório
    if (!node.data.tipo) { campos.push("Tipo de ação"); return campos; }
    // Mensagem só é obrigatória para ações que enviam mensagem
    if ((node.data.tipo === "enviar_whatsapp" || node.data.tipo === "enviar_email") &&
        (!node.data.mensagem || node.data.mensagem.trim() === "")) {
      campos.push("Mensagem");
    }
  } else if (node.type === "condition") {
    // Tipo de filtro é obrigatório
    if (!node.data.tipo) { campos.push("Tipo de filtro"); return campos; }
    // Validação específica por tipo
    if (node.data.tipo === "por_servico") {
      // Aceita tanto campo "servicos" (array) quanto "valor" (string legado)
      const temServicos = (Array.isArray(node.data.servicos) && node.data.servicos.length > 0) ||
        (node.data.valor && node.data.valor.trim() !== "");
      if (!temServicos) campos.push("Serviços");
    } else if (node.data.tipo === "por_profissional") {
      if (!node.data.valor || node.data.valor.trim() === "") campos.push("Profissional");
    } else if (node.data.tipo === "por_categoria") {
      if (!node.data.valor || node.data.valor.trim() === "") campos.push("Categoria");
    } else if (node.data.tipo === "por_tipo_cliente") {
      if (!node.data.valor || node.data.valor.trim() === "") campos.push("Tipo de cliente");
    } else if (node.data.tipo === "por_tag") {
      if (!node.data.valor || node.data.valor.trim() === "") campos.push("Tag");
    } else if (node.data.tipo === "por_valor") {
      // Faixa de valor: pelo menos um dos limites deve estar preenchido
      const temMin = node.data.valorMin !== undefined && node.data.valorMin !== "";
      const temMax = node.data.valorMax !== undefined && node.data.valorMax !== "";
      if (!temMin && !temMax) campos.push("Faixa de valor");
    }
  } else if (node.type === "delay") {
    // quantidade tem default 1, só valida se for explicitamente 0 ou negativo
    if (node.data.quantidade !== undefined && Number(node.data.quantidade) <= 0) campos.push("Quantidade de tempo");
  }
  return campos;
}

/** Gera um resumo legível do filtro de condição para exibir no canvas */
function getConditionPreview(data: Record<string, any>): string | null {
  const tipo = data.tipo;
  if (!tipo) return null;
  if (tipo === "por_servico") {
    const servicos: string[] = Array.isArray(data.servicos) && data.servicos.length > 0
      ? data.servicos
      : (data.valor ? data.valor.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
    if (servicos.length === 0) return null;
    return servicos.length <= 2 ? servicos.join(", ") : `${servicos.slice(0, 2).join(", ")} +${servicos.length - 2}`;
  }
  if (tipo === "por_profissional") {
    const profs: string[] = Array.isArray(data.profissionais) && data.profissionais.length > 0
      ? data.profissionais
      : (data.valor ? data.valor.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
    if (profs.length === 0) return null;
    return profs.length <= 2 ? profs.join(", ") : `${profs.slice(0, 2).join(", ")} +${profs.length - 2}`;
  }
  if (tipo === "por_categoria") {
    return data.valor ? `Categoria: ${data.valor}` : null;
  }
  if (tipo === "por_tag") {
    return data.valor ? `Tag: ${data.valor}` : null;
  }
  if (tipo === "por_tipo_cliente") {
    const labels: Record<string, string> = { novo: "Clientes novos", recorrente: "Clientes recorrentes", inativo: "Clientes inativos", aniversariante: "Aniversariantes" };
    return data.valor ? (labels[data.valor] ?? data.valor) : null;
  }
  if (tipo === "por_valor") {
    const min = data.valorMin !== undefined && data.valorMin !== "" ? `R$ ${data.valorMin}` : null;
    const max = data.valorMax !== undefined && data.valorMax !== "" ? `R$ ${data.valorMax}` : null;
    if (min && max) return `${min} – ${max}`;
    if (min) return `≥ ${min}`;
    if (max) return `≤ ${max}`;
    return null;
  }
  return null;
}

//  NodeCard

function FlowNodeCard({ node, selected, onSelect, onDelete, onPortMouseDown, isConnectTarget, isHoverTarget }: {
  node: FlowNode; selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onPortMouseDown: (e: React.MouseEvent, sourceId: string) => void;
  isConnectTarget: boolean;
  isHoverTarget: boolean;
}) {
  const styles: Record<NodeType, { bg: string; border: string; iconBg: string; icon: React.ReactNode; label: string; labelColor: string }> = {
    trigger: { bg: "bg-indigo-50", border: "border-indigo-300", iconBg: "bg-indigo-100", icon: <Zap size={14} className="text-indigo-600" />, label: "Gatilho", labelColor: "text-indigo-600" },
    condition: { bg: "bg-amber-50", border: "border-amber-300", iconBg: "bg-amber-100", icon: <Filter size={14} className="text-amber-600" />, label: "Condição", labelColor: "text-amber-600" },
    action: { bg: "bg-emerald-50", border: "border-emerald-300", iconBg: "bg-emerald-100", icon: <MessageSquare size={14} className="text-emerald-600" />, label: "Ação", labelColor: "text-emerald-600" },
    delay: { bg: "bg-sky-50", border: "border-sky-300", iconBg: "bg-sky-100", icon: <Clock size={14} className="text-sky-600" />, label: "Aguardar", labelColor: "text-sky-600" },
    end: { bg: "bg-gray-50", border: "border-gray-300", iconBg: "bg-gray-100", icon: <Check size={14} className="text-gray-600" />, label: "Fim", labelColor: "text-gray-600" },
  };
  const s = styles[node.type];
  const title = node.data.label || node.data.tipo || "Configurar...";
  const camposIncompletos = getNodeIncompleto(node);
  const incompleto = camposIncompletos.length > 0;

  return (
    <div
      className={`rounded-xl border-2 shadow-sm ${s.bg} ${incompleto ? "border-amber-400" : s.border} transition-all ${selected ? "ring-2 ring-indigo-500 ring-offset-2" : ""} ${isHoverTarget ? "ring-2 ring-emerald-400 ring-offset-2 scale-105" : ""} ${isConnectTarget && !isHoverTarget ? "ring-1 ring-emerald-300 ring-offset-1" : ""}`}
      style={{ width: 220 }}
      onClick={() => onSelect(node.id)}
    >
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${incompleto ? "border-amber-400" : s.border}`}>
        <div className={`w-6 h-6 rounded-md ${s.iconBg} flex items-center justify-center`}>{s.icon}</div>
        <span className={`text-xs font-bold uppercase tracking-wider ${s.labelColor}`}>{s.label}</span>
        <div className="ml-auto flex items-center gap-1">
          {isHoverTarget && (
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <Plus size={10} />
            </span>
          )}
          {incompleto && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 border border-amber-300 cursor-default">
                    <AlertTriangle size={10} className="text-amber-600" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  <p className="font-semibold mb-1">Campos obrigatórios:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {camposIncompletos.map(c => <li key={c}>{c}</li>)}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {node.type !== "end" && (
            <button className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-red-300"
              onClick={e => { e.stopPropagation(); onDelete(node.id); }}>
              <Trash2 size={9} className="text-gray-400 hover:text-red-500" />
            </button>
          )}
        </div>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-semibold text-gray-800 truncate">{title}</p>
        {node.data.mensagem && <p className="text-xs text-gray-500 mt-1 line-clamp-2 italic">"{node.data.mensagem}"</p>}
        {node.data.quantidade && <p className="text-xs text-gray-500 mt-1">⏱ {node.data.quantidade} {node.data.unidade || "horas"}</p>}
        {node.type === "condition" && (() => {
          const preview = getConditionPreview(node.data);
          const opt = CONDITION_OPTIONS.find(c => c.value === node.data.tipo);
          return preview ? (
            <div className="flex items-center gap-1 mt-1.5">
              {opt && <opt.icon size={10} style={{ color: opt.color }} />}
              <p className="text-[11px] text-gray-500 truncate">{preview}</p>
            </div>
          ) : null;
        })()}
      </div>
      {/* Porta de saída (source port) — arraste para conectar */}
      {node.type !== "end" && (
        <div className="px-3 pb-3 flex justify-center">
          <div
            data-port="source"
            title="Arraste para conectar ao próximo nó"
            className="group flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-indigo-200 shadow-sm cursor-grab hover:border-indigo-500 hover:bg-indigo-50 transition-all select-none"
            onMouseDown={e => onPortMouseDown(e, node.id)}
          >
            <div className="w-3 h-3 rounded-full bg-indigo-400 group-hover:bg-indigo-600 transition-colors" />
            <span className="text-[10px] text-gray-400 group-hover:text-indigo-600 font-medium">Conectar</span>
          </div>
        </div>
      )}
      {/* Porta de entrada (target port) — ponto no topo */}
      {node.type !== "trigger" && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-indigo-400 shadow-sm z-10 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-indigo-400" />
        </div>
      )}
    </div>
  );
}

// Dados de exemplo para preview
const PREVIEW_VARS: Record<string, string> = {
  "{{nome_cliente}}": "Ana Silva",
  "{{primeiro_nome}}": "Ana",
  "{{servico}}": "Escova Progressiva",
  "{{profissional}}": "Maria Oliveira",
  "{{data}}": "segunda-feira, 07 de abril",
  "{{hora}}": "14:00 – 15:30",
  "{{valor}}": "R$ 150,00",
  "{{empresa}}": "Studio Beleza",
  "{{link_confirmacao}}": "https://agendei.manus.space/confirmar/abc123xyz",
  "{{valor_reserva}}": "R$ 45,00",
  "{{nome_pacote}}": "Pacote Progressiva 5x",
  "{{data_vencimento}}": "30/06/2025",
  "{{valor_pago}}": "R$ 350,00",
  "{{parcelas}}": "3x de R$ 116,67",
};

function previewMensagem(template: string): string {
  let msg = template;
  for (const [key, val] of Object.entries(PREVIEW_VARS)) {
    msg = msg.replaceAll(key, val);
  }
  return msg;
}

// Modal de pré-visualização da mensagem
function PreviewMensagemModal({ open, onClose, mensagem, midiaUrl }: {
  open: boolean;
  onClose: () => void;
  mensagem: string;
  midiaUrl?: string;
}) {
  const preview = previewMensagem(mensagem);
  const isImage = midiaUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(midiaUrl);
  const isPdf = midiaUrl && /\.pdf$/i.test(midiaUrl);

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Eye size={16} /> Pré-visualização da mensagem
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-400 -mt-1">Variáveis substituídas por dados de exemplo.</p>

        {/* Balão estilo WhatsApp */}
        <div className="bg-[#dcf8c6] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm mt-2 space-y-2">
          {/* Mídia */}
          {midiaUrl && (
            <div className="mb-2">
              {isImage ? (
                <img src={midiaUrl} alt="mídia" className="rounded-xl w-full max-h-48 object-cover" />
              ) : isPdf ? (
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                  <span className="text-2xl">📄</span>
                  <span className="text-xs text-gray-600 truncate">{midiaUrl.split("/").pop()}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                  <span className="text-2xl">📎</span>
                  <span className="text-xs text-gray-600 truncate">{midiaUrl.split("/").pop()}</span>
                </div>
              )}
            </div>
          )}
          {/* Texto */}
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{preview || <span className="text-gray-400 italic">Nenhuma mensagem configurada.</span>}</p>
          <p className="text-right text-[10px] text-gray-400 mt-1">14:32 ✓✓</p>
        </div>

        <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500 font-medium mb-1">Variáveis usadas:</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(PREVIEW_VARS)
              .filter(([key]) => mensagem.includes(key))
              .map(([key, val]) => (
                <span key={key} className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5 font-mono">
                  {key} → {val}
                </span>
              ))}
          </div>
          {!Object.keys(PREVIEW_VARS).some(k => mensagem.includes(k)) && (
            <p className="text-xs text-gray-400 italic">Nenhuma variável detectada na mensagem.</p>
          )}
        </div>

        <Button size="sm" variant="outline" className="w-full mt-1" onClick={onClose}>Fechar</Button>
      </DialogContent>
    </Dialog>
  );
}

//  Campos específicos do nó de condição

function ConditionFields({ data, set }: { data: Record<string, any>; set: (k: string, v: any) => void }) {
  const { data: servicosData = [] } = trpc.servicos.list.useQuery();
  const { data: profissionaisData = [] } = trpc.profissionais.listParaAgendamento.useQuery();

  // Extrair categorias únicas dos serviços
  const categorias = Array.from(new Set(
    servicosData
      .map((s: any) => s.categoria)
      .filter(Boolean)
  )).sort() as string[];

  // Helpers para multi-select de serviços
  const servicosSelecionados: string[] = data.servicos
    ? (Array.isArray(data.servicos) ? data.servicos : data.servicos.split(",").map((s: string) => s.trim()).filter(Boolean))
    : (data.valor ? data.valor.split(",").map((s: string) => s.trim()).filter(Boolean) : []);

  const toggleServico = (nome: string) => {
    const atual = servicosSelecionados;
    const novo = atual.includes(nome) ? atual.filter(s => s !== nome) : [...atual, nome];
    set("servicos", novo);
    set("valor", novo.join(", "));
  };

  // Filtro de categoria para a lista de serviços
  const [filtroCategoria, setFiltroCategoria] = useState<string>("__todos__");
  const [buscaServico, setBuscaServico] = useState<string>("");
  const servicosFiltrados = servicosData
    .filter((s: any) => filtroCategoria === "__todos__" || s.categoria === filtroCategoria)
    .filter((s: any) => !buscaServico.trim() || s.nome.toLowerCase().includes(buscaServico.toLowerCase()));

  // Helpers para multi-select de profissionais
  const profissionaisSelecionados: string[] = data.profissionais
    ? (Array.isArray(data.profissionais) ? data.profissionais : data.profissionais.split(",").map((s: string) => s.trim()).filter(Boolean))
    : (data.valor && data.tipo === "por_profissional" ? data.valor.split(",").map((s: string) => s.trim()).filter(Boolean) : []);

  const toggleProfissional = (nome: string) => {
    const atual = profissionaisSelecionados;
    const novo = atual.includes(nome) ? atual.filter(s => s !== nome) : [...atual, nome];
    set("profissionais", novo);
    set("valor", novo.join(", "));
  };

  return (
    <>
      {/* Tipo de filtro */}
      <div>
        <Label className="text-xs text-gray-500 mb-1 block">Tipo de filtro</Label>
        <Select value={data.tipo || ""} onValueChange={v => set("tipo", v)}>
          <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {CONDITION_OPTIONS.map(c => (
              <SelectItem key={c.value} value={c.value}>
                <div className="flex items-center gap-2"><c.icon size={13} style={{ color: c.color }} />{c.label}</div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Campos específicos por tipo */}

      {/* Por serviço — multi-select com serviços reais */}
      {data.tipo === "por_servico" && (
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-gray-500 block">Serviços incluídos</Label>

          {/* Campo de busca por nome */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar serviço..."
              value={buscaServico}
              onChange={e => setBuscaServico(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 bg-white placeholder-gray-400"
            />
            {buscaServico && (
              <button
                type="button"
                onClick={() => setBuscaServico("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filtro por categoria/tipo de profissional */}
          {categorias.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => { setFiltroCategoria("__todos__"); setBuscaServico(""); }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  filtroCategoria === "__todos__"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                Todos
              </button>
              {categorias.map((cat: string) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => { setFiltroCategoria(cat); setBuscaServico(""); }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                    filtroCategoria === cat
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {servicosData.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Nenhum serviço cadastrado.</p>
          ) : servicosFiltrados.length === 0 ? (
            <p className="text-xs text-gray-400 italic">{buscaServico ? `Nenhum serviço encontrado para "${buscaServico}".` : "Nenhum serviço nesta categoria."}</p>
          ) : (
            <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-100">
              {servicosFiltrados.map((s: any) => (
                <label key={s.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-indigo-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={servicosSelecionados.includes(s.nome)}
                    onChange={() => toggleServico(s.nome)}
                    className="accent-indigo-600 w-4 h-4 shrink-0"
                  />
                  <span className="text-sm text-gray-800 flex-1">{s.nome}</span>
                  {s.categoria && (
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                      {s.categoria}
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}

          {servicosSelecionados.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-indigo-600 font-medium">{servicosSelecionados.length} serviço(s) selecionado(s)</p>
              <button
                type="button"
                onClick={() => { set("servicos", []); set("valor", ""); }}
                className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
              >
                Limpar seleção
              </button>
            </div>
          )}
        </div>
      )}

      {/* Por profissional — multi-select com profissionais reais */}
      {data.tipo === "por_profissional" && (
        <div>
          <Label className="text-xs text-gray-500 mb-1.5 block">Profissionais incluídos</Label>
          {profissionaisData.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Nenhum profissional cadastrado.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-gray-100">
              {profissionaisData.map((p: any) => (
                <label key={p.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={profissionaisSelecionados.includes(p.nome)}
                    onChange={() => toggleProfissional(p.nome)}
                    className="accent-indigo-600 w-3.5 h-3.5"
                  />
                  <span className="text-xs text-gray-700">{p.nome}</span>
                </label>
              ))}
            </div>
          )}
          {profissionaisSelecionados.length > 0 && (
            <p className="text-[10px] text-indigo-600 mt-1">{profissionaisSelecionados.length} profissional(is) selecionado(s)</p>
          )}
        </div>
      )}

      {/* Por categoria — select com categorias dos serviços */}
      {data.tipo === "por_categoria" && (
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Categoria</Label>
          {categorias.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Nenhuma categoria encontrada nos serviços.</p>
          ) : (
            <Select value={data.valor || ""} onValueChange={v => set("valor", v)}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione a categoria..." /></SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Por valor — faixa de valor mínimo/máximo */}
      {data.tipo === "por_valor" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Valor mínimo (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={data.valorMin ?? ""}
                onChange={e => { set("valorMin", e.target.value); set("valor", `${e.target.value}-${data.valorMax ?? ""}`); }}
                placeholder="0,00"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Valor máximo (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={data.valorMax ?? ""}
                onChange={e => { set("valorMax", e.target.value); set("valor", `${data.valorMin ?? ""}-${e.target.value}`); }}
                placeholder="Ex: 500,00"
                className="text-sm"
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-400">Deixe vazio para sem limite. Ex: de R$100 a R$300.</p>
        </div>
      )}

      {/* Por tipo de cliente */}
      {data.tipo === "por_tipo_cliente" && (
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Tipo de cliente</Label>
          <Select value={data.valor || ""} onValueChange={v => set("valor", v)}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="novo">
                <div className="flex items-center gap-2"><UserPlus size={13} className="text-emerald-500" />Novo cliente (1º agendamento)</div>
              </SelectItem>
              <SelectItem value="recorrente">
                <div className="flex items-center gap-2"><RefreshCw size={13} className="text-blue-500" />Cliente recorrente (2+ agendamentos)</div>
              </SelectItem>
              <SelectItem value="inativo">
                <div className="flex items-center gap-2"><UserX size={13} className="text-red-400" />Cliente inativo (sem agendamento há 60+ dias)</div>
              </SelectItem>
              <SelectItem value="aniversariante">
                <div className="flex items-center gap-2"><Gift size={13} className="text-pink-500" />Aniversariante do mês</div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Por tag — input de texto livre */}
      {data.tipo === "por_tag" && (
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Tag</Label>
          <Input
            value={data.valor || ""}
            onChange={e => set("valor", e.target.value)}
            placeholder="Ex: VIP, Pacote, Fidelidade..."
            className="text-sm"
          />
          <p className="text-[10px] text-gray-400 mt-1">Filtra clientes que possuem essa tag no cadastro.</p>
        </div>
      )}
    </>
  );
}

//  Painel de configuração

function NodeConfigPanel({ node, onUpdate, onClose, onSaveFlow }: {
  node: FlowNode;
  onUpdate: (id: string, data: Record<string, any>) => void;
  onClose: () => void;
  onSaveFlow?: (updatedNodeData?: { id: string; data: Record<string, any> }) => void;
}) {
  const [data, setData] = useState({ ...node.data });
  const [uploadingMidia, setUploadingMidia] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const varEditorRef = useRef<VariableEditorRef>(null);
  // Sincronizar dados com o estado do canvas em tempo real (sem precisar clicar "Salvar configuração")
  useEffect(() => {
    onUpdate(node.id, data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  const set = (key: string, val: any) => setData(p => ({ ...p, [key]: val }));
  const save = () => {
    onUpdate(node.id, data);
    // Persistir no banco automaticamente após atualizar o nó
    if (onSaveFlow) {
      onSaveFlow({ id: node.id, data });
    } else {
      toast.success("Nó atualizado!");
    }
  };
  const insertVar = (v: string) => {
    if (varEditorRef.current) {
      varEditorRef.current.insertVariable(v);
    } else {
      set("mensagem", (data.mensagem || "") + v);
    }
  };
  const utils = trpc.useUtils();
  const uploadMidiaMutation = trpc.automacoes.uploadMidia.useMutation({
    onSuccess: (res) => {
      set("midiaUrl", res.url);
      toast.success("Arquivo enviado com sucesso!");
    },
    onError: (err) => toast.error(err.message || "Erro ao enviar arquivo"),
  });

  function handleMidiaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("Arquivo muito grande. Máximo 16MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadMidiaMutation.mutate({ arquivoBase64: base64, arquivoNome: file.name, arquivoTipo: file.type });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-800 text-sm">Configurar nó</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={15} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Nome do nó</Label>
          <Input value={data.label || ""} onChange={e => set("label", e.target.value)} placeholder="Ex: Lembrete 24h antes" className="text-sm" />
        </div>

        {/* TRIGGER */}
        {node.type === "trigger" && (
          <>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Tipo de gatilho</Label>
              <Select value={data.tipo || ""} onValueChange={v => set("tipo", v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {TRIGGER_OPTIONS.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon size={13} style={{ color: t.color }} />
                        <span>{t.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Explicação fixa do gatilho selecionado */}
              {data.tipo && (() => {
                const selected = TRIGGER_OPTIONS.find(t => t.value === data.tipo);
                if (!selected) return null;
                return (
                  <div className="flex items-start gap-1.5 mt-1.5 px-1">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground leading-snug">{selected.desc}</p>
                  </div>
                );
              })()}
            </div>
            {data.tipo === "data_fixa" && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs text-gray-500 mb-1 block">Dia</Label><Input type="number" min={1} max={31} value={data.dia || ""} onChange={e => set("dia", e.target.value)} className="text-sm" /></div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Mês</Label>
                  <Select value={data.mes || ""} onValueChange={v => set("mes", v)}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Mês" /></SelectTrigger>
                    <SelectContent>{MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label className="text-xs text-gray-500 mb-1 block">Horário</Label><Input type="time" value={data.hora || "09:00"} onChange={e => set("hora", e.target.value)} className="text-sm" /></div>
              </div>
            )}
            {data.tipo === "dias_antes_agendamento" && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs text-gray-500 mb-1 block">Dias antes</Label><Input type="number" min={0} value={data.dias || 1} onChange={e => set("dias", Number(e.target.value))} className="text-sm" /></div>
                <div><Label className="text-xs text-gray-500 mb-1 block">Horário</Label><Input type="time" value={data.hora || "09:00"} onChange={e => set("hora", e.target.value)} className="text-sm" /></div>
              </div>
            )}
            {data.tipo === "horas_antes_agendamento" && (
              <div><Label className="text-xs text-gray-500 mb-1 block">Horas antes</Label><Input type="number" min={1} value={data.horas || 2} onChange={e => set("horas", Number(e.target.value))} className="text-sm" /></div>
            )}
            {data.tipo === "horas_apos_agendamento" && (
              <div><Label className="text-xs text-gray-500 mb-1 block">Horas após</Label><Input type="number" min={1} value={data.horas || 2} onChange={e => set("horas", Number(e.target.value))} className="text-sm" /></div>
            )}
            {data.tipo === "dias_depois_agendamento" && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs text-gray-500 mb-1 block">Dias depois</Label><Input type="number" min={1} value={data.dias || 1} onChange={e => set("dias", Number(e.target.value))} className="text-sm" /></div>
                <div><Label className="text-xs text-gray-500 mb-1 block">Horário</Label><Input type="time" value={data.hora || "09:00"} onChange={e => set("hora", e.target.value)} className="text-sm" /></div>
              </div>
            )}
            {data.tipo === "aniversario_mes" && (
              <div className="rounded-lg bg-pink-50 border border-pink-200 p-3 text-xs text-pink-700">
                <Gift size={11} className="inline mr-1" />
                Dispara no <strong>1º dia do mês</strong> do aniversário da cliente — ela tem o mês inteiro para aproveitar!
              </div>
            )}

            {/* ── MULTI-TRIGGER: Gatilhos adicionais ──────────────────────────────────── */}
            {data.tipo?.startsWith("evento_") && (() => {
              const currentEvento = data.tipo;
              // Filtrar apenas eventos compatíveis (não temporais, não o próprio)
              const eventosCompativeis = TRIGGER_OPTIONS.filter(t =>
                t.value.startsWith("evento_") && t.value !== currentEvento
              );
              const selecionados: string[] = data.eventosAdicionais || [];
              const toggleEvento = (val: string) => {
                const novoArr = selecionados.includes(val)
                  ? selecionados.filter((v: string) => v !== val)
                  : [...selecionados, val];
                set("eventosAdicionais", novoArr);
              };
              return (
                <div className="mt-2">
                  <Label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                    <Layers size={11} />
                    Gatilhos adicionais
                    <span className="text-[10px] text-muted-foreground">(mesma mensagem, múltiplos eventos)</span>
                  </Label>
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/50 p-2 space-y-1 max-h-[180px] overflow-y-auto">
                    {eventosCompativeis.map(t => {
                      const evValue = t.value.replace("evento_", "");
                      const checked = selecionados.includes(evValue);
                      return (
                        <label key={t.value} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${
                          checked ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-100'
                        }`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEvento(evValue)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          />
                          <t.icon size={12} style={{ color: t.color }} />
                          <span className={checked ? 'font-medium text-indigo-700' : 'text-gray-600'}>{t.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {selecionados.length > 0 && (
                    <p className="text-[10px] text-indigo-600 mt-1 px-1">
                      <Check size={10} className="inline mr-0.5" />
                      Esta automação dispara em {selecionados.length + 1} evento(s)
                    </p>
                  )}
                </div>
              );
            })()}
          </>
        )}

        {/* CONDITION */}
        {node.type === "condition" && (
          <ConditionFields data={data} set={set} />
        )}

        {/* ACTION */}
        {node.type === "action" && (
          <>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Tipo de ação</Label>
              <Select value={data.tipo || ""} onValueChange={v => set("tipo", v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map(a => (
                    <SelectItem key={a.value} value={a.value}>
                      <div className="flex items-center gap-2"><a.icon size={13} style={{ color: a.color }} />{a.label}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(data.tipo === "enviar_whatsapp" || data.tipo === "enviar_email") && (
              <>
                <div><Label className="text-xs text-gray-500 mb-1 block">Título / Assunto</Label><Input value={data.titulo || ""} onChange={e => set("titulo", e.target.value)} placeholder="Ex: Confirmação de agendamento" className="text-sm" /></div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-gray-500">Mensagem</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{(data.mensagem || "").length} chars</span>
                      <button
                        type="button"
                        onClick={() => setShowPreview(true)}
                        className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                        title="Pré-visualizar mensagem com dados de exemplo">
                        <Eye size={11} /> Pré-ver
                      </button>
                    </div>
                  </div>
                  <VariableEditor
                    ref={varEditorRef}
                    value={data.mensagem || ""}
                    onChange={v => set("mensagem", v)}
                    placeholder="Olá {{nome_cliente}}, seu agendamento de {{servico}} está confirmado para {{data}} às {{hora}}."
                    className="text-sm"
                    minHeight="90px"
                  />
                  <p className="text-xs text-gray-400 mt-1.5 mb-1">Inserir variável:</p>
                  <TooltipProvider delayDuration={200}>
                    <div className="flex flex-col gap-2">
                      {VARIAVEIS_GRUPOS.map(grupo => (
                        <div key={grupo.grupo}>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{grupo.grupo}</p>
                          <div className="flex flex-wrap gap-1">
                            {grupo.vars.map(v => (
                              <Tooltip key={v.var}>
                                <TooltipTrigger asChild>
                                  <button onClick={() => insertVar(v.var)}
                                    className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5 hover:bg-indigo-100 font-medium transition-colors">
                                    {v.label}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[220px] text-left">
                                  <p className="font-medium text-xs mb-0.5">{v.desc}</p>
                                  <p className="text-xs text-muted-foreground">{v.exemplo}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TooltipProvider>

                  {/* Anexo de mídia */}
                  {data.tipo === "enviar_whatsapp" && (
                    <div className="mt-3 border border-dashed border-gray-200 rounded-lg p-3 bg-gray-50">
                      <p className="text-xs text-gray-500 mb-2 font-medium">Anexar imagem ou PDF (opcional)</p>
                      {data.midiaUrl ? (
                        <div className="flex items-center gap-2">
                          {data.midiaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img src={data.midiaUrl} alt="preview" className="w-16 h-16 object-cover rounded border" />
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-white border rounded px-2 py-1.5">
                              <span>📄</span>
                              <span className="truncate max-w-[120px]">{data.midiaUrl.split("/").pop()}</span>
                            </div>
                          )}
                          <button onClick={() => set("midiaUrl", "")} className="text-xs text-red-500 hover:text-red-700 ml-auto">Remover</button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <div className="flex items-center gap-2 text-xs text-gray-500 hover:text-indigo-600 transition-colors">
                            {uploadMidiaMutation.isPending ? (
                              <span className="text-xs text-indigo-500">Enviando...</span>
                            ) : (
                              <>
                                <span className="text-lg">📎</span>
                                <span>Clique para selecionar imagem (JPG, PNG) ou PDF</span>
                              </>
                            )}
                          </div>
                          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" className="hidden" onChange={handleMidiaChange} disabled={uploadMidiaMutation.isPending} />
                        </label>
                      )}
                      {data.midiaUrl && (
                        <p className="text-xs text-gray-400 mt-1.5">A mídia será enviada junto com a mensagem de texto.</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* DELAY */}
        {node.type === "delay" && (
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs text-gray-500 mb-1 block">Aguardar</Label><Input type="number" min={1} value={data.quantidade || 1} onChange={e => set("quantidade", Number(e.target.value))} className="text-sm" /></div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Unidade</Label>
              <Select value={data.unidade || "horas"} onValueChange={v => set("unidade", v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutos">Minutos</SelectItem>
                  <SelectItem value="horas">Horas</SelectItem>
                  <SelectItem value="dias">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t bg-gray-50">
        <Button onClick={save} size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
          <Save size={13} className="mr-1.5" />Salvar configuração
        </Button>
      </div>

      {/* Modal de pré-visualização */}
      <PreviewMensagemModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        mensagem={data.mensagem || ""}
        midiaUrl={data.midiaUrl}
      />
    </div>
  );
}

//  Canvas

function FlowCanvas({ nodes, onNodesChange, selectedId, onSelect, onDragEnd }: {
  nodes: FlowNode[];
  onNodesChange: (nodes: FlowNode[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDragEnd?: (nodes: FlowNode[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [connectDrag, setConnectDrag] = useState<{ sourceId: string; x: number; y: number } | null>(null);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const lastPinchDist = useRef<number | null>(null);
  const lastPinchZoom = useRef<number>(1);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const NODE_W = 220;
  const NODE_H = 110;
  const MIN_ZOOM = 0.2;
  const MAX_ZOOM = 2;
  const PADDING = 60;

  // ── Auto-fit ──────────────────────────────────────────────────────────────────
  const fitView = useCallback(() => {
    if (!containerRef.current || nodesRef.current.length === 0) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const ns = nodesRef.current;
    const minX = Math.min(...ns.map(n => n.x));
    const minY = Math.min(...ns.map(n => n.y));
    const maxX = Math.max(...ns.map(n => n.x + NODE_W));
    const maxY = Math.max(...ns.map(n => n.y + NODE_H));
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const scaleX = (cw - PADDING * 2) / Math.max(contentW, 1);
    const scaleY = (ch - PADDING * 2) / Math.max(contentH, 1);
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_ZOOM), MAX_ZOOM);
    const newPanX = (cw - contentW * newZoom) / 2 - minX * newZoom;
    const newPanY = (ch - contentH * newZoom) / 2 - minY * newZoom;
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, []);

  const prevNodeCount = useRef(-1);
  useEffect(() => {
    if (nodes.length > 0 && prevNodeCount.current !== nodes.length) {
      const t = setTimeout(fitView, 100);
      prevNodeCount.current = nodes.length;
      return () => clearTimeout(t);
    }
  }, [nodes.length, fitView]);

  // ── Zoom com roda do mouse ────────────────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - r.left;
    const mouseY = e.clientY - r.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => {
      const next = Math.min(Math.max(prev * delta, MIN_ZOOM), MAX_ZOOM);
      const ratio = next / prev;
      setPan(p => ({
        x: mouseX - (mouseX - p.x) * ratio,
        y: mouseY - (mouseY - p.y) * ratio,
      }));
      return next;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

    // ── Pan com arrastar fundo ────────────────────────────────────────────
  // Verifica se o clique foi em área vazia do canvas (não em cima de um nó ou botão)
  const isCanvasBackground = (target: HTMLElement): boolean => {
    if (!containerRef.current) return false;
    // Clique no próprio container ou no div de conteúdo transformado (4000x4000) ou no SVG de conexões
    if (target === containerRef.current) return true;
    if (target.closest('[data-flow-node]')) return false; // é um nó
    if (target.closest('button,select,input,textarea,[data-port]')) return false;
    // Qualquer filho direto do canvas que não seja um nó
    return containerRef.current.contains(target);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Botão do meio sempre ativa pan; botão esquerdo só em área vazia
    if (e.button === 1 || (e.button === 0 && isCanvasBackground(e.target as HTMLElement) && !dragging)) {
      e.preventDefault();
      setPanning({ startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y });
    }
  };

  // ── Drag de nó ────────────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if ((e.target as HTMLElement).closest("button,select,input,textarea,[data-port]")) return;
    const node = nodesRef.current.find(n => n.id === id);
    if (!node) return;
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const cx = (e.clientX - r.left - panRef.current.x) / zoomRef.current;
    const cy = (e.clientY - r.top - panRef.current.y) / zoomRef.current;
    setDragging({ id, ox: cx - node.x, oy: cy - node.y });
    onSelect(id);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (panning) {
      setPan({
        x: panning.panX + (e.clientX - panning.startX),
        y: panning.panY + (e.clientY - panning.startY),
      });
    }
    if (dragging) {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      const cx = (e.clientX - r.left - panRef.current.x) / zoomRef.current;
      const cy = (e.clientY - r.top - panRef.current.y) / zoomRef.current;
      const x = Math.max(0, cx - dragging.ox);
      const y = Math.max(0, cy - dragging.oy);
      onNodesChange(nodesRef.current.map(n => n.id === dragging.id ? { ...n, x, y } : n));
    }
    if (connectDrag) {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      const cx = (e.clientX - r.left - panRef.current.x) / zoomRef.current;
      const cy = (e.clientY - r.top - panRef.current.y) / zoomRef.current;
      setConnectDrag(prev => prev ? { ...prev, x: cx, y: cy } : null);
    }
  }, [panning, dragging, connectDrag, onNodesChange]);

  const handleMouseUp = useCallback(() => {
    if (panning) setPanning(null);
    if (dragging) {
      onDragEnd?.(nodesRef.current);
      setDragging(null);
    }
    if (connectDrag) {
      if (hoverTargetId && hoverTargetId !== connectDrag.sourceId) {
        const sourceNode = nodesRef.current.find(n => n.id === connectDrag.sourceId);
        if (sourceNode && !sourceNode.connections.includes(hoverTargetId)) {
          onNodesChange(nodesRef.current.map(n =>
            n.id === connectDrag.sourceId
              ? { ...n, connections: [...n.connections, hoverTargetId] }
              : n
          ));
          toast.success("Nós conectados!");
        }
      }
      setConnectDrag(null);
      setHoverTargetId(null);
    }
  }, [panning, dragging, connectDrag, hoverTargetId, onNodesChange, onDragEnd]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // ── Pinch-to-zoom (touch) ─────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
      lastPinchZoom.current = zoomRef.current;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / lastPinchDist.current;
      const newZoom = Math.min(Math.max(lastPinchZoom.current * ratio, MIN_ZOOM), MAX_ZOOM);
      setZoom(newZoom);
    }
  }, []);

  const handleTouchEnd = useCallback(() => { lastPinchDist.current = null; }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // ── Porta de saída (source port) ──────────────────────────────────────────────
  const handlePortMouseDown = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const cx = (e.clientX - r.left - panRef.current.x) / zoomRef.current;
    const cy = (e.clientY - r.top - panRef.current.y) / zoomRef.current;
    setConnectDrag({ sourceId, x: cx, y: cy });
  };

  // ── Deletar nó ────────────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    onNodesChange(nodes.filter(n => n.id !== id).map(n => ({ ...n, connections: n.connections.filter(c => c !== id) })));
    if (selectedId === id) onSelect(null);
  };

  // ── Deletar aresta ────────────────────────────────────────────────────────────
  const handleDeleteEdge = (sourceId: string, targetId: string) => {
    onNodesChange(nodes.map(n =>
      n.id === sourceId ? { ...n, connections: n.connections.filter(c => c !== targetId) } : n
    ));
  };

  // ── Renderizar arestas ────────────────────────────────────────────────────────
  const renderConnections = () => nodes.flatMap(node =>
    node.connections.map(tid => {
      const t = nodes.find(n => n.id === tid);
      if (!t) return null;
      const x1 = node.x + NODE_W / 2;
      const y1 = node.y + NODE_H;
      const x2 = t.x + NODE_W / 2;
      const y2 = t.y;
      const cy1 = y1 + Math.abs(y2 - y1) * 0.5;
      const cy2 = y2 - Math.abs(y2 - y1) * 0.5;
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const pathId = `edge-${node.id}-${tid}`;
      return (
        <g key={pathId}>
          <path d={`M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`}
            stroke="white" strokeWidth="4" fill="none" opacity="0.6" />
          <path d={`M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`}
            stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
          <circle cx={x2} cy={y2} r="5" fill="white" stroke="#6366f1" strokeWidth="2" />
          <g style={{ cursor: "pointer" }} onClick={() => handleDeleteEdge(node.id, tid)}>
            <circle cx={midX} cy={midY} r="9" fill="white" stroke="#e5e7eb" strokeWidth="1.5" opacity="0.9" />
            <line x1={midX - 4} y1={midY - 4} x2={midX + 4} y2={midY + 4} stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
            <line x1={midX + 4} y1={midY - 4} x2={midX - 4} y2={midY + 4} stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </g>
      );
    })
  );

  // ── Linha de preview durante drag-to-connect ──────────────────────────────────
  const renderConnectPreview = () => {
    if (!connectDrag) return null;
    const src = nodes.find(n => n.id === connectDrag.sourceId);
    if (!src) return null;
    const x1 = src.x + NODE_W / 2;
    const y1 = src.y + NODE_H;
    const x2 = connectDrag.x;
    const y2 = connectDrag.y;
    const cy = (y1 + y2) / 2;
    return (
      <g>
        <path d={`M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`}
          stroke="#6366f1" strokeWidth="2" fill="none" strokeDasharray="6 3" opacity="0.7"
          markerEnd="url(#arrowhead)" />
        <circle cx={x2} cy={y2} r="5" fill="#6366f1" opacity="0.6" />
      </g>
    );
  };

  const cursor = connectDrag ? "crosshair" : panning ? "grabbing" : dragging ? "grabbing" : "grab";
  const dotSize = Math.max(0.5, zoom);
  const gridSize = 24 * zoom;
  const bgOffsetX = pan.x % gridSize;
  const bgOffsetY = pan.y % gridSize;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        minHeight: 580,
        backgroundColor: "#f8faff",
        backgroundImage: `radial-gradient(circle, #c7d2fe ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${bgOffsetX}px ${bgOffsetY}px`,
        cursor,
      }}
      onMouseDown={handleCanvasMouseDown}
      onClick={e => { if ((e.target as HTMLElement) === containerRef.current) onSelect(null); }}
    >
      {/* Conteúdo transformado (zoom + pan) */}
      <div
        style={{
          position: "absolute", top: 0, left: 0,
          transformOrigin: "0 0",
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width: 4000, height: 4000,
        }}
      >
        <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: connectDrag ? "none" : "auto" }}>
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
            </marker>
          </defs>
          {renderConnections()}
          {renderConnectPreview()}
        </svg>

        {nodes.map(node => (
          <div
            key={node.id}
            data-flow-node="true"
            onMouseDown={e => handleMouseDown(e, node.id)}
            onMouseEnter={() => connectDrag && setHoverTargetId(node.id)}
            onMouseLeave={() => connectDrag && setHoverTargetId(null)}
            style={{
              position: "absolute", left: node.x, top: node.y,
              cursor: dragging?.id === node.id ? "grabbing" : "grab",
            }}
          >
            <FlowNodeCard
              node={node}
              selected={selectedId === node.id}
              onSelect={onSelect}
              onDelete={handleDelete}
              onPortMouseDown={handlePortMouseDown}
              isConnectTarget={!!connectDrag && connectDrag.sourceId !== node.id}
              isHoverTarget={hoverTargetId === node.id}
            />
          </div>
        ))}

        {nodes.length === 0 && (
          <div style={{ position: "absolute", top: 200, left: "50%", transform: "translateX(-50%)" }}
            className="flex flex-col items-center text-gray-400 pointer-events-none">
            <Sparkles size={40} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">Canvas vazio</p>
            <p className="text-xs mt-1 opacity-70">Adicione um nó de gatilho para começar</p>
          </div>
        )}
      </div>

      {/* Controles de zoom + Centralizar */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                onClick={() => setZoom(z => Math.min(z * 1.2, MAX_ZOOM))}
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left"><p>Aumentar zoom</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                onClick={() => setZoom(z => Math.max(z * 0.8, MIN_ZOOM))}
              >
                <Minus size={14} strokeWidth={2.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left"><p>Reduzir zoom</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="w-8 h-px bg-gray-200 mx-auto" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                onClick={fitView}
                disabled={nodes.length === 0}
              >
                <Maximize2 size={13} strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left"><p>Centralizar todos os nós</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Indicador de zoom */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/80 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-500 font-mono pointer-events-none">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

//  Templates

const TEMPLATES = [
  {
    nome: "Lembrete 24h antes", descricao: "Envia lembrete 1 dia antes do agendamento", icon: AlarmClock,
    nodes: [
      { id: "t1", type: "trigger" as NodeType, x: 300, y: 60, data: { label: "1 dia antes", tipo: "dias_antes_agendamento", dias: 1, hora: "09:00" }, connections: ["a1"] },
      { id: "a1", type: "action" as NodeType, x: 300, y: 220, data: { label: "Lembrete WhatsApp", tipo: "enviar_whatsapp", mensagem: "Olá {{nome_cliente}}! Lembrando que você tem {{servico}} amanhã às {{hora}} com {{profissional}}. Confirma sua presença? " }, connections: [] },
    ],
  },
  {
    nome: "Aniversariante do Mês", descricao: "Desconto no 1º dia do mês do aniversário", icon: Gift,
    nodes: [
      { id: "t1", type: "trigger" as NodeType, x: 300, y: 60, data: { label: "Aniversário do mês", tipo: "aniversario_mes" }, connections: ["a1"] },
      { id: "a1", type: "action" as NodeType, x: 300, y: 220, data: { label: "Mensagem de aniversário", tipo: "enviar_whatsapp", mensagem: "Feliz mês do seu aniversário, {{nome_cliente}}!  Você tem desconto especial durante todo o mês. Agende agora! {{empresa}}" }, connections: [] },
    ],
  },
  {
    nome: "Solicitar reserva", descricao: "Pede pagamento de 30% após pré-agendamento", icon: Clock,
    nodes: [
      { id: "t1", type: "trigger" as NodeType, x: 300, y: 60, data: { label: "Pré-agendamento criado", tipo: "evento_agendamento_pre_agendado" }, connections: ["a1"] },
      { id: "a1", type: "action" as NodeType, x: 300, y: 220, data: { label: "Solicitar reserva", tipo: "enviar_whatsapp", mensagem: "Olá {{nome_cliente}}! Seu horário de {{servico}} em {{data}} às {{hora}} foi pré-reservado. Para confirmar, pague a reserva de 30% ({{valor}}) via Pix. Válido por 24h ⏰" }, connections: [] },
    ],
  },
  {
    nome: "Natal / Datas comemorativas", descricao: "Mensagem em data específica do calendário", icon: Sparkles,
    nodes: [
      { id: "t1", type: "trigger" as NodeType, x: 300, y: 60, data: { label: "25 de Dezembro", tipo: "data_fixa", dia: 25, mes: "12", hora: "09:00" }, connections: ["a1"] },
      { id: "a1", type: "action" as NodeType, x: 300, y: 220, data: { label: "Feliz Natal", tipo: "enviar_whatsapp", mensagem: "Feliz Natal, {{nome_cliente}}!  Que este dia seja repleto de alegria. Obrigada por fazer parte da nossa história! Com carinho, {{empresa}} " }, connections: [] },
    ],
  },
  {
    nome: "Confirmação com delay", descricao: "Aguarda 2h e envia confirmação", icon: AlarmClock,
    nodes: [
      { id: "t1", type: "trigger" as NodeType, x: 300, y: 40, data: { label: "Agendamento criado", tipo: "evento_agendamento_criado" }, connections: ["d1"] },
      { id: "d1", type: "delay" as NodeType, x: 300, y: 190, data: { label: "Aguardar 2h", quantidade: 2, unidade: "horas" }, connections: ["a1"] },
      { id: "a1", type: "action" as NodeType, x: 300, y: 340, data: { label: "Confirmação", tipo: "enviar_whatsapp", mensagem: "Olá {{nome_cliente}}! Seu agendamento de {{servico}} em {{data}} às {{hora}} com {{profissional}} está confirmado. Até lá! " }, connections: [] },
    ],
  },
  {
    nome: "Profissional atribuído", descricao: "Avisa o cliente quando um profissional é definido para o agendamento", icon: UserPlus,
    nodes: [
      { id: "t1", type: "trigger" as NodeType, x: 300, y: 60, data: { label: "Profissional atribuído", tipo: "evento_profissional_atribuido" }, connections: ["a1"] },
      { id: "a1", type: "action" as NodeType, x: 300, y: 220, data: { label: "Notificar cliente", tipo: "enviar_whatsapp", mensagem: "Olá {{nome_cliente}}! Seu agendamento de {{servico}} em {{data}} às {{hora}} foi atualizado. Profissional: {{profissional}}. Qualquer dúvida, estamos à disposição! {{empresa}}" }, connections: [] },
    ],
  },
  {
    nome: "Reserva paga", descricao: "Confirma ao cliente que a reserva foi recebida e o agendamento está garantido", icon: Check,
    nodes: [
      { id: "t1", type: "trigger" as NodeType, x: 300, y: 60, data: { label: "Reserva paga", tipo: "evento_reserva_paga" }, connections: ["a1"] },
      { id: "a1", type: "action" as NodeType, x: 300, y: 220, data: { label: "Confirmar reserva", tipo: "enviar_whatsapp", mensagem: "✅ *Reserva Confirmada!*\n\nOlá, *{{nome_cliente}}*! Sua reserva foi confirmada com sucesso.\n\n📅 *Data:* {{data}}\n⏰ *Horário:* {{hora}}\n✂️ *Serviço:* {{servico}}\n🔒 *Reserva paga:* {{valor_reserva}}\n\n_{{empresa}}_" }, connections: [] },
    ],
  },
  {
    nome: "Crédito gerado", descricao: "Notifica o cliente quando um crédito é adicionado à sua conta", icon: DollarSign,
    nodes: [
      { id: "t1", type: "trigger" as NodeType, x: 300, y: 60, data: { label: "Crédito gerado", tipo: "evento_credito_gerado" }, connections: ["a1"] },
      { id: "a1", type: "action" as NodeType, x: 300, y: 220, data: { label: "Notificar crédito", tipo: "enviar_whatsapp", mensagem: "💰 *Crédito Disponível!*\n\nOlá, *{{nome_cliente}}*! Um crédito foi adicionado à sua conta.\n\n📊 *Detalhes:*\n• Valor adicionado: *{{valor}}*\n• Saldo total: *{{saldo_total}}*\n\n_{{empresa}}_\n\n_Seu crédito será descontado automaticamente no próximo atendimento._" }, connections: [] },
    ],
  },
];

//  Página principal

export default function Automacoes() {
  const { pode } = usePermissoes();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [showGerarPipelineModal, setShowGerarPipelineModal] = useState(false);
  const [pipelineGerado, setPipelineGerado] = useState<{ pipelineId: number; nomePipeline: string; totalColunas: number; totalCartoes: number } | null>(null);
  const [pipelinePreview, setPipelinePreview] = useState<{ nomePipeline: string; descricao: string; colunas: Array<{ nome: string; cor: string; descricao: string }>; estimativaCartoes: number } | null>(null);
  const [showSnapshotsModal, setShowSnapshotsModal] = useState(false);
  const [snapshotParaRestaurar, setSnapshotParaRestaurar] = useState<number | null>(null);
  // Sincronização inteligente do Pipeline
  const [showSincModal, setShowSincModal] = useState(false);
  const [sincPreview, setSincPreview] = useState<{
    pipelines: Array<{ id: number; nome: string; colunas: Array<{ id: number; nome: string; statusVinculo: string | null; totalCartoes: number }> }>;
    automacoes: Array<{ id: number; nome: string; evento: string; label: string }>;
  } | null>(null);
  const [sincPipelineId, setSincPipelineId] = useState<number | null>(null);

  const previewPipelineMutation = trpc.pipeline.previewPipelinePorIA.useMutation({
    onSuccess: (data) => setPipelinePreview(data),
    onError: (e: any) => toast.error(e.message ?? "Erro ao gerar preview"),
  });
  const snapshotsQuery = trpc.pipeline.listarSnapshots.useQuery(undefined, { enabled: showSnapshotsModal });
  const restaurarSnapshotMutation = trpc.pipeline.restaurarSnapshot.useMutation({
    onSuccess: (data) => {
      toast.success(`Pipeline "${data.nomePipeline}" restaurado com sucesso!`);
      utils.pipeline.listar.invalidate();
      setShowSnapshotsModal(false);
      setSnapshotParaRestaurar(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao restaurar pipeline"),
  });

  const gerarPipelineMutation = trpc.pipeline.gerarPipelinePorIA.useMutation({
    onSuccess: (data) => {
      setPipelineGerado(data);
      toast.success(`Pipeline "${data.nomePipeline}" criado com sucesso!`);
      utils.pipeline.listar.invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao gerar pipeline"),
  });

  // Campos que definem o FLUXO da automação (mudança nesses campos justifica regenerar o pipeline)
  const CAMPOS_FLUXO = ["tipoGatilho", "evento", "diasAntesDepois", "delayMinutos", "horaDisparo", "dataFixaDia", "dataFixaMes", "canalEnvio", "ativo"] as const;

  // Sincronização inteligente do Pipeline com as automações ativas
  const sincronizarMutation = trpc.pipeline.sincronizarComAutomacoes.useMutation({
    onSuccess: (data) => {
      setShowSincModal(false);
      setSincPreview(null);
      setSincPipelineId(null);
      utils.pipeline.listar.invalidate();
      if (data.colunasAdicionadas > 0) {
        toast.success(`✅ Pipeline sincronizado! ${data.colunasAdicionadas} coluna(s) adicionada(s).`, { duration: 4000 });
      } else {
        toast.success('✅ Pipeline já está sincronizado com as automações.', { duration: 3000 });
      }
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao sincronizar pipeline'),
  });

  // Após salvar/ativar/desativar automação, verifica se há pipelines e oferece sincronização
  const gerarPipelineAutomatico = () => {
    // Busca o preview de sincronização em segundo plano
    utils.pipeline.previewSincronizacao.fetch().then((data) => {
      if (!data) return;
      // Se há pipelines existentes, mostra modal de sincronização
      if (data.pipelines.length > 0) {
        setSincPreview(data);
        setSincPipelineId(data.pipelines[0].id);
        setShowSincModal(true);
      } else {
        // Sem pipelines, gera um novo por IA silenciosamente
        gerarPipelineMutation.mutate(undefined, {
          onSuccess: (d) => {
            toast.success(`✅ Pipeline criado automaticamente — "${d.nomePipeline}"`, { duration: 3500 });
            utils.pipeline.listar.invalidate();
          },
          onError: () => { /* silencioso */ },
        });
      }
    }).catch(() => { /* silencioso */ });
  };

  // Verifica se campos de fluxo mudaram comparando com os dados salvos
  const fluxoMudou = (id: number, novosDados: Record<string, any>): boolean => {
    const automacaoAtual = automacoesSalvas.find((a: any) => a.id === id);
    if (!automacaoAtual) return true; // nova automação, sempre gera
    return CAMPOS_FLUXO.some(campo => {
      const antes = (automacaoAtual as any)[campo];
      const depois = novosDados[campo];
      return antes !== depois;
    });
  };

  const { data: automacoesSalvas = [], isLoading } = trpc.automacoes.list.useQuery();
  const [duplicataInfo, setDuplicataInfo] = useState<{ mensagem: string; onConfirm: () => void } | null>(null);

  const createMutation = trpc.automacoes.create.useMutation({
    onSuccess: () => { toast.success("Automação salva!"); utils.automacoes.list.invalidate(); gerarPipelineAutomatico(); },
    onError: (e: any) => {
      // Detectar erro de duplicidade e mostrar modal de aviso
      if (e.message?.includes("Já existe uma automação com o mesmo")) {
        setDuplicataInfo({ mensagem: e.message, onConfirm: () => {} });
      } else {
        toast.error(e.message);
      }
    },
  });
  const updateMutation = trpc.automacoes.update.useMutation({
    onSuccess: () => { toast.success("Automação atualizada!"); utils.automacoes.list.invalidate(); },
  });
  const deleteMutation = trpc.automacoes.delete.useMutation({
    onSuccess: () => { toast.success("Automação excluída!"); utils.automacoes.list.invalidate(); gerarPipelineAutomatico(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteManyMutation = trpc.automacoes.deleteMany.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.deletedCount} automações excluídas!`);
      utils.automacoes.list.invalidate();
      gerarPipelineAutomatico();
      setSelecionadas(new Set());
      setModoSelecao(false);
      setConfirmDeleteMany(false);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const savePositionsMutation = trpc.automacoes.savePositions.useMutation();
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [confirmDeleteMany, setConfirmDeleteMany] = useState(false);
  const toggleSelecao = (id: number) => setSelecionadas(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const [testeEnvioId, setTesteEnvioId] = useState<number | null>(null);
  const [testeTelefone, setTesteTelefone] = useState("");
  const [testeComClienteId, setTesteComClienteId] = useState<number | null>(null);
  const [testeClienteId, setTesteClienteId] = useState<number | null>(null);
  const [testeClienteSearchTerm, setTesteClienteSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"automacoes" | "historico" | "jornada">("automacoes");
  const [filtroTipoGatilho, setFiltroTipoGatilho] = useState<string>("todos");
  const [historicoPage, setHistoricoPage] = useState(0);
  const [historicoFiltroCanal, setHistoricoFiltroCanal] = useState("");
  const [historicoFiltroStatus, setHistoricoFiltroStatus] = useState("");
  const [historicoApenasTestes, setHistoricoApenasTestes] = useState(false);
  const [historicoAoVivo, setHistoricoAoVivo] = useState(false);
  const [historicoExpandedId, setHistoricoExpandedId] = useState<number | null>(null);
  const HISTORICO_LIMIT = 20;

  const [jornadaPeriodo, setJornadaPeriodo] = useState<"24h" | "7d" | "30d">("7d");
  const { data: jornadaData, isLoading: jornadaLoading, refetch: jornadaRefetch } = trpc.automacoes.getMetricasJornada.useQuery(
    { periodo: jornadaPeriodo },
    { enabled: activeTab === "jornada", refetchInterval: 30000 }
  );
  const { data: falhasData } = trpc.automacoes.getFalhasRecentes.useQuery(
    undefined,
    { refetchInterval: 60000 }
  );
  const reenviarMutation = trpc.automacoes.reenviarMensagem.useMutation({
    onSuccess: () => {
      toast.success("Mensagem reenviada com sucesso!");
      jornadaRefetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const testeComClienteMutation = trpc.automacoes.enviarTesteComCliente.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setTesteComClienteId(null);
      setTesteClienteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: empresaData } = trpc.empresa.get.useQuery();
  const { data: historicoData, isLoading: historicoLoading, refetch: historicoRefetch } = trpc.automacoes.getHistorico.useQuery({
    limit: HISTORICO_LIMIT,
    offset: historicoPage * HISTORICO_LIMIT,
    canal: historicoFiltroCanal || undefined,
    status: historicoFiltroStatus || undefined,
    apenasTestes: historicoApenasTestes || undefined,
  }, { enabled: activeTab === "historico", refetchInterval: historicoAoVivo ? 5000 : false });

  const [view, setView] = useState<"list" | "editor">("list");
  const [abaEditor, setAbaEditor] = useState<"canvas" | "jornada">("canvas");
  const [currentFlow, setCurrentFlow] = useState<FlowAutomacao>({ nome: "Nova Automação", ativo: true, nodes: [] });

  // Auto-save de posições após arrastar um nó (somente para automações já salvas)
  const handleDragEnd = useCallback((updatedNodes: FlowNode[]) => {
    if (currentFlow.id) {
      savePositionsMutation.mutate({ id: currentFlow.id, flowJson: JSON.stringify(updatedNodes) });
    }
  }, [currentFlow.id, savePositionsMutation]);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [addNodeMenu, setAddNodeMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [mobileNodeSheet, setMobileNodeSheet] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;
  const mobileSheetNode = nodes.find(n => n.id === mobileNodeSheet) ?? null;

  const openEditor = (flow?: Partial<FlowAutomacao> & { id?: number; flowJson?: string; confirmacaoAutoAtivo?: boolean; confirmacaoAutoHorasAntes?: number }) => {
    setCurrentFlow({ nome: flow?.nome || "Nova Automação", descricao: flow?.descricao, ativo: flow?.ativo ?? true, nodes: [], confirmacaoAutoAtivo: flow?.confirmacaoAutoAtivo ?? false, confirmacaoAutoHorasAntes: flow?.confirmacaoAutoHorasAntes ?? 2 });
    // Tentar restaurar nós do flowJson salvo
    if (flow?.flowJson) {
      try {
        const parsed = JSON.parse(flow.flowJson);
        // Injetar eventosAdicionais do backend no triggerNode (multi-trigger)
        const flowWithExtras = Array.isArray(parsed) ? parsed.map((n: any) => {
          if (n.type === 'trigger' && (flow as any).eventosAdicionais) {
            try {
              const extras = JSON.parse((flow as any).eventosAdicionais);
              return { ...n, data: { ...n.data, eventosAdicionais: Array.isArray(extras) ? extras : [] } };
            } catch { return n; }
          }
          return n;
        }) : [];
        setNodes(flowWithExtras);
      } catch {
        setNodes(flow?.nodes || []);
      }
    } else {
      setNodes(flow?.nodes || []);
    }
    if (flow?.id) setCurrentFlow(p => ({ ...p, id: flow.id }));
    setSelectedNodeId(null);
    setAbaEditor("canvas");
    setView("editor");
  };

  const addNode = (type: NodeType) => {
    const id = `${type}-${Date.now()}`;
    setNodes(prev => {
      // Posicionar o novo nó abaixo do último nó existente, com offset horizontal
      const lastNode = prev.length > 0 ? prev[prev.length - 1] : null;
      const x = lastNode ? lastNode.x + (Math.random() > 0.5 ? 20 : -20) : 80;
      const y = lastNode ? lastNode.y + 160 : 80;
      return [...prev, { id, type, x, y, data: {}, connections: [] }];
    });
    setSelectedNodeId(id);
    setAddNodeMenu(false);
  };

  // saveFlow aceita opcionalmente um nó já atualizado (para salvar direto do painel do nó)
  const saveFlow = (updatedNodeData?: { id: string; data: Record<string, any> }) => {
    if (!currentFlow.nome.trim()) { toast.error("Dê um nome à automação"); return; }
    if (nodes.length === 0) { toast.error("Adicione pelo menos um nó"); return; }
    // Aplicar dados atualizados do nó antes de serializar
    const nodesParaSalvar = updatedNodeData
      ? nodes.map(n => n.id === updatedNodeData.id ? { ...n, data: { ...n.data, ...updatedNodeData.data } } : n)
      : nodes;
    const triggerNode = nodesParaSalvar.find(n => n.type === "trigger");
    if (!triggerNode) { toast.error("Adicione um nó de gatilho antes de salvar"); return; }
    if (!triggerNode.data.tipo) { toast.error("Configure o tipo do gatilho antes de salvar"); return; }
    const tipo = triggerNode.data.tipo;
    const tipoGatilho: any = tipo.startsWith("manual_") ? "manual"
      : tipo.startsWith("evento_") ? "evento"
      : tipo === "aniversario_mes" ? "aniversario_mes"
      : tipo === "data_fixa" ? "data_fixa"
      : tipo === "dias_antes_agendamento" ? "dias_antes_agendamento"
      : tipo === "horas_antes_agendamento" ? "horas_antes_agendamento"
      : tipo === "dias_depois_agendamento" ? "dias_depois_agendamento"
      : "horas_apos_agendamento";
    const actionNode = nodesParaSalvar.find(n => n.type === "action");
    const flowJsonStr = JSON.stringify(nodesParaSalvar);
    const eventoValue = tipo.startsWith("manual_") ? tipo.replace("manual_", "") : tipo.startsWith("evento_") ? tipo.replace("evento_", "") : undefined;
    // Extrair gatilhos adicionais do triggerNode
    const eventosAdicionaisArr = triggerNode.data.eventosAdicionais || [];
    const eventosAdicionaisStr = eventosAdicionaisArr.length > 0 ? JSON.stringify(eventosAdicionaisArr) : null;
    if (currentFlow.id) {
      // Atualizar automação existente — inclui campos temporais para garantir que dias_antes_agendamento funcione
      updateMutation.mutate({
        id: currentFlow.id,
        nome: currentFlow.nome,
        corpoMensagem: actionNode?.data.mensagem || "Mensagem automática",
        flowJson: flowJsonStr,
        tipoGatilho,
        evento: eventoValue,
        eventosAdicionais: eventosAdicionaisStr,
        diasAntesDepois: (tipoGatilho === 'horas_antes_agendamento' || tipoGatilho === 'horas_apos_agendamento')
          ? undefined
          : (triggerNode.data.dias ? Number(triggerNode.data.dias) : undefined),
        delayMinutos: (tipoGatilho === 'horas_antes_agendamento' || tipoGatilho === 'horas_apos_agendamento')
          ? (triggerNode.data.horas ? Number(triggerNode.data.horas) * 60 : 60)
          : undefined,
        horaDisparo: triggerNode.data.hora,
        dataFixaDia: triggerNode.data.dia ? Number(triggerNode.data.dia) : undefined,
        dataFixaMes: triggerNode.data.mes ? Number(triggerNode.data.mes) : undefined,
        dataFixaHora: triggerNode.data.hora,
        canalEnvio: actionNode?.data.tipo === "enviar_email" ? "email" : "whatsapp",
        tituloMensagem: actionNode?.data.titulo,
        confirmacaoAutoAtivo: currentFlow.confirmacaoAutoAtivo,
        confirmacaoAutoHorasAntes: currentFlow.confirmacaoAutoHorasAntes,
      }, { onSuccess: () => {
        toast.success("Automação salva!");
        if (!updatedNodeData) setView("list");
        // Só regenera o pipeline se campos de fluxo mudaram
        const novosDadosFluxo = { tipoGatilho, evento: eventoValue, diasAntesDepois: (tipoGatilho === 'horas_antes_agendamento' || tipoGatilho === 'horas_apos_agendamento') ? undefined : (triggerNode.data.dias ? Number(triggerNode.data.dias) : undefined), delayMinutos: (tipoGatilho === 'horas_antes_agendamento' || tipoGatilho === 'horas_apos_agendamento') ? (triggerNode.data.horas ? Number(triggerNode.data.horas) * 60 : 60) : undefined, horaDisparo: triggerNode.data.hora, dataFixaDia: triggerNode.data.dia ? Number(triggerNode.data.dia) : undefined, dataFixaMes: triggerNode.data.mes ? Number(triggerNode.data.mes) : undefined, canalEnvio: actionNode?.data.tipo === "enviar_email" ? "email" : "whatsapp" };
        if (currentFlow.id && fluxoMudou(currentFlow.id, novosDadosFluxo)) gerarPipelineAutomatico();
      } });
    } else {
      // Criar nova automação
      createMutation.mutate({
        nome: currentFlow.nome,
        descricao: currentFlow.descricao,
        tipoGatilho,
        evento: eventoValue,
        eventosAdicionais: eventosAdicionaisStr,
        diasAntesDepois: (tipoGatilho === 'horas_antes_agendamento' || tipoGatilho === 'horas_apos_agendamento')
          ? undefined
          : (triggerNode.data.dias ? Number(triggerNode.data.dias) : undefined),
        delayMinutos: (tipoGatilho === 'horas_antes_agendamento' || tipoGatilho === 'horas_apos_agendamento')
          ? (triggerNode.data.horas ? Number(triggerNode.data.horas) * 60 : 60)
          : undefined,
        horaDisparo: triggerNode.data.hora,
        dataFixaDia: triggerNode.data.dia ? Number(triggerNode.data.dia) : undefined,
        dataFixaMes: triggerNode.data.mes ? Number(triggerNode.data.mes) : undefined,
        dataFixaHora: triggerNode.data.hora,
        canalEnvio: actionNode?.data.tipo === "enviar_email" ? "email" : "whatsapp",
        tituloMensagem: actionNode?.data.titulo,
        corpoMensagem: actionNode?.data.mensagem || "Mensagem automática",
        flowJson: flowJsonStr,
      }, { onSuccess: () => { toast.success("Automação salva!"); if (!updatedNodeData) setView("list"); gerarPipelineAutomatico(); } });
    }
  };

  const getTipoGatilhoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      evento: "Eventos",
      dias_antes_agendamento: "Dias antes",
      horas_antes_agendamento: "Horas antes",
      horas_apos_agendamento: "Horas depois",
      dias_depois_agendamento: "Dias depois",
      data_fixa: "Data fixa",
      aniversario_mes: "Aniversário",
      manual: "Manual",
    };
    return labels[tipo] ?? tipo;
  };

  const automacoesDoSistema = (automacoesSalvas as any[]).filter((a: any) => a.isTemplate);
  const automacoesDoUsuario = (automacoesSalvas as any[]).filter((a: any) => !a.isTemplate);

  const automacoesFiltradas = automacoesDoUsuario.filter((a: any) => {
    if (filtroTipoGatilho === "todos") return true;
    return a.tipoGatilho === filtroTipoGatilho;
  });

  const tiposGatilhoUnicos = Array.from(new Set(automacoesDoUsuario.map((a: any) => a.tipoGatilho)));

  const getTriggerLabel = (a: any) => {
    switch (a.tipoGatilho) {
      case "evento": {
        const evtLabels: Record<string, string> = {
          agendamento_criado: "Agendamento criado",
          agendamento_pre_agendado: "Pré-agendamento",
          agendamento_confirmado: "Confirmado",
          agendamento_cancelado: "Cancelado",
          agendamento_concluido: "Concluído",
          cliente_criado: "Novo cliente",
          pre_agendamento_cancelado: "Pré-agend. expirado",
          profissional_atribuido: "Profissional atribuído",
          reserva_paga: "Reserva paga",
          credito_gerado: "Crédito gerado",
          pacote_renovado: "Pacote renovado",
          pacote_vencendo: "Pacote vencendo",
          sessoes_acabando: "Sessões acabando",
        };
        const label = evtLabels[a.evento] ?? `Evento: ${a.evento || "agendamento"}`;
        // Indicar multi-trigger se houver eventosAdicionais
        if (a.eventosAdicionais) {
          try {
            const extras = JSON.parse(a.eventosAdicionais);
            if (Array.isArray(extras) && extras.length > 0) {
              return `${label} +${extras.length}`;
            }
          } catch {}
        }
        return label;
      }
      case "manual": {
        const manualLabels: Record<string, string> = {
          renovacao_pacote: "Manual: Renovação",
          mensagem_avulsa: "Manual: Avulsa",
          lembrete_manual: "Manual: Lembrete",
        };
        return manualLabels[a.evento] ?? "Manual";
      }
      case "aniversario_mes": return "Aniversariante do mês";
      case "data_fixa": return `${a.dataFixaDia}/${a.dataFixaMes ? MESES_ABREV[a.dataFixaMes - 1] : "?"} às ${a.dataFixaHora || "09:00"}`;
      case "dias_antes_agendamento": return `${a.diasAntesDepois || 1} dia(s) antes`;
      case "horas_antes_agendamento": return `${a.delayMinutos ? Math.round(a.delayMinutos / 60) : 2}h antes`;
      case "horas_apos_agendamento": return `${a.delayMinutos ? Math.round(a.delayMinutos / 60) : 2}h após`;
      case "dias_depois_agendamento": return `${a.diasAntesDepois || 1} dia(s) depois`;
      default: return a.tipoGatilho;
    }
  };

  //  Guarda de permissão: apenas quem tem automacoesVer pode acessar Automações
  if (!pode("automacoesVer")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <Zap className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Você não tem permissão para acessar as Automações.</p>
      </div>
    );
  }

  //  LISTA
  if (view === "list") {
    return (
      <>
      <div className="p-4 lg:p-6 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-5 gap-3">
            <div>
              <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Automações</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Fluxos automáticos de mensagens e ações</p>
            </div>
            {activeTab === "automacoes" && (
              <div className="flex gap-2">
                {pode("admin") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                    onClick={() => { setPipelineGerado(null); setShowGerarPipelineModal(true); }}
                  >
                    <GitBranch size={14} className="mr-1" />
                    <span className="hidden sm:inline">Gerar Pipeline com IA</span>
                    <span className="sm:hidden">Pipeline IA</span>
                  </Button>
                )}
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openEditor()}>
                  <Plus size={14} className="mr-1" />
                  <span className="hidden sm:inline">Nova Automação</span>
                  <span className="sm:hidden">Nova</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
                  <Sparkles size={14} className="mr-1" />
                  <span className="hidden sm:inline">Templates</span>
                </Button>

              </div>
            )}
            {activeTab === "historico" && (
              <Button variant="outline" size="sm" onClick={() => historicoRefetch()}>
                <RefreshCw size={13} className="mr-1" />Atualizar
              </Button>
            )}
            {activeTab === "jornada" && (
              <Button variant="outline" size="sm" onClick={() => jornadaRefetch()} disabled={jornadaLoading}>
                <RefreshCw size={13} className={`mr-1 ${jornadaLoading ? "animate-spin" : ""}`} />Atualizar
              </Button>
            )}
          </div>

          {/* Abas de navegação */}
          <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("automacoes")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "automacoes"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Zap size={13} />Automações
            </button>
            <button
              onClick={() => setActiveTab("historico")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "historico"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <History size={13} />Histórico de Envios
            </button>
            <button
              onClick={() => setActiveTab("jornada")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "jornada"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Activity size={13} />Jornada ao Vivo
            </button>
          </div>

          {/* ABA HISTÓRICO */}
          {activeTab === "historico" && (
            <div>
              {/* Filtros */}
              <div className="flex gap-2 mb-4 flex-wrap items-center">
                <select
                  value={historicoFiltroCanal}
                  onChange={e => { setHistoricoFiltroCanal(e.target.value); setHistoricoPage(0); }}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="">Todos os canais</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="lembrete">Lembrete</option>
                  <option value="email">E-mail</option>
                  <option value="sms">SMS</option>
                </select>
                <select
                  value={historicoFiltroStatus}
                  onChange={e => { setHistoricoFiltroStatus(e.target.value); setHistoricoPage(0); }}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="">Todos os status</option>
                  <option value="enviado">Enviado</option>
                  <option value="falhou">Falhou</option>
                  <option value="pendente">Pendente</option>
                </select>
                <button
                  onClick={() => { setHistoricoApenasTestes(v => !v); setHistoricoPage(0); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    historicoApenasTestes
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <Send size={12} />
                  Apenas testes
                </button>
                <button
                  onClick={() => setHistoricoAoVivo(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    historicoAoVivo
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${historicoAoVivo ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
                  Ao vivo
                </button>
              </div>

              {/* Tabela */}
              {historicoLoading ? (
                <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
              ) : !historicoData?.rows.length ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                  <History size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">Nenhum envio registrado</p>
                  <p className="text-sm text-gray-400 mt-1">Os envios de WhatsApp e lembretes aparecerão aqui</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data/Hora</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Telefone</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Automação</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Serviço</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Canal</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mensagem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {historicoData.rows.map((row: any) => {
                          const isExpanded = historicoExpandedId === row.id;
                          return (<>
                          <tr key={row.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setHistoricoExpandedId(isExpanded ? null : row.id)}>
                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                              {new Date(row.criadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-gray-900 text-sm">{row.clienteNome || '—'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-gray-600 text-xs flex items-center gap-1">
                                <Phone size={10} />{row.telefone || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-gray-600 text-xs">{row.automacaoNome || '—'}</span>
                            </td>
                            <td className="px-4 py-3">
                              {row.servicoNome ? (
                                <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-medium" title={row.servicoNome}>
                                  {row.servicoNome.length > 22 ? row.servicoNome.slice(0, 22) + '…' : row.servicoNome}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                row.canal === 'whatsapp' ? 'bg-green-100 text-green-700' :
                                row.canal === 'lembrete' ? 'bg-blue-100 text-blue-700' :
                                row.canal === 'email' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {row.canal === 'whatsapp' ? <><MessageSquare size={9} />WhatsApp</> :
                                 row.canal === 'lembrete' ? <><Bell size={9} />Lembrete</> :
                                 row.canal === 'email' ? <><Mail size={9} />E-mail</> :
                                 <><Send size={9} />{row.canal}</>}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                row.status === 'enviado' ? 'bg-emerald-100 text-emerald-700' :
                                row.status === 'falhou' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {row.status === 'enviado' ? <><Check size={9} />Enviado</> :
                                 row.status === 'falhou' ? <><AlertCircle size={9} />Falhou</> :
                                 <><Clock size={9} />Pendente</>}
                              </span>
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <p className="text-xs text-gray-500 truncate" title={row.mensagem || ''}>
                                {row.mensagem ? row.mensagem.slice(0, 60) + (row.mensagem.length > 60 ? '...' : '') : '—'}
                              </p>
                              {row.erroDetalhe && (
                                <p className="text-xs text-red-500 mt-0.5 truncate" title={row.erroDetalhe}>{row.erroDetalhe}</p>
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${row.id}-expanded`} className="bg-indigo-50/40">
                              <td colSpan={8} className="px-6 py-3">
                                {row.mensagem && (
                                  <div className="mb-2">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Mensagem completa</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded-lg border border-gray-100 p-3">{row.mensagem}</p>
                                  </div>
                                )}
                                {row.erroDetalhe && (
                                  <div>
                                    <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide mb-1">Detalhe do erro</p>
                                    <p className="text-sm text-red-600 bg-red-50 rounded-lg border border-red-100 p-3 whitespace-pre-wrap">{row.erroDetalhe}</p>
                                  </div>
                                )}
                                {!row.mensagem && !row.erroDetalhe && (
                                  <p className="text-xs text-gray-400 italic">Nenhum detalhe adicional disponível.</p>
                                )}
                              </td>
                            </tr>
                          )}
                          </>);
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Paginação */}
                  {historicoData.total > HISTORICO_LIMIT && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        Mostrando {historicoPage * HISTORICO_LIMIT + 1}–{Math.min((historicoPage + 1) * HISTORICO_LIMIT, historicoData.total)} de {historicoData.total}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={historicoPage === 0} onClick={() => setHistoricoPage(p => p - 1)}>
                          <ChevronLeft size={13} />
                        </Button>
                        <Button variant="outline" size="sm" disabled={(historicoPage + 1) * HISTORICO_LIMIT >= historicoData.total} onClick={() => setHistoricoPage(p => p + 1)}>
                          <ChevronRight size={13} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ABA JORNADA AO VIVO */}
          {activeTab === "jornada" && (
            <div>
              {/* Seletor de período */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-500 font-medium">Período:</span>
                {(["24h", "7d", "30d"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setJornadaPeriodo(p)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                      jornadaPeriodo === p
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
                    }`}
                  >
                    {p === "24h" ? "Últimas 24h" : p === "7d" ? "Últimos 7 dias" : "Últimos 30 dias"}
                  </button>
                ))}
                {(jornadaData?.totalFalhas ?? 0) > 0 && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full">
                    <AlertCircle size={12} />
                    {jornadaData!.totalFalhas} falha{jornadaData!.totalFalhas !== 1 ? "s" : ""} no período
                  </span>
                )}
              </div>

              {jornadaLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
              ) : (
                <>
                  {/* Métricas de status */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp size={14} className="text-indigo-500" />
                      <h3 className="text-sm font-semibold text-gray-700">Resumo dos envios — {jornadaPeriodo === "24h" ? "últimas 24h" : jornadaPeriodo === "7d" ? "últimos 7 dias" : "últimos 30 dias"}</h3>
                    </div>
                    {(!jornadaData?.metricas || jornadaData.metricas.length === 0) ? (
                      <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
                        <Activity size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">Nenhum envio registrado ainda</p>
                        <p className="text-xs text-gray-400 mt-1">Os dados aparecerão aqui conforme as automações forem disparadas</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {jornadaData.metricas.map((m: any) => (
                          <div key={m.status} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xl">{m.emoji}</span>
                              <span className="text-2xl font-bold" style={{ color: m.cor }}>{m.total}</span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium">{m.label}</p>
                            {jornadaData.metricas.reduce((acc: number, x: any) => acc + x.total, 0) > 0 && (
                              <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.round((m.total / jornadaData.metricas.reduce((acc: number, x: any) => acc + x.total, 0)) * 100)}%`,
                                    backgroundColor: m.cor,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Feed ao vivo */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Radio size={14} className="text-emerald-500" />
                      <h3 className="text-sm font-semibold text-gray-700">Feed ao vivo</h3>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Atualiza a cada 30s
                      </span>
                    </div>
                    {(!jornadaData?.feed || jornadaData.feed.length === 0) ? (
                      <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
                        <Send size={28} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">Nenhum evento recente</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="divide-y divide-gray-50">
                          {jornadaData.feed.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                              <span className="text-base flex-shrink-0">{item.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-gray-900 truncate">{item.clienteNome}</span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-500 truncate">{item.automacaoNome}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] uppercase tracking-wide text-gray-400">
                                    {item.canal === "whatsapp" ? "WhatsApp" : item.canal === "email" ? "E-mail" : item.canal}
                                  </span>
                                  <span className="text-[10px] text-gray-300">•</span>
                                  <span className="text-[10px] text-gray-400">
                                    {new Date(item.criadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      item.status === "enviado" ? "#dcfce7" :
                                      item.status === "falhou" ? "#fee2e2" :
                                      item.status === "pendente" ? "#fef9c3" : "#f3f4f6",
                                    color:
                                      item.status === "enviado" ? "#16a34a" :
                                      item.status === "falhou" ? "#dc2626" :
                                      item.status === "pendente" ? "#ca8a04" : "#6b7280",
                                  }}
                                >
                                  {item.status === "enviado" ? "Enviado" :
                                   item.status === "falhou" ? "Falhou" :
                                   item.status === "pendente" ? "Pendente" : item.status}
                                </span>
                                {item.status === "falhou" && (
                                  <button
                                    onClick={() => reenviarMutation.mutate({ envioId: item.id })}
                                    disabled={reenviarMutation.isPending}
                                    title="Reenviar mensagem"
                                    className="p-1 rounded-md text-indigo-500 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                                  >
                                    {reenviarMutation.isPending ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                      <RefreshCw size={12} />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ABA AUTOMAÇÕES */}
          {activeTab === "automacoes" && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: "Total", value: automacoesSalvas.length, color: "text-gray-900" },
                  { label: "Ativas", value: (automacoesSalvas as any[]).filter(a => a.ativo).length, color: "text-emerald-600" },
                  { label: "Pausadas", value: (automacoesSalvas as any[]).filter(a => !a.ativo).length, color: "text-gray-400" },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {isLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
              ) : (automacoesSalvas as any[]).length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                  <Zap size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">Nenhuma automação criada</p>
                  <p className="text-sm text-gray-400 mt-1 mb-4">Use templates prontos ou crie do zero com a esteira visual</p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}><Sparkles size={14} className="mr-1.5" />Ver templates</Button>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openEditor()}><Plus size={14} className="mr-1.5" />Criar do zero</Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Barra flutuante de seleção múltipla */}
                  {modoSelecao && (
                    <div className="flex items-center gap-2 mb-3 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                      <input type="checkbox" className="w-4 h-4 accent-indigo-600 cursor-pointer"
                        checked={selecionadas.size === automacoesFiltradas.length && automacoesFiltradas.length > 0}
                        onChange={() => selecionadas.size === automacoesFiltradas.length ? setSelecionadas(new Set()) : setSelecionadas(new Set((automacoesFiltradas as any[]).map((a: any) => a.id)))}
                      />
                      <span className="text-sm text-indigo-700 font-medium flex-1">
                        {selecionadas.size === 0 ? "Nenhuma selecionada" : `${selecionadas.size} selecionada${selecionadas.size > 1 ? "s" : ""}`}
                      </span>
                      {selecionadas.size > 0 && (
                        <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => setConfirmDeleteMany(true)}>
                          <Trash2 size={12} className="mr-1" /> Excluir {selecionadas.size}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-500"
                        onClick={() => { setModoSelecao(false); setSelecionadas(new Set()); }}>
                        <X size={12} className="mr-1" /> Cancelar
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    <button
                      onClick={() => setFiltroTipoGatilho("todos")}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        filtroTipoGatilho === "todos"
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Todos ({automacoesSalvas.length})
                    </button>
                    {tiposGatilhoUnicos.map(tipo => {
                      const count = (automacoesSalvas as any[]).filter(a => a.tipoGatilho === tipo).length;
                      return (
                        <button
                          key={tipo}
                          onClick={() => setFiltroTipoGatilho(tipo)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                            filtroTipoGatilho === tipo
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {getTipoGatilhoLabel(tipo)} ({count})
                        </button>
                      );
                    })}
                    {!modoSelecao && (
                      <button
                        onClick={() => setModoSelecao(true)}
                        className="ml-auto px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1.5 flex-shrink-0"
                      >
                        <Check size={13} /> Selecionar
                      </button>
                    )}
                  </div>
                  {automacoesFiltradas.length === 0 ? (                    <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200">
                      <p className="text-gray-500 font-medium">Nenhuma automação neste tipo</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(automacoesFiltradas as any[]).map(a => {
                        const nodesLista: FlowNode[] = (() => { try { return a.flowJson ? JSON.parse(a.flowJson) : []; } catch { return []; } })();
                        const incompletosLista = nodesLista.filter((n: FlowNode) => n.type !== "end" && getNodeIncompleto(n).length > 0);
                        const temIncompletoLista = incompletosLista.length > 0;
                        return (
                    <div key={a.id} className={`bg-white rounded-xl border shadow-sm p-3.5 flex items-center gap-3 hover:border-indigo-200 transition-colors ${temIncompletoLista ? "border-amber-200" : selecionadas.has(a.id) ? "border-indigo-400 bg-indigo-50" : "border-gray-100"}`}>
                      {modoSelecao && (
                        <input type="checkbox" className="w-4 h-4 accent-indigo-600 cursor-pointer flex-shrink-0"
                          checked={selecionadas.has(a.id)}
                          onChange={() => toggleSelecao(a.id)}
                        />
                      )}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${a.ativo ? "bg-indigo-100" : "bg-gray-100"}`}>
                        <Zap size={16} className={a.ativo ? "text-indigo-600" : "text-gray-400"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm truncate">{a.nome}</p>
                          {temIncompletoLista && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 border border-amber-300 cursor-default flex-shrink-0">
                                    <AlertTriangle size={9} className="text-amber-600" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px] text-xs">
                                  <p className="font-semibold mb-1">{incompletosLista.length} nó{incompletosLista.length > 1 ? "ós" : ""} incompleto{incompletosLista.length > 1 ? "s" : ""}</p>
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {incompletosLista.map((n: FlowNode) => (
                                      <li key={n.id}>{n.type === "trigger" ? "Gatilho" : n.type === "action" ? "Ação" : n.type === "condition" ? "Condição" : "Aguardar"}: {getNodeIncompleto(n).join(", ")}</li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <Badge className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${a.ativo ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500"}`}>
                            {a.ativo ? "Ativa" : "Pausada"}
                          </Badge>
                          {a.isTemplate && (
                            <Badge className="text-[10px] px-1.5 py-0 flex-shrink-0 bg-blue-50 text-blue-600 border-blue-200">
                              Padrão
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-500 flex items-center gap-1 truncate"><Zap size={9} />{getTriggerLabel(a)}</span>
                          <span className="hidden sm:flex text-xs text-gray-400">·</span>
                          <span className="hidden sm:flex text-xs text-gray-500 items-center gap-1">
                            <MessageSquare size={9} />{a.canalEnvio === "whatsapp" ? "WhatsApp" : a.canalEnvio === "email" ? "E-mail" : "SMS"}
                          </span>
                        </div>
                        {a.corpoMensagem && (
                          <p className="text-xs text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">
                            {previewMensagem(a.corpoMensagem).substring(0, 100)}{previewMensagem(a.corpoMensagem).length > 100 ? "..." : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {temIncompletoLista ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div onClick={() => toast.warning("Configure os campos obrigatórios antes de ativar")}>
                                  <Switch checked={false} disabled className="opacity-50" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs max-w-[180px]">
                                Preencha todos os campos obrigatórios para ativar esta automação
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <Switch checked={a.ativo} onCheckedChange={() => updateMutation.mutate({ id: a.id, ativo: !a.ativo }, { onSuccess: () => gerarPipelineAutomatico() })} />
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Testar envio"
                          onClick={() => setTesteEnvioId(a.id)}>
                          <Send size={13} className="text-indigo-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditor({ id: a.id, nome: a.nome, ativo: a.ativo, flowJson: a.flowJson ?? undefined, nodes: [], confirmacaoAutoAtivo: (a as any).confirmacaoAutoAtivo ?? false, confirmacaoAutoHorasAntes: (a as any).confirmacaoAutoHorasAntes ?? 2, eventosAdicionais: (a as any).eventosAdicionais ?? null } as any)}>
                          <Edit2 size={13} />
                        </Button>

                      </div>
                    </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Seção: Automações do Sistema */}
              {automacoesDoSistema.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 flex items-center gap-1.5">
                      <Settings size={11} /> Automações do Sistema
                    </span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                  <p className="text-xs text-gray-400 mb-3 text-center">Criadas automaticamente pelo Hubly. Você pode ativar, pausar ou editar o conteúdo.</p>
                  <div className="space-y-2">
                    {automacoesDoSistema.map((a: any) => (
                      <div key={a.id} className={`bg-gray-50 rounded-xl border p-3.5 flex items-center gap-3 hover:border-indigo-200 transition-colors ${a.ativo ? "border-gray-200" : "border-gray-100 opacity-70"}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${a.ativo ? "bg-blue-100" : "bg-gray-100"}`}>
                          <Settings size={14} className={a.ativo ? "text-blue-500" : "text-gray-400"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-700 text-sm truncate">{a.nome}</p>
                            <Badge className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${a.ativo ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500"}`}>
                              {a.ativo ? "Ativa" : "Pausada"}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{getTriggerLabel(a)}</p>
                        </div>
                        <Switch
                          checked={a.ativo}
                          onCheckedChange={async (checked) => {
                            try {
                              await updateMutation.mutateAsync({ id: a.id, ativo: checked });
                              toast.success(checked ? "Automação ativada" : "Automação pausada");
                            } catch {
                              toast.error("Erro ao atualizar automação");
                            }
                          }}
                        />
                        <button
                          onClick={() => openEditor({ id: a.id, nome: a.nome, ativo: a.ativo, flowJson: a.flowJson ?? undefined, nodes: [], confirmacaoAutoAtivo: (a as any).confirmacaoAutoAtivo ?? false, confirmacaoAutoHorasAntes: (a as any).confirmacaoAutoHorasAntes ?? 2 } as any)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Diálogo de confirmação de exclusão */}
        <Dialog open={confirmDeleteId !== null} onOpenChange={open => !open && setConfirmDeleteId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 size={17} /> Excluir automação
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 mt-1">Tem certeza que deseja excluir esta automação? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => { if (confirmDeleteId) { deleteMutation.mutate({ id: confirmDeleteId }); setConfirmDeleteId(null); } }}
                disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Excluindo..." : "Sim, excluir"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Confirmação de exclusão em lote */}
        <Dialog open={confirmDeleteMany} onOpenChange={open => !open && setConfirmDeleteMany(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 size={17} /> Excluir {selecionadas.size} automações
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 mt-1">
              Tem certeza que deseja excluir <strong>{selecionadas.size} automações</strong> selecionadas? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" size="sm" onClick={() => setConfirmDeleteMany(false)}>Cancelar</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteManyMutation.mutate({ ids: Array.from(selecionadas) })}
                disabled={deleteManyMutation.isPending}>
                {deleteManyMutation.isPending ? "Excluindo..." : `Sim, excluir ${selecionadas.size}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Modal: Aviso de Automação Duplicada */}
        <Dialog open={duplicataInfo !== null} onOpenChange={open => !open && setDuplicataInfo(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle size={17} /> Automação duplicada
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 mt-1">{duplicataInfo?.mensagem}</p>
            <p className="text-xs text-gray-400 mt-2">Edite a automação existente para alterar o comportamento, ou escolha um gatilho, canal ou timing diferente para criar uma nova.</p>
            <div className="flex gap-2 justify-end mt-4">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setDuplicataInfo(null)}>Entendi</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Sincronização inteligente do Pipeline */}
        <Dialog open={showSincModal} onOpenChange={(open) => { if (!sincronizarMutation.isPending) { setShowSincModal(open); if (!open) { setSincPreview(null); setSincPipelineId(null); } } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-700">
                <GitBranch size={18} className="text-indigo-600" />
                Sincronizar Pipeline com Automações
              </DialogTitle>
            </DialogHeader>
            <div className="mt-2 space-y-3">
              <p className="text-sm text-gray-600">
                As automações foram atualizadas. Deseja sincronizar o Pipeline para refletir os novos gatilhos?
              </p>
              {sincPreview && sincPreview.pipelines.length > 0 && (
                <div className="space-y-2">
                  {sincPreview.pipelines.map((p) => (
                    <div key={p.id} className={`border rounded-lg p-3 cursor-pointer transition-colors ${sincPipelineId === p.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                      onClick={() => setSincPipelineId(p.id)}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-gray-800">{p.nome}</span>
                        {sincPipelineId === p.id && <Check size={14} className="text-indigo-600" />}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.colunas.map((c) => (
                          <span key={c.id} className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            {c.nome} {c.totalCartoes > 0 && <span className="font-semibold text-indigo-600">({c.totalCartoes})</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {sincPreview && sincPreview.automacoes.length > 0 && (
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-indigo-700 mb-1.5">Colunas que serão adicionadas/vinculadas:</p>
                  <div className="flex flex-wrap gap-1">
                    {sincPreview.automacoes.map((a) => (
                      <span key={a.id} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                        {a.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400">Os cartões existentes não serão removidos. Apenas novas colunas serão adicionadas conforme necessário.</p>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" size="sm" onClick={() => { setShowSincModal(false); setSincPreview(null); setSincPipelineId(null); }} disabled={sincronizarMutation.isPending}>
                Agora não
              </Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!sincPipelineId || sincronizarMutation.isPending}
                onClick={() => { if (sincPipelineId) sincronizarMutation.mutate({ pipelineId: sincPipelineId }); }}>
                {sincronizarMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <GitBranch size={14} className="mr-1" />}
                Sincronizar Pipeline
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Gerar Pipeline com IA */}
        <Dialog open={showGerarPipelineModal} onOpenChange={(open) => { if (!gerarPipelineMutation.isPending && !previewPipelineMutation.isPending) { setShowGerarPipelineModal(open); if (!open) { setPipelineGerado(null); setPipelinePreview(null); } } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-purple-700">
                <GitBranch size={18} className="text-purple-600" />
                Gerar Pipeline com IA
              </DialogTitle>
            </DialogHeader>

            {!pipelineGerado ? (
              <div className="space-y-4 mt-1">
                {/* Etapa 1: Descrição (sem preview ainda) */}
                {!pipelinePreview && (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                      <strong>⚠️ Atenção:</strong> Se você já possui um pipeline, ele será <strong>atualizado</strong> com os dados atuais das suas automações.
                    </div>
                    <p className="text-sm text-gray-600">
                      A IA vai analisar todas as suas <strong>automações ativas</strong>, identificar a jornada do cliente e criar automaticamente um <strong>Pipeline Kanban</strong> com:
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1.5 pl-1">
                      <li className="flex items-start gap-2"><Check size={14} className="text-purple-500 mt-0.5 flex-shrink-0" />Colunas representando cada etapa da jornada</li>
                      <li className="flex items-start gap-2"><Check size={14} className="text-purple-500 mt-0.5 flex-shrink-0" />Cartões com clientes reais dos últimos 30 dias</li>
                      <li className="flex items-start gap-2"><Check size={14} className="text-purple-500 mt-0.5 flex-shrink-0" />Cores e nomes gerados de acordo com o seu negócio</li>
                    </ul>
                    <div className="flex gap-2 justify-between pt-1">
                      <Button variant="ghost" size="sm" className="text-gray-500 text-xs" onClick={() => setShowSnapshotsModal(true)}>
                        <RefreshCw size={13} className="mr-1" />Restaurar versão anterior
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowGerarPipelineModal(false)} disabled={previewPipelineMutation.isPending}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => previewPipelineMutation.mutate()}
                          disabled={previewPipelineMutation.isPending}
                        >
                          {previewPipelineMutation.isPending ? (
                            <><Loader2 size={14} className="mr-1.5 animate-spin" />Analisando com IA...</>
                          ) : (
                            <><Eye size={14} className="mr-1.5" />Ver Preview</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Etapa 2: Preview das colunas */}
                {pipelinePreview && (
                  <>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="font-semibold text-purple-800 text-sm">{pipelinePreview.nomePipeline}</p>
                      <p className="text-xs text-purple-600 mt-0.5">{pipelinePreview.descricao}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Colunas que serão criadas:</p>
                      <div className="flex flex-wrap gap-2">
                        {pipelinePreview.colunas.map((col, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: col.cor }}>
                            <span>{col.nome}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {pipelinePreview.estimativaCartoes > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                        <strong>{pipelinePreview.estimativaCartoes}</strong> clientes dos últimos 30 dias serão adicionados como cartões.
                      </div>
                    )}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                      <strong>⚠️ Confirmação:</strong> Ao confirmar, o pipeline atual será atualizado com esta estrutura. Esta ação não pode ser desfeita (exceto via restauração de versão anterior).
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <Button variant="outline" size="sm" onClick={() => setPipelinePreview(null)} disabled={gerarPipelineMutation.isPending}>
                        Voltar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => gerarPipelineMutation.mutate()}
                        disabled={gerarPipelineMutation.isPending}
                      >
                        {gerarPipelineMutation.isPending ? (
                          <><Loader2 size={14} className="mr-1.5 animate-spin" />Gerando com IA...</>
                        ) : (
                          <><GitBranch size={14} className="mr-1.5" />Confirmar e Gerar</>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4 mt-1">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800 text-sm">Pipeline criado com sucesso!</p>
                    <p className="text-xs text-green-600 mt-0.5">{pipelineGerado.nomePipeline}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{pipelineGerado.totalColunas}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Colunas criadas</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{pipelineGerado.totalCartoes}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Cartões com clientes</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <Button variant="outline" size="sm" onClick={() => { setShowGerarPipelineModal(false); setPipelineGerado(null); }}>
                    Fechar
                  </Button>
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => {
                      localStorage.setItem("hubly_pipeline_ativo", String(pipelineGerado.pipelineId));
                      setLocation("/admin/pipeline");
                    }}
                  >
                    <ExternalLink size={14} className="mr-1.5" />
                    Ver Pipeline
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal: Restaurar Versão Anterior do Pipeline */}
        <Dialog open={showSnapshotsModal} onOpenChange={(open) => { if (!restaurarSnapshotMutation.isPending) { setShowSnapshotsModal(open); if (!open) setSnapshotParaRestaurar(null); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-800">
                <RefreshCw size={18} className="text-purple-600" />
                Restaurar Versão Anterior do Pipeline
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-1">
              {snapshotsQuery.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-purple-500" />
                  <span className="ml-2 text-sm text-gray-500">Carregando histórico...</span>
                </div>
              )}
              {!snapshotsQuery.isLoading && (!snapshotsQuery.data || snapshotsQuery.data.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                  <RefreshCw size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma versão anterior encontrada.</p>
                  <p className="text-xs mt-1">As versões são salvas automaticamente após cada geração por IA.</p>
                </div>
              )}
              {snapshotsQuery.data && snapshotsQuery.data.length > 0 && (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {snapshotsQuery.data.map((snap) => (
                    <div
                      key={snap.id}
                      className={`border rounded-xl p-3 cursor-pointer transition-all ${
                        snapshotParaRestaurar === snap.id
                          ? "border-purple-400 bg-purple-50"
                          : "border-gray-200 hover:border-purple-200 hover:bg-gray-50"
                      }`}
                      onClick={() => setSnapshotParaRestaurar(snap.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{snap.nomePipeline}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(snap.geradoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        {snapshotParaRestaurar === snap.id && (
                          <Check size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {snap.colunas.slice(0, 5).map((col, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-xs text-white font-medium" style={{ backgroundColor: col.cor }}>
                            {col.nome}
                          </span>
                        ))}
                        {snap.colunas.length > 5 && (
                          <span className="px-2 py-0.5 rounded-full text-xs text-gray-500 bg-gray-100">+{snap.colunas.length - 5}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {snapshotParaRestaurar && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  <strong>⚠️ Atenção:</strong> O pipeline atual será substituído pela versão selecionada. Esta ação não pode ser desfeita.
                </div>
              )}
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" size="sm" onClick={() => setShowSnapshotsModal(false)} disabled={restaurarSnapshotMutation.isPending}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => snapshotParaRestaurar && restaurarSnapshotMutation.mutate({ snapshotId: snapshotParaRestaurar })}
                  disabled={!snapshotParaRestaurar || restaurarSnapshotMutation.isPending}
                >
                  {restaurarSnapshotMutation.isPending ? (
                    <><Loader2 size={14} className="mr-1.5 animate-spin" />Restaurando...</>
                  ) : (
                    <><RefreshCw size={14} className="mr-1.5" />Restaurar Versão</>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Sparkles size={17} className="text-indigo-600" />Templates de automação</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {TEMPLATES.map((t, i) => (
                <button key={i} className="text-left p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                  onClick={() => { openEditor({ nome: t.nome, descricao: t.descricao, ativo: true, nodes: t.nodes }); setShowTemplates(false); }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                      <t.icon size={15} className="text-indigo-600" />
                    </div>
                    <span className="font-semibold text-sm text-gray-900">{t.nome}</span>
                  </div>
                  <p className="text-xs text-gray-500">{t.descricao}</p>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Teste de Envio Modal */}
        {testeEnvioId !== null && (
          <TesteEnvioModal
            open={testeEnvioId !== null}
            onClose={() => { setTesteEnvioId(null); setTesteTelefone(""); }}
            automacaoId={testeEnvioId}
            telefonePadrao={empresaData?.whatsappNumero || empresaData?.telefone || ""}
          />
        )}
      </>
    );
  }

  //  EDITOR
  // ── MOBILE EDITOR ──────────────────────────────────────────────────────────
  if (isMobile) {
    const NODE_LABELS: Record<NodeType, { label: string; color: string; bg: string; icon: any }> = {
      trigger: { label: "Gatilho", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: Zap },
      condition: { label: "Condição", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Filter },
      action: { label: "Ação", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: MessageSquare },
      delay: { label: "Aguardar", color: "text-sky-700", bg: "bg-sky-50 border-sky-200", icon: Clock },
      end: { label: "Fim", color: "text-gray-600", bg: "bg-gray-50 border-gray-200", icon: Check },
    };
    const ADD_NODE_TYPES: { type: NodeType; label: string; icon: any; color: string }[] = [
      { type: "trigger", label: "Gatilho", icon: Zap, color: "text-indigo-600" },
      { type: "condition", label: "Condição", icon: Filter, color: "text-amber-600" },
      { type: "action", label: "Ação", icon: MessageSquare, color: "text-emerald-600" },
      { type: "delay", label: "Aguardar", icon: Clock, color: "text-sky-600" },
      { type: "end", label: "Fim do fluxo", icon: Check, color: "text-gray-600" },
    ];
    return (
      <>
        <div className="flex flex-col bg-gray-50" style={{ minHeight: "calc(100vh - 64px)" }}>
          {/* Mobile Toolbar */}
          <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 px-3 py-2">
              <button className="flex items-center gap-1 text-sm text-gray-500 shrink-0" onClick={() => setView("list")}>
                <ChevronLeft size={16} />Voltar
              </button>
              <Input
                value={currentFlow.nome}
                onChange={e => setCurrentFlow(p => ({ ...p, nome: e.target.value }))}
                className="h-8 text-sm font-semibold border-gray-200 focus-visible:ring-indigo-400 flex-1 min-w-0"
              />
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 h-8 px-3" onClick={() => saveFlow()} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              </Button>
            </div>
            <div className="flex items-center justify-between px-3 pb-2">
              <div className="flex items-center gap-2">
                <Switch checked={currentFlow.ativo} onCheckedChange={v => setCurrentFlow(p => ({ ...p, ativo: v }))} />
                <span className="text-xs text-gray-500">{currentFlow.ativo ? "Ativa" : "Pausada"}</span>
              </div>
              <div className="relative">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAddNodeMenu(p => !p)}>
                  <Plus size={12} className="mr-1" />Adicionar nó
                </Button>
                {addNodeMenu && (
                  <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-40 py-1">
                    {ADD_NODE_TYPES.map(item => (
                      <button key={item.type} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                        onClick={() => { addNode(item.type); setAddNodeMenu(false); }}>
                        <item.icon size={13} className={item.color} />{item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Node List */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
            {nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Zap size={32} className="text-gray-200 mb-3" />
                <p className="text-sm text-gray-500 font-medium">Nenhum nó adicionado</p>
                <p className="text-xs text-gray-400 mt-1">Toque em "Adicionar nó" para começar</p>
              </div>
            ) : (
              nodes.map((node, idx) => {
                const meta = NODE_LABELS[node.type];
                const Icon = meta.icon;
                const label = node.data.label || (node.type === "trigger" ? TRIGGER_OPTIONS.find(t => t.value === node.data.tipo)?.label : node.type === "action" ? ACTION_OPTIONS.find(a => a.value === node.data.tipo)?.label : null) || meta.label;
                return (
                  <div key={node.id}>
                    {idx > 0 && (
                      <div className="flex justify-center my-1">
                        <ArrowRight size={14} className="text-gray-300 rotate-90" />
                      </div>
                    )}
                    <button
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border ${meta.bg} text-left transition-all active:scale-[0.98]`}
                      onClick={() => setMobileNodeSheet(node.id)}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-white border ${meta.bg.split(" ")[1]}`}>
                        <Icon size={16} className={meta.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold uppercase tracking-wide ${meta.color}`}>{meta.label}</p>
                        <p className="text-sm text-gray-800 font-medium truncate mt-0.5">{label}</p>
                        {node.type === "action" && node.data.mensagem && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{node.data.mensagem.substring(0, 60)}{node.data.mensagem.length > 60 ? "..." : ""}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <ChevronRight size={14} className="text-gray-400" />
                      </div>
                    </button>
                  </div>
                );
              })
            )}

            {/* Confirmação Automática (horas_antes) */}
            {(() => {
              const triggerNode = nodes.find(n => n.type === "trigger");
              if (triggerNode?.data?.tipo !== "horas_antes_agendamento") return null;
              return (
                <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Confirmação automática</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Confirma o agendamento automaticamente se o cliente não respondeu.</p>
                    </div>
                    <Switch
                      checked={currentFlow.confirmacaoAutoAtivo ?? false}
                      onCheckedChange={v => setCurrentFlow(p => ({ ...p, confirmacaoAutoAtivo: v }))}
                    />
                  </div>
                  {currentFlow.confirmacaoAutoAtivo && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-600">Confirmar quando faltar</Label>
                      <Select
                        value={String(currentFlow.confirmacaoAutoHorasAntes ?? 2)}
                        onValueChange={v => setCurrentFlow(p => ({ ...p, confirmacaoAutoHorasAntes: Number(v) }))}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1,2,3,4,6,12,24].map(h => <SelectItem key={h} value={String(h)}>{h} hora{h > 1 ? "s" : ""} antes</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Remover nó */}
            {nodes.length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-gray-400 text-center mb-2">Toque em um nó para editar • Deslize para remover</p>
                <div className="space-y-1">
                  {nodes.map(node => {
                    const meta = NODE_LABELS[node.type];
                    return (
                      <button key={node.id} className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-gray-100 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                        onClick={() => setNodes(prev => prev.filter(n => n.id !== node.id))}>
                        <span className="flex items-center gap-2"><Trash2 size={12} />{node.data.label || meta.label}</span>
                        <span className="text-xs text-gray-300">remover</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Sheet para configurar nó */}
        <Dialog open={mobileNodeSheet !== null} onOpenChange={v => !v && setMobileNodeSheet(null)}>
          <DialogContent className="p-0 gap-0 max-w-full w-full sm:max-w-lg rounded-t-2xl rounded-b-none fixed bottom-0 top-auto translate-y-0 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom max-h-[90vh] flex flex-col">
            {mobileSheetNode && (
              <NodeConfigPanel
                key={mobileSheetNode.id}
                node={mobileSheetNode}
                onUpdate={(id, data) => {
                  setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
                }}
                onClose={() => setMobileNodeSheet(null)}
                onSaveFlow={(updatedNodeData) => {
                  if (updatedNodeData) {
                    setNodes(prev => prev.map(n => n.id === updatedNodeData.id ? { ...n, data: { ...n.data, ...updatedNodeData.data } } : n));
                  }
                  setMobileNodeSheet(null);
                  toast.success("Nó atualizado!");
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }
  // ── END MOBILE EDITOR ───────────────────────────────────────────────────────

  return (
    <>
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-100 shadow-sm z-30 flex-shrink-0 sticky top-0">
          <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors" onClick={() => setView("list")}>
            <ChevronRight size={14} className="rotate-180" />Automações
          </button>
          <span className="text-gray-300">/</span>
          <Input
            value={currentFlow.nome}
            onChange={e => setCurrentFlow(p => ({ ...p, nome: e.target.value }))}
            className="h-7 text-sm font-semibold border-0 shadow-none focus-visible:ring-0 w-52 px-1"
          />
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setAddNodeMenu(p => !p)}>
                <Plus size={13} className="mr-1.5" />Adicionar nó
              </Button>
              {addNodeMenu && (
                <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-44 py-1">
                  {([
                    { type: "trigger" as NodeType, label: "Gatilho", icon: Zap, color: "text-indigo-600" },
                    { type: "condition" as NodeType, label: "Condição", icon: Filter, color: "text-amber-600" },
                    { type: "action" as NodeType, label: "Ação", icon: MessageSquare, color: "text-emerald-600" },
                    { type: "delay" as NodeType, label: "Aguardar", icon: Clock, color: "text-sky-600" },
                    { type: "end" as NodeType, label: "Fim do fluxo", icon: Check, color: "text-gray-600" },
                  ]).map(item => (
                    <button key={item.type} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                      onClick={() => addNode(item.type)}>
                      <item.icon size={13} className={item.color} />{item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {(() => {
              const nodesIncompletosToggle = nodes.filter(n => n.type !== "end" && getNodeIncompleto(n).length > 0);
              const temIncompleto = nodesIncompletosToggle.length > 0;
              return (
                <div className="flex items-center gap-1.5">
                  {temIncompleto ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 cursor-not-allowed" onClick={() => toast.warning("Configure todos os campos obrigatórios antes de ativar a automação")}>
                            <Switch checked={currentFlow.ativo} disabled className="opacity-50" />
                            <span className="text-xs text-gray-400">Pausada</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                          <p className="font-semibold mb-1">Não é possível ativar</p>
                          <p>Preencha todos os campos obrigatórios dos nós antes de ativar esta automação.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <>
                      <Switch checked={currentFlow.ativo} onCheckedChange={v => setCurrentFlow(p => ({ ...p, ativo: v }))} />
                      <span className="text-xs text-gray-500">{currentFlow.ativo ? "Ativa" : "Pausada"}</span>
                    </>
                  )}
                </div>
              );
            })()}
            {(() => {
              const nodesIncompletos = nodes.filter(n => n.type !== "end" && getNodeIncompleto(n).length > 0);
              return nodesIncompletos.length > 0 ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => saveFlow()} disabled={createMutation.isPending}>
                          <Save size={13} className="mr-1.5" />{createMutation.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                          {nodesIncompletos.length}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                      <p className="font-semibold mb-1">{nodesIncompletos.length} nó{nodesIncompletos.length > 1 ? "ós" : ""} com campos incompletos</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {nodesIncompletos.map(n => (
                          <li key={n.id}>{n.type === "trigger" ? "Gatilho" : n.type === "action" ? "Ação" : n.type === "condition" ? "Condição" : "Aguardar"}: {getNodeIncompleto(n).join(", ")}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => saveFlow()} disabled={createMutation.isPending}>
                  <Save size={13} className="mr-1.5" />{createMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              );
            })()}
          </div>
        </div>

        {/* Abas: Canvas | Jornada ao Vivo */}
        <div className="flex border-b border-gray-100 bg-white flex-shrink-0">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              abaEditor === "canvas"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setAbaEditor("canvas")}
          >
            Canvas
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              abaEditor === "jornada"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setAbaEditor("jornada")}
          >
            <Radio size={13} />
            Jornada ao Vivo
            {!currentFlow.id && <span className="text-[10px] text-gray-400">(salve primeiro)</span>}
          </button>
        </div>

        {/* Canvas + Painel */}
        <div className={`flex flex-1 overflow-hidden ${abaEditor !== "canvas" ? "hidden" : ""}`}>
          <div className="flex-1 overflow-hidden">
            <FlowCanvas nodes={nodes} onNodesChange={setNodes} selectedId={selectedNodeId} onSelect={setSelectedNodeId} onDragEnd={handleDragEnd} />
          </div>
          {selectedNode ? (
            <div className="w-72 border-l border-gray-200 bg-white overflow-hidden flex flex-col flex-shrink-0">
              <NodeConfigPanel
                key={selectedNode.id}
                node={selectedNode}
                onUpdate={(id, data) => setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n))}
                onClose={() => setSelectedNodeId(null)}
                onSaveFlow={saveFlow}
              />
            </div>
          ) : nodes.length > 0 ? (
            (() => {
              const triggerNode = nodes.find(n => n.type === "trigger");
              const isHorasAntes = triggerNode?.data?.tipo === "horas_antes_agendamento";
              if (isHorasAntes) {
                return (
                  <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto flex flex-col flex-shrink-0">
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Settings size={14} className="text-indigo-500" />
                        <span className="text-sm font-semibold text-gray-800">Configurações Avançadas</span>
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">Confirmação automática</p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Confirma o agendamento automaticamente se o cliente não respondeu ao link de confirmação.</p>
                          </div>
                          <Switch
                            checked={currentFlow.confirmacaoAutoAtivo ?? false}
                            onCheckedChange={v => setCurrentFlow(p => ({ ...p, confirmacaoAutoAtivo: v }))}
                          />
                        </div>
                        {currentFlow.confirmacaoAutoAtivo && (
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-600">Confirmar quando faltar</Label>
                            <Select
                              value={String(currentFlow.confirmacaoAutoHorasAntes ?? 2)}
                              onValueChange={v => setCurrentFlow(p => ({ ...p, confirmacaoAutoHorasAntes: Number(v) }))}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 hora antes</SelectItem>
                                <SelectItem value="2">2 horas antes</SelectItem>
                                <SelectItem value="3">3 horas antes</SelectItem>
                                <SelectItem value="4">4 horas antes</SelectItem>
                                <SelectItem value="6">6 horas antes</SelectItem>
                                <SelectItem value="12">12 horas antes</SelectItem>
                                <SelectItem value="24">24 horas antes</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-indigo-600 mt-1">⚠️ Desabilitado por padrão. Ative apenas se quiser confirmar sem resposta do cliente.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div className="w-56 border-l border-gray-100 bg-gray-50 flex flex-col items-center justify-center text-center p-6 flex-shrink-0">
                  <Settings size={26} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Selecione um nó</p>
                  <p className="text-xs text-gray-400 mt-1">Clique em qualquer nó para configurar</p>
                </div>
              );
            })()
          ) : null}
        </div>

        {/* Jornada ao Vivo */}
        {abaEditor === "jornada" && (
          <JornadaAoVivo automacaoId={currentFlow.id ?? null} />
        )}
    </div>
    </>
  );
}


// ─── Jornada ao Vivo ──────────────────────────────────────────────────────────────────────────────────

function JornadaAoVivo({ automacaoId }: { automacaoId: number | null }) {
  const { data, isLoading, refetch } = trpc.automacoes.getJornadaAoVivo.useQuery(
    { automacaoId: automacaoId! },
    { enabled: !!automacaoId, refetchInterval: 15000 }
  );
  const [abaAtiva, setAbaAtiva] = useState(0);
  const slidesRef = useRef<HTMLDivElement>(null);

  if (!automacaoId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50">
        <Radio size={36} className="text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 font-medium">Salve a automação primeiro</p>
        <p className="text-xs text-gray-400 mt-1">A Jornada ao Vivo fica disponível após salvar a automação.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Loader2 size={24} className="text-indigo-400 animate-spin" />
      </div>
    );
  }

  const grupos = data?.grupos ?? [];
  const totalGeral = grupos.reduce((acc, g) => acc + g.total, 0);

  const COR_CONFIG: Record<string, { bg: string; border: string; text: string; dot: string; badge: string; activeBg: string; activeBorder: string }> = {
    blue:   { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   dot: "bg-blue-400",   badge: "bg-blue-100 text-blue-700",   activeBg: "bg-blue-600",   activeBorder: "border-blue-600" },
    yellow: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", dot: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700", activeBg: "bg-yellow-500", activeBorder: "border-yellow-500" },
    green:  { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  dot: "bg-green-400",  badge: "bg-green-100 text-green-700",  activeBg: "bg-green-600",  activeBorder: "border-green-600" },
    red:    { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    dot: "bg-red-400",    badge: "bg-red-100 text-red-700",    activeBg: "bg-red-600",    activeBorder: "border-red-600" },
  };

  // Navegar para aba ao clicar
  const irParaAba = (idx: number) => {
    setAbaAtiva(idx);
    if (slidesRef.current) {
      const largura = slidesRef.current.offsetWidth;
      slidesRef.current.scrollTo({ left: largura * idx, behavior: "smooth" });
    }
  };

  // Detectar aba ativa ao deslizar
  const handleScroll = () => {
    if (!slidesRef.current) return;
    const largura = slidesRef.current.offsetWidth;
    if (largura === 0) return;
    const idx = Math.round(slidesRef.current.scrollLeft / largura);
    setAbaAtiva(idx);
  };

  // Cards de cliente reutilizável
  const ClienteCard = ({ item }: { item: typeof grupos[0]["itens"][0] }) => (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{item.clienteNome ?? "Cliente"}</p>
          {item.telefone && <p className="text-xs text-gray-400 mt-0.5">{item.telefone}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {item.canal === "whatsapp"
            ? <MessageSquare size={11} className="text-green-500" />
            : <Send size={11} className="text-gray-400" />}
        </div>
      </div>
      {item.servicoNome && (
        <span className="inline-block mt-1.5 text-[10px] font-medium bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
          {item.servicoNome}
        </span>
      )}
      {item.tempoRestante && (
        <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
          <Clock size={9} />{item.tempoRestante}
        </p>
      )}
      {item.erroDetalhe && (
        <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1 truncate">
          <AlertTriangle size={9} />{item.erroDetalhe.slice(0, 50)}
        </p>
      )}
      <p className="text-[10px] text-gray-300 mt-1.5">
        {new Date(item.criadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-indigo-500" />
          <span className="text-sm font-semibold text-gray-800">Jornada ao Vivo</span>
          <span className="hidden sm:inline text-xs text-gray-400">• últimos 90 dias</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{totalGeral} cliente{totalGeral !== 1 ? "s" : ""}</span>
          <button onClick={() => refetch()} className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors">
            <RefreshCw size={12} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <span className="text-[10px] text-green-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
            <span className="hidden sm:inline">Auto 15s</span>
          </span>
        </div>
      </div>

      {totalGeral === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center flex-1">
          <Activity size={36} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 font-medium">Nenhum cliente nesta jornada ainda</p>
          <p className="text-xs text-gray-400 mt-1">Os clientes aparecerão aqui quando a automação for disparada.</p>
        </div>
      ) : (
        <>
          {/* Abas de status — visíveis apenas no mobile */}
          <div className="flex border-b border-gray-200 bg-white overflow-x-auto flex-shrink-0 md:hidden">
            {grupos.map((grupo, idx) => {
              const cor = COR_CONFIG[grupo.cor] ?? COR_CONFIG.blue;
              const ativo = abaAtiva === idx;
              return (
                <button
                  key={grupo.status}
                  onClick={() => irParaAba(idx)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                    ativo
                      ? `${cor.text} ${cor.activeBorder}`
                      : "text-gray-500 border-transparent"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${cor.dot}`} />
                  {grupo.label}
                  <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    ativo ? cor.badge : "bg-gray-100 text-gray-500"
                  }`}>{grupo.total}</span>
                </button>
              );
            })}
          </div>

          {/* Slides deslizáveis — mobile */}
          <div
            ref={slidesRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory flex-1 md:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            {grupos.map(grupo => {
              const cor = COR_CONFIG[grupo.cor] ?? COR_CONFIG.blue;
              return (
                <div
                  key={grupo.status}
                  className="flex-shrink-0 w-full snap-start overflow-y-auto"
                >
                  <div className="p-3 flex flex-col gap-2">
                    {grupo.itens.length === 0 ? (
                      <div className={`flex flex-col items-center justify-center py-12 rounded-xl border ${cor.bg} ${cor.border}`}>
                        <span className={`w-3 h-3 rounded-full ${cor.dot} mb-2`} />
                        <p className="text-xs text-gray-500">Nenhum cliente em "{grupo.label}"</p>
                      </div>
                    ) : (
                      <>
                        {grupo.itens.map(item => <ClienteCard key={item.id} item={item} />)}
                        {grupo.total > grupo.itens.length && (
                          <p className="text-[11px] text-gray-400 text-center py-1">+{grupo.total - grupo.itens.length} mais...</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Indicadores de ponto — mobile */}
          <div className="flex justify-center gap-1.5 py-2 bg-white border-t border-gray-100 flex-shrink-0 md:hidden">
            {grupos.map((grupo, idx) => {
              const cor = COR_CONFIG[grupo.cor] ?? COR_CONFIG.blue;
              return (
                <button
                  key={grupo.status}
                  onClick={() => irParaAba(idx)}
                  className={`rounded-full transition-all ${
                    abaAtiva === idx ? `w-5 h-2 ${cor.activeBg}` : "w-2 h-2 bg-gray-300"
                  }`}
                />
              );
            })}
          </div>

          {/* Grid de colunas — desktop */}
          <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-4 gap-4 p-5 overflow-y-auto flex-1">
            {grupos.map(grupo => {
              const cor = COR_CONFIG[grupo.cor] ?? COR_CONFIG.blue;
              return (
                <div key={grupo.status} className="flex flex-col gap-2">
                  <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${cor.bg} ${cor.border}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${cor.dot}`} />
                      <span className={`text-xs font-semibold ${cor.text}`}>{grupo.label}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cor.badge}`}>{grupo.total}</span>
                  </div>
                  {grupo.itens.length === 0 ? (
                    <div className="flex items-center justify-center py-6">
                      <p className="text-xs text-gray-400">Nenhum cliente</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {grupo.itens.map(item => <ClienteCard key={item.id} item={item} />)}
                      {grupo.total > grupo.itens.length && (
                        <p className="text-[11px] text-gray-400 text-center py-1">+{grupo.total - grupo.itens.length} mais...</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}


// ─── Teste de Envio Modal ───────────────────────────────────────────────────

function TesteEnvioModal({ open, onClose, automacaoId, telefonePadrao }: {
  open: boolean;
  onClose: () => void;
  automacaoId: number;
  telefonePadrao?: string;
}) {
  const [telefone, setTelefone] = useState(telefonePadrao ?? "");

  // Atualizar o telefone quando o modal abre com um novo valor padrão
  useEffect(() => {
    if (open) setTelefone(telefonePadrao ?? "");
  }, [open, telefonePadrao]);

  const testarMutation = trpc.automacoes.testarEnvio.useMutation({
    onSuccess: () => {
      toast.success("Teste enfileirado! Acompanhe no Histórico.");
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Send size={15} className="text-indigo-600" />
            Testar Envio
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Telefone de teste</Label>
            <Input
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              placeholder="5511999999999"
              className="text-sm"
            />
            <p className="text-[11px] text-gray-400 mt-1">Variáveis serão substituídas por dados de exemplo.</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={testarMutation.isPending}>Cancelar</Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[110px]"
            onClick={() => testarMutation.mutate({ automacaoId, telefone })}
            disabled={!telefone || testarMutation.isPending}>
            {testarMutation.isPending ? (
              <span className="flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" />Enviando...</span>
            ) : "Enviar teste"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


// ─── Teste com Cliente Modal ────────────────────────────────────────────────

function TesteComClienteModal({ 
  open, 
  onClose, 
  automacaoId,
  clienteId,
  setClienteId,
  searchTerm,
  setSearchTerm,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  automacaoId: number | null;
  clienteId: number | null;
  setClienteId: (id: number | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSubmit: (clienteId: number) => void;
  isLoading: boolean;
}) {
  const { data: clientes = [] } = trpc.clientes.list.useQuery();
  
  const clientesFiltrados = clientes.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.telefone && c.telefone.includes(searchTerm))
  ).slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Users size={15} className="text-blue-600" />
            Testar com Cliente
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Selecione um cliente</Label>
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="text-sm mb-2"
            />
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {clientesFiltrados.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-400">Nenhum cliente encontrado</div>
              ) : (
                clientesFiltrados.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setClienteId(c.id)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b last:border-b-0 ${
                      clienteId === c.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900">{c.nome}</div>
                    <div className="text-gray-500">{c.telefone || c.whatsapp || 'Sem telefone'}</div>
                  </button>
                ))
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Variáveis serão substituídas pelos dados do cliente.</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => clienteId && onSubmit(clienteId)}
            disabled={!clienteId || isLoading}>
            {isLoading ? "Enviando..." : "Enviar teste"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
