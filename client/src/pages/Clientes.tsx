import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { usePermissoes } from "@/hooks/usePermissoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Search, Users, Phone, Calendar, Pencil, Trash2, RotateCcw,
  Mail, ChevronRight, TrendingUp, DollarSign, UserCheck, UserX, Wallet, X, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

function formatCurrency(v: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));
}

const FORM_VAZIO = { nome: "", telefone: "", whatsapp: "", email: "", cpf: "", dataNascimento: "", endereco: "", observacoes: "" };
// Helpers para unificação: telefone e whatsapp sempre iguais
const setTelWhats = (form: FormCliente, v: string): FormCliente => ({ ...form, telefone: v, whatsapp: v });

type FormCliente = typeof FORM_VAZIO;

// ─── Mini bar chart component ────────────────────────────────────────────────
function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[3px] h-10">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-[6px] rounded-sm transition-all"
          style={{
            height: `${Math.max((v / max) * 100, 6)}%`,
            background: i === data.length - 1 ? color : `${color}50`,
          }}
        />
      ))}
    </div>
  );
}

export default function Clientes() {
  const { pode } = usePermissoes();
  const utils = trpc.useUtils();

  const [busca, setBusca] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false);

  // Modais
  const [modalCriar, setModalCriar] = useState(false);
  const [modalEditar, setModalEditar] = useState<null | { id: number; form: FormCliente }>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState<null | { id: number; nome: string }>(null);

  const [form, setForm] = useState<FormCliente>(FORM_VAZIO);

  // Queries
  const { data: clientesAtivos, isLoading: clientesLoading } = trpc.clientes.list.useQuery();
  const { data: todosClientes } = trpc.clientes.listAll.useQuery();
  const { data: saldosCredito } = trpc.creditos.listSaldos.useQuery();

  const clientes = useMemo(() => {
    const lista = mostrarInativos ? (todosClientes ?? []) : (clientesAtivos ?? []);
    return lista.filter(c =>
      !busca ||
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.telefone ?? "").includes(busca) ||
      (c.email ?? "").toLowerCase().includes(busca.toLowerCase()) ||
      (c.cpf ?? "").includes(busca)
    );
  }, [clientesAtivos, todosClientes, busca, mostrarInativos]);

  // ─── Métricas calculadas ─────────────────────────────────────────────────
  const metricas = useMemo(() => {
    const ativos = clientesAtivos ?? [];
    const todos = todosClientes ?? [];
    const inativos = todos.length - ativos.length;

    const totalReceita = ativos.reduce((acc, c) => acc + Number(c.totalGasto ?? 0), 0);
    const totalAtendimentos = ativos.reduce((acc, c) => acc + (c.totalAtendimentos ?? 0), 0);
    const ticketMedio = ativos.length > 0 ? totalReceita / ativos.length : 0;

    // Top 5 clientes por gasto
    const top5 = [...ativos].sort((a, b) => Number(b.totalGasto ?? 0) - Number(a.totalGasto ?? 0)).slice(0, 5);
    const top5Gastos = top5.map(c => Number(c.totalGasto ?? 0));

    // Distribuição de atendimentos (últimos 6 "buckets" por faixa)
    const atendDistrib = [0, 0, 0, 0, 0, 0]; // 0, 1-2, 3-5, 6-10, 11-20, 20+
    ativos.forEach(c => {
      const n = c.totalAtendimentos ?? 0;
      if (n === 0) atendDistrib[0]++;
      else if (n <= 2) atendDistrib[1]++;
      else if (n <= 5) atendDistrib[2]++;
      else if (n <= 10) atendDistrib[3]++;
      else if (n <= 20) atendDistrib[4]++;
      else atendDistrib[5]++;
    });

    return { ativos: ativos.length, inativos, totalReceita, totalAtendimentos, ticketMedio, top5Gastos, atendDistrib };
  }, [clientesAtivos, todosClientes]);

  const invalidar = () => {
    utils.clientes.list.invalidate();
    utils.clientes.listAll.invalidate();
  };

  // Mutations
  const criarMutation = trpc.clientes.create.useMutation({
    onSuccess: () => {
      toast.success("Cliente cadastrado com sucesso!");
      invalidar();
      setModalCriar(false);
      setForm(FORM_VAZIO);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const editarMutation = trpc.clientes.update.useMutation({
    onSuccess: () => {
      toast.success("Cliente atualizado!");
      invalidar();
      setModalEditar(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const excluirMutation = trpc.clientes.delete.useMutation({
    onSuccess: () => {
      toast.success("Cliente removido.");
      invalidar();
      setConfirmarExcluir(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const restaurarMutation = trpc.clientes.restore.useMutation({
    onSuccess: () => {
      toast.success("Cliente reativado!");
      invalidar();
    },
    onError: (err: any) => toast.error(err.message),
  });

  function abrirEditar(c: any) {
    setModalEditar({
      id: c.id,
      form: {
        nome: c.nome ?? "",
        telefone: c.telefone ?? c.whatsapp ?? "",
        whatsapp: c.whatsapp ?? c.telefone ?? "",
        email: c.email ?? "",
        cpf: c.cpf ?? "",
        dataNascimento: c.dataNascimento ?? "",
        endereco: c.endereco ?? "",
        observacoes: c.observacoes ?? "",
      },
    });
  }

  if (!pode("clientesVer")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <Users className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Você não tem permissão para acessar os Clientes.</p>
      </div>
    );
  }

  if (clientesLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="h-6 w-28 bg-muted animate-pulse rounded" />
            <div className="h-3 w-20 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-9 w-28 bg-muted animate-pulse rounded-lg" />
        </div>
        {/* Métricas skeleton */}
        <div className="grid grid-cols-4 gap-2 lg:gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-xl border bg-card px-3 py-2.5 space-y-2">
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              <div className="h-5 w-14 bg-muted animate-pulse rounded" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
        {/* Busca skeleton */}
        <div className="h-10 w-full bg-muted animate-pulse rounded-lg" />
        {/* Lista skeleton */}
        <div className="space-y-2">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <div className="w-9 h-9 bg-muted animate-pulse rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto animate-in-up flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Clientes</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {metricas.ativos} ativos
            {mostrarInativos && metricas.inativos > 0 && (
              <span className="ml-1 text-orange-500">· {metricas.inativos} inativos</span>
            )}
          </p>
        </div>
        <button onClick={() => { setForm(FORM_VAZIO); setModalCriar(true); }} className="btn-primary py-2 px-3 text-xs">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Novo Cliente</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Cards de métricas — compactos no mobile */}
      <div className="grid grid-cols-4 gap-2 lg:gap-3 mb-3 lg:mb-4">
        {[
          { label: "Ativos", value: String(metricas.ativos), icon: UserCheck, color: "oklch(78.5% 0.075 85)" },
          { label: "Receita", value: formatCurrency(metricas.totalReceita), icon: DollarSign, color: "oklch(50% 0.16 155)" },
          { label: "Ticket médio", value: formatCurrency(metricas.ticketMedio), icon: TrendingUp, color: "oklch(60% 0.20 30)" },
          { label: "Atendimentos", value: String(metricas.totalAtendimentos), icon: Calendar, color: "oklch(55% 0.18 270)" },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card-elegant p-2 lg:p-3.5 flex items-center gap-2 lg:gap-3">
              <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${card.color}18` }}>
                <Icon className="w-3 h-3 lg:w-4 lg:h-4" style={{ color: card.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] lg:text-[11px] text-muted-foreground leading-none truncate">{card.label}</p>
                <p className="text-xs lg:text-lg font-bold tracking-tight mt-0.5 truncate">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mini gráficos — ocultos no mobile */}
      <div className="hidden lg:grid grid-cols-2 gap-3 mb-4">
        <div className="card-elegant p-3.5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-medium text-muted-foreground">Top 5 clientes (receita)</p>
          </div>
          <MiniBarChart data={metricas.top5Gastos.length > 0 ? metricas.top5Gastos : [0]} color="oklch(50% 0.16 155)" />
        </div>
        <div className="card-elegant p-3.5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-medium text-muted-foreground">Frequência de atendimentos</p>
          </div>
          <MiniBarChart data={metricas.atendDistrib} color="oklch(78.5% 0.075 85)" />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-muted-foreground">0</span>
            <span className="text-[9px] text-muted-foreground">1-2</span>
            <span className="text-[9px] text-muted-foreground">3-5</span>
            <span className="text-[9px] text-muted-foreground">6-10</span>
            <span className="text-[9px] text-muted-foreground">11-20</span>
            <span className="text-[9px] text-muted-foreground">20+</span>
          </div>
        </div>
      </div>

      {/* Busca fixa (sticky) + toggle inativos */}
      <div className="sticky top-0 z-10 bg-background pb-3 -mx-4 lg:-mx-6 px-4 lg:px-6 pt-1 border-b border-border/40">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, telefone, email ou CPF..." className="pl-9 h-10" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 px-3 rounded-lg border bg-card text-xs text-muted-foreground whitespace-nowrap">
            <Switch checked={mostrarInativos} onCheckedChange={setMostrarInativos} id="toggle-inativos" />
            <label htmlFor="toggle-inativos" className="cursor-pointer hidden sm:block">Ver inativos</label>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">{clientes.length} resultado{clientes.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Lista com scroll */}
      <div className="card-elegant overflow-hidden flex-1 min-h-0 flex flex-col mt-0">
        {clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(78.5% 0.075 85 / 8%)" }}>
              <Users className="w-5 h-5" style={{ color: "oklch(78.5% 0.075 85)" }} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {busca ? "Tente outro termo de busca" : "Cadastre o primeiro cliente para começar"}
            </p>
            {!busca && (
              <button className="btn-primary text-xs py-1.5" onClick={() => { setForm(FORM_VAZIO); setModalCriar(true); }}>
                <Plus className="w-3.5 h-3.5" /> Cadastrar cliente
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 divide-y" style={{ borderColor: "oklch(94% 0.010 75)" }}>
            {clientes.map(c => {
              const inativo = !c.ativo;
              return (
                <div key={c.id} className={`flex items-center gap-3 px-4 py-3 transition-colors group ${inativo ? "opacity-50" : "hover:bg-muted/30"}`}>
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white ${inativo ? "bg-muted-foreground/40" : ""}`}
                    style={!inativo ? { background: "oklch(78.5% 0.075 85)" } : {}}>
                    {c.nome.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <Link href={`/admin/clientes/${c.id}`} className="flex-1 min-w-0 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{c.nome}</p>
                      {inativo && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Inativo</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {(c.telefone || c.whatsapp) && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 flex-shrink-0 text-green-500" />{c.telefone || c.whatsapp}
                        </span>
                      )}
                      {c.email && (
                        <span className="hidden md:flex text-xs text-muted-foreground items-center gap-1 truncate max-w-[180px]">
                          <Mail className="w-3 h-3 flex-shrink-0" />{c.email}
                        </span>
                      )}
                      {c.dataNascimento && (
                        <span className="hidden sm:flex text-xs text-muted-foreground items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {c.dataNascimento.split("-").reverse().join("/")}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Badge de crédito */}
                  {saldosCredito && (saldosCredito[c.id] ?? 0) > 0 && (
                    <div className="flex-shrink-0 hidden sm:flex items-center gap-1 bg-green-50 border border-green-200 rounded-full px-2 py-0.5" title={`Crédito disponível: ${formatCurrency(saldosCredito[c.id])}`}>
                      <Wallet className="w-3 h-3 text-green-600" />
                      <span className="text-xs font-semibold text-green-700">{formatCurrency(saldosCredito[c.id])}</span>
                    </div>
                  )}

                  {/* Financeiro */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-sm font-bold" style={{ color: "oklch(35% 0.14 155)" }}>{formatCurrency(c.totalGasto)}</p>
                    <p className="text-xs text-muted-foreground">{c.totalAtendimentos ?? 0} atend.</p>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {inativo ? (
                      <button
                        onClick={e => { e.preventDefault(); restaurarMutation.mutate({ id: c.id }); }}
                        className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 transition-colors"
                        title="Reativar cliente"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={e => { e.preventDefault(); abrirEditar(c); }}
                          className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                          title="Editar cliente"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={e => { e.preventDefault(); setConfirmarExcluir({ id: c.id, nome: c.nome }); }}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                          title="Remover cliente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <Link href={`/admin/clientes/${c.id}`}>
                      <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="Ver detalhes">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Criar */}
      <Dialog open={modalCriar} onOpenChange={setModalCriar}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight">Novo Cliente</DialogTitle>
          </DialogHeader>
          <ClienteForm form={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCriar(false)}>Cancelar</Button>
            <Button onClick={() => criarMutation.mutate({ ...form, dataNascimento: form.dataNascimento || undefined } as any)} disabled={!form.nome || criarMutation.isPending}>
              {criarMutation.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={!!modalEditar} onOpenChange={v => !v && setModalEditar(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight">Editar Cliente</DialogTitle>
          </DialogHeader>
          {modalEditar && (
            <ClienteForm
              form={modalEditar.form}
              onChange={f => setModalEditar(prev => prev ? { ...prev, form: f } : null)}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEditar(null)}>Cancelar</Button>
            <Button
              onClick={() => modalEditar && editarMutation.mutate({ id: modalEditar.id, ...modalEditar.form, dataNascimento: modalEditar.form.dataNascimento || undefined } as any)}
              disabled={!modalEditar?.form.nome || editarMutation.isPending}
            >
              {editarMutation.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!confirmarExcluir} onOpenChange={v => !v && setConfirmarExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente <strong>{confirmarExcluir?.nome}</strong> será marcado como inativo e não aparecerá mais na lista. Você pode reativá-lo depois usando o filtro "Ver inativos".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmarExcluir && excluirMutation.mutate({ id: confirmarExcluir.id })}
            >
              {excluirMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Formulário reutilizável ────────────────────────────────────────────────
function ClienteForm({ form, onChange }: { form: FormCliente; onChange: (f: FormCliente) => void }) {
  const set = (k: keyof FormCliente, v: string) => onChange({ ...form, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <div className="sm:col-span-2">
        <Label className="text-xs text-muted-foreground mb-1.5 block">Nome completo *</Label>
        <Input value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Nome do cliente" />
      </div>
      <div className="sm:col-span-2">
        <Label className="text-xs text-muted-foreground mb-1.5 block">Telefone / WhatsApp</Label>
        <Input value={form.telefone || form.whatsapp} onChange={e => onChange(setTelWhats(form, e.target.value))} placeholder="(11) 99999-9999" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Email</Label>
        <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@exemplo.com" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">CPF</Label>
        <Input value={form.cpf} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Data de nascimento <span className="font-normal text-muted-foreground/60">(opcional)</span></Label>
        <div className="relative">
          <Input
            type="date"
            value={form.dataNascimento}
            onChange={e => set("dataNascimento", e.target.value)}
            className={!form.dataNascimento ? "text-muted-foreground" : ""}
          />
          {form.dataNascimento && (
            <button
              type="button"
              onClick={() => set("dataNascimento", "")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Remover data"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Endereço</Label>
        <Input value={form.endereco} onChange={e => set("endereco", e.target.value)} placeholder="Rua, número, bairro..." />
      </div>
      <div className="sm:col-span-2">
        <Label className="text-xs text-muted-foreground mb-1.5 block">Observações</Label>
        <Textarea value={form.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Alergias, preferências, informações importantes..." rows={3} />
      </div>
    </div>
  );
}
