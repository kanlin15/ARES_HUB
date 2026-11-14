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

export type MissionMapId = "jezero" | "valles-marineris" | "gale";

export interface MissionMapDefinition {
  id: MissionMapId;
  label: string;
  subtitle: string;
  routeVariants: Waypoint[][];
  defaultRouteIndex: number;
}

const ROUTE_VARIANTS: Record<MissionMapId, MissionMapDefinition> = {
  jezero: {
    id: "jezero",
    label: "Jezero",
    subtitle: "Cráter Jezero · Hemisferio norte, borde occidental de Isidis Planitia",
    defaultRouteIndex: 0,
    routeVariants: [
      [
        { id: "JZ-0", name: "Base de operaciones", x: 0, y: 0, slope: 2, terrain: "Llanura de polvo", mineral: "Regolito", elevation: 1650 },
        { id: "JZ-1", name: "Duna de granulares", x: 430, y: 280, slope: 7, terrain: "Dunas de regolito", mineral: "Basalto", elevation: 1710 },
        { id: "JZ-2", name: "Delta de sedimentos", x: 980, y: 620, slope: 10, terrain: "Delta lacustre", mineral: "Arcillas", elevation: 1785 },
        { id: "JZ-3", name: "Río seco", x: 1450, y: 1090, slope: 18, terrain: "Canal de flujo antiguo", mineral: "Hematita", elevation: 2010 },
        { id: "JZ-4", name: "Cresta de farellanos", x: 1820, y: 1520, slope: 32, terrain: "Farellanos sedimentarios", mineral: "Yeso (sulfatos)", elevation: 2260 },
        { id: "JZ-5", name: "Mirador de Jezero", x: 2280, y: 1910, slope: 12, terrain: "Terraza lacustre", mineral: "Yeso (sulfatos)", elevation: 2420 },
      ],
      [
        { id: "JZ-A", name: "Alfa margen", x: 70, y: 40, slope: 3, terrain: "Llanura de polvo", mineral: "Regolito", elevation: 1660 },
        { id: "JZ-B", name: "Manto de arena", x: 520, y: 360, slope: 9, terrain: "Manto arenoso", mineral: "Basalto", elevation: 1740 },
        { id: "JZ-C", name: "Muescas del delta", x: 1200, y: 740, slope: 18, terrain: "Canales de deriva", mineral: "Arcillas", elevation: 1845 },
        { id: "JZ-D", name: "Ribera del río", x: 1700, y: 1230, slope: 20, terrain: "Ribera antigua", mineral: "Hematita", elevation: 2140 },
        { id: "JZ-E", name: "Cima escarpada", x: 2100, y: 1635, slope: 32, terrain: "Talud de capas", mineral: "Basalto", elevation: 2350 },
        { id: "JZ-F", name: "Mirador del margen", x: 2490, y: 2080, slope: 13, terrain: "Terraza de arenita", mineral: "Hematita", elevation: 2465 },
      ],
    ],
  },
  "valles-marineris": {
    id: "valles-marineris",
    label: "Valles Marineris",
    subtitle: "Gran sistema de cañones a lo largo del ecuador marciano, al este de Tharsis",
    defaultRouteIndex: 0,
    routeVariants: [
      [
        { id: "VM-0", name: "Rampa del cañón", x: 0, y: 0, slope: 5, terrain: "Meseta basal", mineral: "Basalto", elevation: 1480 },
        { id: "VM-1", name: "Franja de placas", x: 460, y: 340, slope: 12, terrain: "Placas rotas", mineral: "Andesita", elevation: 1578 },
        { id: "VM-2", name: "Cañón septentrional", x: 1050, y: 760, slope: 17, terrain: "Cañón de falla", mineral: "Piroxeno", elevation: 1760 },
        { id: "VM-3", name: "Ladera de derrubios", x: 1540, y: 1160, slope: 25, terrain: "Talud de derrubios", mineral: "Andesita", elevation: 2030 },
        { id: "VM-4", name: "Cornisa del cañón", x: 1920, y: 1730, slope: 30, terrain: "Escarpe de falla", mineral: "Hematita", elevation: 2325 },
        { id: "VM-5", name: "Mirador del valle", x: 2440, y: 2140, slope: 11, terrain: "Risco de sedimentación", mineral: "Yeso (sulfatos)", elevation: 2415 },
      ],
      [
        { id: "VM-A", name: "Acceso de fallas", x: 100, y: 30, slope: 4, terrain: "Piedra fracturada", mineral: "Basalto", elevation: 1505 },
        { id: "VM-B", name: "Cuenca de erosión", x: 620, y: 440, slope: 13, terrain: "Cuenca tectónica", mineral: "Piroxeno", elevation: 1620 },
        { id: "VM-C", name: "Rampa de bloques", x: 1180, y: 910, slope: 22, terrain: "Bloques caídos", mineral: "Andesita", elevation: 1825 },
        { id: "VM-D", name: "Línea de grietas", x: 1710, y: 1390, slope: 28, terrain: "Cañón abierto", mineral: "Hematita", elevation: 2110 },
        { id: "VM-E", name: "Punta de escarpe", x: 2140, y: 1760, slope: 33, terrain: "Pared vertical", mineral: "Arcillas", elevation: 2360 },
        { id: "VM-F", name: "Mirador Marineris", x: 2550, y: 2280, slope: 12, terrain: "Terraza superior", mineral: "Yeso (sulfatos)", elevation: 2520 },
      ],
    ],
  },
  gale: {
    id: "gale",
    label: "Gale",
    subtitle: "Cráter Gale · Cerca del ecuador, al noroeste de Hellas y Monte Sharp",
    defaultRouteIndex: 0,
    routeVariants: [
      [
        { id: "GA-0", name: "Cráter del norte", x: 0, y: 0, slope: 2, terrain: "Llanura de polvo", mineral: "Regolito", elevation: 1710 },
        { id: "GA-1", name: "Rodal de dunas", x: 440, y: 300, slope: 8, terrain: "Dunas de arena", mineral: "Basalto", elevation: 1745 },
        { id: "GA-2", name: "Llanura de rocas", x: 980, y: 620, slope: 11, terrain: "Rocas brechosas", mineral: "Andesita", elevation: 1840 },
        { id: "GA-3", name: "Pendiente del monte", x: 1540, y: 1030, slope: 18, terrain: "Talud de montaña", mineral: "Hematita", elevation: 1985 },
        { id: "GA-4", name: "Mirador de los estratos", x: 2020, y: 1540, slope: 24, terrain: "Estratos sedimentarios", mineral: "Yeso (sulfatos)", elevation: 2250 },
        { id: "GA-5", name: "Pico Gale", x: 2460, y: 1915, slope: 14, terrain: "Meseta de elevación", mineral: "Arcillas", elevation: 2415 },
      ],
      [
        { id: "GA-A", name: "Acceso al cráter", x: 120, y: 60, slope: 3, terrain: "Llanura de polvo", mineral: "Regolito", elevation: 1730 },
        { id: "GA-B", name: "Dunas de surco", x: 520, y: 390, slope: 9, terrain: "Dunas compactas", mineral: "Basalto", elevation: 1775 },
        { id: "GA-C", name: "Piedra de brecha", x: 1120, y: 820, slope: 14, terrain: "Rocas de brecha", mineral: "Piroxeno", elevation: 1880 },
        { id: "GA-D", name: "Rampa de conglomerado", x: 1680, y: 1160, slope: 21, terrain: "Conglomerado", mineral: "Hematita", elevation: 2070 },
        { id: "GA-E", name: "Tajo de capas", x: 2120, y: 1600, slope: 26, terrain: "Capas estratificadas", mineral: "Yeso (sulfatos)", elevation: 2320 },
        { id: "GA-F", name: "Cima de Gale", x: 2560, y: 2010, slope: 13, terrain: "Meseta final", mineral: "Arcillas", elevation: 2480 },
      ],
    ],
  },
} as const;

