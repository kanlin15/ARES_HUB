import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { newId, type FieldLocation, type GeoPoint } from "@/lib/field-log";
import { ABUNDANCE, GEO_RESOURCES } from "@/lib/mission";
import { ChipGroup } from "./ChipGroup";
import { LocationTag } from "./LocationTag";

export function GeoPointDialog({
  open,
  onOpenChange,
  location,
  detected,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  location: FieldLocation;
  detected: string;
  onSave: (g: GeoPoint) => void;
}) {
  const initial = (GEO_RESOURCES as readonly string[]).includes(detected) ? detected : "Otro";
  const [resource, setResource] = useState(initial);
  const [abundance, setAbundance] = useState<string>("Media");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) setResource(initial);
  }, [open, initial]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: newId("GP"), resource, abundance, notes: notes.trim(), location, createdAt: Date.now() });
    toast.success("Punto geológico guardado", { description: `${resource} · abundancia ${abundance.toLowerCase()}` });
    setNotes("");
    setAbundance("Media");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="hud-panel max-h-[90vh] overflow-y-auto border-border bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="hud-title">Guardar muestra geológica</DialogTitle>
          <DialogDescription>Marca este punto del recorrido donde se encontró el recurso.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <LocationTag location={location} />
          <div className="space-y-1.5">
            <Label className="hud-label">Recurso encontrado · detectado: {detected}</Label>
            <ChipGroup label="Recurso" options={GEO_RESOURCES} value={resource} onChange={setResource} />
          </div>
          <div className="space-y-1.5">
            <Label className="hud-label">Abundancia estimada</Label>
            <ChipGroup label="Abundancia" options={ABUNDANCE} value={abundance} onChange={setAbundance} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-notes" className="hud-label">Notas</Label>
            <Textarea id="g-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Afloramiento, extensión, acceso…" rows={3} maxLength={600} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="hudSolid">Guardar punto</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
