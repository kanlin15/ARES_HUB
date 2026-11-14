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
  /** Elevation in metres (illustrative MOLA-like profile). */
  elevation: number;
}

/** Olympus Mons basal scarp, east flank (planetocentric, east-positive longitude). */
export const ORIGIN = { lat: 18.35, lon: 228.9 };
const METRES_PER_DEG_LAT = 59_274; // Mars mean radius 3389.5 km

export const ROUTE: Waypoint[] = [
  { id: "WP-0", name: "Hábitat Ares Base", x: 0, y: 0, slope: 2, terrain: "Llanura de polvo", mineral: "Regolito", elevation: 1650 },
  { id: "WP-1", name: "Campo de bloques", x: 420, y: 310, slope: 8, terrain: "Bloques basálticos", mineral: "Basalto", elevation: 1700 },
  { id: "WP-2", name: "Canal de lava", x: 980, y: 520, slope: 14, terrain: "Canal de lava colapsado", mineral: "Olivino", elevation: 1790 },
  { id: "WP-3", name: "Talud del escarpe", x: 1460, y: 980, slope: 22, terrain: "Talud de derrubios", mineral: "Andesita", elevation: 1990 },
  { id: "WP-4", name: "Cornisa basal", x: 1720, y: 1560, slope: 32, terrain: "Escarpe basal", mineral: "Hematita", elevation: 2320 },
  { id: "WP-5", name: "Mirador del escarpe", x: 2240, y: 1880, slope: 12, terrain: "Terraza de sulfatos", mineral: "Yeso (sulfatos)", elevation: 2420 },
];

/** Safe waypoint lookup (index is clamped to the route). */
export function waypointAt(i: number): Waypoint {
  return ROUTE[Math.min(ROUTE.length - 1, Math.max(0, i))] as Waypoint;
}

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

export const ROUTE_LENGTH = ROUTE.slice(1).reduce((s, wp, i) => s + segLen(waypointAt(i), wp), 0);

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
    const a = waypointAt(i - 1);
    const b = waypointAt(i);
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
  const last = waypointAt(ROUTE.length - 1);
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

/* ---------- Free movement on the local map ---------- */

export const MAP_BOUNDS = { minX: -400, maxX: 2700, minY: -400, maxY: 2300 };
/** Metres from the suggested route before an off-route warning. */
export const OFF_ROUTE_LIMIT = 150;
/** Metres to a waypoint to count it as reached. */
export const WAYPOINT_REACH = 40;

export interface Hazard {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
}

export const HAZARDS: Hazard[] = [
  { id: "HZ-1", label: "Campo de rocas", x: 700, y: 470, radius: 120 },
  { id: "HZ-2", label: "Remolino de polvo", x: 1150, y: 640, radius: 160 },
  { id: "HZ-3", label: "Desprendimientos", x: 1640, y: 1300, radius: 150 },
  { id: "HZ-4", label: "Fractura", x: 2000, y: 1760, radius: 110 },
];

export const wrap360 = (d: number) => ((d % 360) + 360) % 360;
export const wrap180 = (d: number) => wrap360(d + 180) - 180;
export const distance = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);
/** Bearing from point 1 to point 2: 0 = north, clockwise. */
export const bearing = (x1: number, y1: number, x2: number, y2: number) =>
  wrap360((Math.atan2(x2 - x1, y2 - y1) * 180) / Math.PI);

export interface PlaceContext {
  lat: number;
  lon: number;
  /** Index of the waypoint that ends the nearest route segment. */
  segment: number;
  slope: number;
  terrain: string;
  mineral: string;
  elevation: number;
  /** Distance (m) to the suggested route. */
  offRoute: number;
  /** Distance (m) along the route of the nearest point. */
  along: number;
  hazard: Hazard | null;
  hazardDist: number;
}

/** Terrain context of any map position, taken from the nearest route segment. */
export function contextAt(x: number, y: number): PlaceContext {
  let best = { d: Infinity, i: 1, t: 0, along: 0 };
  let acc = 0;
  for (let i = 1; i < ROUTE.length; i++) {
    const a = waypointAt(i - 1);
    const b = waypointAt(i);
    const len = segLen(a, b);
    const t = Math.min(1, Math.max(0, ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / (len * len)));
    const d = distance(x, y, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    if (d < best.d) best = { d, i, t, along: acc + len * t };
    acc += len;
  }
  const a = waypointAt(best.i - 1);
  const b = waypointAt(best.i);
  let hazard: Hazard | null = null;
  let hazardDist = Infinity;
  for (const h of HAZARDS) {
    const d = distance(x, y, h.x, h.y);
    if (d < hazardDist) {
      hazardDist = d;
      hazard = h;
    }
  }
  return {
    ...toLatLon(x, y),
    segment: best.i,
    slope: b.slope,
    terrain: b.terrain,
    mineral: b.mineral,
    elevation: Math.round(a.elevation + (b.elevation - a.elevation) * best.t),
    offRoute: best.d,
    along: best.along,
    hazard,
    hazardDist,
  };
}
