/** Escopo de navegação do app de gestão, sem substituir autorização do servidor. */
export function isManagementAppPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/") || [
    "/cadastro", "/onboarding", "/setup", "/atendimento", "/ca",
    "/orizontech", "/suporte-admin", "/politica-de-privacidade", "/termos-de-uso",
  ].includes(pathname);
}

/** Resolve somente links de gestão do Hubly; autenticação permanece nas rotas. */
export function resolveMobileLink(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    if (url.protocol === "https:" && url.host === "hubly.orizontech.com.br") {
      if (!isManagementAppPath(url.pathname)) return null;
      return url.pathname + url.search + url.hash;
    }
    if (url.protocol !== "hubly:") return null;
    const parts = [url.hostname, ...url.pathname.split("/")].filter(Boolean);
    if (parts.length !== 2 || !/^\d+$/.test(parts[1])) return null;
    if (parts[0] === "agendamento") return `/admin/agendamentos?id=${parts[1]}`;
    if (parts[0] === "cliente") return `/admin/clientes/${parts[1]}`;
    return null;
  } catch {
    return null;
  }
}
