import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Building2, Save } from "lucide-react";
import { toast } from "sonner";

export default function Configuracoes() {
  const utils = trpc.useUtils();
  const { data: empresa } = trpc.empresa.get.useQuery();
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", endereco: "", whatsappNumero: "", reservaPercentual: "30", reservaHorasExpiracao: "24" });

  useEffect(() => {
    if (empresa) {
      setForm({
        nome: empresa.nome ?? "",
        telefone: empresa.telefone ?? "",
        email: empresa.email ?? "",
        endereco: empresa.endereco ?? "",
        whatsappNumero: empresa.whatsappNumero ?? "",
        reservaPercentual: String(empresa.reservaPercentual ?? 30),
        reservaHorasExpiracao: String(empresa.reservaHorasExpiracao ?? 24),
      });
    }
  }, [empresa]);

  const updateMutation = trpc.empresa.update.useMutation({
    onSuccess: () => { toast.success("Configurações salvas!"); utils.empresa.get.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Configurações</h1>

      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2"><Building2 className="w-4 h-4" />Dados da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label className="text-xs text-muted-foreground mb-1.5 block">Nome do estabelecimento</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Telefone</Label><Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">WhatsApp</Label><Input value={form.whatsappNumero} onChange={e => setForm(f => ({ ...f, whatsappNumero: e.target.value }))} placeholder="5511999999999" /></div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground mb-1.5 block">Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground mb-1.5 block">Endereço</Label><Input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2"><Settings className="w-4 h-4" />Regras de Agendamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">% de reserva antecipada</Label>
              <Input type="number" min="0" max="100" value={form.reservaPercentual} onChange={e => setForm(f => ({ ...f, reservaPercentual: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">% do valor total cobrado como reserva</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Expiração do pré-agendamento (h)</Label>
              <Input type="number" min="1" max="72" value={form.reservaHorasExpiracao} onChange={e => setForm(f => ({ ...f, reservaHorasExpiracao: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Horas até cancelar automaticamente</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => updateMutation.mutate({
          ...form,
          reservaPercentual: parseFloat(form.reservaPercentual) || 30,
          reservaHorasExpiracao: parseInt(form.reservaHorasExpiracao) || 24,
        } as any)} disabled={updateMutation.isPending} className="gap-2">
        <Save className="w-4 h-4" />
        {updateMutation.isPending ? "Salvando..." : "Salvar configurações"}
      </Button>
    </div>
  );
}
