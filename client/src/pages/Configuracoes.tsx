import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Building2, Save, Globe, Clock, Palette, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const DIAS_SEMANA = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export default function Configuracoes() {
  const utils = trpc.useUtils();
  const { data: empresa } = trpc.empresa.get.useQuery();
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    nome: "", telefone: "", email: "", endereco: "",
    whatsappNumero: "", reservaPercentual: "30", reservaHorasExpiracao: "24",
    corPrimaria: "#4f46e5", corSecundaria: "#e0e7ff", logoUrl: "",
    // Portal
    portalAtivo: false,
    autoConfirmarPortal: false,
    portalHeaderUrl: "",
    portalMensagemBemVindo: "",
    horaAbertura: "08:00",
    horaFechamento: "18:00",
    diasFuncionamento: [1, 2, 3, 4, 5] as number[],
    intervaloMinutos: "30",
  });

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
        corPrimaria: empresa.corPrimaria ?? "#4f46e5",
        corSecundaria: empresa.corSecundaria ?? "#e0e7ff",
        logoUrl: empresa.logoUrl ?? "",
        portalAtivo: empresa.portalAtivo ?? false,
        autoConfirmarPortal: empresa.autoConfirmarPortal ?? false,
        portalHeaderUrl: (empresa as any).portalHeaderUrl ?? "",
        portalMensagemBemVindo: (empresa as any).portalMensagemBemVindo ?? "",
        horaAbertura: (empresa as any).horaAbertura ?? "08:00",
        horaFechamento: (empresa as any).horaFechamento ?? "18:00",
        diasFuncionamento: (empresa as any).diasFuncionamento ?? [1, 2, 3, 4, 5],
        intervaloMinutos: String((empresa as any).intervaloMinutos ?? 30),
      });
    }
  }, [empresa]);

  const updateMutation = trpc.empresa.update.useMutation({
    onSuccess: () => { toast.success("Configurações salvas!"); utils.empresa.get.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  function handleSave() {
    updateMutation.mutate({
      nome: form.nome,
      telefone: form.telefone,
      email: form.email,
      endereco: form.endereco,
      whatsappNumero: form.whatsappNumero,
      reservaPercentual: form.reservaPercentual,
      reservaHorasExpiracao: parseInt(form.reservaHorasExpiracao) || 24,
      corPrimaria: form.corPrimaria,
      corSecundaria: form.corSecundaria,
      logoUrl: form.logoUrl || undefined,
      portalAtivo: form.portalAtivo,
      autoConfirmarPortal: form.autoConfirmarPortal,
      portalHeaderUrl: form.portalHeaderUrl || undefined,
      portalMensagemBemVindo: form.portalMensagemBemVindo || undefined,
      horaAbertura: form.horaAbertura,
      horaFechamento: form.horaFechamento,
      diasFuncionamento: form.diasFuncionamento,
      intervaloMinutos: parseInt(form.intervaloMinutos) || 30,
    });
  }

  function toggleDia(dia: number) {
    setForm(f => ({
      ...f,
      diasFuncionamento: f.diasFuncionamento.includes(dia)
        ? f.diasFuncionamento.filter(d => d !== dia)
        : [...f.diasFuncionamento, dia].sort(),
    }));
  }

  const portalUrl = `${window.location.origin}/agendar?e=${empresa?.id ?? 1}`;

  function copiarLink() {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copiado!");
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-3xl mx-auto animate-in-up">
      <h1 className="font-bold tracking-tight text-xl lg:text-2xl">Configurações</h1>

      {/* Dados da Empresa */}
      <div className="card-elegant">
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Dados da Empresa</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Nome do estabelecimento</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Telefone</Label>
              <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">WhatsApp</Label>
              <Input value={form.whatsappNumero} onChange={e => setForm(f => ({ ...f, whatsappNumero: e.target.value }))} placeholder="5511999999999" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Endereço</Label>
              <Input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      {/* Identidade Visual */}
      <div className="card-elegant">
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
          <Palette className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Identidade Visual</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Cor primária</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.corPrimaria}
                  onChange={e => setForm(f => ({ ...f, corPrimaria: e.target.value }))}
                  className="w-10 h-9 rounded-lg border border-border cursor-pointer p-0.5" />
                <Input value={form.corPrimaria} onChange={e => setForm(f => ({ ...f, corPrimaria: e.target.value }))}
                  className="font-mono text-sm" placeholder="#4f46e5" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Cor secundária</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.corSecundaria}
                  onChange={e => setForm(f => ({ ...f, corSecundaria: e.target.value }))}
                  className="w-10 h-9 rounded-lg border border-border cursor-pointer p-0.5" />
                <Input value={form.corSecundaria} onChange={e => setForm(f => ({ ...f, corSecundaria: e.target.value }))}
                  className="font-mono text-sm" placeholder="#e0e7ff" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">URL do Logo</Label>
              <Input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                placeholder="https://..." />
              <p className="text-xs text-muted-foreground mt-1">URL pública da imagem do logo (PNG ou SVG recomendado)</p>
            </div>
          </div>
          {/* Preview */}
          <div className="rounded-xl p-4 border" style={{ background: form.corPrimaria + "10", borderColor: form.corPrimaria + "30" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: form.corPrimaria }}>
              Preview das cores
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ background: form.corPrimaria }}>A</div>
              <div className="flex-1 h-3 rounded-full" style={{ background: form.corSecundaria }} />
              <div className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
                style={{ background: form.corPrimaria }}>Botão</div>
            </div>
          </div>
        </div>
      </div>

      {/* Portal de Agendamento Público */}
      <div className="card-elegant">
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
          <Globe className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Portal de Agendamento Público</h3>
        </div>
        <div className="p-5 space-y-5">

          {/* Ativar portal */}
          <div className="flex items-center justify-between p-4 rounded-xl border"
            style={{ background: form.portalAtivo ? "oklch(62% 0.18 155 / 6%)" : "oklch(96% 0.008 250)", borderColor: form.portalAtivo ? "oklch(62% 0.18 155 / 30%)" : "oklch(90% 0.012 250)" }}>
            <div>
              <p className="font-semibold text-sm">Ativar portal público</p>
              <p className="text-xs text-muted-foreground mt-0.5">Permite que clientes agendem online sem precisar ligar</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, portalAtivo: !f.portalAtivo }))}
              className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
              style={{ background: form.portalAtivo ? "oklch(62% 0.18 155)" : "oklch(80% 0.012 250)" }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: form.portalAtivo ? "22px" : "2px" }} />
            </button>
          </div>

          {/* Link do portal */}
          {form.portalAtivo && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: "oklch(96% 0.008 250)", border: "1px solid oklch(90% 0.012 250)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Link do portal</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg truncate">{portalUrl}</code>
                <button onClick={copiarLink}
                  className="p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
                <a href={portalUrl} target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
              </div>
            </div>
          )}

          {/* Confirmação automática */}
          <div className="flex items-center justify-between p-4 rounded-xl border"
            style={{ background: "oklch(96% 0.008 250)", borderColor: "oklch(90% 0.012 250)" }}>
            <div>
              <p className="font-semibold text-sm">Confirmação automática</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {form.autoConfirmarPortal
                  ? "Agendamentos do portal são confirmados automaticamente"
                  : "Agendamentos do portal ficam pendentes para sua aprovação"}
              </p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, autoConfirmarPortal: !f.autoConfirmarPortal }))}
              className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
              style={{ background: form.autoConfirmarPortal ? "oklch(55% 0.22 264)" : "oklch(80% 0.012 250)" }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: form.autoConfirmarPortal ? "22px" : "2px" }} />
            </button>
          </div>

          {/* Mensagem de boas-vindas */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Mensagem de boas-vindas (opcional)</Label>
            <textarea
              value={form.portalMensagemBemVindo}
              onChange={e => setForm(f => ({ ...f, portalMensagemBemVindo: e.target.value }))}
              placeholder="Ex: Bem-vindo ao nosso salão! Agende seu horário com facilidade."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm resize-none border outline-none transition-all bg-background text-foreground"
              style={{ borderColor: "oklch(90% 0.012 250)" }}
            />
          </div>

          {/* Header image */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">URL da imagem de capa (opcional)</Label>
            <Input value={form.portalHeaderUrl} onChange={e => setForm(f => ({ ...f, portalHeaderUrl: e.target.value }))}
              placeholder="https://..." />
            <p className="text-xs text-muted-foreground mt-1">Imagem exibida no topo do portal (1200x400px recomendado)</p>
          </div>
        </div>
      </div>

      {/* Horário de Funcionamento */}
      <div className="card-elegant">
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Horário de Funcionamento</h3>
        </div>
        <div className="p-5 space-y-4">
          {/* Dias da semana */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Dias de funcionamento</Label>
            <div className="flex gap-2 flex-wrap">
              {DIAS_SEMANA.map(dia => (
                <button key={dia.value}
                  onClick={() => toggleDia(dia.value)}
                  className="w-12 h-10 rounded-xl text-xs font-semibold border-2 transition-all"
                  style={{
                    borderColor: form.diasFuncionamento.includes(dia.value) ? "oklch(55% 0.22 264)" : "oklch(90% 0.012 250)",
                    background: form.diasFuncionamento.includes(dia.value) ? "oklch(55% 0.22 264 / 10%)" : "oklch(96% 0.008 250)",
                    color: form.diasFuncionamento.includes(dia.value) ? "oklch(45% 0.18 264)" : "oklch(52% 0.016 260)",
                  }}>
                  {dia.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Hora de abertura</Label>
              <Input type="time" value={form.horaAbertura} onChange={e => setForm(f => ({ ...f, horaAbertura: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Hora de fechamento</Label>
              <Input type="time" value={form.horaFechamento} onChange={e => setForm(f => ({ ...f, horaFechamento: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Intervalo entre slots (min)</Label>
              <Input type="number" min="15" max="120" step="15" value={form.intervaloMinutos}
                onChange={e => setForm(f => ({ ...f, intervaloMinutos: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      {/* Regras de Agendamento */}
      <div className="card-elegant">
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid oklch(90% 0.012 250)" }}>
          <Settings className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Regras de Agendamento</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">% de reserva antecipada</Label>
              <Input type="number" min="0" max="100" value={form.reservaPercentual}
                onChange={e => setForm(f => ({ ...f, reservaPercentual: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">% do valor total cobrado como reserva</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Expiração do pré-agendamento (h)</Label>
              <Input type="number" min="1" max="72" value={form.reservaHorasExpiracao}
                onChange={e => setForm(f => ({ ...f, reservaHorasExpiracao: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Horas até cancelar automaticamente</p>
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={updateMutation.isPending} className="btn-primary">
        <Save className="w-4 h-4" />
        {updateMutation.isPending ? "Salvando..." : "Salvar configurações"}
      </button>
    </div>
  );
}
