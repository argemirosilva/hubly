/**
 * Integração com Google Calendar API
 * Sincroniza agendamentos e bloqueios do Hubly → Google Calendar (unidirecional)
 * 
 * Fluxo OAuth2:
 * 1. Usuário clica em "Conectar Google Agenda" nas Configurações
 * 2. Sistema redireciona para Google OAuth2
 * 3. Google retorna code → sistema troca por access_token + refresh_token
 * 4. Tokens são salvos na tabela google_calendar_tokens
 * 5. A partir daí, agendamentos são sincronizados automaticamente
 */

import { google } from "googleapis";
import { getDb } from "./db";
import { googleCalendarTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Configuração OAuth2 ──────────────────────────────────────────────────────
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${process.env.APP_PUBLIC_URL ?? "https://hubly.orizontech.com.br"}/api/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("[GoogleCalendar] GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET são obrigatórios. Configure no Google Cloud Console.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// ─── Gerar URL de autorização ─────────────────────────────────────────────────
export function gerarUrlAutorizacaoGoogle(state: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
    prompt: "consent", // forçar para sempre receber refresh_token
  });
}

// ─── Trocar code por tokens ───────────────────────────────────────────────────
export async function trocarCodePorTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// ─── Obter cliente autenticado para uma empresa ───────────────────────────────
async function getClienteAutenticado(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");

  const rows = await db.select().from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.empresaId, empresaId))
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
      await db.update(googleCalendarTokens)
        .set({
          accessToken: tokens.access_token,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(googleCalendarTokens.empresaId, empresaId));
    }
  });

  return { oauth2Client, calendarId: tokenRow.calendarId ?? "primary" };
}

// ─── Criar ou atualizar calendário dedicado Hubly ────────────────────────────
export async function garantirCalendarioHubly(empresaId: number, nomeEmpresa: string): Promise<string> {
  const cliente = await getClienteAutenticado(empresaId);
  if (!cliente) throw new Error("Google Calendar não conectado para esta empresa");

  const calendar = google.calendar({ version: "v3", auth: cliente.oauth2Client });

  // Verificar se já existe um calendário Hubly
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");

  const rows = await db.select().from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.empresaId, empresaId))
    .limit(1);

  const tokenRow = rows[0];
  if (tokenRow?.calendarId && tokenRow.calendarId !== "primary") {
    return tokenRow.calendarId; // já existe
  }

  // Criar novo calendário dedicado
  const novoCalendario = await calendar.calendars.insert({
    requestBody: {
      summary: `Hubly — ${nomeEmpresa}`,
      description: "Agendamentos sincronizados automaticamente pelo Hubly",
      timeZone: "America/Sao_Paulo",
    },
  });

  const calendarId = novoCalendario.data.id!;

  // Salvar o ID do calendário
  await db.update(googleCalendarTokens)
    .set({ calendarId, calendarNome: `Hubly — ${nomeEmpresa}`, updatedAt: new Date() })
    .where(eq(googleCalendarTokens.empresaId, empresaId));

  return calendarId;
}

// ─── Sincronizar agendamento → Google Calendar ────────────────────────────────
export async function sincronizarAgendamentoGoogle(params: {
  empresaId: number;
  agendamentoId: number;
  clienteNome: string;
  servicoNome: string;
  profissionalNome?: string;
  data: string;          // "YYYY-MM-DD"
  horaInicio: string;    // "HH:MM"
  horaFim: string;       // "HH:MM"
  status: string;
  observacoes?: string;
  googleEventId?: string | null; // se já existe, atualiza; se não, cria
}): Promise<string | null> {
  try {
    const cliente = await getClienteAutenticado(params.empresaId);
    if (!cliente) return null; // Google não conectado — silencioso

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
      agendado: 9,       // azul
      confirmado: 10,    // verde
      cancelado: 4,      // vermelho
      pre_agendado: 5,   // amarelo
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
          hublyEmpresaId: String(params.empresaId),
        },
      },
    };

    if (params.googleEventId) {
      // Atualizar evento existente
      await calendar.events.update({
        calendarId: cliente.calendarId,
        eventId: params.googleEventId,
        requestBody: eventBody,
      });
      return params.googleEventId;
    } else {
      // Criar novo evento
      const response = await calendar.events.insert({
        calendarId: cliente.calendarId,
        requestBody: eventBody,
      });
      return response.data.id ?? null;
    }
  } catch (err: any) {
    console.error(`[GoogleCalendar] Erro ao sincronizar agendamento ${params.agendamentoId}:`, err?.message ?? err);
    return null;
  }
}

