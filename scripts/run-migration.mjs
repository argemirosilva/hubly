import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();

const sql = `ALTER TABLE \`historico_envios_automacao\` MODIFY COLUMN \`status\` enum('enviado','falhou','pendente','agendado') NOT NULL DEFAULT 'enviado'`;

const conn = await mysql.createConnection(process.env.DATABASE_URL);
console.log("Conectado ao banco.");
const [result] = await conn.execute(sql);
console.log("Migration aplicada:", result);
await conn.end();
console.log("Concluído.");