export const MAPS = Object.values(ROUTE_VARIANTS);

export interface MaterialNode {
  id: string;
  name: string;
  category: string;
  description: string;
  x: number;
  y: number;
  radius: number;
  mapId: MissionMapId;
}

export const MATERIAL_NODES: Record<MissionMapId, MaterialNode[]> = {
  jezero: [
    {
      id: "MAT-JEZ-1",
      name: "Vena de hematita",
      category: "Mineral",
      description: "Piedra ferruginosa con tonalidades rojizas y filones de hematita.",
      x: 620,
      y: 430,
      radius: 120,
      mapId: "jezero",
    },
    {
      id: "MAT-JEZ-2",
      name: "Núcleo de yeso",
      category: "Mineral",
      description: "Deposito cristalino de sulfatos con brillo blanquecino.",
      x: 1450,
      y: 980,
      radius: 130,
      mapId: "jezero",
    },
    {
      id: "MAT-JEZ-3",
      name: "Bloque de arcilla",
      category: "Mineral",
      description: "Estrato arcilloso con textura húmeda y capas compactadas.",
      x: 2140,
      y: 1625,
      radius: 140,
      mapId: "jezero",
    },
  ],
  "valles-marineris": [
    {
      id: "MAT-VM-1",
      name: "Piroxeno fracturado",
      category: "Mineral",
      description: "Fragmentos ricos en piroxeno dentro de una ladera de falla.",
      x: 1060,
      y: 760,
      radius: 125,
      mapId: "valles-marineris",
    },
    {
      id: "MAT-VM-2",
      name: "Lente de andesita",
      category: "Mineral",
      description: "Roca volcánica con vetas de andesita y trazas cristalinas.",
      x: 1700,
      y: 1400,
      radius: 130,
      mapId: "valles-marineris",
    },
    {
      id: "MAT-VM-3",
      name: "Manto de yeso",
      category: "Mineral",
      description: "Capa de sulfatos visible sobre la pared del cañón.",
      x: 2330,
      y: 2060,
      radius: 145,
      mapId: "valles-marineris",
    },
  ],
  gale: [
    {
      id: "MAT-GA-1",
      name: "Estrato de hematita",
      category: "Mineral",
      description: "Capa marrón rojiza de hematita formada por capas sedimentarias.",
      x: 1560,
      y: 1040,
      radius: 140,
      mapId: "gale",
    },
    {
      id: "MAT-GA-2",
      name: "Conglomerado de basaltos",
      category: "Roca",
      description: "Piedras brechosas con gran proporción de basalto.",
      x: 2100,
      y: 1550,
      radius: 125,
      mapId: "gale",
    },
    {
      id: "MAT-GA-3",
      name: "Núcleo de arcillas",
      category: "Mineral",
      description: "Depósito arcilloso de capas finas junto al talud montañoso.",
      x: 2460,
      y: 1920,
      radius: 150,
      mapId: "gale",
    },
  ],
} as const;

