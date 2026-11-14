import { Activity, Battery, Droplets, Gauge, Heart, Radiation, Thermometer, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { oxygenMinutesLeft, RESOURCES, resourceStatus, type ResourceKey, type Telemetry } from "@/lib/mission";
import { cn } from "@/lib/utils";

const ICONS: Record<ResourceKey, LucideIcon> = {
  oxygen: Wind,
  battery: Battery,
  water: Droplets,
  pressure: Gauge,
  radiation: Radiation,
  heartRate: Heart,
  suitTemp: Thermometer,
};

const STATUS_TEXT = { nominal: "OK", advertencia: "ALERTA", critico: "CRÍTICO" } as const;

export function ResourceMonitor({
  telemetry,
  o2Rate,
  stormActive,
}: {
  telemetry: Telemetry;
  o2Rate: number;
  stormActive: boolean;
}) {
  const o2Min = oxygenMinutesLeft(telemetry.oxygen, o2Rate);
  const o2Status = resourceStatus("oxygen", telemetry.oxygen);

  return (
    <section className="hud-panel p-4" aria-label="Monitor de alerta de recursos">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="hud-title flex items-center gap-2 text-sm">
          <Activity className="size-4" /> Soporte vital
        </h2>
        <span className="hud-label">Monitor de recursos</span>
      </header>

      <div className="mb-4 flex items-end justify-between border-b border-border pb-3">
        <div>
          <p className="hud-label">Autonomía O₂</p>
          <p className={cn("hud-value text-3xl font-medium", `status-${o2Status}`, o2Status === "critico" && "alert-blink")}>
            {Number.isFinite(o2Min) ? `${Math.floor(o2Min / 60)}h ${String(Math.floor(o2Min % 60)).padStart(2, "0")}m` : "—"}
          </p>
        </div>
        {stormActive && (
          <span className="alert-blink rounded-sm border border-destructive px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-destructive">
            Tormenta solar
          </span>
        )}
      </div>

      <ul className="space-y-3">
        {RESOURCES.map((r) => {
          const value = telemetry[r.key];
          const status = resourceStatus(r.key, value);
          const pct = Math.min(100, Math.max(0, ((value - r.min) / (r.max - r.min)) * 100));
          const Icon = ICONS[r.key];
          return (
            <li key={r.key}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-secondary-foreground">
                  <Icon className={cn("size-3.5", `status-${status}`)} />
                  {r.label}
                </span>
                <span className="flex items-center gap-2">
                  <span className={cn("hud-value text-sm", `status-${status}`)}>
                    {value.toFixed(r.decimals)}
                    <span className="ml-0.5 text-[10px] text-muted-foreground">{r.unit}</span>
                  </span>
                  <span
                    className={cn(
                      "w-14 text-right font-mono text-[9px] tracking-widest",
                      `status-${status}`,
                      status === "critico" && "alert-blink",
                    )}
                  >
                    {STATUS_TEXT[status]}
                  </span>
                </span>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full transition-all duration-700", `bar-${status}`)} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
