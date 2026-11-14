import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Bot,
  ExternalLink,
  FlagTriangleRight,
  Gauge,
  Mountain,
  Package,
  Pause,
  Play,
  RotateCcw,
  ScanSearch,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/hud/AlertBanner";
import { CenterHud } from "@/components/hud/CenterHud";
import { CommsBanner } from "@/components/hud/CommsBanner";
import { Compass } from "@/components/hud/Compass";
import { GeoPointDialog } from "@/components/hud/GeoPointDialog";
import { GeoPointsSheet } from "@/components/hud/GeoPointsSheet";
import { LinkStatus } from "@/components/hud/LinkStatus";
import { LiveView } from "@/components/hud/LiveView";
import { MiniMap } from "@/components/hud/MiniMap";
import { MovePad } from "@/components/hud/MovePad";
import { ResourceMonitor } from "@/components/hud/ResourceMonitor";
import { SampleDialog } from "@/components/hud/SampleDialog";
import { SamplesSheet } from "@/components/hud/SamplesSheet";
import { useEva } from "@/hooks/use-eva";
import { useFieldLog } from "@/hooks/use-field-log";
import { useMoveKeys } from "@/hooks/use-move-keys";
import { isStorm, viewYaw } from "@/lib/eva-engine";
import type { FieldLocation } from "@/lib/field-log";
import { distance, formatCoord, formatMissionTime, ROUTE_LENGTH, waypointAt } from "@/lib/mission";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ARES-HUD · Visor en vivo para caminatas en Marte" },
      {
        name: "description",
        content:
          "Visor de casco en vivo: camina y mira alrededor del escarpe del Monte Olimpo, con alertas de soporte vital y bitácora de muestras sincronizada con el centro de control.",
      },
      { property: "og:title", content: "ARES-HUD · Visor en vivo para caminatas en Marte" },
      {
        property: "og:description",
        content: "Navegación hiperlocal en primera persona, sincronizada en vivo con el centro de control.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AresVisor,
});

const SPEEDS = [1, 10, 30];
const INTERACTIVE = "button, a, input, textarea, select, label, [role=dialog], .hud-panel";

