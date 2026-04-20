import { createConnection } from "mysql2/promise";
import { config } from "dotenv";

config();

const sql = `
ALTER TABLE \`historico_envios_automacao\` ADD COLUMN IF NOT EXISTS \`zapiMessageId\` varchar(255);
ALTER TABLE \`historico_envios_automacao\` ADD COLUMN IF NOT EXISTS \`messageStatus\` enum('sent','delivered','read','failed') DEFAULT 'sent';
ALTER TABLE \`historico_envios_automacao\` ADD COLUMN IF NOT EXISTS \`messageStatusAt\` timestamp NULL;
`;

const conn = await createConnection(process.env.DATABASE_URL);
for (const stmt of sql.split(";").map(s => s.trim()).filter(Boolean)) {
  try {
    await conn.execute(stmt);
    console.log("✓", stmt.slice(0, 60));
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") {
      console.log("⏭ Coluna já existe:", stmt.slice(0, 60));
    } else {
      throw e;
    }
  }
}
await conn.end();
console.log("Migration concluída.");
