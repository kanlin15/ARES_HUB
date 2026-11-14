// Mission model for the ARES-HUD EVA simulation: route, life-support thresholds and terrain risk.

export type Status = "nominal" | "advertencia" | "critico";

export interface Waypoint {
  id: string;
  name: string;
  /** Local map position in metres from the habitat (x = east, y = north). */
  x: number;
  y: number;
  /** Terrain slope (degrees) of the segment that ENDS at this waypoint. */
  slope: number;
  terrain: string;
  /** Mineral flagged by the simulated CRISM overlay along this segment. */
  mineral: string;
}

/** Olympus Mons basal scarp, east flank (planetocentric, east-positive longitude). */
export const ORIGIN = { lat: 18.35, lon: 228.9 };
const METRES_PER_DEG_LAT = 59_274; // Mars mean radius 3389.5 km

export const ROUTE: Waypoint[] = [
  { id: "WP-0", name: "Hábitat Ares Base", x: 0, y: 0, slope: 2, terrain: "Llanura de polvo", mineral: "Regolito" },
  { id: "WP-1", name: "Campo de bloques", x: 420, y: 310, slope: 8, terrain: "Bloques basálticos", mineral: "Basalto" },
  { id: "WP-2", name: "Canal de lava", x: 980, y: 520, slope: 14, terrain: "Canal de lava colapsado", mineral: "Olivino" },
  { id: "WP-3", name: "Talud del escarpe", x: 1460, y: 980, slope: 22, terrain: "Talud de derrubios", mineral: "Andesita" },
  { id: "WP-4", name: "Cornisa basal", x: 1720, y: 1560, slope: 32, terrain: "Escarpe basal", mineral: "Hematita" },
  { id: "WP-5", name: "Mirador del escarpe", x: 2240, y: 1880, slope: 12, terrain: "Terraza de sulfatos", mineral: "Yeso (sulfatos)" },
];

export function slopeLevel(deg: number): { status: Status; label: string } {
  if (deg >= 30) return { status: "critico", label: "PELIGRO EXTREMO" };
  if (deg >= 25) return { status: "critico", label: "ALTO RIESGO" };
  if (deg >= 15) return { status: "advertencia", label: "PRECAUCIÓN" };
  return { status: "nominal", label: "SEGURO" };
}

export function toLatLon(x: number, y: number) {
  const lat = ORIGIN.lat + y / METRES_PER_DEG_LAT;
  const lon = ORIGIN.lon + x / (METRES_PER_DEG_LAT * Math.cos((ORIGIN.lat * Math.PI) / 180));
  return { lat, lon };
}

const segLen = (a: Waypoint, b: Waypoint) => Math.hypot(b.x - a.x, b.y - a.y);

export const ROUTE_LENGTH = ROUTE.slice(1).reduce((s, wp, i) => s + segLen(ROUTE[i], wp), 0);

export interface Position {
  x: number;
  y: number;
  lat: number;
  lon: number;
  /** Index of the waypoint the astronaut is heading to. */
  nextIndex: number;
  /** Metres left to the next waypoint. */
  toNext: number;
  /** Heading in degrees, 0 = north, clockwise. */
  heading: number;
  slope: number;
  terrain: string;
  mineral: string;
  finished: boolean;
}

export function positionAt(distance: number): Position {
  let left = Math.max(0, distance);
  for (let i = 1; i < ROUTE.length; i++) {
    const a = ROUTE[i - 1];
    const b = ROUTE[i];
    const len = segLen(a, b);
    const heading = ((Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI + 360) % 360;
    if (left <= len || i === ROUTE.length - 1) {
      const t = Math.min(1, left / len);
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      return {
        x,
        y,
        ...toLatLon(x, y),
        nextIndex: i,
        toNext: Math.max(0, len - left),
        heading,
        slope: b.slope,
        terrain: b.terrain,
        mineral: b.mineral,
        finished: distance >= ROUTE_LENGTH,
      };
    }
    left -= len;
  }
  // Unreachable with a route of 2+ waypoints.
  const last = ROUTE[ROUTE.length - 1];
  return { x: last.x, y: last.y, ...toLatLon(last.x, last.y), nextIndex: ROUTE.length - 1, toNext: 0, heading: 0, slope: last.slope, terrain: last.terrain, mineral: last.mineral, finished: true };
}

/* ---------- Life support ---------- */

export type ResourceKey = "oxygen" | "battery" | "water" | "pressure" | "radiation" | "heartRate" | "suitTemp";

interface ResourceDef {
  key: ResourceKey;
  label: string;
  unit: string;
  /** "low" = low values are dangerous, "high" = high values are dangerous. */
  danger: "low" | "high";
  warn: number;
  crit: number;
  /** Gauge range for drawing the bar. */
  min: number;
  max: number;
  decimals: number;
}

export const RESOURCES: ResourceDef[] = [
  { key: "oxygen", label: "Oxígeno", unit: "%", danger: "low", warn: 40, crit: 20, min: 0, max: 100, decimals: 1 },
  { key: "battery", label: "Batería", unit: "%", danger: "low", warn: 35, crit: 15, min: 0, max: 100, decimals: 1 },
  { key: "water", label: "Agua / refrigerante", unit: "%", danger: "low", warn: 30, crit: 15, min: 0, max: 100, decimals: 0 },
  { key: "pressure", label: "Presión del traje", unit: "kPa", danger: "low", warn: 27, crit: 25, min: 20, max: 32, decimals: 1 },
  { key: "radiation", label: "Radiación", unit: "µSv/h", danger: "high", warn: 60, crit: 100, min: 0, max: 160, decimals: 0 },
  { key: "heartRate", label: "Ritmo cardíaco", unit: "lpm", danger: "high", warn: 140, crit: 170, min: 50, max: 200, decimals: 0 },
  { key: "suitTemp", label: "Temp. interna", unit: "°C", danger: "high", warn: 27, crit: 31, min: 10, max: 36, decimals: 1 },
];

export type Telemetry = Record<ResourceKey, number>;

export const INITIAL_TELEMETRY: Telemetry = {
  oxygen: 96,
  battery: 92,
  water: 88,
  pressure: 29.6,
  radiation: 24,
  heartRate: 82,
  suitTemp: 21.5,
};

export function resourceStatus(key: ResourceKey, value: number): Status {
  const def = RESOURCES.find((r) => r.key === key)!;
  if (def.danger === "low") {
    if (value <= def.crit) return "critico";
    if (value <= def.warn) return "advertencia";
    return "nominal";
  }
  if (value >= def.crit) return "critico";
  if (value >= def.warn) return "advertencia";
  return "nominal";
}

/** Minutes of oxygen left at the current consumption rate (% per second of mission time). */
export function oxygenMinutesLeft(oxygen: number, ratePerSec: number) {
  if (ratePerSec <= 0) return Infinity;
  return oxygen / ratePerSec / 60;
}

/* ---------- Catalogues for the logs ---------- */

export const SAMPLE_CATEGORIES = ["Roca", "Mineral", "Regolito", "Hielo", "Meteorito", "Fósil / estructura", "Otro"] as const;
export const GEO_RESOURCES = ["Agua helada", "Hematita", "Basalto", "Andesita", "Olivino", "Yeso (sulfatos)", "Arcillas", "Regolito", "Otro"] as const;
export const ABUNDANCE = ["Baja", "Media", "Alta"] as const;

export function formatCoord(lat: number, lon: number) {
  return `${lat.toFixed(4)}°N  ${lon.toFixed(4)}°E`;
}

export function formatMissionTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
