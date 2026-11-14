import { ROUTE, ROUTE_LENGTH, slopeLevel, waypointAt } from "@/lib/mission";

const VW = 1000;
const VH = 200;
const PAD = 30;
const elevs = ROUTE.map((w) => w.elevation);
const minE = Math.min(...elevs) - 60;
const maxE = Math.max(...elevs) + 60;
const cum = ROUTE.reduce<number[]>((acc, w, i) => {
  if (i === 0) return [0];
  const a = waypointAt(i - 1);
  return [...acc, (acc[i - 1] ?? 0) + Math.hypot(w.x - a.x, w.y - a.y)];
}, []);
const px = (d: number) => PAD + (d / ROUTE_LENGTH) * (VW - PAD * 2);
const py = (e: number) => VH - PAD - ((e - minE) / (maxE - minE)) * (VH - PAD * 2);
const COLOR = { nominal: "var(--color-success)", advertencia: "var(--color-warning)", critico: "var(--color-destructive)" };

export function ElevationProfile({ along, elevation }: { along: number; elevation: number }) {
  const area = `M${px(0)},${VH - PAD} ` + ROUTE.map((w, i) => `L${px(cum[i] ?? 0)},${py(w.elevation)}`).join(" ") + ` L${px(ROUTE_LENGTH)},${VH - PAD} Z`;
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="h-40 w-full" role="img" aria-label="Perfil de elevación de la ruta">
      <path d={area} fill="var(--color-primary)" opacity="0.08" />
      {ROUTE.slice(1).map((w, i) => (
        <line
          key={w.id}
          x1={px(cum[i] ?? 0)}
          y1={py(waypointAt(i).elevation)}
          x2={px(cum[i + 1] ?? 0)}
          y2={py(w.elevation)}
          stroke={COLOR[slopeLevel(w.slope).status]}
          strokeWidth="3"
        />
      ))}
      {ROUTE.map((w, i) => (
        <g key={w.id}>
          <rect x={px(cum[i] ?? 0) - 5} y={VH - PAD + 4} width="10" height="10" transform={`rotate(45 ${px(cum[i] ?? 0)} ${VH - PAD + 9})`} fill={COLOR[slopeLevel(w.slope).status]} />
          <text x={px(cum[i] ?? 0)} y={VH - 2} textAnchor="middle" fontSize="12" fill="var(--color-muted-foreground)" fontFamily="var(--font-mono)">
            {w.id} · {w.slope}°
          </text>
        </g>
      ))}
      <line x1={px(along)} x2={px(along)} y1={PAD - 10} y2={VH - PAD} stroke="var(--color-primary)" strokeDasharray="4 4" />
      <circle cx={px(along)} cy={py(elevation)} r="7" fill="var(--color-primary)" className="alert-blink" />
      <text x={px(along) + 10} y={PAD - 2} fontSize="13" fill="var(--color-primary)" fontFamily="var(--font-mono)">
        Astronauta · {elevation} m
      </text>
    </svg>
  );
}
