import "dotenv/config";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { empresas, syncIntegrationClients } from "../drizzle/schema";
import { getDb } from "../server/db";
import { gerarCredencialSync, hashSecretSync } from "../server/sync-auth";

const [mode, firstArg, secondArg, ...nameParts] = process.argv.slice(2);

function usage(): never {
  console.error([
    "Uso:",
    "  pnpm sync:credential -- read <nome>",
    "  pnpm sync:credential -- marketing <empresaId> <sourceSystem> <nome>",
  ].join("\n"));
  process.exit(1);
}

const db = await getDb();
if (!db) throw new Error("DATABASE_URL indisponível");

if (mode === "read") {
  const nome = [firstArg, secondArg, ...nameParts].filter(Boolean).join(" ").trim();
  if (!nome) usage();
  const credential = gerarCredencialSync();
  await db.insert(syncIntegrationClients).values({
    clientId: credential.clientId,
    nome,
    secretHash: credential.secretHash,
    escopo: "sync.read.all",
  });
  console.log(JSON.stringify({
    clientId: credential.clientId,
    integrationKey: `${credential.clientId}.${credential.secret}`,
    scope: "sync.read.all",
  }, null, 2));
  process.exit(0);
}

if (mode === "marketing") {
  const empresaId = Number(firstArg);
  const sourceSystem = secondArg?.trim();
  const nome = nameParts.join(" ").trim();
  if (!Number.isInteger(empresaId) || empresaId <= 0 || !sourceSystem || !nome) usage();
  const [empresa] = await db.select({ id: empresas.id }).from(empresas)
    .where(eq(empresas.id, empresaId)).limit(1);
  if (!empresa) throw new Error(`Empresa ${empresaId} não encontrada`);

  const credential = gerarCredencialSync();
  const companyKey = crypto.randomBytes(32).toString("base64url");
  await db.insert(syncIntegrationClients).values({
    clientId: credential.clientId,
    nome,
    secretHash: credential.secretHash,
    escopo: "sync.write.marketing",
    empresaId,
    companyKeyHash: hashSecretSync(companyKey),
    sourceSystem,
  });
  console.log(JSON.stringify({
    integrationKey: `${credential.clientId}.${credential.secret}`,
    companyKey,
    sourceSystem,
    empresaId,
    scope: "sync.write.marketing",
    warning: "Guarde estas chaves agora. O Hubly armazena apenas os hashes.",
  }, null, 2));
  process.exit(0);
}

usage();
