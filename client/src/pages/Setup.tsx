import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Setup() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", cidade: "", estado: "" });

  const criarMutation = trpc.empresa.create.useMutation({
    onSuccess: () => { toast.success("Empresa configurada!"); navigate("/admin"); },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-foreground rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-background font-bold text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>A</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Bem-vindo ao Agendei</h1>
          <p className="text-muted-foreground mt-2 text-sm">Configure seu estabelecimento para começar</p>
        </div>

        <Card className="border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><Building2 className="w-4 h-4" />Dados do Estabelecimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Nome do estabelecimento *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Studio Beleza" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Telefone</Label>
                <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contato@studio.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Cidade</Label>
                <Input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Estado</Label>
                <Input value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} placeholder="SP" />
              </div>
            </div>
            <Button className="w-full gap-2 mt-2" onClick={() => criarMutation.mutate(form as any)} disabled={!form.nome || criarMutation.isPending}>
              {criarMutation.isPending ? "Configurando..." : (<><ArrowRight className="w-4 h-4" />Começar</>)}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
