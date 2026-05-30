import { getDb } from "./db";
import { clientes, profissionais, servicos, pacotesModelos, automacoes } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getPlanLimits, verificarAlerta, calcularPercentualUso } from "./plan-limits";

/**
 * Obtém o uso atual de recursos da empresa
 */
export async function getEmpresaUsage(empresaId: number) {
  const db = await getDb();
  if (!db) {
    return {
      clientes: 0,
      profissionais: 0,
      servicos: 0,
      pacotes: 0,
      automacoes: 0,
      usuarios: 0,
    };
  }

  const clientesResult = await db.select().from(clientes).where(eq(clientes.empresaId, empresaId));
  const profissionaisResult = await db.select().from(profissionais).where(eq(profissionais.empresaId, empresaId));
  const servicosResult = await db.select().from(servicos).where(eq(servicos.empresaId, empresaId));
  const pacotesResult = await db.select().from(pacotesModelos).where(eq(pacotesModelos.empresaId, empresaId));
  const automacoesResult = await db.select().from(automacoes).where(eq(automacoes.empresaId, empresaId));

  return {
    clientes: clientesResult.length,
    profissionais: profissionaisResult.length,
    servicos: servicosResult.length,
    pacotes: pacotesResult.length,
    automacoes: automacoesResult.length,
    usuarios: 1, // Simplificado - sempre 1 por enquanto
  };
}

/**
 * Verifica alertas de limite de plano para uma empresa
 */
export async function verificarAlertas(empresaId: number, planType: string) {
  const usage = await getEmpresaUsage(empresaId);
  const limits = getPlanLimits(planType as any);

  const alertas: Array<{
    tipo: string;
    mensagem: string;
    percentual: number;
    atual: number;
    limite: number;
  }> = [];

  // Verifica cada recurso
  const recursos = [
    { chave: "clientes", label: "Clientes" },
    { chave: "profissionais", label: "Profissionais" },
    { chave: "servicos", label: "Serviços" },
    { chave: "pacotes", label: "Pacotes" },
    { chave: "automacoes", label: "Automações" },
    { chave: "usuarios", label: "Usuários" },
  ];

  for (const recurso of recursos) {
    const atual = usage[recurso.chave as keyof typeof usage];
    const limite = limits[recurso.chave as keyof typeof limits];

    if (verificarAlerta(atual, limite, limits.alertaPercentual)) {
      const percentual = calcularPercentualUso(atual, limite);
      alertas.push({
        tipo: recurso.chave,
        mensagem: `Você atingiu ${percentual}% do limite de ${recurso.label.toLowerCase()} (${atual}/${limite})`,
        percentual,
        atual,
        limite,
      });
    }
  }

  return alertas;
}

/**
 * Obtém resumo de uso com alertas
 */
export async function getUsageWithAlerts(empresaId: number, planType: string) {
  const usage = await getEmpresaUsage(empresaId);
  const limits = getPlanLimits(planType as any);
  const alertas = await verificarAlertas(empresaId, planType);

  return {
    usage,
    limits,
    alertas,
    temAlerta: alertas.length > 0,
  };
}
