import { Map as MapIcon } from "lucide-react";
import type { GeoPoint, Sample } from "@/lib/field-log";
import { ROUTE, slopeLevel, type Position } from "@/lib/mission";

const PAD = 160;
const xs = ROUTE.map((w) => w.x);
const ys = ROUTE.map((w) => w.y);
const minX = Math.min(...xs) - PAD;
const maxX = Math.max(...xs) + PAD;
const minY = Math.min(...ys) - PAD;
const maxY = Math.max(...ys) + PAD;
const W = maxX - minX;
const H = maxY - minY;
// SVG y grows downward; north is up.
const sx = (x: number) => x - minX;
const sy = (y: number) => maxY - y;

const STROKE = {
  nominal: "var(--color-success)",
  advertencia: "var(--color-warning)",
  critico: "var(--color-destructive)",
};

export function MiniMap({
  position,
  samples,
  geoPoints,
}: {
  position: Position;
  samples: Sample[];
  geoPoints: GeoPoint[];
}) {
  return (
    <section className="hud-panel p-4" aria-label="Mapa táctico de la ruta">
      <header className="mb-2 flex items-center justify-between">
        <h2 className="hud-title flex items-center gap-2 text-sm">
          <MapIcon className="size-4" /> Ruta táctica
        </h2>
        <span className="hud-label">HiRISE · CTX</span>
      </header>
      <svg viewBox={`0 0 ${W} ${H}`} className="aspect-[4/3] w-full" role="img" aria-label="Mapa con la ruta, muestras y puntos geológicos">
        <defs>
          <pattern id="grid" width="200" height="200" patternUnits="userSpaceOnUse">
            <path d="M 200 0 L 0 0 0 200" fill="none" stroke="var(--color-border)" strokeWidth="2" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />
        {ROUTE.slice(1).map((wp, i) => {
          const a = ROUTE[i];
          return (
            <line
              key={wp.id}
              x1={sx(a.x)}
              y1={sy(a.y)}
              x2={sx(wp.x)}
              y2={sy(wp.y)}
              stroke={STROKE[slopeLevel(wp.slope).status]}
              strokeWidth="14"
              strokeDasharray={i + 1 >= position.nextIndex ? "34 22" : undefined}
              opacity={i + 1 < position.nextIndex ? 0.45 : 0.9}
            />
          );
        })}
        {ROUTE.map((wp, i) => (
          <g key={wp.id}>
            <circle cx={sx(wp.x)} cy={sy(wp.y)} r="26" fill="var(--color-background)" stroke="var(--color-primary)" strokeWidth="6" />
            <text x={sx(wp.x) + 42} y={sy(wp.y) + 14} fill="var(--color-primary)" fontSize="58" fontFamily="var(--font-mono)">
              {i}
            </text>
          </g>
        ))}
        {geoPoints.map((g) => (
          <polygon
            key={g.id}
            points={`${sx(g.location.x)},${sy(g.location.y) - 42} ${sx(g.location.x) + 38},${sy(g.location.y) + 26} ${sx(g.location.x) - 38},${sy(g.location.y) + 26}`}
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
            x={sx(s.location.x) - 24}
            y={sy(s.location.y) - 24}
            width="48"
            height="48"
            transform={`rotate(45 ${sx(s.location.x)} ${sy(s.location.y)})`}
            fill="var(--color-warning)"
            stroke="var(--color-background)"
            strokeWidth="6"
          >
            <title>{s.name}</title>
          </rect>
        ))}
        <g transform={`translate(${sx(position.x)} ${sy(position.y)}) rotate(${position.heading})`}>
          <circle r="70" fill="var(--color-primary)" opacity="0.18" className="alert-blink" />
          <path d="M0,-52 L34,38 L0,20 L-34,38 Z" fill="var(--color-primary)" />
        </g>
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <li className="flex items-center gap-1.5"><span className="inline-block size-2 rotate-45 bg-warning" /> Muestra</li>
        <li className="flex items-center gap-1.5"><span className="inline-block size-0 border-x-4 border-b-8 border-x-transparent border-b-accent" /> Punto geológico</li>
        <li className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-3 bg-destructive" /> Pendiente peligrosa</li>
      </ul>
    </section>
  );
}
