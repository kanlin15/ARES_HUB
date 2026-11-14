import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlagTriangleRight, Gauge, Mountain, Package, Pause, Play, RotateCcw, ScanSearch, Sun } from "lucide-react";
import { toast } from "sonner";
import marsScarp from "@/assets/mars-scarp.jpg";
import { Button } from "@/components/ui/button";
import { AlertBanner, type HudAlert } from "@/components/hud/AlertBanner";
import { CenterHud } from "@/components/hud/CenterHud";
import { Compass } from "@/components/hud/Compass";
import { GeoPointDialog } from "@/components/hud/GeoPointDialog";
import { GeoPointsSheet } from "@/components/hud/GeoPointsSheet";
import { MiniMap } from "@/components/hud/MiniMap";
import { ResourceMonitor } from "@/components/hud/ResourceMonitor";
import { SampleDialog } from "@/components/hud/SampleDialog";
import { SamplesSheet } from "@/components/hud/SamplesSheet";
import { useEvaSim } from "@/hooks/use-eva-sim";
import { useFieldLog } from "@/hooks/use-field-log";
import type { FieldLocation } from "@/lib/field-log";
import { formatCoord, formatMissionTime, RESOURCES, resourceStatus, ROUTE_LENGTH, slopeLevel, waypointAt } from "@/lib/mission";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ARES-HUD · Visor de navegación para caminatas en Marte" },
      {
        name: "description",
        content:
          "Visor de casco para EVAs marcianas: ruta táctica, pendientes peligrosas, monitor de oxígeno y batería, y bitácora de muestras con fotos.",
      },
      { property: "og:title", content: "ARES-HUD · Visor de navegación para caminatas en Marte" },
      {
        property: "og:description",
        content: "Navegación hiperlocal en el escarpe del Monte Olimpo con alertas de soporte vital y registro de muestras geológicas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AresHud,
});

const SPEEDS = [1, 10, 30];

