import { useMemo, useState } from "react";
import { Package, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Sample } from "@/lib/field-log";
import { SAMPLE_CATEGORIES } from "@/lib/mission";
import { ChipGroup } from "./ChipGroup";
import { LocationTag } from "./LocationTag";

export function SamplesSheet({
  open,
  onOpenChange,
  samples,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  samples: Sample[];
  onDelete: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todas");
  const [detail, setDetail] = useState<Sample | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return samples.filter(
      (s) =>
        (cat === "Todas" || s.category === cat) &&
        (!term || `${s.name} ${s.description} ${s.location.waypoint}`.toLowerCase().includes(term)),
    );
  }, [samples, q, cat]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto border-border bg-popover sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="hud-title flex items-center gap-2"><Package className="size-4" /> Muestras recolectadas</SheetTitle>
            <SheetDescription>{samples.length} objetos registrados en el recorrido.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, nota o punto…" className="pl-8" />
            </div>
            <ChipGroup label="Filtrar por tipo" options={["Todas", ...SAMPLE_CATEGORIES]} value={cat} onChange={setCat} />
          </div>
          <ul className="mt-4 space-y-2">
            {filtered.length === 0 && (
              <li className="rounded-sm border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {samples.length === 0 ? "Aún no hay muestras. Usa “Registrar muestra” durante la caminata." : "Sin resultados."}
              </li>
            )}
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setDetail(s)}
                  className="flex w-full gap-3 rounded-sm border border-border p-2 text-left transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-sm bg-muted">
                    {s.photos[0] ? (
                      <img src={s.photos[0]} alt="" className="size-full object-cover" />
                    ) : (
                      <Package className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{s.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-accent">{s.category} · {s.id}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                      {s.location.waypoint} · {s.location.lat.toFixed(4)}°N {s.location.lon.toFixed(4)}°E · {s.photos.length} foto(s)
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="hud-panel max-h-[90vh] overflow-y-auto border-border bg-popover sm:max-w-2xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="hud-title">{detail.name}</DialogTitle>
                <DialogDescription className="font-mono text-xs uppercase tracking-wider">
                  {detail.category} · {detail.id} · {new Date(detail.createdAt).toLocaleString("es")}
                </DialogDescription>
              </DialogHeader>
              <LocationTag location={detail.location} />
              {detail.description && <p className="text-sm text-secondary-foreground">{detail.description}</p>}
              {detail.photos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {detail.photos.map((p, i) => (
                    <img key={i} src={p} alt={`${detail.name} — foto ${i + 1}`} className="aspect-square w-full rounded-sm border border-border object-cover" />
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  variant="hudDanger"
                  size="sm"
                  onClick={() => {
                    onDelete(detail.id);
                    setDetail(null);
                  }}
                >
                  <Trash2 /> Eliminar muestra
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
