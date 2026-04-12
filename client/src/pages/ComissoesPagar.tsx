import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getLocalDateString } from "@/lib/utils";
import { CheckCircle2, Clock, Search, Filter, DollarSign, Users, TrendingUp, AlertCircle } from "lucide-react";
import { usePermissoes } from "@/hooks/usePermissoes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleDateString("pt-BR");
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function ComissoesPagar() {
  const { isAdmin, pode, profissionalId } = usePermissoes();
  const canViewAll = isAdmin || pode("financeiroVer");

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pendente" | "pago">("todos");
  const [filtroProfissional, setFiltroProfissional] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [pagarModalOpen, setPagarModalOpen] = useState(false);
  const [selectedComissoes, setSelectedComissoes] = useState<number[]>([]);
  const [dataPagamento, setDataPagamento] = useState(() => getLocalDateString());

  // Datas do período
  const dataInicio = useMemo(() => new Date(ano, mes - 1, 1), [mes, ano]);
  const dataFim = useMemo(() => new Date(ano, mes, 0, 23, 59, 59), [mes, ano]);

  const { data: comissoes = [], isLoading, refetch } = trpc.comissoesPagar.list.useQuery({
    dataInicio,
    dataFim,
    profissionalId: canViewAll ? undefined : (profissionalId ?? undefined),
  });

  const { data: profissionais = [] } = trpc.profissionais.list.useQuery();

  const marcarPagoMutation = trpc.comissoesPagar.marcarPago.useMutation({
    onSuccess: () => {
      toast.success("Comissões marcadas como pagas!");
      refetch();
      setPagarModalOpen(false);
      setSelectedComissoes([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Filtrar comissões
  const comissoesFiltradas = useMemo(() => {
    return comissoes.filter((c: any) => {
      if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
      if (filtroProfissional !== "todos" && String(c.profissionalId) !== filtroProfissional) return false;
      if (busca) {
        const buscaLower = busca.toLowerCase();
        const profNome = (c.profissionalNome ?? "").toLowerCase();
        const clienteNome = (c.clienteNome ?? "").toLowerCase();
        const servicoNome = (c.servicoNome ?? "").toLowerCase();
        if (!profNome.includes(buscaLower) && !clienteNome.includes(buscaLower) && !servicoNome.includes(buscaLower)) return false;
      }
      return true;
    });
  }, [comissoes, filtroStatus, filtroProfissional, busca]);

  // Métricas
  const metricas = useMemo(() => {
    const total = comissoesFiltradas.reduce((s: number, c: any) => s + parseFloat(c.valor ?? "0"), 0);
    const pagas = comissoesFiltradas.filter((c: any) => c.status === "pago").reduce((s: number, c: any) => s + parseFloat(c.valor ?? "0"), 0);
    const pendentes = comissoesFiltradas.filter((c: any) => c.status === "pendente").reduce((s: number, c: any) => s + parseFloat(c.valor ?? "0"), 0);
    const qtdPendentes = comissoesFiltradas.filter((c: any) => c.status === "pendente").length;
    return { total, pagas, pendentes, qtdPendentes };
  }, [comissoesFiltradas]);

  // Agrupar por profissional
  const porProfissional = useMemo(() => {
    const map = new Map<number, { nome: string; total: number; pago: number; pendente: number; comissoes: any[] }>();
    comissoesFiltradas.forEach((c: any) => {
      const pid = c.profissionalId;
      if (!map.has(pid)) {
        map.set(pid, { nome: c.profissionalNome ?? `Profissional ${pid}`, total: 0, pago: 0, pendente: 0, comissoes: [] });
      }
      const entry = map.get(pid)!;
      const val = parseFloat(c.valor ?? "0");
      entry.total += val;
      if (c.status === "pago") entry.pago += val;
      else entry.pendente += val;
      entry.comissoes.push(c);
    });
    return Array.from(map.values()).sort((a, b) => b.pendente - a.pendente);
  }, [comissoesFiltradas]);

  const pendentesIds = comissoesFiltradas
    .filter((c: any) => c.status === "pendente")
    .map((c: any) => c.id);

  function toggleSelect(id: number) {
    setSelectedComissoes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function selectAllPendentes() {
    setSelectedComissoes(pendentesIds);
  }

  function handleMarcarPago() {
    if (selectedComissoes.length === 0) {
      toast.error("Selecione ao menos uma comissão");
      return;
    }
    marcarPagoMutation.mutate({
      ids: selectedComissoes,
      dataPagamento: new Date(dataPagamento),
    });
  }

  const anosDisponiveis = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comissões a Pagar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie o pagamento de comissões aos profissionais
          </p>
        </div>
        {selectedComissoes.length > 0 && (
          <Button onClick={() => setPagarModalOpen(true)} className="gap-2 bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="w-4 h-4" />
            Pagar {selectedComissoes.length} selecionada{selectedComissoes.length !== 1 ? "s" : ""}
          </Button>
        )}
      </div>

      {/* Seletor de período */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Select value={String(mes)} onValueChange={v => setMes(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESES.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {anosDisponiveis.map(a => (
              <SelectItem key={a} value={String(a)}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500">Total</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(metricas.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">Pago</span>
            </div>
            <p className="text-lg font-bold text-green-700">{formatCurrency(metricas.pagas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-gray-500">Pendente</span>
            </div>
            <p className="text-lg font-bold text-orange-700">{formatCurrency(metricas.pendentes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-gray-500">A pagar</span>
            </div>
            <p className="text-lg font-bold text-red-700">{metricas.qtdPendentes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar profissional, cliente..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroStatus} onValueChange={v => setFiltroStatus(v as any)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="pago">Pagos</SelectItem>
          </SelectContent>
        </Select>
        {canViewAll && profissionais.length > 0 && (
          <Select value={filtroProfissional} onValueChange={setFiltroProfissional}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {profissionais.map((p: any) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {pendentesIds.length > 0 && selectedComissoes.length === 0 && (
          <Button variant="outline" size="sm" onClick={selectAllPendentes} className="gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Selecionar pendentes
          </Button>
        )}
        {selectedComissoes.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedComissoes([])}>
            Limpar seleção
          </Button>
        )}
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : comissoesFiltradas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <DollarSign className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">Nenhuma comissão encontrada</h3>
            <p className="text-sm text-gray-500">
              {filtroStatus !== "todos" || busca
                ? "Tente ajustar os filtros para ver mais resultados."
                : "Não há comissões registradas para este período."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {porProfissional.map((grupo) => (
            <Card key={grupo.nome}>
              <CardContent className="p-0">
                {/* Header do grupo */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {grupo.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{grupo.nome}</p>
                      <p className="text-xs text-gray-500">{grupo.comissoes.length} comissão(ões)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {grupo.pendente > 0 && (
                      <p className="text-sm font-bold text-orange-700">{formatCurrency(grupo.pendente)} pendente</p>
                    )}
                    {grupo.pago > 0 && (
                      <p className="text-xs text-green-600">{formatCurrency(grupo.pago)} pago</p>
                    )}
                  </div>
                </div>
                {/* Linhas de comissão */}
                <div className="divide-y">
                  {grupo.comissoes.map((c: any) => {
                    const isPendente = c.status === "pendente";
                    const isSelected = selectedComissoes.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                          isPendente ? "cursor-pointer hover:bg-gray-50" : ""
                        } ${isSelected ? "bg-green-50" : ""}`}
                        onClick={() => isPendente && toggleSelect(c.id)}
                      >
                        {/* Checkbox visual */}
                        {isPendente && (
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-green-600 border-green-600" : "border-gray-300"
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                        )}
                        {!isPendente && <div className="w-4 h-4 shrink-0" />}
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {c.clienteNome ?? "Cliente"} — {c.servicoNome ?? "Serviço"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(c.dataAgendamento)}
                            {c.dataPagamento && ` · Pago em ${formatDate(c.dataPagamento)}`}
                          </p>
                        </div>
                        {/* Valor e status */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(c.valor)}</p>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              isPendente
                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                : "bg-green-50 text-green-700 border-green-200"
                            }`}
                          >
                            {isPendente ? "Pendente" : "Pago"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* FAB Mobile para pagar selecionados */}
      {selectedComissoes.length > 0 && (
        <button
          onClick={() => setPagarModalOpen(true)}
          className="fixed bottom-6 right-6 sm:hidden z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-green-700 active:scale-95 transition-all text-sm font-semibold"
        >
          <CheckCircle2 className="w-5 h-5" />
          Pagar {selectedComissoes.length}
        </button>
      )}

      {/* Modal confirmar pagamento */}
      <Dialog open={pagarModalOpen} onOpenChange={setPagarModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pagamento de comissões</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Você está marcando <strong>{selectedComissoes.length}</strong> comissão(ões) como pagas.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="dataPagamento">Data de pagamento</Label>
              <Input
                id="dataPagamento"
                type="date"
                value={dataPagamento}
                onChange={e => setDataPagamento(e.target.value)}
              />
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-sm text-green-800">
              <p className="font-semibold">Total a pagar:</p>
              <p className="text-lg font-bold">
                {formatCurrency(
                  comissoes
                    .filter((c: any) => selectedComissoes.includes(c.id))
                    .reduce((s: number, c: any) => s + parseFloat(c.valor ?? "0"), 0)
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagarModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleMarcarPago}
              disabled={marcarPagoMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {marcarPagoMutation.isPending ? "Processando..." : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