function AresHud() {
  const sim = useEvaSim();
  const log = useFieldLog();
  const [sampleOpen, setSampleOpen] = useState(false);
  const [geoOpen, setGeoOpen] = useState(false);
  const [samplesSheet, setSamplesSheet] = useState(false);
  const [geoSheet, setGeoSheet] = useState(false);

  const { position, telemetry } = sim;

  const location: FieldLocation = {
    lat: position.lat,
    lon: position.lon,
    x: position.x,
    y: position.y,
    waypoint: `${waypointAt(position.nextIndex - 1).id} → ${waypointAt(position.nextIndex).id}`,
    terrain: position.terrain,
    slope: position.slope,
    missionTime: sim.missionTime,
  };

  const alerts = useMemo<HudAlert[]>(() => {
    const list: HudAlert[] = [];
    for (const r of RESOURCES) {
      const st = resourceStatus(r.key, telemetry[r.key]);
      if (st !== "nominal")
        list.push({ id: r.key, status: st, message: `${r.label} ${telemetry[r.key].toFixed(r.decimals)} ${r.unit}` });
    }
    const slope = slopeLevel(position.slope);
    if (slope.status !== "nominal")
      list.push({ id: "slope", status: slope.status, message: `Pendiente ${position.slope}° · ${slope.label}` });
    return list;
  }, [telemetry, position.slope]);

  // Toast only when an alert appears or escalates.
  const prev = useRef<Record<string, string>>({});
  useEffect(() => {
    const now: Record<string, string> = {};
    for (const a of alerts) {
      now[a.id] = a.status;
      if (prev.current[a.id] !== a.status) {
        (a.status === "critico" ? toast.error : toast.warning)(a.message, {
          description: a.status === "critico" ? "Nivel crítico — actúa de inmediato" : "Advertencia de soporte vital",
        });
      }
    }
    prev.current = now;
  }, [alerts]);

  useEffect(() => {
    if (position.finished) toast.success("Destino alcanzado: Mirador del escarpe");
  }, [position.finished]);

  const critical = alerts.some((a) => a.status === "critico");
  const progress = Math.min(100, (sim.distance / ROUTE_LENGTH) * 100);

  return (
    <main className="visor-shell">
      <div className="visor-glass">
        <img
          src={marsScarp}
          alt="Vista en primera persona del escarpe basal del Monte Olimpo en Marte"
          width={1920}
          height={1088}
          className="absolute inset-0 size-full scale-105 object-cover"
        />
        <div className="visor-tint" />
        <div className="visor-scanlines" />
        <div className="visor-sweep" />
        <div className="visor-reflection" />
        {critical && <div className="visor-danger" />}

        {/* HUD layer */}
        <div className="absolute inset-0 overflow-y-auto">
          <div className="mx-auto flex min-h-full max-w-[1600px] flex-col gap-4 px-[5vw] pb-6 pt-[4vh] lg:h-full">
            {/* Top bar */}
            <header className="grid grid-cols-1 items-start gap-3 md:grid-cols-[1fr_auto_1fr] md:px-[9vw] md:pt-[3vh]">
              <div>
                <p className="hud-title text-lg leading-none">ARES-HUD</p>
                <p className="hud-label mt-1">EVA-07 · Monte Olimpo · Escarpe basal</p>
              </div>
              <div className="w-full md:w-[22rem]">
                <Compass heading={position.heading} />
              </div>
              <div className="md:text-right">
                <p className="hud-value text-sm text-primary hud-glow">{formatCoord(position.lat, position.lon)}</p>
                <p className="hud-label mt-1">
                  T+{formatMissionTime(sim.missionTime)} · Sol 214 · {sim.running ? "En marcha" : "Detenido"}
                </p>
              </div>
            </header>

            <AlertBanner alerts={alerts} />

            {/* Main HUD */}
            <div className="grid flex-1 grid-cols-1 items-center gap-6 lg:min-h-0 lg:grid-cols-[minmax(260px,320px)_1fr_minmax(260px,340px)]">
              <div className="order-2 lg:order-1">
                <ResourceMonitor telemetry={telemetry} o2Rate={sim.o2Rate} stormActive={sim.stormActive} />
              </div>
              <div className="order-1 py-10 lg:order-2 lg:py-0">
                <CenterHud position={position} />
              </div>
              <div className="order-3 space-y-3">
                <MiniMap position={position} samples={log.samples} geoPoints={log.geoPoints} />
                <div className="hud-panel p-3">
                  <div className="flex items-center justify-between">
                    <span className="hud-label">Progreso de ruta</span>
                    <span className="hud-value text-xs text-primary">
                      {(sim.distance / 1000).toFixed(2)} / {(ROUTE_LENGTH / 1000).toFixed(2)} km
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all duration-700" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Action dock */}
            <nav aria-label="Controles de la caminata" className="hud-panel mx-auto flex flex-wrap items-center justify-center gap-1.5 p-2">
              <Button
                variant={sim.running ? "hud" : "hudSolid"}
                size="dock"
                onClick={() => sim.setRunning(!sim.running)}
                disabled={position.finished}
              >
                {sim.running ? <Pause /> : <Play />} {sim.running ? "Pausar EVA" : "Iniciar EVA"}
              </Button>
              <div className="flex items-center gap-1 px-1" role="group" aria-label="Velocidad de simulación">
                <Gauge className="size-4 text-muted-foreground" />
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sim.setSpeed(s)}
                    aria-pressed={sim.speed === s}
                    className={cn(
                      "rounded-sm px-2 py-1 font-mono text-[11px]",
                      sim.speed === s ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-primary",
                    )}
                  >
                    ×{s}
                  </button>
                ))}
              </div>
              <span className="mx-1 hidden h-8 w-px bg-border md:block" />
              <Button variant="hudAccent" size="dock" onClick={() => setSampleOpen(true)}>
                <ScanSearch /> Registrar muestra
              </Button>
              <Button variant="hudAccent" size="dock" onClick={() => setGeoOpen(true)}>
                <FlagTriangleRight /> Guardar muestra geológica
              </Button>
              <Button variant="hud" size="dock" onClick={() => setSamplesSheet(true)}>
                <Package /> Muestras ({log.samples.length})
              </Button>
              <Button variant="hud" size="dock" onClick={() => setGeoSheet(true)}>
                <Mountain /> Puntos ({log.geoPoints.length})
              </Button>
              <span className="mx-1 hidden h-8 w-px bg-border md:block" />
              <Button variant="hudDanger" size="dock" onClick={sim.triggerStorm} title="Simula un evento de partículas solares">
                <Sun /> Tormenta solar
              </Button>
              <Button variant="ghost" size="dock" onClick={sim.reset} className="font-mono text-xs uppercase tracking-wider">
                <RotateCcw /> Reiniciar
              </Button>
            </nav>
          </div>
        </div>
      </div>

      <SampleDialog open={sampleOpen} onOpenChange={setSampleOpen} location={location} onSave={log.addSample} />
      <GeoPointDialog open={geoOpen} onOpenChange={setGeoOpen} location={location} detected={position.mineral} onSave={log.addGeoPoint} />
      <SamplesSheet open={samplesSheet} onOpenChange={setSamplesSheet} samples={log.samples} onDelete={log.removeSample} />
      <GeoPointsSheet open={geoSheet} onOpenChange={setGeoSheet} points={log.geoPoints} onDelete={log.removeGeoPoint} />
    </main>
  );
}
