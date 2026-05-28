import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePermissoes } from "@/hooks/usePermissoes";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle,
  ArrowRight, ArrowLeft, Loader2, Download, RotateCcw, Sparkles,
  Users, Scissors, UserCog, Calendar,
} from "lucide-react";

type Step = "upload" | "configurar" | "revisar" | "importar";
const STEPS: Step[] = ["upload", "configurar", "revisar", "importar"];
const STEP_LABELS = ["Upload", "Configurar", "Revisar", "Importar"];

const ENTITY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  clientes: { label: "Clientes", icon: Users, color: "oklch(78.5% 0.075 85)" },
  servicos: { label: "Serviços", icon: Scissors, color: "oklch(50% 0.16 155)" },
  profissionais: { label: "Profissionais", icon: UserCog, color: "oklch(60% 0.20 30)" },
  agendamentos: { label: "Agendamentos", icon: Calendar, color: "oklch(55% 0.18 270)" },
};

const ENTITY_FIELDS: Record<string, { field: string; label: string }[]> = {
  clientes: [
    { field: "nome", label: "Nome" }, { field: "telefone", label: "Telefone" }, { field: "email", label: "Email" },
    { field: "cpf", label: "CPF" }, { field: "dataNascimento", label: "Data Nasc." }, { field: "endereco", label: "Endereço" },
    { field: "observacoes", label: "Observações" },
  ],
  servicos: [
    { field: "nome", label: "Nome" }, { field: "valor", label: "Valor" },
    { field: "duracaoMinutos", label: "Duração (min)" }, { field: "categoria", label: "Categoria" },
  ],
  profissionais: [
    { field: "nome", label: "Nome" }, { field: "email", label: "Email" },
    { field: "telefone", label: "Telefone" }, { field: "especialidade", label: "Especialidade" },
  ],
  agendamentos: [
    { field: "clienteNome", label: "Cliente" }, { field: "servicoNome", label: "Serviço" },
    { field: "profissionalNome", label: "Profissional" }, { field: "data", label: "Data" },
    { field: "horaInicio", label: "Horário" }, { field: "status", label: "Status" },
  ],
};

