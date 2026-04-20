import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Ver planos atuais
const [empresas] = await conn.execute(
  `SELECT e.id, e.nome, s.planType, s.status, s.id as subId
   FROM empresas e
   LEFT JOIN subscriptions s ON s.empresaId = e.id
   LIMIT 20`
);
console.log("Empresas e planos:", JSON.stringify(empresas, null, 2));

await conn.end();
