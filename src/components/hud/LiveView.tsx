import { useEffect, useRef, useState } from "react";
import marsScarp from "@/assets/mars-scarp.jpg";
import type { GeoPoint, Sample } from "@/lib/field-log";
import { bearing, distance, getCurrentMap, getMaterialTargets, HAZARDS, ROUTE, ROUTE_LENGTH, wrap180, wrap360 } from "@/lib/mission";
import { cn } from "@/lib/utils";

const IMG_RATIO = 1920 / 1088;

interface Marker {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: "waypoint" | "next" | "hazard" | "sample" | "geo";
  maxDist: number;
}

const KIND_CLASS: Record<Marker["kind"], string> = {
  next: "border-primary text-primary",
  waypoint: "border-primary/50 text-primary/80",
  hazard: "border-destructive text-destructive",
  sample: "border-warning text-warning",
  geo: "border-accent text-accent",
};

const MAP_THEMES = {
  jezero: {
    background: "radial-gradient(circle at 50% 25%, rgba(228,188,108,0.28), transparent 38%), linear-gradient(180deg, rgba(84,65,44,0.38), rgba(12,18,18,0.42))",
    hue: 6,
    brightness: 1,
    saturate: 1.2,
    contrast: 1.08,
    terrain: "Delta y llanura sedimental",
  },
  "valles-marineris": {
    background: "radial-gradient(circle at 50% 25%, rgba(200,135,84,0.24), transparent 36%), linear-gradient(180deg, rgba(91,59,40,0.46), rgba(14,13,10,0.42))",
    hue: 14,
    brightness: 0.95,
    saturate: 1.35,
    contrast: 1.16,
    terrain: "Cañón y escarpe tectónico",
  },
  gale: {
    background: "radial-gradient(circle at 50% 28%, rgba(214,188,120,0.22), transparent 34%), linear-gradient(180deg, rgba(92,75,54,0.32), rgba(14,16,17,0.46))",
    hue: 22,
    brightness: 0.98,
    saturate: 1.28,
    contrast: 1.12,
    terrain: "Cráter y meseta de montaña",
  },
} as const;

const SCENE_STAGES = [
  {
    id: "base",
    label: "Llanura de polvo",
    background: "radial-gradient(circle at 50% 25%, rgba(214,184,136,0.24), transparent 38%), linear-gradient(180deg, rgba(66,49,30,0.32), rgba(14,18,20,0.4))",
    hue: 0,
    brightness: 1,
    saturate: 1.15,
    contrast: 1.05,
  },
  {
    id: "blocks",
    label: "Bloques basálticos",
    background: "radial-gradient(circle at 50% 30%, rgba(191,152,104,0.18), transparent 34%), linear-gradient(180deg, rgba(82,74,60,0.28), rgba(17,14,12,0.42))",
    hue: 8,
    brightness: 1.05,
    saturate: 1.25,
    contrast: 1.08,
  },
  {
    id: "lava",
    label: "Canal de lava",
    background: "radial-gradient(circle at 50% 22%, rgba(244,146,48,0.18), transparent 30%), linear-gradient(180deg, rgba(97,49,31,0.26), rgba(13,18,20,0.44))",
    hue: 18,
    brightness: 1.08,
    saturate: 1.3,
    contrast: 1.15,
  },
  {
    id: "slope",
    label: "Talud de derrubios",
    background: "radial-gradient(circle at 50% 26%, rgba(180,94,58,0.2), transparent 32%), linear-gradient(180deg, rgba(86,57,41,0.32), rgba(18,14,12,0.46))",
    hue: 20,
    brightness: 0.96,
    saturate: 1.35,
    contrast: 1.18,
  },
  {
    id: "scarp",
    label: "Escarpe basal",
    background: "radial-gradient(circle at 52% 22%, rgba(215,142,75,0.24), transparent 30%), linear-gradient(180deg, rgba(108,76,52,0.22), rgba(18,16,13,0.52))",
    hue: 26,
    brightness: 0.92,
    saturate: 1.45,
    contrast: 1.2,
  },
  {
    id: "summit",
    label: "Mirador del escarpe",
    background: "radial-gradient(circle at 50% 18%, rgba(238,209,145,0.24), transparent 28%), linear-gradient(180deg, rgba(126,103,71,0.24), rgba(18,18,16,0.52))",
    hue: 30,
    brightness: 0.9,
    saturate: 1.55,
    contrast: 1.25,
  },
] as const;

const getSceneStage = (x: number, y: number, mapId: string) => {
  const progress = Math.min(1, Math.max(0, (x + y * 0.45) / (ROUTE_LENGTH * 1.1 + 400)));
  const idx = Math.min(SCENE_STAGES.length - 1, Math.max(0, Math.floor(progress * SCENE_STAGES.length)));
  const base = SCENE_STAGES[idx];
  const mapTheme = MAP_THEMES[mapId as keyof typeof MAP_THEMES] ?? MAP_THEMES.jezero;
  return {
    ...base,
    background: mapTheme.background,
    hue: mapTheme.hue + base.hue,
    brightness: Math.min(1.35, base.brightness * mapTheme.brightness),
    saturate: base.saturate * mapTheme.saturate,
    contrast: base.contrast * mapTheme.contrast,
    terrain: mapTheme.terrain,
    label: `${base.label} · ${mapTheme.terrain}`,
  };
};

/**
 * First-person scene seen through the visor. The landscape is a 360° strip (photo + mirror),
 * so turning the body or the head pans it; route points, hazards and logged finds float on top.
 */
