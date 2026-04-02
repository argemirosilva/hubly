import { useRef, useState } from "react";
import { Upload, X, ImageIcon, Loader2, ZoomIn } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  /** URLs das imagens já salvas */
  imagens: string[];
  /** Chamado quando uma nova imagem é selecionada para upload */
  onUpload: (file: File) => Promise<void>;
  /** Chamado quando o usuário remove uma imagem */
  onRemover: (url: string) => Promise<void>;
  /** Máximo de imagens permitidas (default: 5) */
  maxImagens?: number;
  /** Se true, desabilita interações */
  disabled?: boolean;
}

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const TAMANHO_MAX_MB = 5;

export function ImageUpload({
  imagens,
  onUpload,
  onRemover,
  maxImagens = 5,
  disabled = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validações
    if (!TIPOS_ACEITOS.includes(file.type)) {
      toast.error("Formato não suportado. Use JPG, PNG, WEBP ou GIF.");
      return;
    }
    if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
      toast.error(`Imagem muito grande. Máximo ${TAMANHO_MAX_MB}MB.`);
      return;
    }
    if (imagens.length >= maxImagens) {
      toast.error(`Máximo de ${maxImagens} imagens por agendamento.`);
      return;
    }

    setUploading(true);
    try {
      await onUpload(file);
      toast.success("Imagem enviada com sucesso!");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar imagem.");
    } finally {
      setUploading(false);
      // Limpar input para permitir re-upload do mesmo arquivo
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemover(url: string) {
    setRemovendo(url);
    try {
      await onRemover(url);
      toast.success("Imagem removida.");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao remover imagem.");
    } finally {
      setRemovendo(null);
    }
  }

  const podeAdicionarMais = imagens.length < maxImagens && !disabled;

  return (
    <div className="space-y-3">
      {/* Grid de imagens */}
      {imagens.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {imagens.map((url, i) => (
            <div
              key={url}
              className="relative group aspect-square rounded-xl overflow-hidden border"
              style={{ borderColor: "oklch(88% 0.010 250)" }}
            >
              <img
                src={url}
                alt={`Imagem ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Overlay com ações */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setPreview(url)}
                  className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                  title="Ver imagem"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-slate-700" />
                </button>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemover(url)}
                    disabled={removendo === url}
                    className="w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center hover:bg-red-600 transition-colors"
                    title="Remover imagem"
                  >
                    {removendo === url
                      ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                      : <X className="w-3.5 h-3.5 text-white" />
                    }
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Botão adicionar mais (dentro do grid) */}
          {podeAdicionarMais && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors"
              style={{
                borderColor: "oklch(80% 0.010 250)",
                color: "oklch(55% 0.010 260)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "oklch(55% 0.22 264)";
                (e.currentTarget as HTMLElement).style.color = "oklch(45% 0.18 264)";
                (e.currentTarget as HTMLElement).style.background = "oklch(55% 0.22 264 / 5%)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "oklch(80% 0.010 250)";
                (e.currentTarget as HTMLElement).style.color = "oklch(55% 0.010 260)";
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {uploading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <Upload className="w-5 h-5" />
              }
              <span className="text-[10px] font-medium">Adicionar</span>
            </button>
          )}
        </div>
      )}

      {/* Área de upload inicial (quando não há imagens) */}
      {imagens.length === 0 && podeAdicionarMais && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed transition-all"
          style={{
            borderColor: "oklch(80% 0.010 250)",
            color: "oklch(55% 0.010 260)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = "oklch(55% 0.22 264)";
            (e.currentTarget as HTMLElement).style.color = "oklch(45% 0.18 264)";
            (e.currentTarget as HTMLElement).style.background = "oklch(55% 0.22 264 / 5%)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = "oklch(80% 0.010 250)";
            (e.currentTarget as HTMLElement).style.color = "oklch(55% 0.010 260)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(55% 0.22 264 / 10%)" }}>
              <ImageIcon className="w-5 h-5" style={{ color: "oklch(55% 0.22 264)" }} />
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-medium">
              {uploading ? "Enviando..." : "Clique para enviar imagens"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              JPG, PNG, WEBP ou GIF · Máx. {TAMANHO_MAX_MB}MB cada
            </p>
          </div>
        </button>
      )}

      {/* Contador */}
      {imagens.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {imagens.length} de {maxImagens} imagem(ns) · JPG, PNG, WEBP ou GIF · Máx. {TAMANHO_MAX_MB}MB
        </p>
      )}

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_ACEITOS.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Modal de preview */}
      {preview && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ background: "oklch(0% 0 0 / 80%)" }}
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain rounded-2xl"
              style={{ maxHeight: "85vh" }}
            />
            <button
              onClick={() => setPreview(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
