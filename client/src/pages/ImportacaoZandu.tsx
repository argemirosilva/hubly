import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Eye,
  Loader2,
  Users,
  Scissors,
  UserCheck,
  CalendarDays,
  ArrowRight,
  ExternalLink,
  Info,
} from "lucide-react";

type TipoImportacao = "clientes" | "servicos" | "profissionais" | "agendamentos";

interface LogEntry {
  tipo: string;
  total: number;
  importados: number;
  duplicados: number;
  erros: number;
  detalhes: { nome: string; status: "importado" | "duplicado" | "erro"; mensagem?: string }[];
}

const TIPOS_CONFIG: Record<TipoImportacao, { label: string; icon: React.ComponentType<{ className?: string }>; descricao: string }> = {
  clientes: { label: "Clientes", icon: Users, descricao: "Pessoas cadastradas no Zandu" },
  servicos: { label: "Serviços", icon: Scissors, descricao: "Serviços disponíveis no Zandu" },
  profissionais: { label: "Profissionais/Usuários", icon: UserCheck, descricao: "Usuários cadastrados no Zandu" },
  agendamentos: { label: "Agendamentos", icon: CalendarDays, descricao: "Histórico de agendamentos do Zandu" },
};

type Etapa = "token" | "preview" | "importando" | "resultado";

