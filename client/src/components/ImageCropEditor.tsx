import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCw, Check, X } from "lucide-react";

interface ImageCropEditorProps {
  /** URL da imagem original (object URL ou data URL) */
  imageSrc: string;
  /** Proporção do recorte: ex. 1 para quadrado, 3 para banner */
  aspect?: number;
  /** Título do dialog */
  title?: string;
  /** Callback com o blob final recortado */
  onConfirm: (blob: Blob, mimeType: string) => void;
  onCancel: () => void;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area, rotation: number): Promise<Blob> {
  const image = await createImageBitmap(await (await fetch(imageSrc)).blob());
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);
  ctx.drawImage(image, safeArea / 2 - image.width / 2, safeArea / 2 - image.height / 2);

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas is empty"));
    }, "image/jpeg", 0.92);
  });
}

export function ImageCropEditor({ imageSrc, aspect = 1, title = "Editar imagem", onConfirm, onCancel }: ImageCropEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onConfirm(blob, "image/jpeg");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>

        {/* Área de crop */}
        <div className="relative w-full bg-slate-900" style={{ height: 320 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: "#0f172a" },
              cropAreaStyle: { border: "2px solid white", borderRadius: aspect === 1 ? "50%" : "8px" },
            }}
          />
        </div>

        {/* Controles */}
        <div className="px-5 py-4 space-y-4 bg-white">
          {/* Zoom */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <Slider
              min={1}
              max={3}
              step={0.05}
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500 w-10 text-right">{Math.round(zoom * 100)}%</span>
          </div>

          {/* Rotação */}
          <div className="flex items-center gap-3">
            <RotateCw className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <Slider
              min={-180}
              max={180}
              step={1}
              value={[rotation]}
              onValueChange={([v]) => setRotation(v)}
              className="flex-1"
            />
            <span className="text-xs text-slate-500 w-10 text-right">{rotation}°</span>
            <button
              onClick={() => setRotation(r => (r + 90) % 360)}
              className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 flex-shrink-0"
            >
              +90°
            </button>
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 gap-2 flex-row justify-end">
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={processing || !croppedAreaPixels}>
            {processing
              ? <><span className="w-4 h-4 mr-1 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Processando...</>
              : <><Check className="w-4 h-4 mr-1" /> Aplicar</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
