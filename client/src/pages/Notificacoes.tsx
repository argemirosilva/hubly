import { trpc } from "@/lib/trpc";
import { Bell, CheckCheck, Calendar, DollarSign, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";

function getNotifIcon(tipo?: string | null) {
  switch (tipo) {
    case "agendamento": return { icon: Calendar, bg: "oklch(55% 0.22 264 / 12%)", color: "oklch(45% 0.18 264)" };
    case "financeiro":  return { icon: DollarSign, bg: "oklch(62% 0.18 155 / 12%)", color: "oklch(38% 0.14 155)" };
    case "alerta":      return { icon: AlertCircle, bg: "oklch(72% 0.16 80 / 12%)", color: "oklch(40% 0.14 75)" };
    default:            return { icon: Bell, bg: "oklch(55% 0.22 264 / 12%)", color: "oklch(45% 0.18 264)" };
  }
}

export default function Notificacoes() {
  const utils = trpc.useUtils();
  const { data: notificacoes } = trpc.notificacoes.list.useQuery();
  const marcarLidaMutation = trpc.notificacoes.marcarLida.useMutation({
    onSuccess: () => utils.notificacoes.list.invalidate(),
    onError: (err: any) => toast.error(err.message),
  });
  const marcarTodasMutation = trpc.notificacoes.marcarTodasLidas.useMutation({
    onSuccess: () => { toast.success("Todas marcadas como lidas!"); utils.notificacoes.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });
  const naoLidas = (notificacoes ?? []).filter(n => !n.lida).length;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-3xl mx-auto animate-in-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Notificações</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {naoLidas > 0 ? `${naoLidas} não lida${naoLidas !== 1 ? "s" : ""}` : "Tudo em dia"}
          </p>
        </div>
        {naoLidas > 0 && (
          <button
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors"
            style={{ borderColor: "oklch(88% 0.010 250)", color: "oklch(45% 0.010 260)" }}
            onClick={() => marcarTodasMutation.mutate()}
            disabled={marcarTodasMutation.isPending}>
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Marcar todas como lidas</span>
            <span className="sm:hidden">Marcar lidas</span>
          </button>
        )}
      </div>

      <div className="card-elegant overflow-hidden">
        {(notificacoes ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(55% 0.22 264 / 8%)" }}>
              <Bell className="w-5 h-5" style={{ color: "oklch(55% 0.22 264)" }} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Nenhuma notificação</p>
            <p className="text-xs text-muted-foreground">Você está em dia com tudo!</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "oklch(94% 0.008 250)" }}>
            {(notificacoes ?? []).map(n => {
              const { icon: NIcon, bg, color } = getNotifIcon((n as any).tipo);
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 px-4 py-4 cursor-pointer transition-colors"
                  style={{ background: !n.lida ? "oklch(55% 0.22 264 / 3%)" : "transparent" }}
                  onClick={() => !n.lida && marcarLidaMutation.mutate({ id: n.id })}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "oklch(97% 0.006 250)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = !n.lida ? "oklch(55% 0.22 264 / 3%)" : "transparent"; }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: bg }}>
                    <NIcon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.lida ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                      {n.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.mensagem}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                      {new Date(n.createdAt).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {!n.lida && (
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                      style={{ background: "oklch(55% 0.22 264)" }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
