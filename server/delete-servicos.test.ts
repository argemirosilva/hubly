import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const dbContent = fs.readFileSync(path.join(__dirname, 'db.ts'), 'utf-8');
const routersContent = fs.readFileSync(path.join(__dirname, 'routers.ts'), 'utf-8');
const servicosPage = fs.readFileSync(path.join(__dirname, '../client/src/pages/Servicos.tsx'), 'utf-8');

describe('Delete/Desativar Serviços', () => {
  describe('Backend — db.ts', () => {
    it('deve ter a função verificarVinculosServico', () => {
      expect(dbContent).toMatch(/export async function verificarVinculosServico/);
    });

    it('deve verificar vínculos em agendamentos', () => {
      expect(dbContent).toMatch(/agendamentoItens|agendamentos.*servicoId|servicoId.*agendamento/s);
    });

    it('deve ter a função deleteOuDesativarServico', () => {
      expect(dbContent).toMatch(/export async function deleteOuDesativarServico/);
    });

    it('deve desativar (ativo=false) quando há vínculos em vez de deletar', () => {
      const fnMatch = dbContent.match(/export async function deleteOuDesativarServico[\s\S]*?^}/m);
      expect(fnMatch).toBeTruthy();
      const fn = fnMatch![0];
      expect(fn).toMatch(/ativo.*false|false.*ativo/);
      expect(fn).toMatch(/temVinculos/);
    });

    it('deve ter a função deleteLoteServicos', () => {
      expect(dbContent).toMatch(/export async function deleteLoteServicos/);
    });

    it('deleteLoteServicos deve retornar contadores de deletados e desativados', () => {
      const fnMatch = dbContent.match(/export async function deleteLoteServicos[\s\S]*?^}/m);
      expect(fnMatch).toBeTruthy();
      const fn = fnMatch![0];
      expect(fn).toMatch(/deletados/);
      expect(fn).toMatch(/desativados/);
    });
  });

  describe('Backend — routers.ts', () => {
    it('deve ter a procedure servicos.verificarVinculos', () => {
      expect(routersContent).toMatch(/verificarVinculos.*protectedProcedure|protectedProcedure[\s\S]*?verificarVinculos/);
    });

    it('deve ter a procedure servicos.delete', () => {
      expect(routersContent).toMatch(/delete.*protectedProcedure|protectedProcedure[\s\S]*?deleteOuDesativarServico/);
    });

    it('deve ter a procedure servicos.deleteLote', () => {
      expect(routersContent).toMatch(/deleteLote.*protectedProcedure|protectedProcedure[\s\S]*?deleteLoteServicos/);
    });

    it('deve usar a permissão servicosExcluir nas procedures de delete', () => {
      const deleteSection = routersContent.match(/verificarVinculos.*?deleteLote[\s\S]*?}\)/s);
      if (deleteSection) {
        expect(deleteSection[0]).toMatch(/servicosExcluir/);
      } else {
        expect(routersContent).toMatch(/servicosExcluir/);
      }
    });
  });

  describe('Frontend — Servicos.tsx', () => {
    it('deve importar trpc', () => {
      expect(servicosPage).toMatch(/import.*trpc.*from.*trpc/);
    });

    it('deve ter o botão de excluir individual (Trash2 por serviço)', () => {
      expect(servicosPage).toMatch(/abrirModalDelete\(\[s\.id\]\)/);
    });

    it('deve ter o modo de seleção em lote (modoSelecao)', () => {
      expect(servicosPage).toMatch(/modoSelecao/);
      expect(servicosPage).toMatch(/selecionados/);
    });

    it('deve ter o botão de selecionar todos', () => {
      expect(servicosPage).toMatch(/toggleTodos/);
      expect(servicosPage).toMatch(/Selecionar todos|Desmarcar todos/);
    });

    it('deve ter o modal de confirmação de exclusão', () => {
      expect(servicosPage).toMatch(/deleteModalOpen/);
      expect(servicosPage).toMatch(/confirmarDelete/);
    });

    it('deve diferenciar serviços com e sem vínculos no modal', () => {
      expect(servicosPage).toMatch(/comVinculos/);
      expect(servicosPage).toMatch(/semVinculos/);
    });

    it('deve informar que serviços com vínculos serão desativados', () => {
      expect(servicosPage).toMatch(/desativado|desativar/i);
    });

    it('deve ter o banner explicativo do modo seleção', () => {
      expect(servicosPage).toMatch(/desativados.*vez de excluídos|desativados em vez de excluídos/i);
    });

    it('deve cancelar a seleção corretamente', () => {
      expect(servicosPage).toMatch(/cancelarSelecao/);
      expect(servicosPage).toMatch(/setModoSelecao\(false\)/);
      expect(servicosPage).toMatch(/setSelecionados\(new Set\(\)\)/);
    });

    it('deve usar deleteMutation para exclusão individual', () => {
      expect(servicosPage).toMatch(/trpc\.servicos\.delete\.useMutation/);
    });

    it('deve usar deleteLoteMutation para exclusão em lote', () => {
      expect(servicosPage).toMatch(/trpc\.servicos\.deleteLote\.useMutation/);
    });
  });
});
