import { useEffect, useRef, useState } from "react";
import { VIEW_FOV } from "@/lib/eva-engine";
import type { GeoPoint, Sample } from "@/lib/field-log";
import { HAZARDS, MAP_BOUNDS, ROUTE, slopeLevel, waypointAt } from "@/lib/mission";
import { cn } from "@/lib/utils";

export type MapLayer = "pendiente" | "crism" | "peligros" | "ruta" | "reticula";
export const MAP_LAYERS: { key: MapLayer; label: string }[] = [
  { key: "pendiente", label: "Pendiente MOLA" },
  { key: "crism", label: "Espectral CRISM" },
  { key: "peligros", label: "Peligros" },
  { key: "ruta", label: "Ruta sugerida" },
  { key: "reticula", label: "Retícula" },
];

const W = MAP_BOUNDS.maxX - MAP_BOUNDS.minX;
const H = MAP_BOUNDS.maxY - MAP_BOUNDS.minY;
const sx = (x: number) => x - MAP_BOUNDS.minX;
const sy = (y: number) => MAP_BOUNDS.maxY - y;

const SLOPE_COLOR = {
  nominal: "var(--color-success)",
  advertencia: "var(--color-warning)",
  critico: "var(--color-destructive)",
};
export const MINERAL_COLOR: Record<string, string> = {
  Regolito: "var(--color-muted-foreground)",
  Basalto: "var(--color-chart-1)",
  Olivino: "var(--color-success)",
  Andesita: "var(--color-accent)",
  Hematita: "var(--color-destructive)",
  "Yeso (sulfatos)": "var(--color-warning)",
};

