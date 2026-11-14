import { Crosshair, Gem, Mountain } from "lucide-react";
import { slopeLevel, waypointAt, type Position } from "@/lib/mission";
import { cn } from "@/lib/utils";

export function CenterHud({ position }: { position: Position }) {
  const level = slopeLevel(position.slope);
  const next = waypointAt(position.nextIndex);
  return (
    <div className="pointer-events-none relative flex flex-col items-center gap-6">
      {/* Reticle */}
      <div className="relative grid size-44 place-items-center sm:size-56">
        <svg viewBox="0 0 200 200" className="animate-reticle absolute inset-0 size-full" aria-hidden>
          <circle cx="100" cy="100" r="92" fill="none" stroke="var(--color-primary)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="4 8" />
          <path d="M100 4 v14 M100 182 v14 M4 100 h14 M182 100 h14" stroke="var(--color-primary)" strokeWidth="2" />
        </svg>
        <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden>
          <circle cx="100" cy="100" r="64" fill="none" stroke="var(--color-primary)" strokeOpacity="0.6" strokeWidth="1.5" />
        </svg>
        <Crosshair className="size-8 text-primary hud-glow" strokeWidth={1.25} />
        <div className="absolute -top-2 left-1/2 w-72 -translate-x-1/2 -translate-y-full text-center">
          <p className="hud-label">Siguiente punto · {next.id}</p>
          <p className="hud-value text-sm text-primary hud-glow">
            {next.name} · {Math.round(position.toNext)} m
          </p>
        </div>
      </div>

      {/* Slope & mineral readout */}
      <div className="flex flex-wrap items-stretch justify-center gap-3">
        <div
          className={cn(
            "hud-panel min-w-44 px-4 py-2 text-center",
            level.status === "critico" && "border-destructive",
          )}
        >
          <p className="hud-label flex items-center justify-center gap-1.5">
            <Mountain className="size-3" /> Inclinación
          </p>
          <p className={cn("hud-value text-3xl", `status-${level.status}`, level.status === "critico" && "hud-glow-danger")}>
            {position.slope}°
          </p>
          <p className={cn("font-mono text-[10px] tracking-[0.2em]", `status-${level.status}`, level.status === "critico" && "alert-blink")}>
            {level.label}
          </p>
        </div>
        <div className="hud-panel min-w-44 px-4 py-2 text-center">
          <p className="hud-label flex items-center justify-center gap-1.5">
            <Gem className="size-3" /> Mineral · CRISM
          </p>
          <p className="text-lg font-semibold text-accent">{position.mineral}</p>
          <p className="font-mono text-[10px] tracking-wider text-muted-foreground">{position.terrain}</p>
        </div>
      </div>
    </div>
  );
}
