import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, RefreshCw, ChevronDown, ChevronRight, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApiLogsStore, ApiLog } from '@/store/apiLogsStore';

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const LogEntry = ({ log }: { log: ApiLog }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      className={`border rounded-lg mb-2 overflow-hidden transition-all ${
        log.success ? 'border-border' : 'border-destructive/50 bg-destructive/5'
      }`}
    >
      <div 
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        
        <Badge variant={log.success ? 'default' : 'destructive'} className="shrink-0">
          {log.success ? 'OK' : 'ERRO'}
        </Badge>
        
        <Badge variant="outline" className="shrink-0 font-mono">
          {log.action}
        </Badge>
        
        <span className="text-xs text-muted-foreground shrink-0">
          {log.durationMs}ms
        </span>
        
        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {formatTime(log.timestamp)}
        </span>
      </div>
      
      {expanded && (
        <div className="px-3 pb-3 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Status:</span>{' '}
              <span className="font-mono">{log.responseStatus || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Data:</span>{' '}
              <span>{formatDate(log.timestamp)}</span>
            </div>
          </div>
          
          <div>
            <div className="text-xs text-muted-foreground mb-1">URL:</div>
            <code className="text-xs bg-muted p-1 rounded block break-all">
              {log.url}
            </code>
          </div>
          
          <div>
            <div className="text-xs text-muted-foreground mb-1">Request Payload:</div>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40">
              {JSON.stringify(log.requestPayload, null, 2)}
            </pre>
          </div>
          
          {log.responseData && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Response:</div>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40">
                {JSON.stringify(log.responseData, null, 2)}
              </pre>
            </div>
          )}
          
          {log.error && (
            <div>
              <div className="text-xs text-destructive mb-1">Erro:</div>
              <pre className="text-xs bg-destructive/10 text-destructive p-2 rounded">
                {log.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function ApiLogsPage() {
  const navigate = useNavigate();
  const { logs, clearLogs } = useApiLogsStore();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Get unique actions for filter
  const uniqueActions = [...new Set(logs.map(l => l.action))];

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = search === '' || 
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(log.requestPayload).toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(log.responseData).toLowerCase().includes(search.toLowerCase());
    
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'success' && log.success) ||
      (filterStatus === 'error' && !log.success);
    
    return matchesSearch && matchesAction && matchesStatus;
  });

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.success).length,
    errors: logs.filter(l => !l.success).length,
    avgDuration: logs.length > 0 
      ? Math.round(logs.reduce((acc, l) => acc + l.durationMs, 0) / logs.length)
      : 0,
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Logs da API</h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Atualizar
            </Button>
            <Button variant="destructive" size="sm" onClick={clearLogs}>
              <Trash2 className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.success}</div>
              <div className="text-xs text-muted-foreground">Sucesso</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-destructive">{stats.errors}</div>
              <div className="text-xs text-muted-foreground">Erros</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{stats.avgDuration}ms</div>
              <div className="text-xs text-muted-foreground">Média</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar nos logs..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas ações</SelectItem>
              {uniqueActions.map(action => (
                <SelectItem key={action} value={action}>{action}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs List */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">
              {filteredLogs.length} logs {filteredLogs.length !== logs.length && `(de ${logs.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[60vh]">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhum log encontrado</p>
                  <p className="text-xs mt-1">Os logs aparecerão aqui quando você usar o app</p>
                </div>
              ) : (
                filteredLogs.map(log => (
                  <LogEntry key={log.id} log={log} />
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
