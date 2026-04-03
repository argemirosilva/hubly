import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
  proto,
  AuthenticationCreds,
  SignalKeyStore,
  initAuthCreds,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as QRCode from "qrcode";
import { EventEmitter } from "events";
import { getDb } from "./db";
import { waSession } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── AUTH STATE PERSISTENTE NO BANCO ─────────────────────────────────────────

async function useDbAuthState(): Promise<{
  state: { creds: AuthenticationCreds; keys: SignalKeyStore };
  saveCreds: () => Promise<void>;
  clearSession: () => Promise<void>;
}> {
  const db = await getDb();

  async function readData(id: string): Promise<any> {
    if (!db) return null;
    const rows = await db.select().from(waSession).where(eq(waSession.id, id)).limit(1);
    if (!rows[0]) return null;
    try {
      return JSON.parse(rows[0].data, (_, v) =>
        v && typeof v === "object" && v.__type === "Buffer"
          ? Buffer.from(v.data)
          : v
      );
    } catch {
      return null;
    }
  }

  async function writeData(id: string, data: any): Promise<void> {
    if (!db) return;
    const json = JSON.stringify(data, (_, v) =>
      Buffer.isBuffer(v) ? { __type: "Buffer", data: Array.from(v) } : v
    );
    await db
      .insert(waSession)
      .values({ id, data: json })
      .onDuplicateKeyUpdate({ set: { data: json } });
  }

  async function removeData(id: string): Promise<void> {
    if (!db) return;
    await db.delete(waSession).where(eq(waSession.id, id));
  }

  async function clearAll(): Promise<void> {
    if (!db) return;
    // Remove todas as chaves da sessão
    await db.delete(waSession);
  }

  const creds: AuthenticationCreds = (await readData("creds")) || initAuthCreds();

  const keys: SignalKeyStore = {
    get: async (type, ids) => {
      const data: Record<string, any> = {};
      for (const id of ids) {
        const val = await readData(`${type}-${id}`);
        if (val) data[id] = val;
      }
      return data;
    },
    set: async (data) => {
      for (const [type, typeData] of Object.entries(data)) {
        for (const [id, val] of Object.entries(typeData as Record<string, any>)) {
          if (val) {
            await writeData(`${type}-${id}`, val);
          } else {
            await removeData(`${type}-${id}`);
          }
        }
      }
    },
  };

  return {
    state: { creds, keys },
    saveCreds: async () => {
      await writeData("creds", creds);
    },
    clearSession: clearAll,
  };
}

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type WAStatus =
  | "disconnected"
  | "connecting"
  | "qr_ready"
  | "connected"
  | "logged_out";

interface WAState {
  status: WAStatus;
  qrDataUrl: string | null;
  phoneNumber: string | null;
  connectedAt: Date | null;
}

// ─── MANAGER ──────────────────────────────────────────────────────────────────