export default function ImportacaoZandu() {
  const [etapa, setEtapa] = useState<Etapa>("token");
  const [token, setToken] = useState("");
  const [tiposSelecionados, setTiposSelecionados] = useState<TipoImportacao[]>(["clientes", "servicos", "profissionais"]);
  const [ignorarDuplicados, setIgnorarDuplicados] = useState(true);
  const [previewData, setPreviewData] = useState<Record<string, { total: number; amostra: unknown[] }> | null>(null);
  const [resultadoLog, setResultadoLog] = useState<LogEntry[]>([]);
  const [erroGlobal, setErroGlobal] = useState<string | null>(null);

  const previewMutation = trpc.zandu.preview.useMutation({
    onSuccess: (data) => {
      setPreviewData(data);
      setEtapa("preview");
      setErroGlobal(null);
    },
    onError: (err) => {
      setErroGlobal(err.message);
    },
  });

  const importarMutation = trpc.zandu.importar.useMutation({
    onSuccess: (data) => {
      setResultadoLog(data.log);
      setEtapa("resultado");
    },
    onError: (err) => {
      setErroGlobal(err.message);
      setEtapa("preview");
    },
  });

  const toggleTipo = (tipo: TipoImportacao) => {
    setTiposSelecionados((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
    );
  };

  const handlePreview = () => {
    if (!token.trim()) { setErroGlobal("Informe o token da API do Zandu"); return; }
    if (tiposSelecionados.length === 0) { setErroGlobal("Selecione ao menos um tipo de dado para importar"); return; }
    setErroGlobal(null);
    previewMutation.mutate({ token: token.trim(), tipos: tiposSelecionados });
  };

  const handleImportar = () => {
    setEtapa("importando");
    importarMutation.mutate({
      token: token.trim(),
      tipos: tiposSelecionados,
      ignorarDuplicados,
    });
  };

  const totalImportados = resultadoLog.reduce((s, l) => s + l.importados, 0);
  const totalDuplicados = resultadoLog.reduce((s, l) => s + l.duplicados, 0);
  const totalErros = resultadoLog.reduce((s, l) => s + l.erros, 0);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Download className="w-4 h-4 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold">Importar do Zandu</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Migre seus dados do Zandu para o Agendei em poucos cliques usando a API oficial.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {(["token", "preview", "importando", "resultado"] as Etapa[]).map((e, i) => {
          const labels = ["Token", "Preview", "Importando", "Resultado"];
          const isActive = etapa === e;
          const isDone = ["token", "preview", "importando", "resultado"].indexOf(etapa) > i;
          return (
            <div key={e} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={isActive ? "text-foreground font-medium" : ""}>{labels[i]}</span>
              {i < 3 && <ArrowRight className="w-3 h-3" />}
            </div>
          );
        })}
      </div>

      {erroGlobal && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{erroGlobal}</AlertDescription>
        </Alert>
      )}

      {/* Etapa 1: Token */}
      {etapa === "token" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configurar acesso à API do Zandu</CardTitle>
            <CardDescription>
              Para gerar um token, acesse o Zandu em{" "}
              <a href="https://pro.zandu.com.br" target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline">
                pro.zandu.com.br <ExternalLink className="w-3 h-3" />
              </a>{" "}
              → Conta → Dispositivos e API → Novo Token.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="token">Token de API</Label>
              <Input
                id="token"
                type="password"
                placeholder="Cole aqui o token gerado no Zandu..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-3">
              <Label>O que deseja importar?</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(TIPOS_CONFIG) as TipoImportacao[]).map((tipo) => {
                  const cfg = TIPOS_CONFIG[tipo];
                  const Icon = cfg.icon;
                  const selected = tiposSelecionados.includes(tipo);
                  return (
                    <button
                      key={tipo}
                      onClick={() => toggleTipo(tipo)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-sm font-medium ${selected ? "text-primary" : ""}`}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{cfg.descricao}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="ignorar"
                checked={ignorarDuplicados}
                onCheckedChange={(v) => setIgnorarDuplicados(!!v)}
              />
              <Label htmlFor="ignorar" className="text-sm cursor-pointer">
                Ignorar registros duplicados (recomendado)
              </Label>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                A importação não sobrescreve dados existentes. Registros com mesmo telefone ou e-mail serão marcados como duplicados se a opção acima estiver ativa.
                {tiposSelecionados.includes("agendamentos") && (
                  <span className="block mt-1 text-yellow-600 dark:text-yellow-400">
                     Para importar agendamentos, importe clientes, serviços e profissionais primeiro (ou selecione-os juntos acima).
                  </span>
                )}
              </AlertDescription>
            </Alert>

            <Button
              onClick={handlePreview}
              disabled={previewMutation.isPending || !token.trim() || tiposSelecionados.length === 0}
              className="w-full"
            >
              {previewMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Conectando ao Zandu...</>
              ) : (
                <><Eye className="w-4 h-4 mr-2" /> Visualizar dados disponíveis</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Etapa 2: Preview */}
      {etapa === "preview" && previewData && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados encontrados no Zandu</CardTitle>
              <CardDescription>Confirme os dados antes de importar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tiposSelecionados.map((tipo) => {
                const info = previewData[tipo];
                const cfg = TIPOS_CONFIG[tipo];
                const Icon = cfg.icon;
                const hasError = info?.total === -1;
                return (
                  <div key={tipo} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{cfg.label}</span>
                      </div>
                      {hasError ? (
                        <Badge variant="destructive">Erro ao buscar</Badge>
                      ) : (
                        <Badge variant="secondary">{info?.total ?? 0} registros</Badge>
                      )}
                    </div>
                    {!hasError && info?.amostra && info.amostra.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Amostra (5 primeiros):</p>
                        <div className="bg-muted/50 rounded p-2 space-y-1">
                          {info.amostra.map((item, i) => (
                            <div key={i} className="text-xs text-muted-foreground font-mono">
                              {Object.entries(item as Record<string, unknown>)
                                .filter(([, v]) => v != null && v !== "")
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" · ")}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {hasError && (
                      <p className="text-xs text-destructive">{String((info?.amostra?.[0] as Record<string, unknown>)?.erro ?? "Erro desconhecido")}</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setEtapa("token")} className="flex-1">
              Voltar
            </Button>
            <Button onClick={handleImportar} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Confirmar e importar
            </Button>
          </div>
        </div>
      )}

      {/* Etapa 3: Importando */}
      {etapa === "importando" && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Importando dados do Zandu...</p>
              <p className="text-sm text-muted-foreground mt-1">Isso pode levar alguns segundos dependendo da quantidade de registros.</p>
            </div>
            <Progress value={undefined} className="w-48 animate-pulse" />
          </CardContent>
        </Card>
      )}

      {/* Etapa 4: Resultado */}
      {etapa === "resultado" && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
              <CardContent className="pt-4 pb-4 text-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{totalImportados}</p>
                <p className="text-xs text-green-600 dark:text-green-500">Importados</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900">
              <CardContent className="pt-4 pb-4 text-center">
                <AlertCircle className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{totalDuplicados}</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500">Duplicados</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
              <CardContent className="pt-4 pb-4 text-center">
                <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{totalErros}</p>
                <p className="text-xs text-red-600 dark:text-red-500">Erros</p>
              </CardContent>
            </Card>
          </div>

          {/* Log detalhado */}
          {resultadoLog.map((entry) => (
            <Card key={entry.tipo}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm capitalize">{TIPOS_CONFIG[entry.tipo as TipoImportacao]?.label ?? entry.tipo}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">{entry.total} total</Badge>
                    <Badge className="bg-green-500 text-xs">{entry.importados} ok</Badge>
                    {entry.duplicados > 0 && <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-600">{entry.duplicados} dup.</Badge>}
                    {entry.erros > 0 && <Badge variant="destructive" className="text-xs">{entry.erros} erros</Badge>}
                  </div>
                </div>
              </CardHeader>
              {entry.detalhes.length > 0 && (
                <CardContent className="pt-0">
                  <Separator className="mb-3" />
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {entry.detalhes.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {d.status === "importado" && <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />}
                        {d.status === "duplicado" && <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                        {d.status === "erro" && <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                        <span className="truncate">{d.nome}</span>
                        {d.mensagem && <span className="text-muted-foreground truncate">— {d.mensagem}</span>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          <Button
            variant="outline"
            onClick={() => { setEtapa("token"); setPreviewData(null); setResultadoLog([]); setToken(""); }}
            className="w-full"
          >
            Fazer nova importação
          </Button>
        </div>
      )}
    </div>
  );
}