export function LiveView({
  x,
  y,
  yaw,
  pitch,
  moving,
  nextIndex,
  samples,
  geoPoints,
}: {
  x: number;
  y: number;
  yaw: number;
  pitch: number;
  moving: boolean;
  nextIndex: number;
  samples: Sample[];
  geoPoints: GeoPoint[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1280, h: 800 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const imgH = size.h * 1.25;
  const imgW = imgH * IMG_RATIO;
  const period = imgW * 2; // photo + mirrored photo = 360°
  const pxPerDeg = period / 360;
  const offset = wrap360(yaw) * pxPerDeg;
  const tx = size.w / 2 - (offset + period);
  const ty = -size.h * 0.125 + pitch * ((size.h * 0.1) / 25);
  const horizon = size.h * 0.5 + pitch * ((size.h * 0.1) / 25);
  const currentMap = getCurrentMap();
  const scene = getSceneStage(x, y, currentMap.id);
  const nextWaypoint = ROUTE[Math.min(ROUTE.length - 1, Math.max(0, nextIndex))] ?? ROUTE[ROUTE.length - 1];
  const waypointDist = distance(x, y, nextWaypoint.x, nextWaypoint.y);
  const course = bearing(x, y, nextWaypoint.x, nextWaypoint.y);
  const materialTargets = getMaterialTargets(currentMap.id);

  const markers: Marker[] = [
    ...ROUTE.map((w, i) => ({
      id: w.id,
      x: w.x,
      y: w.y,
      label: `${w.id} · ${w.name}`,
      kind: (i === nextIndex ? "next" : "waypoint") as Marker["kind"],
      maxDist: i === nextIndex ? Infinity : 1400,
    })),
    ...HAZARDS.map((h) => ({ id: h.id, x: h.x, y: h.y, label: `⚠ ${h.label}`, kind: "hazard" as const, maxDist: 900 })),
    ...materialTargets.map((m) => ({ id: m.id, x: m.x, y: m.y, label: m.name, kind: "sample" as const, maxDist: 1200 })),
    ...samples.map((s) => ({ id: s.id, x: s.location.x, y: s.location.y, label: s.name, kind: "sample" as const, maxDist: 500 })),
    ...geoPoints.map((g) => ({ id: g.id, x: g.location.x, y: g.location.y, label: g.resource, kind: "geo" as const, maxDist: 500 })),
  ];

  const halfFov = size.w / 2 / pxPerDeg;
  const compact = size.w < 600; // small preview (e.g. mission control camera): labels only for the target

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: scene.background, pointerEvents: "none" }}
      />
      <div
        className={cn("absolute left-0 top-0 flex will-change-transform", moving && "visor-walk")}
        style={{ transform: `translate3d(${tx}px, ${ty}px, 0)`, height: imgH }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <img
            key={i}
            src={marsScarp}
            alt={i === 0 ? "Vista en vivo del escarpe basal del Monte Olimpo" : ""}
            aria-hidden={i !== 0}
            draggable={false}
            width={1920}
            height={1088}
            className="h-full max-w-none select-none"
            style={{
              width: imgW,
              filter: `hue-rotate(${scene.hue}deg) saturate(${scene.saturate}) brightness(${scene.brightness}) contrast(${scene.contrast})`,
              transform: i % 2 ? "scaleX(-1)" : undefined,
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute right-4 top-4 rounded-sm border border-border bg-background/55 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary backdrop-blur-sm">
        {currentMap.label} · {scene.label}
      </div>

      <div className="pointer-events-none absolute left-4 top-4 rounded-sm border border-border bg-background/50 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary backdrop-blur-sm">
        <div className="text-muted-foreground">Siguiente punto</div>
        <div className="mt-1 text-[12px] text-primary">{nextWaypoint.id} · {nextWaypoint.name}</div>
        <div className="mt-1 text-[11px] text-accent">Rumbo {Math.round(course)}° · {waypointDist < 1000 ? `${Math.round(waypointDist)} m` : `${(waypointDist / 1000).toFixed(2)} km`}</div>
      </div>

      {/* AR markers */}
      <div className="pointer-events-none absolute inset-0">
        {markers.map((m) => {
          const d = distance(x, y, m.x, m.y);
          if (d > m.maxDist || d < 3) return null;
          const rel = wrap180(bearing(x, y, m.x, m.y) - yaw);
          if (Math.abs(rel) > halfFov) return null;
          const sx = size.w / 2 + rel * pxPerDeg;
          const near = 1 - Math.min(d, 1500) / 1500;
          const sy = horizon + near * size.h * 0.18;
          return (
            <div
              key={m.id}
              className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
              style={{ left: sx, top: sy, opacity: 0.55 + near * 0.45 }}
            >
              {(!compact || m.kind === "next") && (
                <span
                  className={cn(
                    "whitespace-nowrap rounded-sm border bg-background/75 px-1.5 py-0.5 font-mono uppercase tracking-wider",
                    KIND_CLASS[m.kind],
                    compact ? "text-[9px]" : "text-[10px]",
                    m.kind === "next" && !compact && "hud-glow text-xs",
                  )}
                >
                  {m.label} · {d >= 1000 ? `${(d / 1000).toFixed(2)} km` : `${Math.round(d)} m`}
                </span>
              )}
              <span className={cn("h-5 w-px border-l", KIND_CLASS[m.kind])} />
              <span className={cn("size-2 rotate-45 border", KIND_CLASS[m.kind])} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