class WhatsAppManager extends EventEmitter {
  private sock: WASocket | null = null;
  private state: WAState = {
    status: "disconnected",
    qrDataUrl: null,
    phoneNumber: null,
    connectedAt: null,
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private dbAuth: Awaited<ReturnType<typeof useDbAuthState>> | null = null;
  private reconnectCount = 0;
  private readonly MAX_RECONNECT_BEFORE_CLEAR = 5;

  getState(): WAState {
    return { ...this.state };
  }

  async connect(): Promise<void> {
    if (this.state.status === "connected" || this.state.status === "connecting") {
      return;
    }

    this.isShuttingDown = false;
    this.setState({ status: "connecting", qrDataUrl: null });

    try {
      // Inicializar ou reutilizar o authState do banco
      if (!this.dbAuth) {
        this.dbAuth = await useDbAuthState();
      }
      const { state: authState, saveCreds } = this.dbAuth;

      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        auth: {
          creds: authState.creds,
          keys: makeCacheableSignalKeyStore(authState.keys, undefined as any),
        },
        printQRInTerminal: false,
        browser: ["Agendei", "Chrome", "1.0.0"],
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: 30_000,
        keepAliveIntervalMs: 25_000,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        logger: {
          level: "silent",
          trace: () => {},
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {},
          fatal: () => {},
          child: () => ({ level: "silent", trace: () => {}, debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, fatal: () => {}, child: () => ({} as any) }),
        } as any,
      });

      // Salvar credenciais sempre que atualizadas
      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const qrDataUrl = await QRCode.toDataURL(qr, {
              width: 300,
              margin: 2,
              color: { dark: "#000000", light: "#ffffff" },
            });
            this.setState({ status: "qr_ready", qrDataUrl });
            this.emit("qr", qrDataUrl);
          } catch (err) {
            console.error("[WhatsApp] Erro ao gerar QR Code:", err);
          }
        }

        if (connection === "open") {
          this.reconnectCount = 0; // Reset contador ao conectar com sucesso
          const phoneNumber = this.sock?.user?.id?.split(":")[0] ?? null;
          this.setState({
            status: "connected",
            qrDataUrl: null,
            phoneNumber,
            connectedAt: new Date(),
          });
          this.emit("connected", phoneNumber);
          console.log(`[WhatsApp] ✅ Conectado: ${phoneNumber}`);
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[WhatsApp] Conexão fechada. Código: ${statusCode}. Reconectar: ${shouldReconnect}`);

          if (statusCode === DisconnectReason.loggedOut) {
            // Usuário deslogou — limpar sessão do banco
            this.setState({ status: "logged_out", qrDataUrl: null, phoneNumber: null, connectedAt: null });
            await this.dbAuth?.clearSession();
            this.dbAuth = null;
            this.emit("logged_out");
          } else if (shouldReconnect && !this.isShuttingDown) {
            this.reconnectCount++;
            if (this.reconnectCount >= this.MAX_RECONNECT_BEFORE_CLEAR) {
              console.log(`[WhatsApp] ⚠️ Muitas tentativas de reconexão (${this.reconnectCount}). Limpando sessão corrompida...`);
              this.reconnectCount = 0;
              await this.dbAuth?.clearSession();
              this.dbAuth = null;
              this.setState({ status: "disconnected", qrDataUrl: null, phoneNumber: null, connectedAt: null });
              this.emit("disconnected");
              return;
            }
            this.setState({ status: "disconnected" });
            this.emit("disconnected");
            // Reconectar automaticamente após 5 segundos
            this.scheduleReconnect();
          } else {
            this.setState({ status: "disconnected" });
            this.emit("disconnected");
          }
        }
      });
    } catch (err) {
      console.error("[WhatsApp] Erro ao conectar:", err);
      this.setState({ status: "disconnected" });
      if (!this.isShuttingDown) {
        this.scheduleReconnect(10_000);
      }
    }
  }

  private scheduleReconnect(delay = 5_000): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.isShuttingDown) {
        console.log("[WhatsApp] Tentando reconectar...");
        this.connect().catch(console.error);
      }
    }, delay);
  }

  async disconnect(): Promise<void> {
    this.isShuttingDown = true;
    this.reconnectCount = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch {
        // Ignorar erro ao deslogar
      }
      this.sock = null;
    }
    // Limpar sessão do banco ao deslogar manualmente
    await this.dbAuth?.clearSession();
    this.dbAuth = null;
    this.setState({ status: "disconnected", qrDataUrl: null, phoneNumber: null, connectedAt: null });
    this.emit("disconnected");
  }

  /**
   * Limpa a sessão salva no banco e reseta o estado.
   * Útil quando o QR Code não aparece ou a sessão está corrompida.
   */
  async resetSession(): Promise<void> {
    this.isShuttingDown = true;
    this.reconnectCount = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.sock) {
      try { this.sock.end(undefined); } catch { /* ignorar */ }
      this.sock = null;
    }
    await this.dbAuth?.clearSession();
    this.dbAuth = null;
    this.isShuttingDown = false;
    this.setState({ status: "disconnected", qrDataUrl: null, phoneNumber: null, connectedAt: null });
    this.emit("disconnected");
    console.log("[WhatsApp] 🔄 Sessão resetada. Pronto para novo QR Code.");
  }

  async sendMediaMessage(phoneNumber: string, mediaUrl: string, caption?: string, mimeType?: string): Promise<boolean> {
    if (this.state.status !== "connected" || !this.sock) {
      console.warn("[WhatsApp] Tentativa de envio sem conexão ativa");
      return false;
    }

    try {
      const cleaned = phoneNumber.replace(/\D/g, "");
      const withCountry = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
      const jid = `${withCountry}@s.whatsapp.net`;

      const mime = mimeType || (mediaUrl.match(/\.pdf$/i) ? "application/pdf" : "image/jpeg");
      const isDocument = mime === "application/pdf" || mime.startsWith("application/");

      if (isDocument) {
        await this.sock.sendMessage(jid, {
          document: { url: mediaUrl },
          mimetype: mime,
          fileName: mediaUrl.split("/").pop() || "arquivo.pdf",
          caption: caption || "",
        });
      } else {
        await this.sock.sendMessage(jid, {
          image: { url: mediaUrl },
          caption: caption || "",
        });
      }

      console.log(`[WhatsApp] Mídia enviada para ${jid}`);
      return true;
    } catch (err) {
      console.error(`[WhatsApp] Erro ao enviar mídia para ${phoneNumber}:`, err);
      return false;
    }
  }

  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    if (this.state.status !== "connected" || !this.sock) {
      console.warn("[WhatsApp] Tentativa de envio sem conexão ativa");
      return false;
    }

    try {
      const cleaned = phoneNumber.replace(/\D/g, "");
      const withCountry = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
      const jid = `${withCountry}@s.whatsapp.net`;

      await this.sock.sendMessage(jid, { text: message });
      console.log(`[WhatsApp] Mensagem enviada para ${jid}`);
      return true;
    } catch (err) {
      console.error(`[WhatsApp] Erro ao enviar mensagem para ${phoneNumber}:`, err);
      return false;
    }
  }

  private setState(partial: Partial<WAState>): void {
    this.state = { ...this.state, ...partial };
    this.emit("state_change", this.state);
  }

  /**
   * Chamado ao iniciar o servidor.
   * Se houver credenciais salvas no banco, reconecta automaticamente.
   */
  async init(): Promise<void> {
    try {
      const db = await getDb();
      if (!db) {
        console.log("[WhatsApp] Banco não disponível. Aguardando conexão manual.");
        return;
      }

      // Verificar se há credenciais salvas
      const rows = await db.select().from(waSession).where(eq(waSession.id, "creds")).limit(1);
      if (rows.length > 0) {
        console.log("[WhatsApp] Sessão encontrada no banco. Reconectando automaticamente...");
        await this.connect();
      } else {
        console.log("[WhatsApp] Nenhuma sessão salva. Aguardando conexão manual via QR Code.");
      }
    } catch (err) {
      console.error("[WhatsApp] Erro ao verificar sessão no banco:", err);
    }
  }
}

// ─── SINGLETON GLOBAL ─────────────────────────────────────────────────────────
export const waManager = new WhatsAppManager();

// ─── HELPERS DE MENSAGEM ──────────────────────────────────────────────────────

export async function sendAgendamentoConfirmacao(params: {
  clienteNome: string;
  clienteTelefone: string;
  profissionalNome: string;
  servicoNome: string;
  data: string;
  hora: string;
  empresaNome: string;
}): Promise<boolean> {
  const { clienteNome, clienteTelefone, profissionalNome, servicoNome, data, hora, empresaNome } = params;
  const mensagem =
    `✅ *Agendamento Confirmado!*\n\n` +
    `Olá, *${clienteNome}*! Seu agendamento foi confirmado.\n\n` +
    `📋 *Detalhes:*\n` +
    `• Serviço: ${servicoNome}\n` +
    `• Profissional: ${profissionalNome}\n` +
    `• Data: ${data}\n` +
    `• Horário: ${hora}\n\n` +
    `📍 *${empresaNome}*\n\n` +
    `_Caso precise reagendar ou cancelar, entre em contato conosco._`;
  return waManager.sendMessage(clienteTelefone, mensagem);
}

export async function sendAgendamentoCancelado(params: {
  clienteNome: string;
  clienteTelefone: string;
  servicoNome: string;
  data: string;
  hora: string;
  empresaNome: string;
}): Promise<boolean> {
  const { clienteNome, clienteTelefone, servicoNome, data, hora, empresaNome } = params;
  const mensagem =
    `❌ *Agendamento Cancelado*\n\n` +
    `Olá, *${clienteNome}*. Informamos que seu agendamento foi cancelado.\n\n` +
    `📋 *Detalhes:*\n` +
    `• Serviço: ${servicoNome}\n` +
    `• Data: ${data}\n` +
    `• Horário: ${hora}\n\n` +
    `📍 *${empresaNome}*\n\n` +
    `_Entre em contato para reagendar._`;
  return waManager.sendMessage(clienteTelefone, mensagem);
}

export async function sendPacoteVencendo(params: {
  clienteNome: string;
  clienteTelefone: string;
  pacoteNome: string;
  sessoesRestantes: number;
  diasParaVencer: number;
  empresaNome: string;
}): Promise<boolean> {
  const { clienteNome, clienteTelefone, pacoteNome, sessoesRestantes, diasParaVencer, empresaNome } = params;
  const mensagem =
    `⚠️ *Aviso de Pacote*\n\n` +
    `Olá, *${clienteNome}*!\n\n` +
    `Seu pacote *${pacoteNome}* está próximo do vencimento.\n\n` +
    `📊 *Situação:*\n` +
    `• Sessões restantes: ${sessoesRestantes}\n` +
    `• Vence em: ${diasParaVencer} dia(s)\n\n` +
    `📍 *${empresaNome}*\n\n` +
    `_Entre em contato para renovar seu pacote e não perder seus benefícios!_`;
  return waManager.sendMessage(clienteTelefone, mensagem);
}

export async function sendWAMedia(params: {
  telefone: string;
  mediaUrl: string;
  caption?: string;
  mimeType?: string;
}): Promise<boolean> {
  return waManager.sendMediaMessage(params.telefone, params.mediaUrl, params.caption, params.mimeType);
}