export default function ImportacaoInteligente() {
  const { isAdmin } = usePermissoes();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<any>(null);
  const [entityType, setEntityType] = useState("");
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [duplicateAction, setDuplicateAction] = useState<"skip" | "update" | "create">("skip");
  const [validatedRows, setValidatedRows] = useState<any[]>([]);
  const [counts, setCounts] = useState({ ok: 0, warning: 0, error: 0 });
  const [filter, setFilter] = useState<"all" | "ok" | "warning" | "error">("all");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);

  const parseMutation = trpc.importacao.parseFile.useMutation();
  const validateMutation = trpc.importacao.validate.useMutation();
  const executeMutation = trpc.importacao.execute.useMutation();

  async function handleUpload() {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    const fileType = ext === "csv" ? "csv" : ext === "pdf" ? "pdf" : "xlsx";
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const res = await parseMutation.mutateAsync({ fileBase64: base64, fileName: file.name, fileType });
        setParseResult(res);
        setEntityType(res.detectedType);
        setMapping(res.suggestedMapping);
        setStep("configurar");
      } catch (err: any) {
        toast.error(err.message || "Erro ao processar arquivo");
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleValidate() {
    if (!parseResult) return;
    try {
      const res = await validateMutation.mutateAsync({
        rows: parseResult.rows,
        mapping,
        entityType: entityType as any,
        duplicateAction,
      });
      setValidatedRows(res.rows);
      setCounts(res.counts);
      setStep("revisar");
    } catch (err: any) {
      toast.error(err.message || "Erro na validação");
    }
  }

  async function handleExecute() {
    setImporting(true);
    setProgress(0);
    const importable = validatedRows.filter(r => r.status === "ok" || r.status === "warning");
    const CHUNK = 100;
    let totalSuccess = 0;
    let allErrors: any[] = [];

    for (let i = 0; i < importable.length; i += CHUNK) {
      const chunk = importable.slice(i, i + CHUNK);
      try {
        const res = await executeMutation.mutateAsync({
          rows: chunk.map(r => ({ mapped: r.mapped, status: r.status })),
          entityType: entityType as any,
          duplicateAction,
        });
        totalSuccess += res.success;
        allErrors = [...allErrors, ...res.errors];
      } catch (err: any) {
        allErrors.push({ row: i, message: err.message });
      }
      setProgress(Math.min(100, Math.round(((i + chunk.length) / importable.length) * 100)));
    }

    setResult({ total: importable.length, success: totalSuccess, errors: allErrors, errorCount: allErrors.length });
    setImporting(false);
    setStep("importar");
  }

  function downloadErrorLog() {
    if (!result?.errors?.length) return;
    const csv = "Linha,Erro\n" + result.errors.map((e: any) => `${e.row},"${e.message}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "erros-importacao.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setStep("upload"); setFile(null); setParseResult(null); setEntityType("");
    setMapping({}); setValidatedRows([]); setCounts({ ok: 0, warning: 0, error: 0 });
    setResult(null); setProgress(0);
  }

  const filteredRows = useMemo(() => {
    if (filter === "all") return validatedRows;
    return validatedRows.filter(r => r.status === filter);
  }, [validatedRows, filter]);

  const stepIdx = STEPS.indexOf(step);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <Upload className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Apenas administradores podem importar dados.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto animate-in-up space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Importação Inteligente</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Importe dados de Excel, CSV ou PDF com detecção automática</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < stepIdx ? "bg-green-500 text-white" : i === stepIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {i < stepIdx ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === stepIdx ? "text-foreground" : "text-muted-foreground"}`}>
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 rounded-full ${i < stepIdx ? "bg-green-500" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="card-elegant p-8 text-center space-y-4">
          <div
            className="border-2 border-dashed rounded-2xl p-10 transition-colors cursor-pointer hover:border-primary/50 hover:bg-primary/5"
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/5"); }}
            onDragLeave={e => { e.currentTarget.classList.remove("border-primary", "bg-primary/5"); }}
            onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove("border-primary", "bg-primary/5"); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input id="file-input" type="file" accept=".xlsx,.xls,.csv,.pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
            <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            {file ? (
              <div>
                <p className="text-sm font-semibold text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-foreground">Arraste um arquivo ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-1">Excel (.xlsx), CSV (.csv) ou PDF (.pdf) — máx 10MB</p>
              </div>
            )}
          </div>
          <Button onClick={handleUpload} disabled={!file || parseMutation.isPending} className="gap-2">
            {parseMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><Sparkles className="w-4 h-4" /> Analisar arquivo</>}
          </Button>
        </div>
      )}

      {/* Step: Configurar */}
      {step === "configurar" && parseResult && (
        <div className="space-y-4">
          <div className="card-elegant p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Tipo de dados detectado</p>
                <p className="text-xs text-muted-foreground">{parseResult.totalRows} linhas encontradas · Confiança: {parseResult.confidence}%</p>
              </div>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ENTITY_LABELS).map(([k, v]) => {
                    const Icon = v.icon;
                    return <SelectItem key={k} value={k}><div className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" />{v.label}</div></SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Mapeamento de colunas</p>
              <div className="space-y-2">
                {parseResult.columns.map((col: string) => (
                  <div key={col} className="flex items-center gap-3">
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded min-w-[120px] truncate">{col}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <Select value={mapping[col] ?? "__ignore__"} onValueChange={v => setMapping(m => ({ ...m, [col]: v === "__ignore__" ? null : v }))}>
                      <SelectTrigger className="flex-1 text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ignore__">— Ignorar —</SelectItem>
                        {(ENTITY_FIELDS[entityType] ?? []).map(f => (
                          <SelectItem key={f.field} value={f.field}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-1">Duplicatas</p>
              <Select value={duplicateAction} onValueChange={v => setDuplicateAction(v as any)}>
                <SelectTrigger className="w-48 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Pular duplicatas</SelectItem>
                  <SelectItem value="create">Criar mesmo assim</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("upload")} className="gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Voltar</Button>
            <Button onClick={handleValidate} disabled={validateMutation.isPending} className="gap-1">
              {validateMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Validando...</> : <>Validar e revisar <ArrowRight className="w-3.5 h-3.5" /></>}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Revisar */}
      {step === "revisar" && (
        <div className="space-y-4">
          {/* Counters */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Válidos", count: counts.ok, icon: CheckCircle2, color: "oklch(50% 0.16 155)", filter: "ok" as const },
              { label: "Avisos", count: counts.warning, icon: AlertTriangle, color: "oklch(60% 0.20 75)", filter: "warning" as const },
              { label: "Erros", count: counts.error, icon: XCircle, color: "oklch(50% 0.22 25)", filter: "error" as const },
            ].map(c => {
              const Icon = c.icon;
              return (
                <button key={c.label} onClick={() => setFilter(f => f === c.filter ? "all" : c.filter)}
                  className={`card-elegant p-3 flex items-center gap-2 transition-all ${filter === c.filter ? "ring-2 ring-primary" : ""}`}>
                  <Icon className="w-4 h-4" style={{ color: c.color }} />
                  <div className="text-left">
                    <p className="text-lg font-bold">{c.count}</p>
                    <p className="text-[10px] text-muted-foreground">{c.label}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview table */}
          <div className="card-elegant overflow-hidden">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Status</th>
                    {(ENTITY_FIELDS[entityType] ?? []).map(f => (
                      <th key={f.field} className="px-3 py-2 text-left font-semibold text-muted-foreground">{f.label}</th>
                    ))}
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Mensagens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRows.map((row, i) => (
                    <tr key={i} className={row.status === "error" ? "bg-red-50/50" : row.status === "warning" ? "bg-amber-50/50" : ""}>
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2">
                        {row.status === "ok" && <Badge className="bg-green-100 text-green-700 text-[10px]">OK</Badge>}
                        {row.status === "warning" && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Aviso</Badge>}
                        {row.status === "error" && <Badge className="bg-red-100 text-red-700 text-[10px]">Erro</Badge>}
                      </td>
                      {(ENTITY_FIELDS[entityType] ?? []).map(f => (
                        <td key={f.field} className="px-3 py-2 max-w-[150px] truncate">{row.mapped[f.field] ?? "—"}</td>
                      ))}
                      <td className="px-3 py-2 max-w-[200px]">
                        {[...row.errors, ...row.warnings].map((m: string, j: number) => (
                          <p key={j} className={`text-[10px] ${row.errors.includes(m) ? "text-red-500" : "text-amber-500"}`}>{m}</p>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("configurar")} className="gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Voltar</Button>
            <Button onClick={handleExecute} disabled={counts.ok + counts.warning === 0 || importing} className="gap-1">
              {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</> : <>Importar {counts.ok + counts.warning} registros <ArrowRight className="w-3.5 h-3.5" /></>}
            </Button>
          </div>
          {importing && <Progress value={progress} className="h-2" />}
        </div>
      )}

      {/* Step: Resultado */}
      {step === "importar" && result && (
        <div className="card-elegant p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: result.errorCount === 0 ? "oklch(50% 0.16 155 / 12%)" : "oklch(60% 0.20 75 / 12%)" }}>
            {result.errorCount === 0
              ? <CheckCircle2 className="w-8 h-8" style={{ color: "oklch(50% 0.16 155)" }} />
              : <AlertTriangle className="w-8 h-8" style={{ color: "oklch(60% 0.20 75)" }} />}
          </div>
          <div>
            <h2 className="text-xl font-bold">Importação concluída</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {result.success} de {result.total} registros importados com sucesso
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{result.total}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "oklch(50% 0.16 155)" }}>{result.success}</p>
              <p className="text-[10px] text-muted-foreground">Sucesso</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "oklch(50% 0.22 25)" }}>{result.errorCount}</p>
              <p className="text-[10px] text-muted-foreground">Erros</p>
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            {result.errorCount > 0 && (
              <Button variant="outline" onClick={downloadErrorLog} className="gap-1 text-xs">
                <Download className="w-3.5 h-3.5" /> Baixar log de erros
              </Button>
            )}
            <Button onClick={reset} className="gap-1 text-xs">
              <RotateCcw className="w-3.5 h-3.5" /> Nova importação
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
