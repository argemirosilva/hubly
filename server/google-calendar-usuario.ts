/**
 * Integração com Google Calendar API — por Usuário/Profissional
 * Cada profissional conecta a própria conta Google no Perfil.
 * Os agendamentos do profissional são sincronizados no Google Agenda pessoal dele.
 */
import { google } from "googleapis";
import { getDb } from "./db";
import { googleCalendarTokensUsuario } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Configuração OAuth2 ──────────────────────────────────────────────────────
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_PUBLIC_URL ?? "https://hubly.orizontech.com.br";
  const redirectUri = `${appUrl}/api/google/user-callback`;
  if (!clientId || !clientSecret) {
    throw new Error("[GoogleCalendarUsuario] GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET são obrigatórios.");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// ─── Gerar URL de autorização ─────────────────────────────────────────────────
export function gerarUrlAutorizacaoGoogleUsuario(state: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
    prompt: "consent",
  });
}

// ─── Trocar code por tokens ───────────────────────────────────────────────────
export async function trocarCodePorTokensUsuario(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// ─── Obter cliente autenticado para um usuário ────────────────────────────────
export async function getClienteAutenticadoUsuario(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const rows = await db.select().from(googleCalendarTokensUsuario)
    .where(eq(googleCalendarTokensUsuario.userId, userId))
    .limit(1);
  const tokenRow = rows[0];
  if (!tokenRow || !tokenRow.ativo) return null;
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokenRow.accessToken,
    refresh_token: tokenRow.refreshToken ?? undefined,
    expiry_date: tokenRow.expiresAt ? tokenRow.expiresAt.getTime() : undefined,
  });
  // Auto-refresh token se necessário
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await db.update(googleCalendarTokensUsuario)
        .set({
          accessToken: tokens.access_token,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(googleCalendarTokensUsuario.userId, userId));
    }
  });
  return { oauth2Client, calendarId: tokenRow.calendarId ?? "primary" };
}

// ─── Criar ou garantir calendário dedicado Hubly para o usuário ──────────────
// Garante que o calendário exista e esteja visível na lista de agendas do usuário
export async function garantirCalendarioHublyUsuario(
  userId: number,
  nomeCalendario: string
): Promise<string> {
  const cliente = await getClienteAutenticadoUsuario(userId);
  if (!cliente) throw new Error("Google Calendar não conectado para este usuário");
  const calendar = google.calendar({ version: "v3", auth: cliente.oauth2Client });
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");

  const rows = await db.select().from(googleCalendarTokensUsuario)
    .where(eq(googleCalendarTokensUsuario.userId, userId))
    .limit(1);
  const tokenRow = rows[0];

  // Se já tem um calendarId salvo (que não seja "primary"), verificar se ainda existe
  if (tokenRow?.calendarId && tokenRow.calendarId !== "primary") {
    try {
      // Verificar se o calendário ainda existe
      await calendar.calendars.get({ calendarId: tokenRow.calendarId });
      // Atualizar nome se mudou
      if (tokenRow.calendarNome !== nomeCalendario) {
        await calendar.calendars.update({
          calendarId: tokenRow.calendarId,
          requestBody: { summary: nomeCalendario },
        });
        await db.update(googleCalendarTokensUsuario)
          .set({ calendarNome: nomeCalendario, updatedAt: new Date() })
          .where(eq(googleCalendarTokensUsuario.userId, userId));
      }
      return tokenRow.calendarId;
    } catch {
      // Calendário não existe mais, criar um novo
    }
  }

  // Criar novo calendário dedicado
  const novoCalendario = await calendar.calendars.insert({
    requestBody: {
      summary: nomeCalendario,
      description: "Agendamentos sincronizados automaticamente pelo Hubly",
      timeZone: "America/Sao_Paulo",
    },
  });
  const calendarId = novoCalendario.data.id!;

  // Garantir que o calendário apareça na lista de agendas do usuário
  // (adicionar à lista de calendários do usuário com cor padrão)
  try {
    await calendar.calendarList.insert({
      requestBody: {
        id: calendarId,
        backgroundColor: "#039be5", // Azul padrão do Google
        foregroundColor: "#ffffff",
        selected: true,
      },
    });
  } catch (err: any) {
    // Pode já estar na lista — ignorar erro 409
    if (err?.code !== 409) {
      console.warn("[GoogleCalendarUsuario] Aviso ao adicionar calendário à lista:", err?.message);
    }
  }

  await db.update(googleCalendarTokensUsuario)
    .set({ calendarId, calendarNome: nomeCalendario, updatedAt: new Date() })
    .where(eq(googleCalendarTokensUsuario.userId, userId));

  return calendarId;
}

