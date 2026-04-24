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
import { sql } from "drizzle-orm";

// ─── HELPER: registrar evento de conexão no banco ────────────────────────────
interface WaLogOptions {
  detail?: string;
  statusCode?: number;
  motivo?: string;
  duracaoSessaoMs?: number;
  tentativa?: number;
  detalheTecnico?: string;
  telefone?: string;
}

async function logWaEvent(
  event: "connected" | "disconnected" | "qr_ready" | "logged_out" | "reconnecting" | "reconnect_attempt" | "error",
  detailOrOptions?: string | WaLogOptions
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const opts: WaLogOptions = typeof detailOrOptions === "string"
      ? { detail: detailOrOptions }
      : (detailOrOptions ?? {});
    // Usar SQL raw para evitar conflito de tipo do enum no tsc --watch
    await db.execute(sql`
      INSERT INTO wa_connection_log (event, detail, statusCode, motivo, duracaoSessaoMs, tentativa, detalheTecnico, telefone)
      VALUES (
        ${event},
        ${opts.detail ?? null},
        ${opts.statusCode ?? null},
        ${opts.motivo ?? null},
        ${opts.duracaoSessaoMs ?? null},
        ${opts.tentativa ?? null},
        ${opts.detalheTecnico ?? null},
        ${opts.telefone ?? null}
      )
    `);
    // Manter apenas os últimos 200 registros
    await db.execute(sql`
      DELETE FROM wa_connection_log
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id FROM wa_connection_log ORDER BY createdAt DESC LIMIT 200
        ) AS keep
      )
    `);
  } catch { /* ignorar erros de log */ }
}

// Classifica o código de desconexão em um motivo human-readable
function classificarMotivo(statusCode?: number, errorMessage?: string): string {
  if (!statusCode) return errorMessage ? "erro_desconhecido" : "desconexao_limpa";
  switch (statusCode) {
    case 408: return "timeout_rede";
    case 401: return "nao_autorizado";
    case 403: return "acesso_negado";
    case 405: return "metodo_invalido";
    case 410: return "logout_dispositivo";
    case 411: return "logout_dispositivo";
    case 428: return "precondition_required";
    case 440: return "sessao_expirada";
    case 500: return "erro_servidor_wa";
    case 503: return "servidor_wa_indisponivel";
    case 515: return "reinicio_servidor";
    default: return `codigo_${statusCode}`;
  }
}

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
  | "scanning"
  | "connected"
  | "logged_out";

interface WAState {
  status: WAStatus;
  qrDataUrl: string | null;
  phoneNumber: string | null;
  connectedAt: Date | null;
  nextReconnectAt: Date | null;  // timestamp da próxima tentativa automática
}

// ─── MANAGER ──────────────────────────────────────────────────────────────────

// Delays de backoff exponencial: 3s, 5s, 10s, 20s, 40s, 60s
// Reconexão rápida — código 408 (timeout) é tratado com reconexão imediata
const RECONNECT_DELAYS = [3_000, 5_000, 10_000, 20_000, 40_000, 60_000];
// Máximo de tentativas automáticas antes de parar (evita loop infinito)
const MAX_RECONNECT_ATTEMPTS = 20;

class WhatsAppManager extends EventEmitter {
  private sock: WASocket | null = null;
  private state: WAState = {
    status: "disconnected",
    qrDataUrl: null,
    phoneNumber: null,
    connectedAt: null,
    nextReconnectAt: null,
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private dbAuth: Awaited<ReturnType<typeof useDbAuthState>> | null = null;
  private reconnectCount = 0;
  // Flag para evitar que dois connect() rodem simultaneamente
  private isConnecting = false;

  getState(): WAState {
    return { ...this.state };
  }

   async connect(): Promise<void> {
    // Evitar dupla execução simultânea do connect()
    if (this.isConnecting) {
      console.log("[WhatsApp] connect() ignorado — já há uma tentativa em andamento.");
      return;
    }
    if (this.state.status === "connected" || this.state.status === "connecting") {
      return;
    }
    // Parar se atingiu o limite de tentativas (requer reconexão manual)
    if (this.reconnectCount >= MAX_RECONNECT_ATTEMPTS) {
      console.warn(`[WhatsApp] ⛔ Limite de ${MAX_RECONNECT_ATTEMPTS} tentativas atingido. Aguardando reconexão manual.`);
      this.setState({ status: "disconnected", nextReconnectAt: null });
      return;
    }
    this.isConnecting = true;
    this.isShuttingDown = false;
    // Fechar socket anterior com pequeno delay para garantir cleanup completo
    if (this.sock) {
      try {
        // Remover listeners de eventos específicos (Baileys requer evento como argumento)
        this.sock.ev.removeAllListeners("connection.update");
        this.sock.ev.removeAllListeners("creds.update");
        this.sock.end(new Error("Reconexão solicitada"));
      } catch { /* ignorar */ }
      this.sock = null;
      // Aguardar 1s para garantir que o socket anterior foi destruído
      await new Promise(r => setTimeout(r, 1_000));
    }
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
        browser: ["Hubly", "Chrome", "1.0.0"],
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: 30_000,
        keepAliveIntervalMs: 10_000,
        retryRequestDelayMs: 2_000,
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
            logWaEvent("qr_ready", { detail: "QR Code gerado — aguardando leitura pelo celular", motivo: "aguardando_qr" }).catch(() => {});
          } catch (err) {
            console.error("[WhatsApp] Erro ao gerar QR Code:", err);
          }
        }

