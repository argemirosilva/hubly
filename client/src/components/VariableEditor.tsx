import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";

// Regex para detectar variáveis no formato {{variavel}}
const VAR_REGEX = /(\{\{[a-z_]+\}\})/gi;

// Mapeamento de variáveis para labels amigáveis
const VAR_LABELS: Record<string, string> = {
  "{{nome_cliente}}": "nome cliente",
  "{{primeiro_nome}}": "primeiro nome",
  "{{servico}}": "serviço",
  "{{profissional}}": "profissional",
  "{{data}}": "data",
  "{{hora}}": "hora",
  "{{valor}}": "valor",
  "{{empresa}}": "empresa",
  "{{link_confirmacao}}": "link confirmação",
  "{{link_agendamento}}": "link agendamento",
  "{{valor_reserva}}": "valor reserva",
  "{{nome_pacote}}": "nome pacote",
  "{{data_vencimento}}": "data vencimento",
  "{{valor_pago}}": "valor pago",
  "{{parcelas}}": "parcelas",
  "{{pacote}}": "pacote",
  "{{sessoes_restantes}}": "sessões restantes",
  "{{sessoes_total}}": "sessões total",
};

// Converte texto puro com {{variavel}} em HTML com chips
function textToHtml(text: string): string {
  if (!text) return "";
  const parts = text.split(VAR_REGEX);
  return parts
    .map((part) => {
      if (VAR_REGEX.test(part)) {
        VAR_REGEX.lastIndex = 0; // reset regex state
        const label = VAR_LABELS[part.toLowerCase()] || part.replace(/\{\{|\}\}/g, "");
        return `<span class="var-chip" contenteditable="false" data-var="${part}">${label}</span>`;
      }
      // Escapar HTML mas preservar quebras de linha
      return part
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
    })
    .join("");
}

// Converte HTML do contenteditable de volta para texto puro com {{variavel}}
function htmlToText(html: string): string {
  // Criar elemento temporário para parsear o HTML
  const div = document.createElement("div");
  div.innerHTML = html;

  function nodeToText(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      // Chip de variável
      if (el.classList.contains("var-chip")) {
        return el.getAttribute("data-var") || el.textContent || "";
      }
      // Quebra de linha
      if (el.tagName === "BR") {
        return "\n";
      }
      // Div/p = nova linha
      const children = Array.from(el.childNodes).map(nodeToText).join("");
      if (el.tagName === "DIV" || el.tagName === "P") {
        return "\n" + children;
      }
      return children;
    }
    return "";
  }

  const text = Array.from(div.childNodes).map(nodeToText).join("");
  // Limpar quebras de linha duplicadas no início
  return text.replace(/^\n/, "");
}

// Salvar e restaurar posição do cursor
function saveCursorPosition(el: HTMLElement): { node: Node; offset: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.startContainer)) return null;
  return { node: range.startContainer, offset: range.startOffset };
}

