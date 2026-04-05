import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { empresas, profissionais, servicos } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const onboardingRouter = router({
  concluir: publicProcedure
    .input(z.object({
      nomeEmpresa: z.string().min(1),
      tipoNegocio: z.enum(["salao", "clinica", "barbearia", "consultorio", "outro"]),
      telefoneEmpresa: z.string().optional(),
      horaAbertura: z.string().default("08:00"),
      horaFechamento: z.string().default("18:00"),
      diasFuncionamento: z.array(z.number()).default([1, 2, 3, 4, 5]),
      intervaloMinutos: z.number().default(30),
      nomeProfissional: z.string().min(1),
      especialidade: z.string().optional(),
      nomeServico: z.string().min(1),
      duracaoServico: z.number().default(60),
      precoServico: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      // Requer systemUser (usuário do sistema com empresaId)
      const systemUser = ctx.systemUser;
      if (!systemUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Não autenticado" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

      const empresaId = systemUser.empresaId;

      // 1. Atualizar empresa com dados do onboarding
      await db.update(empresas).set({
        nome: input.nomeEmpresa,
        tipo: input.tipoNegocio,
        telefone: input.telefoneEmpresa,
        horaAbertura: input.horaAbertura,
        horaFechamento: input.horaFechamento,
        diasFuncionamento: input.diasFuncionamento,
        intervaloMinutos: input.intervaloMinutos,
        onboardingConcluido: true,
      }).where(eq(empresas.id, empresaId));

      // 2. Atualizar o profissional owner com os dados do onboarding
      const [ownerProf] = await db.select({ id: profissionais.id })
        .from(profissionais)
        .where(eq(profissionais.id, systemUser.id))
        .limit(1);

      if (ownerProf) {
        await db.update(profissionais).set({
          nome: input.nomeProfissional,
          especialidade: input.especialidade,
          isProfissional: true,
        }).where(eq(profissionais.id, systemUser.id));
      }

      // 3. Criar o primeiro serviço
      await db.insert(servicos).values({
        empresaId,
        nome: input.nomeServico,
        duracaoMinutos: input.duracaoServico,
        valor: input.precoServico.toFixed(2) as any,
        ativo: true,
      });

      return { success: true };
    }),
});