// ─── Salvar tokens após OAuth callback ───────────────────────────────────────
export async function salvarTokensGoogleUsuario(params: {
  userId: number;
  empresaId: number;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  email?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const rows = await db.select().from(googleCalendarTokensUsuario)
    .where(eq(googleCalendarTokensUsuario.userId, params.userId))
    .limit(1);
  if (rows.length > 0) {
    await db.update(googleCalendarTokensUsuario)
      .set({
        accessToken: params.accessToken,
        refreshToken: params.refreshToken ?? rows[0].refreshToken,
        expiresAt: params.expiresAt,
        email: params.email,
        ativo: true,
        // Resetar calendarId para forçar recriação com nome correto
        calendarId: null,
        calendarNome: null,
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarTokensUsuario.userId, params.userId));
  } else {
    await db.insert(googleCalendarTokensUsuario).values({
      userId: params.userId,
      empresaId: params.empresaId,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      expiresAt: params.expiresAt,
      email: params.email,
      ativo: true,
    });
  }
}

// ─── Desconectar Google Calendar do usuário ───────────────────────────────────
export async function desconectarGoogleUsuario(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(googleCalendarTokensUsuario)
    .set({ ativo: false, calendarId: null, calendarNome: null, updatedAt: new Date() })
    .where(eq(googleCalendarTokensUsuario.userId, userId));
}

// ─── Verificar status da conexão do usuário ───────────────────────────────────
export async function getStatusConexaoGoogleUsuario(userId: number): Promise<{
  conectado: boolean;
  email?: string;
  calendarNome?: string;
  calendarId?: string;
}> {
  const db = await getDb();
  if (!db) return { conectado: false };
  const rows = await db.select().from(googleCalendarTokensUsuario)
    .where(eq(googleCalendarTokensUsuario.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row || !row.ativo) return { conectado: false };
  return {
    conectado: true,
    email: row.email ?? undefined,
    calendarNome: row.calendarNome ?? undefined,
    calendarId: row.calendarId ?? undefined,
  };
}

// ─── Renomear calendário Hubly do usuário ────────────────────────────────────
export async function renomearCalendarioHublyUsuario(
  userId: number,
  novoNome: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const rows = await db.select().from(googleCalendarTokensUsuario)
    .where(eq(googleCalendarTokensUsuario.userId, userId))
    .limit(1);
  const tokenRow = rows[0];
  if (!tokenRow?.ativo) throw new Error("Google Calendar não conectado");

  const cliente = await getClienteAutenticadoUsuario(userId);
  if (!cliente) throw new Error("Google Calendar não conectado");

  if (tokenRow.calendarId && tokenRow.calendarId !== "primary") {
    const calendar = google.calendar({ version: "v3", auth: cliente.oauth2Client });
    await calendar.calendars.update({
      calendarId: tokenRow.calendarId,
      requestBody: { summary: novoNome },
    });
  }

  await db.update(googleCalendarTokensUsuario)
    .set({ calendarNome: novoNome, updatedAt: new Date() })
    .where(eq(googleCalendarTokensUsuario.userId, userId));
}

// ─── Sincronizar agendamento no Google do profissional ───────────────────────
export async function sincronizarAgendamentoGoogleUsuario(params: {
  userId: number;
  agendamentoId: number;
  clienteNome: string;
  servicoNome: string;
  profissionalNome?: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: string;
  observacoes?: string;
  googleEventId?: string | null;
}): Promise<string | null> {
  try {
    const cliente = await getClienteAutenticadoUsuario(params.userId);
    if (!cliente) return null;
    const calendar = google.calendar({ version: "v3", auth: cliente.oauth2Client });
    const startDateTime = `${params.data}T${params.horaInicio}:00`;
    const endDateTime = `${params.data}T${params.horaFim}:00`;
    const timeZone = "America/Sao_Paulo";
    const statusGoogle: Record<string, string> = {
      agendado: "confirmed",
      confirmado: "confirmed",
      em_andamento: "confirmed",
      concluido: "confirmed",
      cancelado: "cancelled",
      faltou: "cancelled",
      remarcado: "cancelled",
      pre_agendado: "tentative",
      aguardando_reserva: "tentative",
    };
    const corStatus: Record<string, number> = {
      agendado: 9,
      confirmado: 10,
      cancelado: 4,
      pre_agendado: 5,
    };
    const eventBody = {
      summary: `${params.clienteNome} — ${params.servicoNome}`,
      description: [
        params.profissionalNome ? `Profissional: ${params.profissionalNome}` : "",
        params.observacoes ? `Obs: ${params.observacoes}` : "",
        `\nSincronizado pelo Hubly (ID: ${params.agendamentoId})`,
      ].filter(Boolean).join("\n"),
      start: { dateTime: startDateTime, timeZone },
      end: { dateTime: endDateTime, timeZone },
      status: statusGoogle[params.status] ?? "confirmed",
      colorId: String(corStatus[params.status] ?? 9),
      extendedProperties: {
        private: {
          hublyAgendamentoId: String(params.agendamentoId),
          hublyUserId: String(params.userId),
        },
      },
    };
    if (params.googleEventId) {
      await calendar.events.update({
        calendarId: cliente.calendarId,
        eventId: params.googleEventId,
        requestBody: eventBody,
      });
      return params.googleEventId;
    } else {
      const response = await calendar.events.insert({
        calendarId: cliente.calendarId,
        requestBody: eventBody,
      });
      return response.data.id ?? null;
    }
  } catch (err: any) {
    console.error(`[GoogleCalendarUsuario] Erro ao sincronizar agendamento ${params.agendamentoId}:`, err?.message ?? err);
    return null;
  }
}

// ─── Remover evento do Google Calendar do usuário ────────────────────────────
export async function removerEventoGoogleUsuario(userId: number, googleEventId: string): Promise<void> {
  try {
    const cliente = await getClienteAutenticadoUsuario(userId);
    if (!cliente) return;
    const calendar = google.calendar({ version: "v3", auth: cliente.oauth2Client });
    const rows = await (await getDb())?.select().from(googleCalendarTokensUsuario)
      .where(eq(googleCalendarTokensUsuario.userId, userId)).limit(1);
    const calendarId = rows?.[0]?.calendarId ?? "primary";
    await calendar.events.delete({ calendarId, eventId: googleEventId });
  } catch (err: any) {
    if (err?.code !== 410) {
      console.error(`[GoogleCalendarUsuario] Erro ao remover evento ${googleEventId}:`, err?.message ?? err);
    }
  }
}