function restoreCursorPosition(el: HTMLElement, pos: { node: Node; offset: number } | null) {
  if (!pos) return;
  try {
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.setStart(pos.node, pos.offset);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch {
    // cursor pode ter ficado inválido após re-render
  }
}

export interface VariableEditorRef {
  insertVariable: (varText: string) => void;
  focus: () => void;
}

interface VariableEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const VariableEditor = forwardRef<VariableEditorRef, VariableEditorProps>(
  ({ value, onChange, placeholder, className = "", minHeight = "90px" }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const isComposingRef = useRef(false);
    const lastValueRef = useRef(value);

    // Expor métodos ao pai
    useImperativeHandle(ref, () => ({
      insertVariable: (varText: string) => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          // Remover seleção atual
          range.deleteContents();

          // Criar chip
          const chip = document.createElement("span");
          chip.className = "var-chip";
          chip.contentEditable = "false";
          chip.setAttribute("data-var", varText);
          chip.textContent = VAR_LABELS[varText.toLowerCase()] || varText.replace(/\{\{|\}\}/g, "");

          range.insertNode(chip);

          // Mover cursor após o chip
          const newRange = document.createRange();
          newRange.setStartAfter(chip);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        } else {
          // Sem seleção: inserir no final
          const chip = document.createElement("span");
          chip.className = "var-chip";
          chip.contentEditable = "false";
          chip.setAttribute("data-var", varText);
          chip.textContent = VAR_LABELS[varText.toLowerCase()] || varText.replace(/\{\{|\}\}/g, "");
          el.appendChild(chip);
        }

        // Notificar mudança
        const newText = htmlToText(el.innerHTML);
        lastValueRef.current = newText;
        onChange(newText);
      },
      focus: () => {
        editorRef.current?.focus();
      },
    }));

    // Sincronizar valor externo → HTML interno (apenas quando o valor muda externamente)
    useEffect(() => {
      const el = editorRef.current;
      if (!el) return;
      if (value === lastValueRef.current) return; // sem mudança externa

      // Salvar cursor
      const pos = saveCursorPosition(el);
      el.innerHTML = textToHtml(value);
      lastValueRef.current = value;
      restoreCursorPosition(el, pos);
    }, [value]);

    // Inicializar HTML na montagem
    useEffect(() => {
      const el = editorRef.current;
      if (!el) return;
      el.innerHTML = textToHtml(value);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleInput = useCallback(() => {
      if (isComposingRef.current) return;
      const el = editorRef.current;
      if (!el) return;
      const newText = htmlToText(el.innerHTML);
      if (newText !== lastValueRef.current) {
        lastValueRef.current = newText;
        onChange(newText);
      }
    }, [onChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
      // Backspace/Delete: se o cursor está logo após/antes de um chip, remover o chip inteiro
      if (e.key === "Backspace" || e.key === "Delete") {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        if (!range.collapsed) return; // tem seleção, deixar comportamento padrão

        if (e.key === "Backspace") {
          // Verificar se o nó anterior é um chip
          const { startContainer, startOffset } = range;
          if (startOffset === 0 && startContainer.previousSibling) {
            const prev = startContainer.previousSibling as HTMLElement;
            if (prev.classList?.contains("var-chip")) {
              e.preventDefault();
              prev.remove();
              handleInput();
              return;
            }
          }
          // Se o cursor está dentro de um nó de texto e o char anterior é parte de um chip (não deve acontecer)
        } else {
          // Delete: verificar se o próximo nó é um chip
          const { startContainer, startOffset } = range;
          const textLen = startContainer.nodeType === Node.TEXT_NODE
            ? (startContainer.textContent || "").length
            : 0;
          if (startOffset === textLen && startContainer.nextSibling) {
            const next = startContainer.nextSibling as HTMLElement;
            if (next.classList?.contains("var-chip")) {
              e.preventDefault();
              next.remove();
              handleInput();
              return;
            }
          }
        }
      }
    }, [handleInput]);

    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      // Inserir como HTML com chips
      const html = textToHtml(text);
      document.execCommand("insertHTML", false, html);
      handleInput();
    }, [handleInput]);

    const isEmpty = !value || value.trim() === "";

    return (
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
            handleInput();
          }}
          className={`
            w-full rounded-md border border-input bg-background px-3 py-2 text-sm
            ring-offset-background focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-ring focus-visible:ring-offset-2
            overflow-y-auto whitespace-pre-wrap break-words
            [&_.var-chip]:inline-flex [&_.var-chip]:items-center
            [&_.var-chip]:bg-indigo-100 [&_.var-chip]:text-indigo-700
            [&_.var-chip]:border [&_.var-chip]:border-indigo-300
            [&_.var-chip]:rounded-full [&_.var-chip]:px-2 [&_.var-chip]:py-0.5
            [&_.var-chip]:text-xs [&_.var-chip]:font-medium
            [&_.var-chip]:mx-0.5 [&_.var-chip]:cursor-default
            [&_.var-chip]:select-none [&_.var-chip]:leading-tight
            ${className}
          `}
          style={{ minHeight }}
          data-placeholder={placeholder}
        />
        {isEmpty && placeholder && (
          <div
            className="absolute top-2 left-3 text-sm text-muted-foreground pointer-events-none"
            style={{ lineHeight: "1.5" }}
          >
            {placeholder}
          </div>
        )}
      </div>
    );
  }
);

VariableEditor.displayName = "VariableEditor";

export default VariableEditor;
