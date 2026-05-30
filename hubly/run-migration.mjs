import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";

const sql = readFileSync("./drizzle/0016_tired_puma.sql", "utf8");
const conn = await createConnection(process.env.DATABASE_URL);
try {
  await conn.execute(sql);
  console.log("Migration applied successfully.");
} catch (err) {
  if (err.code === "ER_TABLE_EXISTS_ERROR") {
    console.log("Table already exists, skipping.");
  } else {
    throw err;
  }
} finally {
  await conn.end();
}
