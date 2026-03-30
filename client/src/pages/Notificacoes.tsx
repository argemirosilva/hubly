import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, CheckCheck, Calendar, DollarSign, Lock } from "lucide-react";
import { toast } from "sonner";

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
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Notificações</h1>
          {naoLidas > 0 && <p className="text-sm text-muted-foreground mt-0.5">{naoLidas} não lida{naoLidas !== 1 ? "s" : ""}</p>}
        </div>
        {naoLidas > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => marcarTodasMutation.mutate()}>
            <CheckCheck className="w-4 h-4" />Marcar todas como lidas
          </Button>
        )}
      </div>
      <Card className="border-border shadow-none">
        <CardContent className="p-0">
          {(notificacoes ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(notificacoes ?? []).map(n => (
                <div key={n.id} className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors ${!n.lida ? "bg-secondary/20" : ""}`}
                  onClick={() => !n.lida && marcarLidaMutation.mutate({ id: n.id })}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${!n.lida ? "bg-primary/10" : "bg-muted"}`}>
                    <Bell className={`w-4 h-4 ${!n.lida ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.lida ? "font-semibold text-foreground" : "text-foreground"}`}>{n.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.mensagem}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{new Date(n.createdAt).toLocaleString("pt-BR")}</p>
                  </div>
                  {!n.lida && <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
