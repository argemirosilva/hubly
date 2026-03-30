import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
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

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{clientes?.length ?? 0} clientes cadastrados</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, telefone ou email..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      <Card className="border-border shadow-none">
        <CardContent className="p-0">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum cliente encontrado</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setModalOpen(true)}>
                Cadastrar cliente
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtrados.map(c => (
                <Link key={c.id} href={`/admin/clientes/${c.id}`}>
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-semibold">
                        {c.nome.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{c.nome}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {c.telefone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />{c.telefone}
                          </span>
                        )}
                        {c.dataNascimento && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {c.dataNascimento.split("-").reverse().join("/")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(parseFloat(String(c.totalGasto ?? 0)))}</p>
                      <p className="text-xs text-muted-foreground">{c.totalAtendimentos ?? 0} atend.</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
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
            <div className="col-span-2">
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
