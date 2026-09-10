import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type RuntimeConfig = {
  publicUrl?: string;
  storage?: { root: string };
  ai?: { provider: "lmstudio"; baseUrl: string; model: string; credentialFile: string };
};

export function getRuntimeConfig(): RuntimeConfig {
  const path = resolve(process.cwd(), "runtime-local.json");
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

export function getPublicAppUrl(): string | undefined {
  return getRuntimeConfig().publicUrl ?? process.env.APP_PUBLIC_URL;
}
