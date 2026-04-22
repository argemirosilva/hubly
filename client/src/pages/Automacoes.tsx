import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePermissoes } from "@/hooks/usePermissoes";
import { toast } from "sonner";
import {
  Zap, Calendar, Clock, Gift, MessageSquare, Bell, Mail,
  Plus, Trash2, Play, Pause, Settings, ChevronRight,
  ArrowRight, X, Save, Sparkles, Filter,
  AlarmClock, Users, Tag, Check, CheckCircle, Edit2, Eye,
  History, Send, AlertCircle, RefreshCw, ChevronLeft, Phone,
  GitBranch, Loader2, ExternalLink, Activity, Radio, TrendingUp, UserPlus, UserX,
  Package, MousePointerClick, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  { value: "evento_agendamento_criado", label: "Agendamento criado", icon: Calendar, color: "#6366f1", desc: "Dispara quando qualquer agendamento é criado, independente do status inicial." },
  { value: "evento_agendamento_pre_agendado", label: "Pré-agendamento criado", icon: Calendar, color: "#8b5cf6", desc: "Dispara quando um pré-agendamento é criado (aguardando confirmação do salão)." },
  { value: "evento_agendamento_confirmado", label: "Agendamento confirmado", icon: Check, color: "#10b981", desc: "Dispara quando o status do agendamento muda para confirmado." },
  { value: "evento_agendamento_cancelado", label: "Agendamento cancelado", icon: X, color: "#ef4444", desc: "Dispara quando um agendamento é cancelado pelo salão ou pelo cliente." },
  { value: "evento_agendamento_concluido", label: "Agendamento concluído", icon: CheckCircle, color: "#0ea5e9", desc: "Dispara quando o atendimento é finalizado e marcado como concluído." },
  { value: "evento_cliente_criado", label: "Novo cliente cadastrado", icon: UserPlus, color: "#10b981", desc: "Dispara quando um novo cliente é cadastrado no sistema (manual ou via portal)." },
  { value: "evento_pre_agendamento_cancelado", label: "Pré-agendamento expirado", icon: UserX, color: "#f97316", desc: "Dispara quando um pré-agendamento expira sem ser confirmado." },
  { value: "evento_profissional_atribuido", label: "Profissional atribuído", icon: UserPlus, color: "#0ea5e9", desc: "Dispara quando um profissional é atribuído a um agendamento que estava sem profissional definido." },
  { value: "evento_reserva_paga", label: "Reserva paga", icon: Check, color: "#10b981", desc: "Dispara quando o cliente confirma o pagamento da reserva de um pré-agendamento." },
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
];

const VARIAVEIS = [
  { var: "{{nome_cliente}}", desc: "Nome completo da cliente", exemplo: "Ex: Ana Silva" },
  { var: "{{primeiro_nome}}", desc: "Primeiro nome da cliente (somente o primeiro)", exemplo: "Ex: Ana" },
  { var: "{{servico}}", desc: "Nome do serviço agendado", exemplo: "Ex: Escova progressiva" },
  { var: "{{profissional}}", desc: "Nome da profissional que irá realizar o serviço", exemplo: "Ex: Maria" },
  { var: "{{data}}", desc: "Data do agendamento por extenso", exemplo: "Ex: segunda-feira, 07 de abril" },
  { var: "{{hora}}", desc: "Horário de início e fim do agendamento", exemplo: "Ex: 14:00 – 15:30" },
  { var: "{{valor}}", desc: "Valor total do serviço", exemplo: "Ex: R$ 150,00" },
  { var: "{{empresa}}", desc: "Nome do seu salão/empresa", exemplo: "Ex: Studio Beléza" },
  { var: "{{link_confirmacao}}", desc: "Link único para o cliente confirmar o agendamento com 1 clique. Válido por 24h.", exemplo: "Ex: https://agendei.../confirmar/abc123" },
  { var: "{{link_agendamento}}", desc: "Link do portal público de agendamento da sua empresa. Ideal para campanhas de reativação e convites.", exemplo: "Ex: https://agendei.../agendar/meu-salao" },
  { var: "{{valor_reserva}}", desc: "Valor calculado da reserva antecipada. Baseado no percentual configurado em Configurações × valor do serviço.", exemplo: "Ex: R$ 45,00 (30% de R$ 150,00)" },
  { var: "{{nome_pacote}}", desc: "Nome do pacote renovado (disponível no evento Pacote renovado)", exemplo: "Ex: Pacote Progressiva 5x" },
  { var: "{{data_vencimento}}", desc: "Data de vencimento do pacote renovado", exemplo: "Ex: 30/06/2025" },
  { var: "{{valor_pago}}", desc: "Valor total pago na renovação do pacote", exemplo: "Ex: R$ 350,00" },
  { var: "{{parcelas}}", desc: "Forma de pagamento parcelada ou valor único do pacote", exemplo: "Ex: 3x de R$ 116,67" },
  { var: "{{pacote}}", desc: "Nome do pacote do cliente (para gatilhos de pacote)", exemplo: "Ex: Pacote Manicure 8x" },
  { var: "{{sessoes_restantes}}", desc: "Quantidade de sessões ainda disponíveis no pacote", exemplo: "Ex: 2" },
  { var: "{{sessoes_total}}", desc: "Quantidade total de sessões do pacote", exemplo: "Ex: 8" },
];

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