export function TacticalMap({
  x,
  y,
  yaw,
  nextIndex,
  layers,
  samples,
  geoPoints,
}: {
  x: number;
  y: number;
  yaw: number;
  nextIndex: number;
  layers: Set<MapLayer>;
  samples: Sample[];
  geoPoints: GeoPoint[];
}) {
  // Breadcrumb trail of where the astronaut has walked (this session).
  const [trail, setTrail] = useState<[number, number][]>([]);
  const last = useRef<[number, number] | null>(null);
  useEffect(() => {
    const l = last.current;
    if (!l || Math.hypot(x - l[0], y - l[1]) > 12) {
      last.current = [x, y];
      setTrail((t) => (Math.hypot(x, y) < 1 && t.length > 5 ? [[x, y]] : [...t.slice(-400), [x, y]]));
    }
  }, [x, y]);

  const cone = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return `${sx(x) + Math.sin(r) * 380},${sy(y) - Math.cos(r) * 380}`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="size-full" role="img" aria-label="Mapa táctico en vivo">
      <defs>
        <pattern id="cc-grid" width="250" height="250" patternUnits="userSpaceOnUse">
          <path d="M 250 0 L 0 0 0 250" fill="none" stroke="var(--color-border)" strokeWidth="3" />
        </pattern>
        <radialGradient id="cc-terrain" cx="70%" cy="20%" r="90%">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.05" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#cc-terrain)" />
      {layers.has("reticula") && <rect width={W} height={H} fill="url(#cc-grid)" />}

      {layers.has("crism") &&
        ROUTE.slice(1).map((wp, i) => {
          const a = waypointAt(i);
          return (
            <ellipse
              key={wp.id}
              cx={sx((a.x + wp.x) / 2)}
              cy={sy((a.y + wp.y) / 2)}
              rx="260"
              ry="200"
              fill={MINERAL_COLOR[wp.mineral] ?? "var(--color-muted)"}
              opacity="0.18"
            />
          );
        })}

      {layers.has("pendiente") &&
        ROUTE.slice(1).map((wp, i) => {
          const a = waypointAt(i);
          return (
            <line
              key={wp.id}
              x1={sx(a.x)}
              y1={sy(a.y)}
              x2={sx(wp.x)}
              y2={sy(wp.y)}
              stroke={SLOPE_COLOR[slopeLevel(wp.slope).status]}
              strokeWidth="90"
              strokeLinecap="round"
              opacity="0.2"
            />
          );
        })}

      {layers.has("peligros") &&
        HAZARDS.map((h) => (
          <g key={h.id}>
            <circle cx={sx(h.x)} cy={sy(h.y)} r={h.radius} fill="var(--color-destructive)" opacity="0.15" stroke="var(--color-destructive)" strokeWidth="5" strokeDasharray="20 14" />
            <text x={sx(h.x)} y={sy(h.y) - h.radius - 18} textAnchor="middle" fill="var(--color-destructive)" fontSize="46" fontFamily="var(--font-mono)">
              △ {h.label}
            </text>
          </g>
        ))}

      {layers.has("ruta") &&
        ROUTE.slice(1).map((wp, i) => {
          const a = waypointAt(i);
          return (
            <line
              key={wp.id}
              x1={sx(a.x)}
              y1={sy(a.y)}
              x2={sx(wp.x)}
              y2={sy(wp.y)}
              stroke={layers.has("pendiente") ? SLOPE_COLOR[slopeLevel(wp.slope).status] : "var(--color-primary)"}
              strokeWidth="12"
              strokeDasharray={i + 1 >= nextIndex ? "36 22" : undefined}
            />
          );
        })}

      {trail.length > 1 && (
        <polyline
          points={trail.map(([tx, ty]) => `${sx(tx)},${sy(ty)}`).join(" ")}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="6"
          strokeOpacity="0.7"
          strokeDasharray="4 10"
          strokeLinecap="round"
        />
      )}

      {ROUTE.map((wp, i) => {
        const level = slopeLevel(wp.slope).status;
        return (
          <g key={wp.id}>
            <circle cx={sx(wp.x)} cy={sy(wp.y)} r={i === nextIndex ? 34 : 24} fill="var(--color-background)" stroke={i === nextIndex ? "var(--color-primary)" : SLOPE_COLOR[level]} strokeWidth="7" />
            <rect x={sx(wp.x) + 40} y={sy(wp.y) - 40} width="230" height="64" rx="6" fill="var(--color-background)" opacity="0.8" stroke={SLOPE_COLOR[level]} strokeWidth="3" />
            <text x={sx(wp.x) + 54} y={sy(wp.y) + 4} fill={SLOPE_COLOR[level]} fontSize="44" fontFamily="var(--font-mono)">
              {wp.id} {wp.slope}°
            </text>
          </g>
        );
      })}

      {geoPoints.map((g) => (
        <polygon
          key={g.id}
          points={`${sx(g.location.x)},${sy(g.location.y) - 40} ${sx(g.location.x) + 36},${sy(g.location.y) + 24} ${sx(g.location.x) - 36},${sy(g.location.y) + 24}`}
          fill="var(--color-accent)"
          stroke="var(--color-background)"
          strokeWidth="6"
        >
          <title>{g.resource}</title>
        </polygon>
      ))}
      {samples.map((s) => (
        <rect
          key={s.id}
          x={sx(s.location.x) - 22}
          y={sy(s.location.y) - 22}
          width="44"
          height="44"
          transform={`rotate(45 ${sx(s.location.x)} ${sy(s.location.y)})`}
          fill="var(--color-warning)"
          stroke="var(--color-background)"
          strokeWidth="6"
        >
          <title>{s.name}</title>
        </rect>
      ))}

      <polygon points={`${sx(x)},${sy(y)} ${cone(yaw - VIEW_FOV / 2)} ${cone(yaw + VIEW_FOV / 2)}`} fill="var(--color-primary)" opacity="0.18" />
      <g transform={`translate(${sx(x)} ${sy(y)})`}>
        <circle r="80" fill="var(--color-primary)" opacity="0.15" className="alert-blink" />
        <g transform={`rotate(${yaw})`}>
          <path d="M0,-56 L36,40 L0,22 L-36,40 Z" fill="var(--color-primary)" />
        </g>
      </g>
    </svg>
  );
}

export function LayerToggles({ layers, onToggle }: { layers: Set<MapLayer>; onToggle: (l: MapLayer) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="hud-label mr-1">Capas de datos</span>
      {MAP_LAYERS.map((l) => (
        <button
          key={l.key}
          type="button"
          aria-pressed={layers.has(l.key)}
          onClick={() => onToggle(l.key)}
          className={cn(
            "rounded-sm border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors",
            layers.has(l.key) ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-primary",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
