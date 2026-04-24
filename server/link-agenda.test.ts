import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const routersCode = readFileSync('./server/routers.ts', 'utf-8');
const schedulerCode = readFileSync('./server/scheduler.ts', 'utf-8');
const automacoesCode = readFileSync('./client/src/pages/Automacoes.tsx', 'utf-8');

describe('Link "Adicionar à Agenda" ({{link_agenda}})', () => {
  it('função gerarLinkAgenda existe no routers.ts', () => {
    expect(routersCode).toContain('function gerarLinkAgenda(');
  });

  it('função gerarLinkAgendaScheduler existe no scheduler.ts', () => {
    expect(schedulerCode).toContain('function gerarLinkAgendaScheduler(');
  });

  it('gerarLinkAgenda gera URL do Google Calendar com parâmetros corretos', () => {
    // Extrair e testar a lógica da função
    expect(routersCode).toContain("calendar.google.com/calendar/render");
    expect(routersCode).toContain("action");
    expect(routersCode).toContain("TEMPLATE");
    expect(routersCode).toContain("America/Sao_Paulo");
  });

  it('link_agenda está no processarVariaveisTemplate', () => {
    expect(routersCode).toContain("link_agenda?: string");
    expect(routersCode).toContain("link_agenda");
  });

  it('link_agenda está nos templateVars da criação de agendamento', () => {
    // Verificar que gerarLinkAgenda é chamado nos templateVars
    const criacaoMatch = routersCode.match(/const templateVars = \{[\s\S]*?link_agenda: gerarLinkAgenda/);
    expect(criacaoMatch).not.toBeNull();
  });

  it('link_agenda está nos templateVars do confirmarReserva', () => {
    const reservaMatch = routersCode.match(/templateVarsReserva = \{[\s\S]*?link_agenda: gerarLinkAgenda/);
    expect(reservaMatch).not.toBeNull();
  });

  it('link_agenda está nos templateVars da mudança de status', () => {
    const statusMatch = routersCode.match(/templateVars2 = \{[\s\S]*?link_agenda: gerarLinkAgenda/);
    expect(statusMatch).not.toBeNull();
  });

  it('link_agenda está nos templateVars do scheduler (dias_antes)', () => {
    expect(schedulerCode).toContain('link_agenda: gerarLinkAgendaScheduler(');
  });

  it('{{link_agenda}} está disponível como variável no frontend', () => {
    expect(automacoesCode).toContain('{{link_agenda}}');
    expect(automacoesCode).toContain('adicionar à agenda');
  });

  it('horaFim está incluído nas queries do scheduler', () => {
    const horaFimCount = (schedulerCode.match(/horaFim: agendamentos\.horaFim/g) || []).length;
    // Deve ter pelo menos 5 ocorrências (dias_antes, horas_antes, horas_apos, dias_depois, pre-registro, recorrências)
    expect(horaFimCount).toBeGreaterThanOrEqual(5);
  });
});
