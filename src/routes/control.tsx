import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  CloudSun,
  Eye,
  Gauge,
  MapPinned,
  MessageSquare,
  Package,
  Pause,
  Play,
  RefreshCcw,
  Send,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ElevationProfile } from "@/components/control/ElevationProfile";
import { LayerToggles, MINERAL_COLOR, TacticalMap, type MapLayer } from "@/components/control/TacticalMap";
import { LinkStatus } from "@/components/hud/LinkStatus";
import { LiveView } from "@/components/hud/LiveView";
import { ResourceMonitor } from "@/components/hud/ResourceMonitor";
import { useEva } from "@/hooks/use-eva";
import { useFieldLog } from "@/hooks/use-field-log";
import { isStorm, viewYaw, WALK_SPEED } from "@/lib/eva-engine";
import { distance, formatCoord, formatMissionTime, slopeLevel, waypointAt } from "@/lib/mission";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/control")({
  head: () => ({
    meta: [
      { title: "ARES-HUD · Centro de control de la EVA" },
      {
        name: "description",
        content:
          "Centro de control en vivo: mapa táctico con capas MOLA y CRISM, soporte vital, clima espacial, alertas y mensajes sincronizados con el visor del astronauta.",
      },
      { property: "og:title", content: "ARES-HUD · Centro de control de la EVA" },
      { property: "og:description", content: "Sigue y guía al astronauta en vivo, sincronizado con su visor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ControlCenter,
});

const SPEEDS = [1, 10, 30];

function Panel({ title, icon: Icon, aside, children, className }: {
  title: string;
  icon: typeof Eye;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("hud-panel p-4", className)}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="hud-title flex items-center gap-2 text-sm">
          <Icon className="size-4" /> {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

function ControlCenter() {
  const { eva, ctx, alerts, dispatch, partnerOnline } = useEva("control");
  const log = useFieldLog();
  const [layers, setLayers] = useState<Set<MapLayer>>(new Set(["pendiente", "crism", "peligros", "ruta", "reticula"]));
  const [msg, setMsg] = useState("");

  const yaw = viewYaw(eva);
  const next = waypointAt(eva.nextIndex);
  const toNext = distance(eva.x, eva.y, next.x, next.y);
  const level = slopeLevel(ctx.slope);
  const etaMin = toNext / (WALK_SPEED / (1 + ctx.slope / 20)) / 60;
  const storm = isStorm(eva);

  const toggleLayer = (l: MapLayer) =>
    setLayers((prev) => {
      const n = new Set(prev);
      if (n.has(l)) n.delete(l);
      else n.add(l);
      return n;
    });

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = msg.trim();
    if (!text) return;
    dispatch({ type: "message", id: crypto.randomUUID(), text, sentAt: Date.now() });
    setMsg("");
  };

  return (
    <main className="min-h-screen bg-background px-4 py-4 lg:px-8">
      <div className="mx-auto max-w-[1700px] space-y-4">
        {/* Header */}
        <header className="hud-panel flex flex-wrap items-center justify-between gap-4 px-5 py-3">
          <div>
            <p className="hud-title text-xl leading-none">ARES-HUD · Centro de control</p>
            <p className="hud-label mt-1">Navegación hiperlocal y contextual para EVA · Olympus Mons</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LinkStatus online={partnerOnline} partner="Visor del astronauta" />
            <Link to="/" target="_blank" className="font-mono text-[10px] uppercase tracking-wider text-primary underline-offset-4 hover:underline">
              Abrir visor ↗
            </Link>
          </div>
          <div className="flex gap-6 font-mono">
            <div>
              <p className="hud-label">Sol</p>
              <p className="hud-value text-lg">0214</p>
            </div>
            <div>
              <p className="hud-label">Tiempo EVA</p>
              <p className="hud-value text-lg">{formatMissionTime(eva.missionTime)}</p>
            </div>
            <div>
              <p className="hud-label">Estado</p>
              <p className={cn("text-sm uppercase", eva.running ? "text-success" : "text-muted-foreground")}>
                {eva.autopilot ? "Autopiloto" : eva.moving ? "Caminando" : eva.running ? "En EVA" : "Detenido"}
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_1fr_360px]">
          {/* Left column */}
          <div className="space-y-4">
            <ResourceMonitor telemetry={eva.telemetry} o2Rate={eva.o2Rate} stormActive={storm} />
            <Panel title="Clima espacial" icon={CloudSun} aside={<span className="hud-label">DSN-WX</span>}>
              <div className={cn("mb-3 rounded-sm border p-3", storm ? "border-destructive text-destructive" : "border-border")}>
                <p className="hud-label">Actividad solar</p>
                <p className={cn("font-semibold", storm ? "alert-blink" : "text-success")}>{storm ? "Tormenta de partículas" : "Nominal"}</p>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="hud-label">Polvo τ</dt>
                  <dd className="hud-value">{eva.env.dust.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="hud-label">Temp. ext.</dt>
                  <dd className="hud-value">{eva.env.extTemp} °C</dd>
                </div>
                <div>
                  <dt className="hud-label">Viento</dt>
                  <dd className="hud-value">{eva.env.wind} m/s</dd>
                </div>
              </dl>
              <div className="mt-4 grid gap-2">
                <Button variant="hudDanger" onClick={() => dispatch({ type: "storm" })}>
                  <Sun /> Simular tormenta solar
                </Button>
                <Button variant="hud" onClick={() => dispatch({ type: "refill" })}>
                  <RefreshCcw /> Reabastecer
                </Button>
              </div>
            </Panel>
          </div>

          {/* Center column */}
          <div className="space-y-4">
            <section className="hud-panel space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="hud-title flex items-center gap-2 text-sm">
                  <MapPinned className="size-4" /> Mapa táctico en vivo
                </h2>
                <span className="hud-value text-xs text-primary">{formatCoord(ctx.lat, ctx.lon)}</span>
              </div>
              <LayerToggles layers={layers} onToggle={toggleLayer} />
              <div className="relative aspect-[31/27] w-full overflow-hidden rounded-sm border border-border bg-muted/40 xl:aspect-auto xl:h-[min(62vh,640px)]">
                <TacticalMap x={eva.x} y={eva.y} yaw={yaw} nextIndex={eva.nextIndex} layers={layers} samples={log.samples} geoPoints={log.geoPoints} />
                <div className="absolute left-3 top-3 rounded-sm border border-border bg-background/80 px-2 py-1 font-mono text-[10px] text-primary">
                  Olympus Mons · {ctx.terrain}
                </div>
                <ul className="absolute bottom-3 left-3 space-y-0.5 rounded-sm border border-border bg-background/80 p-2 font-mono text-[10px] text-muted-foreground">
                  <li><span className="mr-1.5 inline-block h-1.5 w-3 bg-success" />&lt; 15° Seguro</li>
                  <li><span className="mr-1.5 inline-block h-1.5 w-3 bg-warning" />15–25° Precaución</li>
                  <li><span className="mr-1.5 inline-block h-1.5 w-3 bg-destructive" />≥ 25° Riesgo / peligro</li>
                </ul>
                <ul className="absolute bottom-3 right-3 space-y-0.5 rounded-sm border border-border bg-background/80 p-2 font-mono text-[10px] text-muted-foreground">
                  {Object.entries(MINERAL_COLOR).map(([m, c]) => (
                    <li key={m} className="flex items-center gap-1.5">
                      <span className="inline-block size-2 rounded-full" style={{ background: c }} /> {m}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="font-mono text-[10px] text-warning">Relieve ilustrativo · no es un modelo NASA</p>
            </section>
            <Panel
              title="Perfil de elevación"
              icon={Gauge}
              aside={<span className="hud-value text-xs text-muted-foreground">Recorrido {(eva.walked / 1000).toFixed(2)} km</span>}
            >
              <ElevationProfile along={ctx.along} elevation={ctx.elevation} />
            </Panel>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <Panel title="Cámara del casco" icon={Eye} aside={<span className="hud-label">{String(Math.round(yaw)).padStart(3, "0")}°</span>}>
              <div className="relative aspect-video overflow-hidden rounded-sm border border-border">
                <LiveView x={eva.x} y={eva.y} yaw={yaw} pitch={eva.lookPitch} moving={eva.moving} nextIndex={eva.nextIndex} samples={log.samples} geoPoints={log.geoPoints} />
                <div className="visor-scanlines" />
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-sm bg-background/80 px-1.5 py-0.5 font-mono text-[10px] uppercase text-destructive">
                  <span className="alert-blink size-1.5 rounded-full bg-destructive" /> En vivo
                </span>
              </div>
            </Panel>

            <Panel title="Punto de vía" icon={MapPinned} aside={<span className="hud-label">{eva.nextIndex}/5</span>}>
              <p className="hud-label">Siguiente objetivo</p>
              <p className="text-lg font-semibold">
                <span className="text-primary">{next.id}</span> · {next.name}
              </p>
              <div className={cn("my-3 border-l-4 p-3", level.status === "critico" ? "border-destructive bg-destructive/10" : level.status === "advertencia" ? "border-warning bg-warning/10" : "border-success bg-success/10")}>
                <p className="hud-label">Inclinación actual</p>
                <p className={cn("hud-value text-3xl", `status-${level.status}`)}>{ctx.slope}°</p>
                <p className={cn("font-mono text-xs tracking-widest", `status-${level.status}`)}>{level.label}</p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="hud-label">Mineral dominante</dt>
                  <dd className="flex items-center gap-1.5">
                    <span className="inline-block size-2 rounded-full" style={{ background: MINERAL_COLOR[ctx.mineral] }} /> {ctx.mineral}
                  </dd>
                </div>
                <div>
                  <dt className="hud-label">Elevación</dt>
                  <dd className="hud-value">{ctx.elevation.toLocaleString("es")} m</dd>
                </div>
                <div>
                  <dt className="hud-label">Distancia al objetivo</dt>
                  <dd className="hud-value">{Math.round(toNext)} m</dd>
                </div>
                <div>
                  <dt className="hud-label">Tiempo estimado</dt>
                  <dd className="hud-value">{eva.finished ? "—" : `${Math.round(etaMin)} min`}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant={eva.running ? "hud" : "hudSolid"} size="sm" onClick={() => dispatch({ type: "setRunning", value: !eva.running })}>
                  {eva.running ? <Pause /> : <Play />} {eva.running ? "Pausar EVA" : "Iniciar EVA"}
                </Button>
                <Button variant={eva.autopilot ? "hudSolid" : "hud"} size="sm" disabled={eva.finished} onClick={() => dispatch({ type: "setAutopilot", value: !eva.autopilot })}>
                  <Bot /> Autopiloto
                </Button>
                <div className="flex items-center gap-1" role="group" aria-label="Velocidad">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={eva.speed === s}
                      onClick={() => dispatch({ type: "setSpeed", value: s })}
                      className={cn("rounded-sm px-2 py-1 font-mono text-[11px]", eva.speed === s ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-primary")}
                    >
                      ×{s}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel
              title="Alertas de seguridad"
              icon={AlertTriangle}
              aside={alerts.length > 0 && <span className="rounded-sm bg-destructive px-1.5 font-mono text-xs text-destructive-foreground">{alerts.length}</span>}
            >
              {alerts.length === 0 ? (
                <p className="font-mono text-xs uppercase tracking-wider text-success">Todos los sistemas nominales</p>
              ) : (
                <ul className="space-y-2">
                  {alerts.map((a) => {
                    const acked = eva.acked.includes(a.id);
                    return (
                      <li
                        key={a.id}
                        className={cn(
                          "flex items-start justify-between gap-2 rounded-sm border p-2",
                          a.status === "critico" ? "border-destructive bg-destructive/10" : "border-warning bg-warning/10",
                          acked && "opacity-60",
                        )}
                      >
                        <div>
                          <p className={cn("text-sm font-semibold", a.status === "critico" ? "text-destructive" : "text-warning")}>{a.message}</p>
                          <p className="text-xs text-muted-foreground">{a.detail}</p>
                        </div>
                        {acked ? (
                          <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-success">
                            <Check className="size-3" /> Confirmada
                          </span>
                        ) : (
                          <Button variant="hudAccent" size="sm" onClick={() => dispatch({ type: "ack", id: a.id })}>
                            Confirmar
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel title="Mensaje a la tripulación" icon={MessageSquare}>
              <form onSubmit={sendMessage} className="space-y-2">
                <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ej. Evita el tramo WP-4, usa cuerda fija." rows={2} maxLength={200} />
                <Button type="submit" variant="hudSolid" size="sm" disabled={!msg.trim()}>
                  <Send /> Enviar al visor
                </Button>
              </form>
              {eva.message && (
                <p className="mt-3 rounded-sm border border-border p-2 text-xs">
                  <span className="text-secondary-foreground">“{eva.message.text}”</span>
                  <span className={cn("mt-1 block font-mono text-[10px] uppercase", eva.message.receivedAt ? "text-success" : "text-warning")}>
                    {eva.message.receivedAt
                      ? `Recibido por el astronauta · ${new Date(eva.message.receivedAt).toLocaleTimeString("es")}`
                      : "Enviado · esperando confirmación"}
                  </span>
                </p>
              )}
            </Panel>

            <Panel title="Bitácora de campo" icon={Package} aside={<span className="hud-label">{log.samples.length} muestras · {log.geoPoints.length} puntos</span>}>
              {log.samples.length + log.geoPoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">El astronauta aún no registra hallazgos.</p>
              ) : (
                <ul className="space-y-2">
                  {log.samples.slice(0, 3).map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <div className="size-10 shrink-0 overflow-hidden rounded-sm bg-muted">
                        {s.photos[0] && <img src={s.photos[0]} alt="" className="size-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm">{s.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{s.category} · {s.location.waypoint}</p>
                      </div>
                    </li>
                  ))}
                  {log.geoPoints.slice(0, 3).map((g) => (
                    <li key={g.id} className="flex items-center gap-2 text-sm">
                      <span className="size-0 border-x-[6px] border-b-[10px] border-x-transparent border-b-accent" />
                      <span className="text-accent">{g.resource}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">· {g.abundance} · {g.location.waypoint}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        <footer className="hud-panel flex flex-wrap gap-x-6 gap-y-2 px-5 py-3 text-xs text-secondary-foreground">
          <span className="hud-title text-xs">Fuentes de datos NASA</span>
          <span><b>Mars Trek (JPL)</b> — Cartografía base y selección de sitios</span>
          <span><b>HiRISE / CTX</b> — Capas ópticas de alta resolución</span>
          <span><b>CRISM</b> — Superposición espectral de minerales</span>
          <span><b>MOLA</b> — Modelo de elevación y pendientes</span>
          <span className="w-full text-right font-mono text-[10px] text-muted-foreground">Prototipo con telemetría simulada. Imágenes de terreno ilustrativas.</span>
        </footer>
      </div>
    </main>
  );
}
