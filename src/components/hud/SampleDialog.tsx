import { useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { compressImage, newId, type FieldLocation, type Sample } from "@/lib/field-log";
import { SAMPLE_CATEGORIES } from "@/lib/mission";
import { ChipGroup } from "./ChipGroup";
import { LocationTag } from "./LocationTag";

export function SampleDialog({
  open,
  onOpenChange,
  location,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  location: FieldLocation;
  onSave: (s: Sample) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(SAMPLE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setName("");
    setCategory(SAMPLE_CATEGORIES[0]);
    setDescription("");
    setPhotos([]);
  };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const imgs = await Promise.all(Array.from(files).slice(0, 6).map((f) => compressImage(f)));
      setPhotos((p) => [...p, ...imgs].slice(0, 6));
    } catch {
      toast.error("No se pudo cargar una de las fotos");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: newId("MX"),
      name: name.trim(),
      category,
      description: description.trim(),
      photos,
      location,
      createdAt: Date.now(),
    });
    toast.success("Muestra guardada en la bitácora", { description: name.trim() });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="hud-panel max-h-[90vh] overflow-y-auto border-border bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="hud-title">Registrar muestra recolectada</DialogTitle>
          <DialogDescription>La ubicación del recorrido se guarda automáticamente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <LocationTag location={location} />
          <div className="space-y-1.5">
            <Label htmlFor="s-name" className="hud-label">Nombre del objeto</Label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Fragmento de basalto vesicular" required maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label className="hud-label">Tipo</Label>
            <ChipGroup label="Tipo de muestra" options={SAMPLE_CATEGORIES} value={category} onChange={setCategory} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-desc" className="hud-label">Observaciones</Label>
            <Textarea id="s-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Color, textura, tamaño, contexto…" rows={3} maxLength={600} />
          </div>
          <div className="space-y-2">
            <Label className="hud-label">Fotos ({photos.length}/6)</Label>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((src, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-sm border border-border">
                  <img src={src} alt={`Foto ${i + 1} de la muestra`} className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label="Quitar foto"
                    onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 rounded-sm bg-background/80 p-0.5 text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="hud" size="sm" disabled={busy || photos.length >= 6} onClick={() => cameraRef.current?.click()}>
                <Camera /> Cámara
              </Button>
              <Button type="button" variant="hud" size="sm" disabled={busy || photos.length >= 6} onClick={() => fileRef.current?.click()}>
                <ImagePlus /> Galería
              </Button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="hudSolid" disabled={busy || !name.trim()}>Guardar muestra</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