const segLen = (a: Waypoint, b: Waypoint) => Math.hypot(b.x - a.x, b.y - a.y);

let ACTIVE_MAP_ID: MissionMapId = "jezero";
let ACTIVE_ROUTE_INDEX = ROUTE_VARIANTS.jezero.defaultRouteIndex;

export let ROUTE: Waypoint[] = ROUTE_VARIANTS[ACTIVE_MAP_ID].routeVariants[ACTIVE_ROUTE_INDEX];
export let ROUTE_LENGTH = ROUTE.slice(1).reduce((s, wp, i) => s + segLen(waypointAt(i), wp), 0);

export function getCurrentMap(): MissionMapDefinition {
  return ROUTE_VARIANTS[ACTIVE_MAP_ID] ?? ROUTE_VARIANTS.jezero;
}

export function setActiveMap(mapId: MissionMapId, routeIndex = 0) {
  const map = ROUTE_VARIANTS[mapId] ?? ROUTE_VARIANTS.jezero;
  const safeIndex = Math.min(map.routeVariants.length - 1, Math.max(0, routeIndex));
  ACTIVE_MAP_ID = map.id;
  ACTIVE_ROUTE_INDEX = safeIndex;
  ROUTE = map.routeVariants[safeIndex];
  ROUTE_LENGTH = ROUTE.slice(1).reduce((s, wp, i) => s + segLen(waypointAt(i), wp), 0);
  return map;
}

export function getMissionRoutes(mapId: MissionMapId = ACTIVE_MAP_ID) {
  return ROUTE_VARIANTS[mapId]?.routeVariants ?? ROUTE_VARIANTS.jezero.routeVariants;
}

export function getMaterialTargets(mapId: MissionMapId = ACTIVE_MAP_ID) {
  return MATERIAL_NODES[mapId] ?? MATERIAL_NODES.jezero;
}

export function findNearbyMaterial(x: number, y: number, mapId: MissionMapId = ACTIVE_MAP_ID) {
  return getMaterialTargets(mapId).find((node) => distance(x, y, node.x, node.y) <= node.radius) ?? null;
}

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
