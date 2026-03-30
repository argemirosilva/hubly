import { useState, useRef, useCallback, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Zap, Calendar, Clock, Gift, MessageSquare, Bell, Mail,
  Plus, Trash2, Play, Pause, Settings, ChevronRight,
  ArrowRight, X, Save, Sparkles, Filter,
  AlarmClock, Users, Tag, Check, Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// ─── Tipos ────────────────────────────────────────────────────────────────────

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
}

// ─── Opções ───────────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: "evento_agendamento_criado", label: "Agendamento criado", icon: Calendar, color: "#6366f1" },
  { value: "evento_agendamento_confirmado", label: "Agendamento confirmado", icon: Check, color: "#10b981" },
  { value: "evento_agendamento_cancelado", label: "Agendamento cancelado", icon: X, color: "#ef4444" },
  { value: "evento_pre_agendamento", label: "Pré-agendamento criado", icon: Clock, color: "#f59e0b" },
  { value: "aniversario_mes", label: "Aniversário do mês", icon: Gift, color: "#ec4899" },
  { value: "data_fixa", label: "Data específica do calendário", icon: Calendar, color: "#8b5cf6" },
  { value: "dias_antes_agendamento", label: "Dias antes do agendamento", icon: AlarmClock, color: "#0ea5e9" },
  { value: "horas_apos_agendamento", label: "Horas após o agendamento", icon: Clock, color: "#14b8a6" },
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
  { var: "{{nome_cliente}}", desc: "Nome da cliente" },
  { var: "{{servico}}", desc: "Nome do serviço" },
  { var: "{{profissional}}", desc: "Nome do profissional" },
  { var: "{{data}}", desc: "Data do agendamento" },
  { var: "{{hora}}", desc: "Hora do agendamento" },
  { var: "{{valor}}", desc: "Valor do serviço" },
  { var: "{{empresa}}", desc: "Nome da empresa" },
];

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ─── NodeCard ─────────────────────────────────────────────────────────────────

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

// ─── Painel de configuração ───────────────────────────────────────────────────

