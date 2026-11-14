import { useEffect, useRef, useState } from "react";
import marsScarp from "@/assets/mars-scarp.jpg";
import type { GeoPoint, Sample } from "@/lib/field-log";
import { bearing, distance, HAZARDS, ROUTE, wrap180, wrap360 } from "@/lib/mission";
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
    ...samples.map((s) => ({ id: s.id, x: s.location.x, y: s.location.y, label: s.name, kind: "sample" as const, maxDist: 500 })),
    ...geoPoints.map((g) => ({ id: g.id, x: g.location.x, y: g.location.y, label: g.resource, kind: "geo" as const, maxDist: 500 })),
  ];

  const halfFov = size.w / 2 / pxPerDeg;
  const compact = size.w < 600; // small preview (e.g. mission control camera): labels only for the target

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
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
            style={{ width: imgW, transform: i % 2 ? "scaleX(-1)" : undefined }}
          />
        ))}
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
