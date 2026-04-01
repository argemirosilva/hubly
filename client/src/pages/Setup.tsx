import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Building2, Phone, Mail, MapPin, ChevronRight, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Setup() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", cidade: "", estado: "" });

  const criar = trpc.empresa.create.useMutation({
    onSuccess: () => { toast.success("Empresa configurada!"); navigate("/admin"); },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) { toast.error("Nome da empresa é obrigatório."); return; }
    criar.mutate(form);
  };

  return (
    <div className="min-h-screen flex" style={{ background: "oklch(98% 0.004 250)" }}>
      {/* Painel esquerdo */}
      <div className="hidden lg:flex w-2/5 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "oklch(12% 0.020 260)" }}>
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-10"
          style={{ background: "oklch(55% 0.22 264)" }} />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-5"
          style={{ background: "oklch(60% 0.20 300)" }} />

        <div className="relative">
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Agendei</span>
          </div>
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase"
              style={{ color: "oklch(55% 0.22 264)" }}>
              Primeiros passos
            </p>
            <h2 className="font-bold leading-tight"
              style={{ fontSize: "2rem", color: "oklch(95% 0.008 250)", letterSpacing: "-0.03em" }}>
              Configure seu negócio em minutos
            </h2>
            <p className="text-sm leading-relaxed"
              style={{ color: "oklch(50% 0.012 260)" }}>
              Preencha as informações básicas do seu estabelecimento para começar a usar o Agendei.
            </p>
          </div>
        </div>

        <div className="relative space-y-3">
          {[
            "Agendamentos automáticos",
            "Confirmações via WhatsApp",
            "Controle financeiro completo",
            "Portal de agendamento para clientes",
          ].map(item => (
            <div key={item} className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(55% 0.22 264 / 20%)" }}>
                <CheckCircle2 className="w-3 h-3" style={{ color: "oklch(65% 0.18 264)" }} />
              </div>
              <span className="text-sm" style={{ color: "oklch(65% 0.012 260)" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Formulário */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Agendei</span>
          </div>

          <div className="mb-8">
            <h1 className="font-bold tracking-tight mb-1.5" style={{ fontSize: "1.6rem" }}>
              Configurar empresa
            </h1>
            <p className="text-sm text-muted-foreground">
              Preencha os dados do seu estabelecimento para começar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: "Nome do estabelecimento *", field: "nome" as const, icon: Building2, placeholder: "Ex: Studio da Ana, Clínica Bem Estar..." },
              { label: "Telefone / WhatsApp", field: "telefone" as const, icon: Phone, placeholder: "(11) 99999-9999" },
              { label: "E-mail", field: "email" as const, icon: Mail, placeholder: "contato@seuestablecimento.com" },
              { label: "Cidade", field: "cidade" as const, icon: MapPin, placeholder: "São Paulo" },
              { label: "Estado", field: "estado" as const, icon: MapPin, placeholder: "SP" },
            ].map(({ label, field, icon: Icon, placeholder }) => (
              <div key={field}>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  {label}
                </label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={form[field]}
                    onChange={update(field)}
                    placeholder={placeholder}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      border: "2px solid oklch(90% 0.012 250)",
                      background: "white",
                      outline: "none",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = "oklch(55% 0.22 264)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "oklch(90% 0.012 250)"; }}
                  />
                </div>
              </div>
            ))}

            <button type="submit" disabled={criar.isPending || !form.nome}
              className="btn-primary w-full justify-center py-3 mt-2">
              {criar.isPending ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Configurando...</>
              ) : (
                <>Começar a usar o Agendei <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
