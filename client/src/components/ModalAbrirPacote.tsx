/**
 * ModalAbrirPacote — componente reutilizável para abrir um pacote para um cliente.
 * Pode ser usado a partir da página de Pacotes, do NovaAgendaModal ou de qualquer
 * outro ponto do sistema.
 */
import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Search, X } from "lucide-react";

function formatCurrency(v: number | string) {
  const num = typeof v === "string" ? parseFloat(v) : v;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(isNaN(num) ? 0 : num);
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Quando fornecido, o campo de cliente é pré-preenchido e bloqueado */
  clienteIdInicial?: number;
  clienteNomeInicial?: string;
  /** Serviço pré-selecionado no primeiro item do pacote */
  servicoIdInicial?: number;
  onSuccess?: (pacoteId: number) => void;
}

export default function ModalAbrirPacote({
  open,
  onClose,
  clienteIdInicial,
  clienteNomeInicial,
  servicoIdInicial,
  onSuccess,
}: Props) {
  const utils = trpc.useUtils();

  // ── Dados externos ──────────────────────────────────────────────────────────
  const { data: clientes = [] } = trpc.clientes.list.useQuery(undefined, { enabled: !clienteIdInicial });
  const { data: modelos = [] } = trpc.pacotes.listarModelos.useQuery();
  const { data: servicos = [] } = trpc.servicos.list.useQuery();

  // ── Estado do cliente ───────────────────────────────────────────────────────
  const [clienteId, setClienteId] = useState(clienteIdInicial ? String(clienteIdInicial) : "");
  const [clienteBusca, setClienteBusca] = useState(clienteNomeInicial ?? "");
  const [clienteNomeSelecionado, setClienteNomeSelecionado] = useState(clienteNomeInicial ?? "");
  const [clienteDropdownAberto, setClienteDropdownAberto] = useState(false);
  const clienteInputRef = useRef<HTMLInputElement>(null);
  const clienteDropdownRef = useRef<HTMLDivElement>(null);

  // Sincronizar quando props mudam (ex: modal reabre com cliente diferente)
  useEffect(() => {
    if (open) {
      if (clienteIdInicial) {
        setClienteId(String(clienteIdInicial));
        setClienteBusca(clienteNomeInicial ?? "");
        setClienteNomeSelecionado(clienteNomeInicial ?? "");
      } else {
        setClienteId("");
        setClienteBusca("");
        setClienteNomeSelecionado("");
      }
      // Pré-preencher serviço inicial
      if (servicoIdInicial) {
        setItens([{ servicoId: servicoIdInicial, quantidadeTotal: 1 }]);
      } else {
        setItens([{ servicoId: 0, quantidadeTotal: 1 }]);
      }
      // Resetar demais campos
      setModeloId("");
      setNome("");
      setValorPago("");
      setFormaPagamento("");
      setNumeroParcelas("1");
      setValidadeDias("");
      setObservacoes("");
      setAutomacaoRenovacao(false);
      setDataValidade("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const clientesFiltrados = clienteBusca.trim().length >= 1
    ? clientes.filter((c: any) =>
        c.nome?.toLowerCase().includes(clienteBusca.toLowerCase())
      ).slice(0, 10)
    : [];

  function selecionarCliente(c: any) {
    setClienteId(String(c.id));
    setClienteNomeSelecionado(c.nome);
    setClienteBusca(c.nome);
    setClienteDropdownAberto(false);
  }

  function limparCliente() {
    setClienteId("");
    setClienteNomeSelecionado("");
    setClienteBusca("");
    setClienteDropdownAberto(false);
    setTimeout(() => clienteInputRef.current?.focus(), 50);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        clienteDropdownRef.current &&
        !clienteDropdownRef.current.contains(e.target as Node) &&
        clienteInputRef.current &&
        !clienteInputRef.current.contains(e.target as Node)
      ) {
        setClienteDropdownAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Estado do formulário ────────────────────────────────────────────────────
  const [modeloId, setModeloId] = useState("");
  const [nome, setNome] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [numeroParcelas, setNumeroParcelas] = useState("1");
  const [validadeDias, setValidadeDias] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [automacaoRenovacao, setAutomacaoRenovacao] = useState(false);
  const [dataValidade, setDataValidade] = useState("");
  const [itens, setItens] = useState<{ servicoId: number; quantidadeTotal: number }[]>([
    { servicoId: servicoIdInicial ?? 0, quantidadeTotal: 1 },
  ]);

  const numParcelas = parseInt(numeroParcelas) || 1;
  const valorTotal = parseFloat(valorPago) || 0;
  const valorPorParcela = numParcelas > 1 ? valorTotal / numParcelas : 0;

  function handleModeloChange(id: string) {
    setModeloId(id);
    const modelo = modelos.find((m: any) => m.id === parseInt(id));
    if (modelo) {
      setNome(modelo.nome);
      setValorPago(String(parseFloat(modelo.preco)));
      setValidadeDias(modelo.validadeDias ? String(modelo.validadeDias) : "");
      setItens(modelo.itens.map((i: any) => ({ servicoId: i.servicoId, quantidadeTotal: i.quantidade })));
    }
  }

  const abrirMutation = trpc.pacotes.abrirPacote.useMutation({
    onSuccess: (data) => {
      utils.pacotes.listarTodos.invalidate();
      utils.pacotes.listarAtivosComSessoes.invalidate();
      toast.success("Pacote aberto com sucesso!");
      onSuccess?.(data.id);
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSave() {
    if (!clienteId || !nome || !valorPago || itens.some((i) => !i.servicoId)) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    abrirMutation.mutate({
      clienteId: parseInt(clienteId),
      modeloId: modeloId ? parseInt(modeloId) : undefined,
      nome,
      valorPago: parseFloat(valorPago),
      formaPagamento: formaPagamento || undefined,
      numeroParcelas: parseInt(numeroParcelas) || 1,
      validadeDias: validadeDias ? parseInt(validadeDias) : undefined,
      observacoes: observacoes || undefined,
      automacaoRenovacao,
      dataValidade: dataValidade || undefined,
      itens: itens.filter((i) => i.servicoId > 0),
    });
  }

  const clienteBloqueado = !!clienteIdInicial;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Abrir Pacote para Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Cliente */}
          <div>
            <Label>Cliente *</Label>
            {clienteBloqueado ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50 text-sm font-medium">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {clienteNomeSelecionado?.[0]?.toUpperCase()}
                </div>
                {clienteNomeSelecionado}
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={clienteInputRef}
                    value={clienteBusca}
                    onChange={(e) => {
                      setClienteBusca(e.target.value);
                      setClienteDropdownAberto(true);
                      if (clienteNomeSelecionado && e.target.value !== clienteNomeSelecionado) {
                        setClienteId("");
                        setClienteNomeSelecionado("");
                      }
                    }}
                    onFocus={() => setClienteDropdownAberto(true)}
                    placeholder="Digite o nome do cliente..."
                    className="pl-9 pr-8"
                  />
                  {clienteBusca && (
                    <button
                      type="button"
                      onClick={limparCliente}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {clienteDropdownAberto && clientesFiltrados.length > 0 && (
                  <div
                    ref={clienteDropdownRef}
                    className="absolute z-50 w-full mt-1 rounded-lg border bg-popover shadow-lg overflow-hidden"
                    style={{ borderColor: "oklch(89.5% 0.018 80)" }}
                  >
                    {clientesFiltrados.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); selecionarCliente(c); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors flex items-center gap-2 ${
                          clienteId === String(c.id) ? "bg-primary/8 text-primary font-medium" : ""
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-primary">
                          {c.nome?.[0]?.toUpperCase()}
                        </div>
                        <span>{c.nome}</span>
                      </button>
                    ))}
                  </div>
                )}
                {clienteDropdownAberto && clienteBusca.trim().length >= 1 && clientesFiltrados.length === 0 && (
                  <div
                    ref={clienteDropdownRef}
                    className="absolute z-50 w-full mt-1 rounded-lg border bg-popover shadow-lg px-4 py-3 text-sm text-muted-foreground"
                    style={{ borderColor: "oklch(89.5% 0.018 80)" }}
                  >
                    Nenhum cliente encontrado
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modelo */}
          {modelos.filter((m: any) => m.ativo).length > 0 && (
            <div>
              <Label>Modelo de pacote (opcional)</Label>
              <Select value={modeloId} onValueChange={handleModeloChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar modelo pré-definido" />
                </SelectTrigger>
                <SelectContent>
                  {modelos.filter((m: any) => m.ativo).map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.nome} — {formatCurrency(m.preco)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Nome */}
          <div>
            <Label>Nome do pacote *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Pacote Manicure 4x" />
          </div>

          {/* Valor + Forma de pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor total (R$) *</Label>
              <Input type="number" min="0" step="0.01" value={valorPago} onChange={(e) => setValorPago(e.target.value)} />
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {["Dinheiro", "Pix", "Cartão de crédito", "Cartão de débito", "Transferência"].map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Parcelas + Validade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Número de parcelas</Label>
              <Select value={numeroParcelas} onValueChange={setNumeroParcelas}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n === 1 ? "À vista" : `${n}x`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {numParcelas > 1 && valorTotal > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {numParcelas}x de {formatCurrency(valorPorParcela)}
                </p>
              )}
            </div>
            <div>
              <Label>Validade (dias)</Label>
              <Input
                type="number"
                min="1"
                value={validadeDias}
                onChange={(e) => setValidadeDias(e.target.value)}
                placeholder="Sem validade"
              />
            </div>
          </div>

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Itens do pacote *</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setItens([...itens, { servicoId: 0, quantidadeTotal: 1 }])}
                className="h-7 text-xs gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {itens.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select
                    value={String(item.servicoId || "")}
                    onValueChange={(v) =>
                      setItens(itens.map((it, idx) => idx === i ? { ...it, servicoId: parseInt(v) } : it))
                    }
                  >
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicos.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setItens(itens.map((it, idx) =>
                          idx === i ? { ...it, quantidadeTotal: Math.max(1, it.quantidadeTotal - 1) } : it
                        ))
                      }
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantidadeTotal}</span>
                    <button
                      onClick={() =>
                        setItens(itens.map((it, idx) =>
                          idx === i ? { ...it, quantidadeTotal: it.quantidadeTotal + 1 } : it
                        ))
                      }
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
                    >
                      +
                    </button>
                  </div>
                  {itens.length > 1 && (
                    <button
                      onClick={() => setItens(itens.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Automação de renovação */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-foreground">Ativar lembrete de renovação</p>
              <p className="text-xs text-muted-foreground">Ativado: dispara automação de WhatsApp ao vencer ou acabar sessões. Desativado: nenhuma mensagem é enviada à cliente.</p>
            </div>
            <Switch checked={automacaoRenovacao} onCheckedChange={setAutomacaoRenovacao} />
          </div>

          {automacaoRenovacao && (
            <div>
              <Label>Data de validade (opcional)</Label>
              <Input
                type="date"
                value={dataValidade}
                onChange={(e) => setDataValidade(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Se não preenchida, o pacote não expira por tempo.</p>
            </div>
          )}

          {/* Observações */}
          <div>
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Notas sobre o pacote..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={abrirMutation.isPending}>
            {abrirMutation.isPending ? "Abrindo..." : "Abrir pacote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
