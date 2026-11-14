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
import { newId, type FieldLocation } from "@/lib/field-log";
import { distance, findNearbyMaterial, formatCoord, formatMissionTime, getCurrentMap, getMaterialTargets, ROUTE_LENGTH, waypointAt } from "@/lib/mission";
import { parseVoiceCommand } from "@/lib/voice-commands";
import { cn } from "@/lib/utils";
import { DEFAULT_HUD_LAYOUT, HUD_PANEL_OPTIONS, isHudPanelVisible, type HudPanelKey } from "@/lib/visor-layout";

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
  const [compactMode, setCompactMode] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [hudLayout, setHudLayout] = useState(DEFAULT_HUD_LAYOUT);
  const [hudPanelMenuOpen, setHudPanelMenuOpen] = useState(false);
  const [minimizedPanels, setMinimizedPanels] = useState<Record<HudPanelKey, boolean>>({
    alerts: false,
    materials: false,
    supportVital: false,
    route: false,
    comms: false,
    map: false,
    compass: false,
  });
  const [collectedMaterialIds, setCollectedMaterialIds] = useState<string[]>([]);
  const toggleCompactMode = () => {
    setCompactMode((prev) => {
      const next = !prev;
      toast.success(next ? "HUD minimizado" : "HUD restaurado");
      return next;
    });
  };
  const toggleHudPanel = (panel: HudPanelKey) => {
    setHudLayout((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };
  const toggleMinimizePanel = (panel: HudPanelKey) => {
    setMinimizedPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };
  const recognitionRef = useRef<{
    start: () => void;
    stop: () => void;
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: ((event: any) => void) | null;
    onstart: (() => void) | null;
    onerror: ((event: any) => void) | null;
    onend: (() => void) | null;
  } | null>(null);
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName))) return;
      if (event.key.toLowerCase() !== "m") return;
      event.preventDefault();
      if (!anyOverlay) toggleCompactMode();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [anyOverlay]);

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

  const currentMap = getCurrentMap();
  const materialTargets = getMaterialTargets(currentMap.id);
  const nearbyMaterial = findNearbyMaterial(eva.x, eva.y, currentMap.id);
  const nextMaterial = materialTargets.find((target) => !collectedMaterialIds.includes(target.id)) ?? materialTargets[0];
  const critical = alerts.some((a) => a.status === "critico");
  const progress = Math.min(100, (ctx.along / ROUTE_LENGTH) * 100);

  useEffect(() => {
    setCollectedMaterialIds([]);
  }, [currentMap.id]);

  useEffect(() => {
    if (!nearbyMaterial || collectedMaterialIds.includes(nearbyMaterial.id)) return;
    if (distance(eva.x, eva.y, nearbyMaterial.x, nearbyMaterial.y) <= nearbyMaterial.radius + 18) {
      const sample = {
        id: newId("MAT"),
        name: nearbyMaterial.name,
        category: nearbyMaterial.category,
        description: nearbyMaterial.description,
        photos: [],
        location: { ...location, waypoint: `${waypointAt(ctx.segment - 1).id} → ${waypointAt(ctx.segment).id}` },
        createdAt: Date.now(),
      };
      log.addSample(sample);
      setCollectedMaterialIds((prev) => [...prev, nearbyMaterial.id]);
      toast.success(`Material recogido: ${nearbyMaterial.name}`);
    }
  }, [collectedMaterialIds, ctx.segment, eva.x, eva.y, location, log]);

  const collectMaterial = (target = nearbyMaterial) => {
    if (!target) {
      toast.info("Busca una zona mineral cercana para recoger material.");
      return false;
    }
    if (collectedMaterialIds.includes(target.id)) {
      toast.info(`${target.name} ya fue recogido en este tramo.`);
      return false;
    }
    const sample = {
      id: newId("MAT"),
      name: target.name,
      category: target.category,
      description: target.description,
      photos: [],
      location,
      createdAt: Date.now(),
    };
    log.addSample(sample);
    setCollectedMaterialIds((prev) => [...prev, target.id]);
    toast.success(`Material recogido: ${target.name}`);
    return true;
  };

  const handleVoiceCommand = (raw: string) => {
    const parsed = parseVoiceCommand(raw);
    if (!parsed) {
      toast.info("Comando no reconocido. Prueba: iniciar EVA, pausar EVA, minimizar visor, ruta correcta o enviar noticia importante.");
      return;
    }

    switch (parsed.action) {
      case "toggleCompact":
        toggleCompactMode();
        break;
      case "restore":
        setCompactMode(false);
        toast.success("Visor restaurado");
        break;
      case "startEVA":
        dispatch({ type: "setRunning", value: true });
        toast.success("EVA iniciada");
        break;
      case "pauseEVA":
        dispatch({ type: "setRunning", value: false });
        toast.info("EVA pausada");
        break;
      case "toggleAutopilot":
        dispatch({ type: "setAutopilot", value: !eva.autopilot });
        toast.success(eva.autopilot ? "Autopiloto desactivado" : "Autopiloto activado");
        break;
      case "triggerStorm":
        dispatch({ type: "storm" });
        toast.warning("Tormenta solar simulada");
        break;
      case "collectMaterial": {
        const target = findNearbyMaterial(eva.x, eva.y, currentMap.id) ?? nextMaterial;
        if (!target) {
          toast.info("No hay material disponible en este sector.");
          break;
        }
        collectMaterial(target);
        break;
      }
      case "showSamples":
        setSamplesSheet(true);
        toast.success("Muestras recogidas abiertas");
        break;
      case "showRoute": {
        setCompactMode(false);
        const current = waypointAt(Math.max(0, ctx.segment - 1));
        const nextWaypoint = waypointAt(ctx.segment);
        toast.info(`Ruta correcta: ${current.name} → ${nextWaypoint.name} · ${nextWaypoint.terrain}`);
        break;
      }
      case "saveGeoPoint":
        setGeoOpen(true);
        toast.info("Guardando punto geográfico del sector actual");
        break;
      case "saveVoiceNote": {
        const detail = parsed.detail?.trim() || "Nota de voz del astronauta";
        log.addSample({
          id: newId("NOTE"),
          name: "Nota por voz",
          category: "Otro",
          description: detail,
          photos: [],
          location,
          createdAt: Date.now(),
        });
        setSamplesSheet(true);
        toast.success(`Nota por voz guardada: ${detail}`);
        break;
      }
      case "sendPriorityNews": {
        const detail = parsed.detail?.trim() || "Revisión de tramo y ruta segura confirmada.";
        const text = `Noticia prioritaria: ${detail}`;
        dispatch({ type: "message", id: crypto.randomUUID(), text, sentAt: Date.now() });
        toast.success("Noticia enviada a control");
        break;
      }
      case "reset":
        dispatch({ type: "reset" });
        toast.success("Sistema reiniciado");
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionCtor = (
      window as typeof window & {
        SpeechRecognition?: new () => {
          start: () => void;
          stop: () => void;
          lang: string;
          interimResults: boolean;
          continuous: boolean;
          onresult: ((event: any) => void) | null;
          onstart: (() => void) | null;
          onerror: ((event: any) => void) | null;
          onend: (() => void) | null;
        };
        webkitSpeechRecognition?: new () => {
          start: () => void;
          stop: () => void;
          lang: string;
          interimResults: boolean;
          continuous: boolean;
          onresult: ((event: any) => void) | null;
          onstart: (() => void) | null;
          onerror: ((event: any) => void) | null;
          onend: (() => void) | null;
        };
      }
    ).SpeechRecognition ?? (window as typeof window & { webkitSpeechRecognition?: new () => {
      start: () => void;
      stop: () => void;
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      onresult: ((event: any) => void) | null;
      onstart: (() => void) | null;
      onerror: ((event: any) => void) | null;
      onend: (() => void) | null;
    } }).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "es-ES";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript) handleVoiceCommand(transcript);
    };

    recognition.onstart = () => setVoiceActive(true);
    recognition.onerror = () => setVoiceActive(false);
    recognition.onend = () => {
      setVoiceActive(false);
      if (compactMode && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // The recognizer can restart itself after a brief pause while compact mode remains active.
        }
      }
    };
    recognitionRef.current = recognition;

    if (compactMode) {
      try {
        recognition.start();
      } catch {
        // Ignore repeated starts triggered by the same compact-mode toggle.
      }
    }

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [compactMode, dispatch, eva.autopilot]);

  useEffect(() => {
    if (!recognitionRef.current) return;

    if (compactMode && !voiceActive) {
      try {
        recognitionRef.current.start();
      } catch {
        // Already listening, ignore duplicate start attempts.
      }
      return;
    }

    if (!compactMode && voiceActive) {
      recognitionRef.current.stop();
    }
  }, [compactMode, voiceActive]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error("La voz no está disponible en este navegador.");
      return;
    }

    if (voiceActive) {
      recognitionRef.current.stop();
      return;
    }

    recognitionRef.current.start();
  };

  return (
    <main className="visor-shell">
      <div className={cn("visor-glass", compactMode && "visor-compact")}>
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
          {!compactMode && (
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
                {isHudPanelVisible("compass", hudLayout, false) && (
                  <div className="w-full md:w-[22rem]">
                    <Compass heading={yaw} />
                  </div>
                )}
                <div className="md:text-right">
                  <p className="hud-value text-sm text-primary hud-glow">{formatCoord(ctx.lat, ctx.lon)}</p>
                  <p className="hud-label mt-1">
                    T+{formatMissionTime(eva.missionTime)} · Sol 214 ·{" "}
                    {eva.autopilot ? "Autopiloto" : eva.moving ? "Caminando" : eva.running ? "En EVA" : "Detenido"}
                  </p>
                </div>
              </header>

              {isHudPanelVisible("alerts", hudLayout, false) && (
                <div className={cn("hud-panel overflow-hidden", minimizedPanels["alerts"] && "panel-collapsed")}>
                  <button
                    type="button"
                    className="panel-minimize-button"
                    onClick={() => toggleMinimizePanel("alerts")}
                    aria-label={minimizedPanels["alerts"] ? "Expandir alertas" : "Minimizar alertas"}
                  >
                    <span className="panel-minimize-line" />
                  </button>
                  {!minimizedPanels["alerts"] && <AlertBanner alerts={alerts} />}
                </div>
              )}

              {isHudPanelVisible("materials", hudLayout, false) && (
                <div className={cn("hud-panel overflow-hidden p-3", minimizedPanels["materials"] && "panel-collapsed")}>
                  <button
                    type="button"
                    className="panel-minimize-button"
                    onClick={() => toggleMinimizePanel("materials")}
                    aria-label={minimizedPanels["materials"] ? "Expandir materiales" : "Minimizar materiales"}
                  >
                    <span className="panel-minimize-line" />
                  </button>
                  {!minimizedPanels["materials"] && (
                    <>
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="hud-label">Reto del EVA</p>
                          <p className="hud-value text-sm text-primary">
                            {collectedMaterialIds.length}/{materialTargets.length} materiales recogidos
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono uppercase tracking-[0.2em]">Objetivo</span>
                          <span className="hud-value text-xs text-primary">{nextMaterial?.name ?? "Completado"}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {nearbyMaterial ? `Cerca: ${Math.round(distance(eva.x, eva.y, nearbyMaterial.x, nearbyMaterial.y))} m` : "Sin material cercano"}
                        </span>
                        <Button variant="hudAccent" size="dock" onClick={() => collectMaterial(nextMaterial ?? nearbyMaterial ?? undefined)}>
                          <ScanSearch /> Recoger material
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="grid flex-1 grid-cols-1 items-center gap-6 lg:min-h-0 lg:grid-cols-[minmax(260px,320px)_1fr_minmax(260px,340px)]">
                {isHudPanelVisible("supportVital", hudLayout, false) && (
                  <div className={cn("order-2 lg:order-1", minimizedPanels["supportVital"] && "opacity-90")}>
                    <div className={cn("hud-panel overflow-hidden", minimizedPanels["supportVital"] && "panel-collapsed")}>
                      <button
                        type="button"
                        className="panel-minimize-button"
                        onClick={() => toggleMinimizePanel("supportVital")}
                        aria-label={minimizedPanels["supportVital"] ? "Expandir soporte vital" : "Minimizar soporte vital"}
                      >
                        <span className="panel-minimize-line" />
                      </button>
                      {!minimizedPanels["supportVital"] && (
                        <ResourceMonitor telemetry={eva.telemetry} o2Rate={eva.o2Rate} stormActive={isStorm(eva)} />
                      )}
                    </div>
                  </div>
                )}
                <div className="order-1 py-10 lg:order-2 lg:py-0">
                  <CenterHud ctx={ctx} nextIndex={eva.nextIndex} toNext={toNext} finished={eva.finished}>
                    <MovePad press={press} release={release} onCenter={() => dispatch({ type: "centerView" })} />
                  </CenterHud>
                </div>
                <div className="order-3 space-y-3">
                  {isHudPanelVisible("comms", hudLayout, false) && (
                    <div className={cn("hud-panel overflow-hidden", minimizedPanels["comms"] && "panel-collapsed")}>
                      <button
                        type="button"
                        className="panel-minimize-button"
                        onClick={() => toggleMinimizePanel("comms")}
                        aria-label={minimizedPanels["comms"] ? "Expandir comunicaciones" : "Minimizar comunicaciones"}
                      >
                        <span className="panel-minimize-line" />
                      </button>
                      {!minimizedPanels["comms"] && (
                        <CommsBanner message={eva.message} onReceived={() => dispatch({ type: "messageReceived", at: Date.now() })} />
                      )}
                    </div>
                  )}
                  {isHudPanelVisible("map", hudLayout, false) && (
                    <div className={cn("hud-panel overflow-hidden", minimizedPanels["map"] && "panel-collapsed")}>
                      <button
                        type="button"
                        className="panel-minimize-button"
                        onClick={() => toggleMinimizePanel("map")}
                        aria-label={minimizedPanels["map"] ? "Expandir mapa" : "Minimizar mapa"}
                      >
                        <span className="panel-minimize-line" />
                      </button>
                      {!minimizedPanels["map"] && (
                        <MiniMap
                          x={eva.x}
                          y={eva.y}
                          yaw={yaw}
                          heading={eva.heading}
                          nextIndex={eva.nextIndex}
                          samples={log.samples}
                          geoPoints={log.geoPoints}
                        />
                      )}
                    </div>
                  )}
                  {isHudPanelVisible("route", hudLayout, false) && (
                    <div className={cn("hud-panel overflow-hidden p-3", minimizedPanels["route"] && "panel-collapsed")}>
                      <button
                        type="button"
                        className="panel-minimize-button"
                        onClick={() => toggleMinimizePanel("route")}
                        aria-label={minimizedPanels["route"] ? "Expandir ruta" : "Minimizar ruta"}
                      >
                        <span className="panel-minimize-line" />
                      </button>
                      {!minimizedPanels["route"] && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="hud-label">Progreso de ruta</span>
                            <span className="hud-value text-xs text-primary">
                              {(ctx.along / 1000).toFixed(2)} / {(ROUTE_LENGTH / 1000).toFixed(2)} km
                            </span>
                          </div>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pointer-events-none absolute right-4 top-1/2 z-40 -translate-y-1/2">
                <div
                  className={cn(
                    "pointer-events-auto flex overflow-hidden rounded-xl border border-border bg-background/85 shadow-2xl backdrop-blur-md transition-all duration-200",
                    hudPanelMenuOpen ? "w-[17rem]" : "w-12",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setHudPanelMenuOpen((prev) => !prev)}
                    className="flex h-12 w-12 shrink-0 items-center justify-center border-r border-border bg-primary/10 text-lg font-semibold text-primary"
                    aria-label={hudPanelMenuOpen ? "Cerrar panel de visor" : "Abrir panel de visor"}
                  >
                    {hudPanelMenuOpen ? "×" : "☰"}
                  </button>
                  {hudPanelMenuOpen && (
                    <div className="flex-1 space-y-2 p-3">
                      <p className="hud-label mb-2">Paneles del visor</p>
                      {HUD_PANEL_OPTIONS.map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleHudPanel(key)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-sm border px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                            hudLayout[key] ? "border-primary/60 bg-primary/10 text-primary" : "border-border bg-background/60 text-muted-foreground",
                          )}
                        >
                          <span>{label}</span>
                          <span>{hudLayout[key] ? "On" : "Off"}</span>
                        </button>
                      ))}
                    </div>
                  )}
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
                <Button variant={compactMode ? "hudSolid" : "hud"} size="dock" onClick={toggleCompactMode}>
                  {compactMode ? <RotateCcw /> : <Package />} {compactMode ? "Restaurar HUD" : "Minimizar HUD"}
                </Button>
                <Button variant={voiceActive ? "hudDanger" : "hud"} size="dock" onClick={toggleVoiceInput}>
                  <Bot /> {voiceActive ? "Escuchando" : "Comando por voz"}
                </Button>
              </nav>
            </div>
          )}

          {compactMode && (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-4 px-4 md:px-[8vw]">
                <div className="mx-auto max-w-[1200px]">
                  {isHudPanelVisible("alerts", hudLayout, true) && (
                    alerts.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-2">
                        {alerts
                          .filter((a) => a.status === "critico" || a.status === "advertencia")
                          .slice(0, 3)
                          .map((a) => (
                            <span
                              key={a.id}
                              className={cn(
                                "rounded-sm border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em]",
                                a.status === "critico"
                                  ? "alert-blink border-destructive bg-background/85 text-destructive"
                                  : "border-warning bg-background/85 text-warning",
                              )}
                            >
                              {a.message}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <div className="mx-auto flex w-fit items-center gap-2 rounded-sm border border-success/40 bg-background/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-success">
                        Sistemas nominales
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-5 px-4 md:px-[8vw]">
                <div className="mx-auto flex max-w-[1200px] items-end justify-between gap-3">
                  {isHudPanelVisible("supportVital", hudLayout, true) && (
                    <div className="pointer-events-auto w-full max-w-[320px]">
                      <ResourceMonitor telemetry={eva.telemetry} o2Rate={eva.o2Rate} stormActive={isStorm(eva)} />
                    </div>
                  )}
                  {isHudPanelVisible("route", hudLayout, true) && (
                    <div className="flex-1 pointer-events-auto">
                      <div className="hud-panel p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="hud-label">Ruta</span>
                          <span className="hud-value text-xs text-primary">{formatCoord(ctx.lat, ctx.lon)}</span>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          <span>{(ctx.along / 1000).toFixed(2)} km</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <SampleDialog open={sampleOpen} onOpenChange={setSampleOpen} location={location} onSave={log.addSample} />
      <GeoPointDialog open={geoOpen} onOpenChange={setGeoOpen} location={location} detected={ctx.mineral} onSave={log.addGeoPoint} />
      <SamplesSheet open={samplesSheet} onOpenChange={setSamplesSheet} samples={log.samples} onDelete={log.removeSample} />
      <GeoPointsSheet open={geoSheet} onOpenChange={setGeoSheet} points={log.geoPoints} onDelete={log.removeGeoPoint} />
    </main>
  );
}