function NodeConfigPanel({ node, onUpdate, onClose }: {
  node: FlowNode;
  onUpdate: (id: string, data: Record<string, any>) => void;
  onClose: () => void;
}) {
  const [data, setData] = useState({ ...node.data });
  const set = (key: string, val: any) => setData(p => ({ ...p, [key]: val }));
  const save = () => { onUpdate(node.id, data); toast.success("Nó atualizado!"); };
  const insertVar = (v: string) => set("mensagem", (data.mensagem || "") + v);

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
                <SelectContent>
                  {TRIGGER_OPTIONS.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2"><t.icon size={13} style={{ color: t.color }} />{t.label}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            {data.tipo === "horas_apos_agendamento" && (
              <div><Label className="text-xs text-gray-500 mb-1 block">Horas após</Label><Input type="number" min={1} value={data.horas || 2} onChange={e => set("horas", Number(e.target.value))} className="text-sm" /></div>
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
                    <span className="text-xs text-gray-400">{(data.mensagem || "").length} chars</span>
                  </div>
                  <Textarea value={data.mensagem || ""} onChange={e => set("mensagem", e.target.value)}
                    placeholder="Olá {{nome_cliente}}, seu agendamento de {{servico}} está confirmado para {{data}} às {{hora}}."
                    className="text-sm min-h-[90px] resize-none" />
                  <p className="text-xs text-gray-400 mt-1.5 mb-1">Inserir variável:</p>
                  <div className="flex flex-wrap gap-1">
                    {VARIAVEIS.map(v => (
                      <button key={v.var} onClick={() => insertVar(v.var)} title={v.desc}
                        className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5 hover:bg-indigo-100 font-mono">
                        {v.var}
                      </button>
                    ))}
                  </div>
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
    </div>
  );
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

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

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    nome: "Lembrete 24h antes", descricao: "Envia lembrete 1 dia antes do agendamento", icon: AlarmClock,
    nodes: [
      { id: "t1", type: "trigger" as NodeType, x: 300, y: 60, data: { label: "1 dia antes", tipo: "dias_antes_agendamento", dias: 1, hora: "09:00" }, connections: ["a1"] },
      { id: "a1", type: "action" as NodeType, x: 300, y: 220, data: { label: "Lembrete WhatsApp", tipo: "enviar_whatsapp", mensagem: "Olá {{nome_cliente}}! Lembrando que você tem {{servico}} amanhã às {{hora}} com {{profissional}}. Confirma sua presença? 😊" }, connections: [] },
    ],
  },
  {
    nome: "Aniversariante do Mês", descricao: "Desconto no 1º dia do mês do aniversário", icon: Gift,
    nodes: [
      { id: "t1", type: "trigger" as NodeType, x: 300, y: 60, data: { label: "Aniversário do mês", tipo: "aniversario_mes" }, connections: ["a1"] },
      { id: "a1", type: "action" as NodeType, x: 300, y: 220, data: { label: "Mensagem de aniversário", tipo: "enviar_whatsapp", mensagem: "Feliz mês do seu aniversário, {{nome_cliente}}! 🎂🎉 Você tem desconto especial durante todo o mês. Agende agora! {{empresa}}" }, connections: [] },
    ],
  },
  {
    nome: "Solicitar reserva", descricao: "Pede pagamento de 30% após pré-agendamento", icon: Clock,
    nodes: [
      { id: "t1", type: "trigger" as NodeType, x: 300, y: 60, data: { label: "Pré-agendamento criado", tipo: "evento_pre_agendamento" }, connections: ["a1"] },
      { id: "a1", type: "action" as NodeType, x: 300, y: 220, data: { label: "Solicitar reserva", tipo: "enviar_whatsapp", mensagem: "Olá {{nome_cliente}}! Seu horário de {{servico}} em {{data}} às {{hora}} foi pré-reservado. Para confirmar, pague a reserva de 30% ({{valor}}) via Pix. Válido por 24h ⏰" }, connections: [] },
    ],
  },
  {
    nome: "Natal / Datas comemorativas", descricao: "Mensagem em data específica do calendário", icon: Sparkles,
    nodes: [
      { id: "t1", type: "trigger" as NodeType, x: 300, y: 60, data: { label: "25 de Dezembro", tipo: "data_fixa", dia: 25, mes: "12", hora: "09:00" }, connections: ["a1"] },
      { id: "a1", type: "action" as NodeType, x: 300, y: 220, data: { label: "Feliz Natal", tipo: "enviar_whatsapp", mensagem: "Feliz Natal, {{nome_cliente}}! 🎄✨ Que este dia seja repleto de alegria. Obrigada por fazer parte da nossa história! Com carinho, {{empresa}} 💙" }, connections: [] },
    ],
  },
  {
    nome: "Confirmação com delay", descricao: "Aguarda 2h e envia confirmação", icon: AlarmClock,
    nodes: [
      { id: "t1", type: "trigger" as NodeType, x: 300, y: 40, data: { label: "Agendamento criado", tipo: "evento_agendamento_criado" }, connections: ["d1"] },
      { id: "d1", type: "delay" as NodeType, x: 300, y: 190, data: { label: "Aguardar 2h", quantidade: 2, unidade: "horas" }, connections: ["a1"] },
      { id: "a1", type: "action" as NodeType, x: 300, y: 340, data: { label: "Confirmação", tipo: "enviar_whatsapp", mensagem: "Olá {{nome_cliente}}! Seu agendamento de {{servico}} em {{data}} às {{hora}} com {{profissional}} está confirmado. Até lá! 💙" }, connections: [] },
    ],
  },
];

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Automacoes() {
  const utils = trpc.useUtils();
  const { data: automacoesSalvas = [], isLoading } = trpc.automacoes.list.useQuery();
  const createMutation = trpc.automacoes.create.useMutation({
    onSuccess: () => { toast.success("Automação salva!"); utils.automacoes.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = trpc.automacoes.update.useMutation({
    onSuccess: () => { toast.success("Automação atualizada!"); utils.automacoes.list.invalidate(); },
  });
  const deleteMutation = trpc.automacoes.delete.useMutation({
    onSuccess: () => { toast.success("Automação excluída!"); utils.automacoes.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [view, setView] = useState<"list" | "editor">("list");
  const [currentFlow, setCurrentFlow] = useState<FlowAutomacao>({ nome: "Nova Automação", ativo: true, nodes: [] });
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [addNodeMenu, setAddNodeMenu] = useState(false);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;

  const openEditor = (flow?: Partial<FlowAutomacao>) => {
    setCurrentFlow({ nome: flow?.nome || "Nova Automação", descricao: flow?.descricao, ativo: flow?.ativo ?? true, nodes: [] });
    setNodes(flow?.nodes || []);
    setSelectedNodeId(null);
    setView("editor");
  };

  const addNode = (type: NodeType) => {
    const id = `${type}-${Date.now()}`;
    setNodes(prev => [...prev, { id, type, x: 80 + Math.random() * 250, y: 80 + Math.random() * 200, data: {}, connections: [] }]);
    setSelectedNodeId(id);
    setAddNodeMenu(false);
  };

  const saveFlow = () => {
    if (!currentFlow.nome.trim()) { toast.error("Dê um nome à automação"); return; }
    if (nodes.length === 0) { toast.error("Adicione pelo menos um nó"); return; }
    const triggerNode = nodes.find(n => n.type === "trigger");
    if (!triggerNode) { toast.error("Adicione um nó de gatilho"); return; }
    const tipo = triggerNode.data.tipo || "evento";
    const tipoGatilho: any = tipo.startsWith("evento_") ? "evento"
      : tipo === "aniversario_mes" ? "aniversario_mes"
      : tipo === "data_fixa" ? "data_fixa"
      : tipo === "dias_antes_agendamento" ? "dias_antes_agendamento"
      : "horas_apos_agendamento";
    const actionNode = nodes.find(n => n.type === "action");
    createMutation.mutate({
      nome: currentFlow.nome,
      descricao: currentFlow.descricao,
      tipoGatilho,
      evento: tipo.startsWith("evento_") ? tipo.replace("evento_", "") : undefined,
      diasAntesDepois: triggerNode.data.dias ? Number(triggerNode.data.dias) : undefined,
      horaDisparo: triggerNode.data.hora,
      dataFixaDia: triggerNode.data.dia ? Number(triggerNode.data.dia) : undefined,
      dataFixaMes: triggerNode.data.mes ? Number(triggerNode.data.mes) : undefined,
      dataFixaHora: triggerNode.data.hora,
      canalEnvio: actionNode?.data.tipo === "enviar_email" ? "email" : "whatsapp",
      tituloMensagem: actionNode?.data.titulo,
      corpoMensagem: actionNode?.data.mensagem || "Mensagem automática",
    }, { onSuccess: () => setView("list") });
  };

  const getTriggerLabel = (a: any) => {
    switch (a.tipoGatilho) {
      case "evento": return `Evento: ${a.evento || "agendamento"}`;
      case "aniversario_mes": return "Aniversariante do mês";
      case "data_fixa": return `${a.dataFixaDia}/${a.dataFixaMes ? MESES_ABREV[a.dataFixaMes - 1] : "?"} às ${a.dataFixaHora || "09:00"}`;
      case "dias_antes_agendamento": return `${a.diasAntesDepois || 1} dia(s) antes`;
      case "horas_apos_agendamento": return `${a.diasAntesDepois || 2}h após`;
      default: return a.tipoGatilho;
    }
  };

  // ── LISTA ──────────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <AdminLayout>
        <div className="p-6 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Automações</h1>
              <p className="text-sm text-gray-500 mt-0.5">Crie fluxos automáticos de mensagens e ações</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
                <Sparkles size={14} className="mr-1.5" />Templates
              </Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openEditor()}>
                <Plus size={14} className="mr-1.5" />Nova automação
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
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
            <div className="space-y-3">
              {(automacoesSalvas as any[]).map(a => (
                <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:border-indigo-200 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.ativo ? "bg-indigo-100" : "bg-gray-100"}`}>
                    <Zap size={18} className={a.ativo ? "text-indigo-600" : "text-gray-400"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{a.nome}</p>
                      <Badge className={`text-xs ${a.ativo ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500"}`}>
                        {a.ativo ? "Ativa" : "Pausada"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Zap size={10} />{getTriggerLabel(a)}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <MessageSquare size={10} />{a.canalEnvio === "whatsapp" ? "WhatsApp" : a.canalEnvio === "email" ? "E-mail" : "SMS"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={a.ativo} onCheckedChange={() => updateMutation.mutate({ id: a.id, ativo: !a.ativo })} />
                    <Button variant="ghost" size="sm" onClick={() => openEditor({ nome: a.nome, ativo: a.ativo, nodes: [] })}>
                      <Edit2 size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setConfirmDeleteId(a.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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

        <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Sparkles size={17} className="text-indigo-600" />Templates de automação</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-2">
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
      </AdminLayout>
    );
  }

  // ── EDITOR ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="flex flex-col" style={{ height: "calc(100vh - 0px)" }}>
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
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={saveFlow} disabled={createMutation.isPending}>
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
              />
            </div>
          ) : nodes.length > 0 ? (
            <div className="w-56 border-l border-gray-100 bg-gray-50 flex flex-col items-center justify-center text-center p-6 flex-shrink-0">
              <Settings size={26} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-500 font-medium">Selecione um nó</p>
              <p className="text-xs text-gray-400 mt-1">Clique em qualquer nó para configurar</p>
            </div>
          ) : null}
        </div>
      </div>
    </AdminLayout>
  );
}
