import assert from "node:assert/strict";
import { test } from "node:test";
import { isManagementAppPath, resolveMobileLink } from "../client/src/lib/mobile-links.ts";

test("resolve esquema customizado com host ou caminho", () => {
  assert.equal(resolveMobileLink("hubly://agendamento/123"), "/admin/agendamentos?id=123");
  assert.equal(resolveMobileLink("hubly:///cliente/42"), "/admin/clientes/42");
  assert.equal(resolveMobileLink("hubly://cliente/42"), "/admin/clientes/42");
});
test("app permite gestão e seus fluxos auxiliares, excluindo portal público", () => {
  for (const path of ["/admin", "/admin/calendario", "/admin/financeiro", "/cadastro", "/onboarding", "/atendimento", "/politica-de-privacidade", "/termos-de-uso"]) {
    assert.equal(isManagementAppPath(path), true, path);
  }
  for (const path of ["/", "/agendar", "/agendar/empresa", "/confirmar/token", "/assinaturas", "/recursos", "/administrator", "//evil.example"]) {
    assert.equal(isManagementAppPath(path), false, path);
    assert.equal(resolveMobileLink(`https://hubly.orizontech.com.br${path}`), null, path);
  }
});
test("preserva caminho, parâmetros e fragmento no domínio confiável", () => {
  assert.equal(resolveMobileLink("https://hubly.orizontech.com.br/admin?tab=1#agenda"), "/admin?tab=1#agenda");
});
test("ignora entradas inválidas e origens externas", () => {
  for (const value of ["invalid", "javascript:alert(1)", "https://evil.example/admin", "https://hubly.orizontech.com.br.evil.example", "http://hubly.orizontech.com.br", "https://user@hubly.orizontech.com.br", "hubly://cliente/abc", "hubly://cliente/42/extra"]) {
    assert.equal(resolveMobileLink(value), null, value);
  }
});
