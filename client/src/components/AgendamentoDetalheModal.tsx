import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, User, Scissors, DollarSign } from "lucide-react";

const statusLabel: Record<string, string> = {
  pre_agendado: "Pré-agendado",
  aguardando_reserva: "Aguardando Reserva",
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  faltou: "Faltou",
};

const statusColor: Record<string, string> = {
  pre_agendado: "bg-purple-100 text-purple-700",
  aguardando_reserva: "bg-orange-100 text-orange-700",
  agendado: "bg-blue-100 text-blue-700",
  confirmado: "bg-emerald-100 text-emerald-700",
  em_andamento: "bg-cyan-100 text-cyan-700",
  concluido: "bg-gray-100 text-gray-600",
  cancelado: "bg-red-100 text-red-700",
  faltou: "bg-amber-100 text-amber-700",
};

interface Props {
  agendamentoId: number;
  open: boolean;
  onClose: () => void;
}

export default function AgendamentoDetalheModal({ agendamentoId, open, onClose }: Props) {
  const utils = trpc.useUtils();
  const { data: ag, isLoading } = trpc.agendamentos.getById.useQuery({ id: agendamentoId });
  const { data: clientes } = trpc.clientes.list.useQuery();
  const { data: profissionais } = trpc.profissionais.list.useQuery();
  const { data: servicos } = trpc.servicos.list.useQuery();

  const updateMutation = trpc.agendamentos.update.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      utils.agendamentos.list.invalidate();
      utils.agendamentos.getById.invalidate({ id: agendamentoId });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const cliente = clientes?.find(c => c.id === ag?.clienteId);
  const profissional = profissionais?.find(p => p.id === ag?.profissionalId);
  const servico = servicos?.find(s => s.id === ag?.servicoId);

  const handleStatus = (status: string) => {
    updateMutation.mutate({ id: agendamentoId, status: status as any } as any);
  };

  if (isLoading || !ag) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>
            Detalhes do Agendamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[ag.status] ?? "bg-gray-100 text-gray-600"}`}>
              {statusLabel[ag.status] ?? ag.status}
            </span>
          </div>

          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{cliente?.nome ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{cliente?.telefone ?? ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Scissors className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{servico?.nome ?? "—"}</p>
                <p className="text-xs text-muted-foreground">com {profissional?.nome ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">
                {ag.data.split("-").reverse().join("/")} · {ag.horaInicio.slice(0, 5)} – {ag.horaFim.slice(0, 5)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">
                R$ {parseFloat(String(ag.valorTotal)).toFixed(2)}
              </p>
            </div>
          </div>

          {ag.observacoes && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Observações</p>
              <p className="text-sm">{ag.observacoes}</p>
            </div>
          )}

          {/* Ações de status */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Alterar status</p>
            <div className="flex flex-wrap gap-2">
              {ag.status === "aguardando_reserva" && (
                <Button size="sm" variant="outline" className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  onClick={() => handleStatus("agendado")}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Confirmar reserva
                </Button>
              )}
              {["agendado", "pre_agendado"].includes(ag.status) && (
                <Button size="sm" variant="outline" className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  onClick={() => handleStatus("confirmado")}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Confirmar
                </Button>
              )}
              {["agendado", "confirmado"].includes(ag.status) && (
                <Button size="sm" variant="outline" className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => handleStatus("concluido")}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Concluído
                </Button>
              )}
              {["agendado", "confirmado"].includes(ag.status) && (
                <Button size="sm" variant="outline" className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
                  onClick={() => handleStatus("faltou")}>
                  <XCircle className="w-3.5 h-3.5" />
                  Faltou
                </Button>
              )}
              {!["cancelado", "concluido"].includes(ag.status) && (
                <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleStatus("cancelado")}>
                  <XCircle className="w-3.5 h-3.5" />
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
