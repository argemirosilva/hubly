import { createConnection } from "mysql2/promise";

const conn = await createConnection(process.env.DATABASE_URL);
try {
  await conn.execute("ALTER TABLE `system_users` ADD `avatarUrl` text;");
  console.log("Migration 0017 applied: avatarUrl added to system_users.");
} catch (err) {
  if (err.code === "ER_DUP_FIELDNAME") {
    console.log("Column avatarUrl already exists, skipping.");
  } else {
    throw err;
  }
} finally {
  await conn.end();
}