// ─── Sincronizar bloqueio → Google Calendar ───────────────────────────────────
export async function sincronizarBloqueioGoogle(params: {
  empresaId: number;
  bloqueioId: number;
  profissionalNome: string;
  motivo?: string;
  dataInicio: string;    // "YYYY-MM-DD"
  horaInicio: string;    // "HH:MM"
  dataFim: string;       // "YYYY-MM-DD"
  horaFim: string;       // "HH:MM"
  googleEventId?: string | null;
}): Promise<string | null> {
  try {
    const cliente = await getClienteAutenticado(params.empresaId);
    if (!cliente) return null;

    const calendar = google.calendar({ version: "v3", auth: cliente.oauth2Client });
    const timeZone = "America/Sao_Paulo";

    const eventBody = {
      summary: `🔒 Bloqueado — ${params.profissionalNome}`,
      description: [
        params.motivo ? `Motivo: ${params.motivo}` : "Bloqueio de agenda",
        `\nSincronizado pelo Hubly (Bloqueio ID: ${params.bloqueioId})`,
      ].filter(Boolean).join("\n"),
      start: { dateTime: `${params.dataInicio}T${params.horaInicio}:00`, timeZone },
      end: { dateTime: `${params.dataFim}T${params.horaFim}:00`, timeZone },
      status: "confirmed" as const,
      colorId: "8", // grafite
      extendedProperties: {
        private: {
          hublyBloqueioId: String(params.bloqueioId),
          hublyEmpresaId: String(params.empresaId),
          tipo: "bloqueio",
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
    console.error(`[GoogleCalendar] Erro ao sincronizar bloqueio ${params.bloqueioId}:`, err?.message ?? err);
    return null;
  }
}

// ─── Remover evento do Google Calendar ───────────────────────────────────────
export async function removerEventoGoogle(empresaId: number, googleEventId: string): Promise<void> {
  try {
    const cliente = await getClienteAutenticado(empresaId);
    if (!cliente) return;

    const calendar = google.calendar({ version: "v3", auth: cliente.oauth2Client });
    await calendar.events.delete({
      calendarId: cliente.calendarId,
      eventId: googleEventId,
    });
  } catch (err: any) {
    // Ignorar erro 410 (evento já deletado)
    if (err?.code !== 410) {
      console.error(`[GoogleCalendar] Erro ao remover evento ${googleEventId}:`, err?.message ?? err);
    }
  }
}

// ─── Salvar tokens após OAuth callback ───────────────────────────────────────
export async function salvarTokensGoogle(params: {
  empresaId: number;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  email?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");

  // Verificar se já existe registro
  const rows = await db.select().from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.empresaId, params.empresaId))
    .limit(1);

  if (rows.length > 0) {
    await db.update(googleCalendarTokens)
      .set({
        accessToken: params.accessToken,
        refreshToken: params.refreshToken ?? rows[0].refreshToken,
        expiresAt: params.expiresAt,
        email: params.email,
        ativo: true,
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarTokens.empresaId, params.empresaId));
  } else {
    await db.insert(googleCalendarTokens).values({
      empresaId: params.empresaId,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      expiresAt: params.expiresAt,
      email: params.email,
      ativo: true,
    });
  }
}

// ─── Desconectar Google Calendar ─────────────────────────────────────────────
export async function desconectarGoogle(empresaId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(googleCalendarTokens)
    .set({ ativo: false, updatedAt: new Date() })
    .where(eq(googleCalendarTokens.empresaId, empresaId));
}

// ─── Verificar status da conexão ─────────────────────────────────────────────
export async function getStatusConexaoGoogle(empresaId: number): Promise<{
  conectado: boolean;
  email?: string;
  calendarNome?: string;
}> {
  const db = await getDb();
  if (!db) return { conectado: false };

  const rows = await db.select().from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.empresaId, empresaId))
    .limit(1);

  const row = rows[0];
  if (!row || !row.ativo) return { conectado: false };

  return {
    conectado: true,
    email: row.email ?? undefined,
    calendarNome: row.calendarNome ?? undefined,
  };
}
