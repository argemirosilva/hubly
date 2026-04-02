import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as QRCode from "qrcode";
import * as path from "path";
import * as fs from "fs";
import { EventEmitter } from "events";

// Diretório para armazenar a sessão do WhatsApp
const SESSION_DIR = path.join(process.cwd(), "whatsapp-session");

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

  getState(): WAState {
    return { ...this.state };
  }

  async connect(): Promise<void> {
    if (this.state.status === "connected" || this.state.status === "connecting") {
      return;
    }

    this.isShuttingDown = false;
    this.setState({ status: "connecting", qrDataUrl: null });

    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }

    try {
      const { state: authState, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
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
        keepAliveIntervalMs: 30_000,
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
          const phoneNumber = this.sock?.user?.id?.split(":")[0] ?? null;
          this.setState({
            status: "connected",
            qrDataUrl: null,
            phoneNumber,
            connectedAt: new Date(),
          });
          this.emit("connected", phoneNumber);
          console.log(`[WhatsApp] Conectado: ${phoneNumber}`);
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[WhatsApp] Conexão fechada. Código: ${statusCode}. Reconectar: ${shouldReconnect}`);

          if (statusCode === DisconnectReason.loggedOut) {
            this.setState({ status: "logged_out", qrDataUrl: null, phoneNumber: null, connectedAt: null });
            this.clearSession();
            this.emit("logged_out");
          } else if (shouldReconnect && !this.isShuttingDown) {
            this.setState({ status: "disconnected" });
            this.emit("disconnected");
            // Tentar reconectar após 5 segundos
            this.reconnectTimer = setTimeout(() => {
              if (!this.isShuttingDown) {
                this.connect().catch(console.error);
              }
            }, 5000);
          } else {
            this.setState({ status: "disconnected" });
            this.emit("disconnected");
          }
        }
      });
    } catch (err) {
      console.error("[WhatsApp] Erro ao conectar:", err);
      this.setState({ status: "disconnected" });
    }
  }

  async disconnect(): Promise<void> {
    this.isShuttingDown = true;
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
    this.clearSession();
    this.setState({ status: "disconnected", qrDataUrl: null, phoneNumber: null, connectedAt: null });
    this.emit("disconnected");
  }

  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    if (this.state.status !== "connected" || !this.sock) {
      console.warn("[WhatsApp] Tentativa de envio sem conexão ativa");
      return false;
    }

    try {
      // Formatar número: remover não-dígitos e adicionar @s.whatsapp.net
      const cleaned = phoneNumber.replace(/\D/g, "");
      // Adicionar código do país se não tiver (assume Brasil +55)
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

  private clearSession(): void {
    try {
      if (fs.existsSync(SESSION_DIR)) {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        console.log("[WhatsApp] Sessão removida");
      }
    } catch (err) {
      console.error("[WhatsApp] Erro ao remover sessão:", err);
    }
  }

  // Inicializar: tentar reconectar se já havia sessão salva
  async init(): Promise<void> {
    if (fs.existsSync(SESSION_DIR) && fs.readdirSync(SESSION_DIR).length > 0) {
      console.log("[WhatsApp] Sessão existente encontrada, reconectando...");
      await this.connect();
    } else {
      console.log("[WhatsApp] Nenhuma sessão salva. Aguardando conexão manual.");
    }
  }
}

// Singleton global
export const waManager = new WhatsAppManager();

// Helper para enviar mensagem de confirmação de agendamento
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

// Helper para enviar mensagem de cancelamento
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

// Helper para lembrete de pacote vencendo
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
