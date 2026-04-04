import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CheckCircle2, XCircle, RefreshCw, Send, MessageSquare, Filter } from "lucide-react";

type StatusFila = "pendente" | "enviado" | "falhou" | "todos";
type Periodo = "hoje" | "semana" | "mes" | "todos";
type Ordenacao = "proximos" | "recentes";

function StatusBadge({ status, tempoRestante }: { status: string; tempoRestante?: string | null }) {
  if (status === "pendente") {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Pendente
        </Badge>
        {tempoRestante && (
          <span className="text-xs text-yellow-600 font-medium">{tempoRestante}</span>
        )}
      </div>
    );
  }
  if (status === "enviado") {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Enviado
      </Badge>
    );
  }
  if (status === "falhou") {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
        <XCircle className="w-3 h-3 mr-1" />
        Falhou
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

function CanalIcon({ canal }: { canal: string }) {
  if (canal === "whatsapp") return <MessageSquare className="w-3.5 h-3.5 text-green-600" />;
  return <Send className="w-3.5 h-3.5 text-muted-foreground" />;
}

export default function FilaAutomacoes() {
  const [status, setStatus] = useState<StatusFila>("todos");
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("recentes");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, isLoading, refetch } = trpc.automacoes.getFilaEnvios.useQuery(
    { status, periodo, ordenacao, limit: 100 },
    { refetchInterval: autoRefresh ? 30000 : false }
  );

  const pendentes = data?.rows.filter(r => r.status === "pendente").length ?? 0;
  const enviados = data?.rows.filter(r => r.status === "enviado").length ?? 0;
  const falhas = data?.rows.filter(r => r.status === "falhou").length ?? 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Send className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Fila de Envios</h1>
            <p className="text-sm text-muted-foreground">Acompanhe os envios de automações em tempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="gap-1.5 text-xs"
          >
            <Clock className="w-3.5 h-3.5" />
            {autoRefresh ? "Auto ON" : "Auto OFF"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setStatus("pendente")}
          className={`rounded-xl border p-3 text-left transition-all ${status === "pendente" ? "border-yellow-400 bg-yellow-50" : "bg-card hover:bg-muted/50"}`}
        >
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-600">{pendentes}</p>
        </button>
        <button
          onClick={() => setStatus("enviado")}
          className={`rounded-xl border p-3 text-left transition-all ${status === "enviado" ? "border-green-400 bg-green-50" : "bg-card hover:bg-muted/50"}`}
        >
          <p className="text-xs text-muted-foreground">Enviados</p>
          <p className="text-2xl font-bold text-green-600">{enviados}</p>
        </button>
        <button
          onClick={() => setStatus("falhou")}
          className={`rounded-xl border p-3 text-left transition-all ${status === "falhou" ? "border-red-400 bg-red-50" : "bg-card hover:bg-muted/50"}`}
        >
          <p className="text-xs text-muted-foreground">Falhas</p>
          <p className="text-2xl font-bold text-red-600">{falhas}</p>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={status} onValueChange={v => setStatus(v as StatusFila)}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="enviado">Enviados</SelectItem>
            <SelectItem value="falhou">Falhas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={periodo} onValueChange={v => setPeriodo(v as Periodo)}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Período" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="semana">Esta semana</SelectItem>
            <SelectItem value="mes">Este mês</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ordenacao} onValueChange={v => setOrdenacao(v as Ordenacao)}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Ordenação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recentes">Mais recentes</SelectItem>
            <SelectItem value="proximos">Próximos envios</SelectItem>
          </SelectContent>
        </Select>
        {status !== "todos" && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setStatus("todos")}>
            Limpar filtro
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !data || data.rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Send className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground font-medium">Nenhum envio encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros ou aguarde novos envios</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {data.total} envio{data.total !== 1 ? "s" : ""} encontrado{data.total !== 1 ? "s" : ""}
              {autoRefresh && <span className="ml-2 text-xs text-green-600">• Atualização automática ativa</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.rows.map((row) => (
                <div key={row.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="mt-0.5 shrink-0"><CanalIcon canal={row.canal} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{row.clienteNome ?? "Cliente"}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground truncate">{row.automacaoNome ?? "Automação"}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground capitalize">{row.canal}</span>
                      {row.telefone && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{row.telefone}</span>
                        </>
                      )}
                    </div>
                    {row.mensagem && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
                        "{row.mensagem.slice(0, 80)}{row.mensagem.length > 80 ? "..." : ""}"
                      </p>
                    )}
                    {row.erroDetalhe && <p className="text-xs text-red-500 mt-1">{row.erroDetalhe}</p>}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <StatusBadge status={row.status} tempoRestante={row.tempoRestante} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(row.criadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
