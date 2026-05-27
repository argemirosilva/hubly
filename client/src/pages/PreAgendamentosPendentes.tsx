/**
 * Página de Pré-agendamentos Pendentes
 * Acessível pelo badge da bottom nav (ícone Agenda).
 * Permite confirmar ou cancelar cada pré-agendamento em um toque.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle, XCircle, Calendar, Clock, User, Scissors, Phone, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AgendamentoDetalheModal from "@/components/AgendamentoDetalheModal";
import { useLocation } from "wouter";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const [year, month, day] = String(dateStr).slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function formatCurrency(v: string | number | null | undefined): string {
  const num = parseFloat(String(v ?? 0));
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

type ConfirmAction = { id: number; action: "confirmar" | "cancelar" };

export default function PreAgendamentosPendentes() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [detalheId, setDetalheId] = useState<number | null>(null);

  const { data: pendentes, isLoading, refetch } = trpc.agendamentos.listPreAgendamentosPendentes.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });

  const updateMutation = trpc.agendamentos.update.useMutation({
    onSuccess: (_, variables) => {
      const label = variables.status === "agendado" ? "confirmado" : "cancelado";
      toast.success(`Agendamento ${label} com sucesso!`);
      utils.agendamentos.listPreAgendamentosPendentes.invalidate();
      utils.agendamentos.contarPreAgendamentosPendentes.invalidate();
      utils.agendamentos.list.invalidate();
      setConfirmAction(null);
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
      setConfirmAction(null);
    },
  });

  function handleAction(id: number, action: "confirmar" | "cancelar") {
    setConfirmAction({ id, action });
  }

  function executeAction() {
    if (!confirmAction) return;
    updateMutation.mutate({
      id: confirmAction.id,
      status: confirmAction.action === "confirmar" ? "agendado" : "cancelado",
    });
  }

  const total = pendentes?.length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/admin/calendario")}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-foreground">Pré-agendamentos</h1>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Carregando…" : `${total} pendente${total !== 1 ? "s" : ""} de confirmação`}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Lista */}
      <div className="p-4 space-y-3 pb-24">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && total === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground">Nenhum pré-agendamento pendente</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Quando clientes agendarem pelo portal, eles aparecerão aqui para você confirmar.
            </p>
          </div>
        )}

        {!isLoading && (pendentes ?? []).map((ag) => (
          <div
            key={ag.id}
            className="bg-card border border-border rounded-xl p-4 shadow-sm"
          >
            {/* Linha superior: cliente + badge */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {ag.clienteNome ?? "Cliente"}
                  </p>
                  {ag.clienteTelefone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {ag.clienteTelefone}
                    </p>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-xs flex-shrink-0"
                style={{
                  background: "oklch(72% 0.16 80 / 14%)",
                  color: "oklch(42% 0.14 75)",
                  borderColor: "oklch(72% 0.16 80 / 30%)",
                }}
              >
                Pré-agendado
              </Badge>
            </div>

            {/* Detalhes */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{formatDate(ag.data as string)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{ag.horaInicio} – {ag.horaFim}</span>
              </div>
              {ag.servicoNome && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <Scissors className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{ag.servicoNome}</span>
                </div>
              )}
              {ag.profissionalNome && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <User className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{ag.profissionalNome}</span>
                </div>
              )}
            </div>

            {/* Valor + ações */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(ag.valorTotal)}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setDetalheId(ag.id)}
                >
                  Ver detalhes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-7 px-2.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleAction(ag.id, "cancelar")}
                  disabled={updateMutation.isPending}
                >
                  <XCircle className="w-3 h-3 mr-0.5" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="text-[11px] h-7 px-2.5 bg-primary hover:bg-primary/90 text-white"
                  onClick={() => handleAction(ag.id, "confirmar")}
                  disabled={updateMutation.isPending}
                >
                  <CheckCircle className="w-3 h-3 mr-0.5" />
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Diálogo de confirmação */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "confirmar" ? "Confirmar agendamento?" : "Cancelar agendamento?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "confirmar"
                ? "O status será alterado para Agendado e o cliente poderá receber uma notificação."
                : "O agendamento será marcado como Cancelado. Esta ação pode ser desfeita manualmente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              className={confirmAction?.action === "cancelar" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {confirmAction?.action === "confirmar" ? "Confirmar" : "Cancelar agendamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de detalhe */}
      {detalheId !== null && (
        <AgendamentoDetalheModal
          agendamentoId={detalheId}
          open={detalheId !== null}
          onClose={() => setDetalheId(null)}
        />
      )}
    </div>
  );
}