        // Detectar quando o QR foi lido (isNewLogin = true e connection ainda não é 'open')
        if (update.isNewLogin && connection !== 'open') {
          this.setState({ status: "scanning", qrDataUrl: null });
          console.log('[WhatsApp] QR Code lido — aguardando confirmação no celular...');
        }

        if (connection === "open") {
          this.reconnectCount = 0; // Reset contador ao conectar com sucesso
          this.isConnecting = false; // Liberar flag de conexão
          const phoneNumber = this.sock?.user?.id?.split(":")[0] ?? null;
          this.setState({
            status: "connected",
            qrDataUrl: null,
            phoneNumber,
            connectedAt: new Date(),
            nextReconnectAt: null,
          });
          this.emit("connected", phoneNumber);
          console.log(`[WhatsApp] ✅ Conectado: ${phoneNumber}`);
          logWaEvent("connected", {
            detail: `Conectado com sucesso ao número ${phoneNumber}`,
            motivo: "conexao_estabelecida",
            telefone: phoneNumber ?? undefined,
          }).catch(() => {});
        }

          if (connection === "close") {
          this.isConnecting = false; // Liberar flag ao fechar
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          // Código 408 = Connection Timeout (rede caiu, servidor do WA encerrou por inatividade)
          const isTimeout = statusCode === 408;
          console.log(`[WhatsApp] Conexão fechada. Código: ${statusCode}. LoggedOut: ${isLoggedOut}. Timeout: ${isTimeout}`);
          if (isLoggedOut) {
            // Usuário deslogou explicitamente no celular — única situação onde limpamos a sessão
            console.log("[WhatsApp] 🚪 Deslogado pelo dispositivo. Limpando sessão.");
            this.setState({ status: "logged_out", qrDataUrl: null, phoneNumber: null, connectedAt: null, nextReconnectAt: null });
            await this.dbAuth?.clearSession();
            this.dbAuth = null;
            this.emit("logged_out");
            logWaEvent("logged_out", {
              detail: "Deslogado pelo dispositivo — sessão encerrada",
              statusCode,
              motivo: "logout_dispositivo",
              duracaoSessaoMs: this.state.connectedAt ? Date.now() - this.state.connectedAt.getTime() : undefined,
              telefone: this.state.phoneNumber ?? undefined,
            }).catch(() => {});
          } else if (!this.isShuttingDown) {
            // Verificar se atingiu o limite de tentativas
            if (this.reconnectCount >= MAX_RECONNECT_ATTEMPTS) {
              console.warn(`[WhatsApp] ⛔ Limite de ${MAX_RECONNECT_ATTEMPTS} tentativas atingido. Aguardando reconexão manual.`);
              this.setState({ status: "disconnected", nextReconnectAt: null });
              this.emit("disconnected");
              return;
            }
            // Código 408 (timeout de rede) → reconectar imediatamente sem backoff
            if (isTimeout) {
              console.log(`[WhatsApp] ⚡ Timeout de rede (408) — reconectando imediatamente...`);
              this.setState({ status: "disconnected", nextReconnectAt: null });
              this.emit("disconnected");
              logWaEvent("disconnected", {
                detail: "Timeout de rede (408) — reconectando imediatamente em 500ms",
                statusCode: 408,
                motivo: "timeout_rede",
                duracaoSessaoMs: this.state.connectedAt ? Date.now() - this.state.connectedAt.getTime() : undefined,
                telefone: this.state.phoneNumber ?? undefined,
              }).catch(() => {});
              this.scheduleReconnect(500);
              return;
            }
            // Qualquer outro motivo (rede, deploy, timeout) → reconectar com backoff exponencial
            this.reconnectCount++;
            const delayIndex = Math.min(this.reconnectCount - 1, RECONNECT_DELAYS.length - 1);
            const delay = RECONNECT_DELAYS[delayIndex];
            const nextAt = new Date(Date.now() + delay);
            console.log(`[WhatsApp] 🔄 Tentativa ${this.reconnectCount}/${MAX_RECONNECT_ATTEMPTS} em ${delay / 1000}s...`);
            this.setState({ status: "disconnected", nextReconnectAt: nextAt });
            this.emit("disconnected");
            this.scheduleReconnect(delay);
            logWaEvent("reconnect_attempt", {
              detail: `Desconectado (código ${statusCode}) — tentativa ${this.reconnectCount}/${MAX_RECONNECT_ATTEMPTS} em ${delay / 1000}s`,
              statusCode,
              motivo: classificarMotivo(statusCode, (lastDisconnect?.error as any)?.message),
              duracaoSessaoMs: this.state.connectedAt ? Date.now() - this.state.connectedAt.getTime() : undefined,
              tentativa: this.reconnectCount,
              detalheTecnico: (lastDisconnect?.error as any)?.message ?? undefined,
              telefone: this.state.phoneNumber ?? undefined,
            }).catch(() => {});
          } else {
            this.setState({ status: "disconnected", nextReconnectAt: null });
            this.emit("disconnected");
            logWaEvent("disconnected", {
              detail: `Desconectado (código ${statusCode}) — shutdown solicitado`,
              statusCode,
              motivo: "shutdown_servidor",
              duracaoSessaoMs: this.state.connectedAt ? Date.now() - this.state.connectedAt.getTime() : undefined,
              telefone: this.state.phoneNumber ?? undefined,
            }).catch(() => {});
          }
        }
      });
    } catch (err) {
      console.error("[WhatsApp] Erro ao conectar:", err);
      this.isConnecting = false; // Liberar flag em caso de erro
      this.setState({ status: "disconnected" });
      logWaEvent("error", {
        detail: `Erro ao estabelecer conexão: ${(err as any)?.message ?? String(err)}`,
        motivo: "erro_conexao",
        detalheTecnico: (err as any)?.stack ?? String(err),
      }).catch(() => {});
      if (!this.isShuttingDown && this.reconnectCount < MAX_RECONNECT_ATTEMPTS) {
        this.reconnectCount++;
        const delayIndex = Math.min(this.reconnectCount - 1, RECONNECT_DELAYS.length - 1);
        this.scheduleReconnect(RECONNECT_DELAYS[delayIndex]);
      }
    }
  }

  private scheduleReconnect(delay = 5_000): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.isShuttingDown) {
        console.log(`[WhatsApp] ⏱ Reconectando agora (tentativa ${this.reconnectCount})...`);
        this.connect().catch(console.error);
      }
    }, delay);
  }

  async disconnect(): Promise<void> {
    this.isShuttingDown = true;
    this.isConnecting = false;
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
    // Aguardar o banco estar disponível (retry por até 30s após deploy)
    let db = await getDb();
    if (!db) {
      console.log("[WhatsApp] Banco não disponível. Aguardando até 30s...");
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 5_000));
        db = await getDb();
        if (db) break;
      }
    }

    if (!db) {
      console.log("[WhatsApp] Banco indisponível após 30s. Aguardando conexão manual.");
      return;
    }

    try {
      // Verificar se há credenciais salvas
      const rows = await db.select().from(waSession).where(eq(waSession.id, "creds")).limit(1);
      if (rows.length > 0) {
        console.log("[WhatsApp] ✅ Sessão encontrada no banco. Reconectando automaticamente...");
        await this.connect();
      } else {
        console.log("[WhatsApp] Nenhuma sessão salva. Aguardando conexão manual via QR Code.");
      }
    } catch (err) {
      console.error("[WhatsApp] Erro ao verificar sessão no banco:", err);
      // Tentar reconectar após 10s caso seja erro transitório
      setTimeout(() => this.init().catch(console.error), 10_000);
    }
  }
}

// ─── SINGLETON GLOBAL ─────────────────────────────────────────────────────────
export const waManager = new WhatsAppManager();

// Funções helper de mensagem hardcoded foram REMOVIDAS.
// Todas as mensagens agora são controladas exclusivamente pelo sistema de automações.
// Nenhum texto fixo deve ser enviado sem automação configurada pelo usuário.

export async function sendWAMedia(params: {
  telefone: string;
  mediaUrl: string;
  caption?: string;
  mimeType?: string;
}): Promise<boolean> {
  return waManager.sendMediaMessage(params.telefone, params.mediaUrl, params.caption, params.mimeType);
}
