import { useId, useState } from "react";
import { format } from "date-fns";
import { Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  agendamentoId: number;
  reservaExpiracaoEm: Date | string | null;
  createdAt: Date | string;
  disabled?: boolean;
}

export default function PrazoPreAgendamento({ agendamentoId, reservaExpiracaoEm, createdAt, disabled }: Props) {
  const utils = trpc.useUtils();
  const inputId = useId();
  const [editando, setEditando] = useState(false);
  const [novaDataLimite, setNovaDataLimite] = useState("");
  const { data: empresa } = trpc.empresa.get.useQuery(undefined, {
    enabled: !reservaExpiracaoEm,
  });
  // Mesmo prazo usado pelo cancelamento automático para registros antigos.
  const prazoAtual = reservaExpiracaoEm
    ? new Date(reservaExpiracaoEm)
    : empresa
      ? new Date(new Date(createdAt).getTime() + (empresa.reservaHorasExpiracao ?? 24) * 3600000)
      : null;
  const prazoValido = prazoAtual && !Number.isNaN(prazoAtual.getTime()) ? prazoAtual : null;

  const mutation = trpc.agendamentos.prorrogarPrazo.useMutation({
    onSuccess: () => {
      setEditando(false);
      setNovaDataLimite("");
      toast.success("Prazo do pré-agendamento atualizado!");
      void utils.agendamentos.getById.invalidate({ id: agendamentoId });
      void utils.agendamentos.list.invalidate();
      void utils.agendamentos.listPreAgendamentosPendentes.invalidate();
      void utils.agendamentos.contarPreAgendamentosPendentes.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function salvarPrazo() {
    const novaData = new Date(novaDataLimite);
    if (!novaDataLimite || Number.isNaN(novaData.getTime()) || novaData.getTime() <= Date.now()) {
      toast.error("Escolha uma data e hora no futuro.");
      return;
    }
    mutation.mutate({ id: agendamentoId, novaDataLimite: novaData.toISOString() });
  }

  const bloqueado = disabled || mutation.isPending;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 space-y-3">
      <div className="flex items-start gap-2">
        <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-amber-900">Prazo do pré-agendamento</p>
          <p className="text-sm text-amber-800">
            {prazoValido ? format(prazoValido, "dd/MM/yyyy 'às' HH:mm") : "Carregando prazo…"}
          </p>
        </div>
      </div>
      {editando ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={inputId} className="text-xs">Nova data e hora limite</Label>
            <Input
              id={inputId}
              type="datetime-local"
              value={novaDataLimite}
              min={format(new Date(Date.now() + 60000), "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => setNovaDataLimite(e.target.value)}
              disabled={bloqueado}
              className="w-full min-w-0 bg-background"
            />
          </div>
          <p className="text-xs text-amber-800">
            Este prazo vale apenas para este pré-agendamento. O prazo padrão dos demais permanece igual.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" size="sm" disabled={bloqueado} onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" disabled={bloqueado || !novaDataLimite} onClick={salvarPrazo}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {mutation.isPending ? "Salvando…" : "Salvar prazo"}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => {
          setNovaDataLimite(prazoValido ? format(prazoValido, "yyyy-MM-dd'T'HH:mm") : "");
          setEditando(true);
        }}>
          Alterar prazo
        </Button>
      )}
    </div>
  );
}
