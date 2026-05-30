import "dotenv/config";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const url = new URL(process.env.DATABASE_URL);

const connection = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port) || 4000,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

const novaSenha = "remoto!123";
const hash = await bcrypt.hash(novaSenha, 10);
console.log("Hash gerado:", hash);

const [result] = await connection.execute(
  "UPDATE system_users SET passwordHash = ? WHERE email = ?",
  [hash, "mariaalvesacomercial@gmail.com"]
);

console.log("Linhas afetadas:", result.affectedRows);

// Verificar
const [rows] = await connection.execute(
  "SELECT id, nome, email, LEFT(passwordHash, 10) as hash_preview, ativo FROM system_users WHERE email = ?",
  ["mariaalvesacomercial@gmail.com"]
);
console.log("Usuário atualizado:", rows[0]);

// Testar a senha
const [userRows] = await connection.execute(
  "SELECT passwordHash FROM system_users WHERE email = ?",
  ["mariaalvesacomercial@gmail.com"]
);
const senhaOk = await bcrypt.compare(novaSenha, userRows[0].passwordHash);
console.log("Senha verificada com sucesso?", senhaOk);

await connection.end();
