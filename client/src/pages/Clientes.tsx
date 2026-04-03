import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { usePermissoes } from "@/hooks/usePermissoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, Users, Phone, Calendar, Star } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function Clientes() {
  const { pode } = usePermissoes();
  const utils = trpc.useUtils();
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", whatsapp: "", email: "", cpf: "", dataNascimento: "", observacoes: "" });

  const { data: clientes } = trpc.clientes.list.useQuery();

  const criarMutation = trpc.clientes.create.useMutation({
    onSuccess: () => {
      toast.success("Cliente cadastrado!");
      utils.clientes.list.invalidate();
      setModalOpen(false);
      setForm({ nome: "", telefone: "", whatsapp: "", email: "", cpf: "", dataNascimento: "", observacoes: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtrados = useMemo(() => {
    return (clientes ?? []).filter(c =>
      !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.telefone ?? "").includes(busca) || (c.email ?? "").toLowerCase().includes(busca.toLowerCase())
    );
  }, [clientes, busca]);

  // Guarda de permissão: apenas quem tem clientesVer pode acessar Clientes
  if (!pode("clientesVer")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <Users className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Você não tem permissão para acessar os Clientes.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-7xl mx-auto animate-in-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Clientes</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{clientes?.length ?? 0} cadastrados</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary py-2 px-3 text-xs">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Novo Cliente</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, telefone ou email..." className="pl-9 h-10" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      <div className="card-elegant overflow-hidden">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "oklch(55% 0.22 264 / 8%)" }}>
                <Users className="w-5 h-5" style={{ color: "oklch(55% 0.22 264)" }} />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Nenhum cliente encontrado</p>
              <p className="text-xs text-muted-foreground mb-4">Cadastre o primeiro cliente para começar</p>
              <button className="btn-primary text-xs py-1.5" onClick={() => setModalOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Cadastrar cliente
              </button>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "oklch(94% 0.008 250)" }}>
              {filtrados.map(c => (
                <Link key={c.id} href={`/admin/clientes/${c.id}`}>
                  <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                      style={{ background: "oklch(55% 0.22 264)" }}>
                      {c.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {c.telefone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <Phone className="w-3 h-3 flex-shrink-0" />{c.telefone}
                          </span>
                        )}
                        {c.dataNascimento && (
                          <span className="hidden sm:flex text-xs text-muted-foreground items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {c.dataNascimento.split("-").reverse().join("/")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: "oklch(35% 0.14 155)" }}>{formatCurrency(parseFloat(String(c.totalGasto ?? 0)))}</p>
                      <p className="text-xs text-muted-foreground">{c.totalAtendimentos ?? 0} atend.</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight">Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Nome completo *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome da cliente" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Telefone</Label>
              <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">WhatsApp</Label>
              <Input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Data de nascimento</Label>
              <Input type="date" value={form.dataNascimento} onChange={e => setForm(f => ({ ...f, dataNascimento: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Observações</Label>
              <Input value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Alergias, preferências..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => criarMutation.mutate(form as any)} disabled={!form.nome || criarMutation.isPending}>
              {criarMutation.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
