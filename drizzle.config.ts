import { defineConfig } from "drizzle-kit";
import { readFileSync } from "node:fs";

const connection = JSON.parse(readFileSync("database-postgres.local.json", "utf8"));

export default defineConfig({
  schema: ["./drizzle/schema.ts", "./server/stripe-event-store.ts"],
  out: "./drizzle-postgres",
  dialect: "postgresql",
  dbCredentials: {
    host: connection.host,
    port: connection.port,
    user: connection.user,
    database: connection.database,
    ssl: false,
  },
});
