import { Download, Mountain, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { GeoPoint } from "@/lib/field-log";
import { formatMissionTime } from "@/lib/mission";

function exportCsv(points: GeoPoint[]) {
  const header = ["id", "recurso", "abundancia", "latitud", "longitud", "punto_ruta", "terreno", "pendiente", "tiempo_mision", "notas"];
  const rows = points.map((g) => [
    g.id,
    g.resource,
    g.abundance,
    g.location.lat.toFixed(5),
    g.location.lon.toFixed(5),
    g.location.waypoint,
    g.location.terrain,
    g.location.slope,
    formatMissionTime(g.location.missionTime),
    g.notes.replace(/"/g, '""'),
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "ares-hud-puntos-geologicos.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function GeoPointsSheet({
  open,
  onOpenChange,
  points,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  points: GeoPoint[];
  onDelete: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-border bg-popover sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="hud-title flex items-center gap-2"><Mountain className="size-4" /> Puntos geológicos</SheetTitle>
          <SheetDescription>Lugares del recorrido donde se encontraron recursos.</SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <Button variant="hud" size="sm" disabled={points.length === 0} onClick={() => exportCsv(points)}>
            <Download /> Exportar CSV
          </Button>
        </div>
        <ol className="mt-4 space-y-2">
          {points.length === 0 && (
            <li className="rounded-sm border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Aún no hay puntos. Usa “Guardar muestra geológica” al encontrar un recurso.
            </li>
          )}
          {points.map((g) => (
            <li key={g.id} className="rounded-sm border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-accent">{g.resource}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Abundancia {g.abundance} · {g.id}
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label="Eliminar punto" onClick={() => onDelete(g.id)}>
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
              <p className="mt-1 font-mono text-[11px] text-primary">
                {g.location.lat.toFixed(5)}°N {g.location.lon.toFixed(5)}°E
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {g.location.waypoint} · {g.location.terrain} · {g.location.slope}° · T+{formatMissionTime(g.location.missionTime)}
              </p>
              {g.notes && <p className="mt-1 text-sm text-secondary-foreground">{g.notes}</p>}
            </li>
          ))}
        </ol>
      </SheetContent>
    </Sheet>
  );
}