//  NodeCard

function FlowNodeCard({ node, selected, onSelect, onDelete, onConnect, connecting }: {
  node: FlowNode; selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onConnect: (id: string) => void;
  connecting: string | null;
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

  return (
    <div
      className={`rounded-xl border-2 shadow-sm ${s.bg} ${s.border} transition-all ${selected ? "ring-2 ring-indigo-500 ring-offset-2" : ""} ${connecting && connecting !== node.id ? "ring-2 ring-emerald-400 ring-offset-1 cursor-crosshair" : ""}`}
      style={{ width: 220 }}
      onClick={() => onSelect(node.id)}
    >
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${s.border}`}>
        <div className={`w-6 h-6 rounded-md ${s.iconBg} flex items-center justify-center`}>{s.icon}</div>
        <span className={`text-xs font-bold uppercase tracking-wider ${s.labelColor}`}>{s.label}</span>
        <div className="ml-auto flex items-center gap-1">
          {connecting && connecting !== node.id && (
            <button className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 z-10"
              onClick={e => { e.stopPropagation(); onConnect(node.id); }}>
              <Plus size={10} />
            </button>
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
      </div>
      {node.type !== "end" && !connecting && (
        <div className="px-3 pb-2 flex justify-center">
          <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
            onClick={e => { e.stopPropagation(); onConnect(node.id); }}>
            <ArrowRight size={11} /><span>Conectar próximo</span>
          </button>
        </div>
      )}
      {/* Dot de conexão */}
      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-indigo-400 shadow-sm z-10" />
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
  const insertVar = (v: string) => set("mensagem", (data.mensagem || "") + v);
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
          </>
        )}

        {/* CONDITION */}
        {node.type === "condition" && (
          <>
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
            <div><Label className="text-xs text-gray-500 mb-1 block">Valor</Label><Input value={data.valor || ""} onChange={e => set("valor", e.target.value)} placeholder="Ex: nome do profissional" className="text-sm" /></div>
          </>
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
                  <Textarea value={data.mensagem || ""} onChange={e => set("mensagem", e.target.value)}
                    placeholder="Olá {{nome_cliente}}, seu agendamento de {{servico}} está confirmado para {{data}} às {{hora}}."
                    className="text-sm min-h-[90px] resize-none" />
                  <p className="text-xs text-gray-400 mt-1.5 mb-1">Inserir variável:</p>
                  <TooltipProvider delayDuration={200}>
                    <div className="flex flex-wrap gap-1">
                      {VARIAVEIS.map(v => (
                        <Tooltip key={v.var}>
                          <TooltipTrigger asChild>
                            <button onClick={() => insertVar(v.var)}
                              className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5 hover:bg-indigo-100 font-mono transition-colors">
                              {v.var}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px] text-left">
                            <p className="font-medium text-xs mb-0.5">{v.desc}</p>
                            <p className="text-xs text-muted-foreground">{v.exemplo}</p>
                          </TooltipContent>
                        </Tooltip>
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

function FlowCanvas({ nodes, onNodesChange, selectedId, onSelect }: {
  nodes: FlowNode[];
  onNodesChange: (nodes: FlowNode[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if ((e.target as HTMLElement).closest("button,select,input,textarea")) return;
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    setDragging({ id, ox: e.clientX - node.x, oy: e.clientY - node.y });
    onSelect(id);
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - r.left - dragging.ox);
    const y = Math.max(0, e.clientY - r.top - dragging.oy);
    onNodesChange(nodes.map(n => n.id === dragging.id ? { ...n, x, y } : n));
  }, [dragging, nodes, onNodesChange]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [handleMouseMove, handleMouseUp]);

  const handleDelete = (id: string) => {
    onNodesChange(nodes.filter(n => n.id !== id).map(n => ({ ...n, connections: n.connections.filter(c => c !== id) })));
    if (selectedId === id) onSelect(null);
  };

  const handleConnect = (targetId: string) => {
    if (!connecting) { setConnecting(targetId); return; }
    if (connecting !== targetId) {
      onNodesChange(nodes.map(n => n.id === connecting ? { ...n, connections: Array.from(new Set([...n.connections, targetId])) } : n));
      toast.success("Nós conectados!");
    }
    setConnecting(null);
  };

  const renderConnections = () => nodes.flatMap(node =>
    node.connections.map(tid => {
      const t = nodes.find(n => n.id === tid);
      if (!t) return null;
      const x1 = node.x + 110, y1 = node.y + 90;
      const x2 = t.x + 110, y2 = t.y;
      const cy = (y1 + y2) / 2;
      return (
        <g key={`${node.id}-${tid}`}>
          <path d={`M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`}
            stroke="#6366f1" strokeWidth="2" fill="none" strokeDasharray="6 3" opacity="0.6" />
          <circle cx={x2} cy={y2} r="4" fill="#6366f1" opacity="0.8" />
        </g>
      );
    })
  );

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-auto"
      style={{
        minHeight: 580, minWidth: 800,
        backgroundImage: "radial-gradient(circle, #c7d2fe 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        backgroundColor: "#f8faff",
      }}
      onClick={e => { if (e.target === canvasRef.current) { onSelect(null); setConnecting(null); } }}
    >
      <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
        {renderConnections()}
      </svg>

      {connecting && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-indigo-600 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <ArrowRight size={12} />
          Clique em outro nó para conectar ·{" "}
          <button onClick={() => setConnecting(null)} className="underline">Cancelar</button>
        </div>
      )}

      {nodes.map(node => (
        <div
          key={node.id}
          onMouseDown={e => handleMouseDown(e, node.id)}
          style={{ position: "absolute", left: node.x, top: node.y, cursor: dragging?.id === node.id ? "grabbing" : "grab" }}
        >
          <FlowNodeCard
            node={node}
            selected={selectedId === node.id}
            onSelect={onSelect}
            onDelete={handleDelete}
            onConnect={handleConnect}
            connecting={connecting}
          />
        </div>
      ))}

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
          <Sparkles size={40} className="mb-3 opacity-20" />
          <p className="text-sm font-medium">Canvas vazio</p>
          <p className="text-xs mt-1 opacity-70">Adicione um nó de gatilho para começar</p>
        </div>
      )}
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

  // Gera pipeline automaticamente apenas se campos de fluxo mudaram
  const gerarPipelineAutomatico = () => {
    gerarPipelineMutation.mutate(undefined, {
      onSuccess: (data) => {
        toast.success(`✅ Pipeline atualizado automaticamente — "${data.nomePipeline}"`, { duration: 3500 });
        utils.pipeline.listar.invalidate();
      },
      onError: () => { /* silencioso em segundo plano */ },
    });
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
  const createMutation = trpc.automacoes.create.useMutation({
    onSuccess: () => { toast.success("Automação salva!"); utils.automacoes.list.invalidate(); gerarPipelineAutomatico(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = trpc.automacoes.update.useMutation({
    onSuccess: () => { toast.success("Automação atualizada!"); utils.automacoes.list.invalidate(); },
  });
  const deleteMutation = trpc.automacoes.delete.useMutation({
    onSuccess: () => { toast.success("Automação excluída!"); utils.automacoes.list.invalidate(); gerarPipelineAutomatico(); },
    onError: (e: any) => toast.error(e.message),
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
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
  }, { enabled: activeTab === "historico" });

  const [view, setView] = useState<"list" | "editor">("list");
  const [currentFlow, setCurrentFlow] = useState<FlowAutomacao>({ nome: "Nova Automação", ativo: true, nodes: [] });
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
        setNodes(Array.isArray(parsed) ? parsed : []);
      } catch {
        setNodes(flow?.nodes || []);
      }
    } else {
      setNodes(flow?.nodes || []);
    }
    if (flow?.id) setCurrentFlow(p => ({ ...p, id: flow.id }));
    setSelectedNodeId(null);
    setView("editor");
  };

  const addNode = (type: NodeType) => {
    const id = `${type}-${Date.now()}`;
    setNodes(prev => [...prev, { id, type, x: 80 + Math.random() * 250, y: 80 + Math.random() * 200, data: {}, connections: [] }]);
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
    if (!triggerNode) { toast.error("Adicione um nó de gatilho"); return; }
    const tipo = triggerNode.data.tipo || "evento";
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
    if (currentFlow.id) {
      // Atualizar automação existente — inclui campos temporais para garantir que dias_antes_agendamento funcione
      updateMutation.mutate({
        id: currentFlow.id,
        nome: currentFlow.nome,
        corpoMensagem: actionNode?.data.mensagem || "Mensagem automática",
        flowJson: flowJsonStr,
        tipoGatilho,
        evento: eventoValue,
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

  const automacoesFiltradas = (automacoesSalvas as any[]).filter(a => {
    if (filtroTipoGatilho === "todos") return true;
    return a.tipoGatilho === filtroTipoGatilho;
  });

  const tiposGatilhoUnicos = Array.from(new Set((automacoesSalvas as any[]).map(a => a.tipoGatilho)));

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
          pacote_renovado: "Pacote renovado",
          pacote_vencendo: "Pacote vencendo",
          sessoes_acabando: "Sessões acabando",
        };
        return evtLabels[a.evento] ?? `Evento: ${a.evento || "agendamento"}`;
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

                <Button variant="outline" size="sm" onClick={() => setDebugOpen(true)}>
                  <Activity size={14} className="mr-1" />
                  <span className="hidden sm:inline">Debug</span>
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
                        {historicoData.rows.map((row: any) => (
                          <tr key={row.id} className="hover:bg-gray-50 transition-colors">
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
                        ))}
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
                  </div>
                  {automacoesFiltradas.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200">
                      <p className="text-gray-500 font-medium">Nenhuma automação neste tipo</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(automacoesFiltradas as any[]).map(a => (
                    <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 flex items-center gap-3 hover:border-indigo-200 transition-colors">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${a.ativo ? "bg-indigo-100" : "bg-gray-100"}`}>
                        <Zap size={16} className={a.ativo ? "text-indigo-600" : "text-gray-400"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm truncate">{a.nome}</p>
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
                        <Switch checked={a.ativo} onCheckedChange={() => updateMutation.mutate({ id: a.id, ativo: !a.ativo }, { onSuccess: () => gerarPipelineAutomatico() })} />
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Testar envio"
                          onClick={() => setTesteEnvioId(a.id)}>
                          <Send size={13} className="text-indigo-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditor({ id: a.id, nome: a.nome, ativo: a.ativo, flowJson: a.flowJson ?? undefined, nodes: [], confirmacaoAutoAtivo: (a as any).confirmacaoAutoAtivo ?? false, confirmacaoAutoHorasAntes: (a as any).confirmacaoAutoHorasAntes ?? 2 })}>
                          <Edit2 size={13} />
                        </Button>

                      </div>
                    </div>
                      ))}
                    </div>
                  )}
                </>
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

        {/* Debug Modal */}
        {debugOpen && (
          <DebugAutomacoesModal
            open={debugOpen}
            onClose={() => setDebugOpen(false)}
            automacoes={automacoesSalvas as any[]}
          />
        )}
      </>
    );
  }
  // ── END MOBILE EDITOR ───────────────────────────────────────────────────────

  return (
    <>
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-100 shadow-sm z-10 flex-shrink-0">
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
            <div className="flex items-center gap-1.5">
              <Switch checked={currentFlow.ativo} onCheckedChange={v => setCurrentFlow(p => ({ ...p, ativo: v }))} />
              <span className="text-xs text-gray-500">{currentFlow.ativo ? "Ativa" : "Pausada"}</span>
            </div>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => saveFlow()} disabled={createMutation.isPending}>
              <Save size={13} className="mr-1.5" />{createMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* Canvas + Painel */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <FlowCanvas nodes={nodes} onNodesChange={setNodes} selectedId={selectedNodeId} onSelect={setSelectedNodeId} />
          </div>
          {selectedNode ? (
            <div className="w-72 border-l border-gray-200 bg-white overflow-hidden flex flex-col flex-shrink-0">
              <NodeConfigPanel
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
    </div>
    {/* Debug Modal */}
    {debugOpen && (
      <DebugAutomacoesModal
        open={debugOpen}
        onClose={() => setDebugOpen(false)}
        automacoes={automacoesSalvas as any[]}
      />
    )}

    </>
  );
}


// ─── Debug Modal ────────────────────────────────────────────────────────────

function DebugAutomacoesModal({ open, onClose, automacoes }: {
  open: boolean;
  onClose: () => void;
  automacoes: any[];
}) {
  const [filtroAutomacao, setFiltroAutomacao] = useState("all");
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [filtroPeriodo, setFiltroPeriodo] = useState("24h");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: debugData = [], isLoading } = trpc.automacoes.debugList.useQuery({
    automacaoId: filtroAutomacao && filtroAutomacao !== "all" ? parseInt(filtroAutomacao) : undefined,
    status: filtroStatus && filtroStatus !== "all" ? (filtroStatus as any) : undefined,
    periodo: filtroPeriodo ? (filtroPeriodo as any) : undefined,
    limite: 100,
  }, { refetchInterval: 5000 });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Activity size={16} className="text-indigo-600" />
            Debug de Automações
          </DialogTitle>
        </DialogHeader>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 px-5 pb-3 border-b">
          <Select value={filtroAutomacao} onValueChange={setFiltroAutomacao}>
            <SelectTrigger className="h-8 text-xs w-[180px]">
              <SelectValue placeholder="Todas automações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas automações</SelectItem>
              {automacoes.map(a => (
                <SelectItem key={a.id} value={String(a.id)}>{a.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue placeholder="Todos status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="falhou">Falhou</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Última hora</SelectItem>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {isLoading ? (
            <div className="text-center py-8 text-sm text-gray-400">Carregando...</div>
          ) : debugData.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">Nenhum envio encontrado para os filtros selecionados.</div>
          ) : (
            <div className="space-y-2">
              {debugData.map((item: any) => {
                const isFailed = item.status === 'falhou';
                const isExpanded = expandedId === item.id;
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border p-3 text-sm cursor-pointer transition-colors"
                    style={{
                      borderColor: isFailed ? "oklch(58% 0.22 25 / 30%)" : "oklch(90% 0.012 250)",
                      background: isFailed ? "oklch(58% 0.22 25 / 4%)" : "white",
                    }}
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-gray-400 tabular-nums">
                        {item.criadoEm ? new Date(item.criadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </span>
                      <span className="text-xs font-medium text-gray-700 truncate">{item.automacaoNome ?? "—"}</span>
                      {item.tipoGatilho && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{item.tipoGatilho}</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        item.status === 'enviado' ? 'bg-green-100 text-green-700' :
                        item.status === 'pendente' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.status === 'enviado' ? '✅ Enviado' : item.status === 'pendente' ? '⏳ Pendente' : '❌ Falhou'}
                      </span>
                      {item.isTeste && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-violet-100 text-violet-700 border-violet-200">Teste</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{item.clienteNome ?? "—"}</span>
                      {item.telefone && <span>· {item.telefone}</span>}
                    </div>
                    {isFailed && item.erroDetalhe && (
                      <div className={`mt-2 text-xs text-red-600 ${isExpanded ? '' : 'line-clamp-1'}`}>
                        {item.erroDetalhe}
                      </div>
                    )}
                    {isExpanded && item.mensagem && (
                      <div className="mt-2 p-2 rounded bg-gray-50 text-xs text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {item.mensagem}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
