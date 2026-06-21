import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissoes } from "@/hooks/usePermissoes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Play,
  Users,
  Sparkles,
  ShieldOff,
  AlertTriangle,
  Loader2,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export default function DbConsole() {
  const { isOwner, hasFullAccess, isLoading: permLoading } = usePermissoes();
  const [sql, setSql] = useState<string>("SELECT id, name, email, role, createdAt FROM users ORDER BY id ASC LIMIT 100;");
  const [confirmarDestrutivo, setConfirmarDestrutivo] = useState(false);
  const [resultado, setResultado] = useState<{
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
    affectedRows?: number;
    executionMs: number;
  } | null>(null);

  const executar = trpc.dbConsole.executar.useMutation({
    onSuccess: (data) => {
      setResultado(data);
      toast.success(
        data.affectedRows !== undefined
          ? `Comando executado. Linhas afetadas: ${data.affectedRows}`
          : `Consulta retornou ${data.rowCount} linha(s) em ${data.executionMs}ms`
      );
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const migrar = trpc.dbConsole.migrarCalendarioEditorial.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setResultado({
        columns: ["coluna", "status"],
        rows: [
          ...data.aplicadas.map((c) => ({ coluna: c, status: "CRIADA" })),
          ...data.jaExistiam.map((c) => ({ coluna: c, status: "já existia" })),
        ],
        rowCount: data.aplicadas.length + data.jaExistiam.length,
        executionMs: 0,
      });
    },
    onError: (err) => toast.error(err.message),
  });

  // ─── Proteção de acesso (frontend) ─────────────────────────────────────────
  if (permLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOwner && !hasFullAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <ShieldOff className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso restrito</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          O Console do Banco de Dados é exclusivo para o administrador do sistema.
        </p>
      </div>
    );
  }

  const isDestructive = /\b(drop\s+table|drop\s+database|truncate|delete\s+from)\b/i.test(sql);

  function rodarSql() {
    if (!sql.trim()) {
      toast.error("Digite um comando SQL.");
      return;
    }
    executar.mutate({ sql, confirmarDestrutivo });
  }

  return (
    <div className="space-y-6 p-1">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Database className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Console do Banco de Dados</h1>
          <p className="text-sm text-muted-foreground">
            Execute consultas e migrations diretamente no banco de produção. Uso exclusivo do administrador.
          </p>
        </div>
      </div>

      {/* Atalhos rápidos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atalhos rápidos</CardTitle>
          <CardDescription>Operações comuns com um clique.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setSql("SELECT id, name, email, role, createdAt FROM users ORDER BY id ASC LIMIT 100;");
              setConfirmarDestrutivo(false);
              executar.mutate({
                sql: "SELECT id, name, email, role, createdAt FROM users ORDER BY id ASC LIMIT 100;",
                confirmarDestrutivo: false,
              });
            }}
            disabled={executar.isPending}
          >
            <Users className="w-4 h-4 mr-2" />
            Listar usuários
          </Button>
          <Button
            variant="outline"
            onClick={() => migrar.mutate()}
            disabled={migrar.isPending}
          >
            {migrar.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Rodar migration do Calendário Editorial
          </Button>
        </CardContent>
      </Card>

      {/* Editor SQL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Editor SQL</CardTitle>
          <CardDescription>
            Suporta SELECT, INSERT, UPDATE, ALTER e outros comandos. Resultados limitados a 500 linhas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            rows={8}
            className="font-mono text-sm"
            placeholder="Digite seu SQL aqui…"
          />

          {isDestructive && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/40 bg-destructive/5">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  Comando destrutivo detectado (DROP / TRUNCATE / DELETE).
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={confirmarDestrutivo}
                    onChange={(e) => setConfirmarDestrutivo(e.target.checked)}
                    className="rounded"
                  />
                  Confirmo que desejo executar este comando destrutivo.
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={rodarSql} disabled={executar.isPending}>
              {executar.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Executar
            </Button>
            {resultado && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {resultado.executionMs}ms
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {resultado && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Resultado
            </CardTitle>
            <CardDescription>
              {resultado.affectedRows !== undefined ? (
                <Badge variant="secondary">Linhas afetadas: {resultado.affectedRows}</Badge>
              ) : (
                <Badge variant="secondary">{resultado.rowCount} linha(s)</Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resultado.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma linha retornada (comando executado com sucesso).
              </p>
            ) : (
              <div className="overflow-auto max-h-[500px] border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {resultado.columns.map((col) => (
                        <th key={col} className="text-left px-3 py-2 font-semibold whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.rows.map((row, i) => (
                      <tr key={i} className="border-t hover:bg-muted/40">
                        {resultado.columns.map((col) => (
                          <td key={col} className="px-3 py-2 whitespace-nowrap">
                            {formatCell(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