function AresVisor() {
  const { eva, ctx, alerts, dispatch, partnerOnline } = useEva("visor");
  const log = useFieldLog();
  const [sampleOpen, setSampleOpen] = useState(false);
  const [geoOpen, setGeoOpen] = useState(false);
  const [samplesSheet, setSamplesSheet] = useState(false);
  const [geoSheet, setGeoSheet] = useState(false);
  const anyOverlay = sampleOpen || geoOpen || samplesSheet || geoSheet;
  const { press, release } = useMoveKeys(dispatch, !anyOverlay);

  const next = waypointAt(eva.nextIndex);
  const toNext = distance(eva.x, eva.y, next.x, next.y);
  const yaw = viewYaw(eva);

  const location: FieldLocation = {
    lat: ctx.lat,
    lon: ctx.lon,
    x: eva.x,
    y: eva.y,
    waypoint: `${waypointAt(ctx.segment - 1).id} → ${waypointAt(ctx.segment).id}`,
    terrain: ctx.terrain,
    slope: ctx.slope,
    missionTime: eva.missionTime,
  };

  // Toast when an alert appears or escalates.
  const seen = useRef<Set<string>>(new Set());
  useEffect(() => {
    const now = new Set(alerts.map((a) => a.id));
    for (const a of alerts) {
      if (!seen.current.has(a.id)) (a.status === "critico" ? toast.error : toast.warning)(a.message, { description: a.detail });
    }
    seen.current = now;
  }, [alerts]);

  useEffect(() => {
    if (eva.finished) toast.success("Destino alcanzado: Mirador del escarpe");
  }, [eva.finished]);

  // Drag anywhere on the scene to look around.
  const drag = useRef<{ x: number; y: number; offset: number; pitch: number } | null>(null);
  const frame = useRef(0);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
    drag.current = { x: e.clientX, y: e.clientY, offset: eva.lookOffset, pitch: eva.lookPitch };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const offset = d.offset - (e.clientX - d.x) * 0.25;
    const pitch = d.pitch + (e.clientY - d.y) * 0.15;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => dispatch({ type: "look", offset, pitch }));
  };
  const endDrag = () => {
    drag.current = null;
  };

  const critical = alerts.some((a) => a.status === "critico");
  const progress = Math.min(100, (ctx.along / ROUTE_LENGTH) * 100);

  return (
    <main className="visor-shell">
      <div className="visor-glass">
        <LiveView
          x={eva.x}
          y={eva.y}
          yaw={yaw}
          pitch={eva.lookPitch}
          moving={eva.moving}
          nextIndex={eva.nextIndex}
          samples={log.samples}
          geoPoints={log.geoPoints}
        />
        <div className="visor-tint" />
        <div className="visor-scanlines" />
        <div className="visor-sweep" />
        <div className="visor-reflection" />
        {critical && <div className="visor-danger" />}

        {/* HUD layer */}
        <div
          className="absolute inset-0 cursor-grab touch-pan-y overflow-y-auto active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="mx-auto flex min-h-full max-w-[1600px] flex-col gap-4 px-[5vw] pb-6 pt-[4vh] lg:h-full">
            <header className="grid grid-cols-1 items-start gap-3 md:grid-cols-[1fr_auto_1fr] md:px-[9vw] md:pt-[3vh]">
              <div>
                <p className="hud-title text-lg leading-none">ARES-HUD</p>
                <p className="hud-label mt-1">EVA-07 · Monte Olimpo · Escarpe basal</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <LinkStatus online={partnerOnline} partner="Centro de control" />
                  <a
                    href="/control"
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary underline-offset-4 hover:underline"
                  >
                    Abrir centro de control <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
              <div className="w-full md:w-[22rem]">
                <Compass heading={yaw} />
              </div>
              <div className="md:text-right">
                <p className="hud-value text-sm text-primary hud-glow">{formatCoord(ctx.lat, ctx.lon)}</p>
                <p className="hud-label mt-1">
                  T+{formatMissionTime(eva.missionTime)} · Sol 214 ·{" "}
                  {eva.autopilot ? "Autopiloto" : eva.moving ? "Caminando" : eva.running ? "En EVA" : "Detenido"}
                </p>
              </div>
            </header>

            <AlertBanner alerts={alerts} />
            <CommsBanner message={eva.message} onReceived={() => dispatch({ type: "messageReceived", at: Date.now() })} />

            <div className="grid flex-1 grid-cols-1 items-center gap-6 lg:min-h-0 lg:grid-cols-[minmax(260px,320px)_1fr_minmax(260px,340px)]">
              <div className="order-2 lg:order-1">
                <ResourceMonitor telemetry={eva.telemetry} o2Rate={eva.o2Rate} stormActive={isStorm(eva)} />
              </div>
              <div className="order-1 py-10 lg:order-2 lg:py-0">
                <CenterHud ctx={ctx} nextIndex={eva.nextIndex} toNext={toNext} finished={eva.finished}>
                  <MovePad press={press} release={release} onCenter={() => dispatch({ type: "centerView" })} />
                </CenterHud>
              </div>
              <div className="order-3 space-y-3">
                <MiniMap
                  x={eva.x}
                  y={eva.y}
                  yaw={yaw}
                  heading={eva.heading}
                  nextIndex={eva.nextIndex}
                  samples={log.samples}
                  geoPoints={log.geoPoints}
                />
                <div className="hud-panel p-3">
                  <div className="flex items-center justify-between">
                    <span className="hud-label">Progreso de ruta</span>
                    <span className="hud-value text-xs text-primary">
                      {(ctx.along / 1000).toFixed(2)} / {(ROUTE_LENGTH / 1000).toFixed(2)} km
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <nav aria-label="Controles de la caminata" className="hud-panel mx-auto flex flex-wrap items-center justify-center gap-1.5 p-2">
              <Button variant={eva.running ? "hud" : "hudSolid"} size="dock" onClick={() => dispatch({ type: "setRunning", value: !eva.running })}>
                {eva.running ? <Pause /> : <Play />} {eva.running ? "Pausar EVA" : "Iniciar EVA"}
              </Button>
              <Button
                variant={eva.autopilot ? "hudSolid" : "hud"}
                size="dock"
                disabled={eva.finished}
                onClick={() => dispatch({ type: "setAutopilot", value: !eva.autopilot })}
                aria-pressed={eva.autopilot}
              >
                <Bot /> Autopiloto
              </Button>
              <div className="flex items-center gap-1 px-1" role="group" aria-label="Velocidad de simulación">
                <Gauge className="size-4 text-muted-foreground" />
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => dispatch({ type: "setSpeed", value: s })}
                    aria-pressed={eva.speed === s}
                    className={cn(
                      "rounded-sm px-2 py-1 font-mono text-[11px]",
                      eva.speed === s ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-primary",
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
              <Button variant="hudDanger" size="dock" onClick={() => dispatch({ type: "storm" })} title="Simula un evento de partículas solares">
                <Sun /> Tormenta solar
              </Button>
              <Button variant="ghost" size="dock" onClick={() => dispatch({ type: "reset" })} className="font-mono text-xs uppercase tracking-wider">
                <RotateCcw /> Reiniciar
              </Button>
            </nav>
          </div>
        </div>
      </div>

      <SampleDialog open={sampleOpen} onOpenChange={setSampleOpen} location={location} onSave={log.addSample} />
      <GeoPointDialog open={geoOpen} onOpenChange={setGeoOpen} location={location} detected={ctx.mineral} onSave={log.addGeoPoint} />
      <SamplesSheet open={samplesSheet} onOpenChange={setSamplesSheet} samples={log.samples} onDelete={log.removeSample} />
      <GeoPointsSheet open={geoSheet} onOpenChange={setGeoSheet} points={log.geoPoints} onDelete={log.removeGeoPoint} />
    </main>
  );
}
