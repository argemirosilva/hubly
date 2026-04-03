import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Check, Search, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Cliente {
  id: number;
  nome: string;
  telefone?: string | null;
  email?: string | null;
}

interface Props {
  clientes: Cliente[] | undefined;
  value: string; // clienteId como string
  onValueChange: (clienteId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Remove acentuação de uma string para busca case-insensitive.
 */
function removeAcentos(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function ClienteAutocomplete({
  clientes,
  value,
  onValueChange,
  placeholder = "Buscar cliente...",
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce de 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Busca inteligente: nome, sobrenome, parcial, sem acentos, case-insensitive
  const filteredClientes = useMemo(() => {
    if (!clientes) return [];
    if (!debouncedSearch.trim()) return clientes.slice(0, 20);
    const terms = removeAcentos(debouncedSearch.toLowerCase()).split(/\s+/);
    return clientes
      .filter((c) => {
        const nome = removeAcentos(c.nome.toLowerCase());
        const telefone = c.telefone ? removeAcentos(c.telefone.toLowerCase()) : "";
        return terms.every(
          (term) => nome.includes(term) || telefone.includes(term)
        );
      })
      .slice(0, 10);
  }, [clientes, debouncedSearch]);

  // Nome do cliente selecionado
  const selectedCliente = useMemo(
    () => clientes?.find((c) => String(c.id) === value),
    [clientes, value]
  );

  const handleSelect = useCallback(
    (clienteId: string) => {
      onValueChange(clienteId);
      setSearch("");
      setOpen(false);
    },
    [onValueChange]
  );

  const handleClear = useCallback(() => {
    onValueChange("");
    setSearch("");
  }, [onValueChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={open ? search : selectedCliente?.nome ?? ""}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              setSearch("");
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-8 pr-8"
            autoComplete="off"
          />
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {!clientes ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
              </div>
            ) : filteredClientes.length === 0 ? (
              <CommandEmpty>
                <span className="text-sm text-muted-foreground">Nenhum cliente encontrado</span>
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredClientes.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={String(c.id)}
                    onSelect={() => handleSelect(String(c.id))}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        String(c.id) === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{c.nome}</span>
                      {c.telefone && (
                        <span className="text-xs text-muted-foreground">{c.telefone}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
