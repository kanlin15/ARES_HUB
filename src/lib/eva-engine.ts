// Pure EVA simulation: state, commands and a time step. Shared by the visor and mission control.
import {
  bearing,
  contextAt,
  distance,
  INITIAL_TELEMETRY,
  MAP_BOUNDS,
  ROUTE,
  WAYPOINT_REACH,
  waypointAt,
  wrap180,
  wrap360,
  type Telemetry,
} from "./mission";

export const WALK_SPEED = 1.1; // m/s on flat ground
export const TURN_RATE = 70; // deg per real second
export const VIEW_FOV = 70; // degrees shown as the view cone on maps

export interface MoveInput {
  forward: number; // -1..1
  turn: number; // -1..1 (positive = clockwise)
  strafe: number; // -1..1 (positive = right)
}

export interface CrewMessage {
  id: string;
  text: string;
  sentAt: number;
  receivedAt: number | null;
}

export interface EvaState {
  running: boolean;
  autopilot: boolean;
  speed: number;
  missionTime: number;
  x: number;
  y: number;
  /** Body heading, 0 = north. */
  heading: number;
  /** Head/visor offset relative to the body, degrees. */
  lookOffset: number;
  lookPitch: number;
  walked: number;
  nextIndex: number;
  finished: boolean;
  moving: boolean;
  telemetry: Telemetry;
  o2Rate: number;
  stormUntil: number;
  env: { dust: number; extTemp: number; wind: number };
  input: MoveInput;
  acked: string[];
  message: CrewMessage | null;
  noiseAcc: number;
}

export type Command =
  | { type: "setRunning"; value: boolean }
  | { type: "setAutopilot"; value: boolean }
  | { type: "setSpeed"; value: number }
  | { type: "input"; value: MoveInput }
  | { type: "look"; offset: number; pitch: number }
  | { type: "centerView" }
  | { type: "storm" }
  | { type: "refill" }
  | { type: "reset" }
  | { type: "ack"; id: string }
  | { type: "message"; id: string; text: string; sentAt: number }
  | { type: "messageReceived"; at: number };

const NO_INPUT: MoveInput = { forward: 0, turn: 0, strafe: 0 };

export const INITIAL_EVA: EvaState = {
  running: false,
  autopilot: false,
  speed: 10,
  missionTime: 0,
  x: 0,
  y: 0,
  heading: bearing(0, 0, waypointAt(1).x, waypointAt(1).y),
  lookOffset: 0,
  lookPitch: 0,
  walked: 0,
  nextIndex: 1,
  finished: false,
  moving: false,
  telemetry: INITIAL_TELEMETRY,
  o2Rate: 0.0018,
  stormUntil: 0,
  env: { dust: 0.42, extTemp: -63, wind: 7 },
  input: NO_INPUT,
  acked: [],
  message: null,
  noiseAcc: 0,
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const rad = (d: number) => (d * Math.PI) / 180;

export const isStorm = (s: EvaState) => s.missionTime < s.stormUntil;
export const viewYaw = (s: EvaState) => wrap360(s.heading + s.lookOffset);

export function applyCommand(s: EvaState, c: Command): EvaState {
  switch (c.type) {
    case "setRunning":
      return { ...s, running: c.value, autopilot: c.value ? s.autopilot : false, moving: c.value && s.moving };
    case "setAutopilot":
      return { ...s, autopilot: c.value && !s.finished, running: c.value ? true : s.running };
    case "setSpeed":
      return { ...s, speed: c.value };
    case "input":
      return { ...s, input: c.value };
    case "look":
      return { ...s, lookOffset: wrap180(c.offset), lookPitch: clamp(c.pitch, -25, 25) };
    case "centerView":
      return { ...s, lookOffset: 0, lookPitch: 0 };
    case "storm":
      return { ...s, stormUntil: s.missionTime + 300, telemetry: { ...s.telemetry, radiation: 128 } };
    case "refill":
      return { ...s, telemetry: { ...s.telemetry, oxygen: 100, battery: 100, water: 100 } };
    case "reset":
      return { ...INITIAL_EVA, speed: s.speed };
    case "ack":
      return s.acked.includes(c.id) ? s : { ...s, acked: [...s.acked, c.id] };
    case "message":
      return { ...s, message: { id: c.id, text: c.text, sentAt: c.sentAt, receivedAt: null } };
    case "messageReceived":
      return s.message ? { ...s, message: { ...s.message, receivedAt: c.at } } : s;
  }
}

/** Advance the simulation by `dtReal` real seconds. Returns the same object when nothing changes. */
export function step(s: EvaState, dtReal: number, rnd: () => number = Math.random): EvaState {
  const walkingInput = s.input.forward !== 0 || s.input.strafe !== 0;
  const manual = walkingInput || s.input.turn !== 0;
  if (!s.running && !manual) return s.moving ? { ...s, moving: false } : s;

  const simDt = dtReal * s.speed;
  let { x, y, heading, nextIndex, walked, autopilot, finished } = s;
  const ctx = contextAt(x, y);
  const walkSpeed = WALK_SPEED / (1 + ctx.slope / 20);

  heading = wrap360(heading + s.input.turn * TURN_RATE * dtReal);
  let dx = 0;
  let dy = 0;
  if (walkingInput) {
    autopilot = false;
    const h = rad(heading);
    const f = s.input.forward * walkSpeed * simDt;
    const st = s.input.strafe * walkSpeed * 0.6 * simDt;
    dx = Math.sin(h) * f + Math.cos(h) * st;
    dy = Math.cos(h) * f - Math.sin(h) * st;
  } else if (autopilot && !finished) {
    const t = waypointAt(nextIndex);
    const b = bearing(x, y, t.x, t.y);
    heading = wrap360(heading + wrap180(b - heading) * Math.min(1, dtReal * 5));
    const d = Math.min(walkSpeed * simDt, distance(x, y, t.x, t.y));
    dx = Math.sin(rad(b)) * d;
    dy = Math.cos(rad(b)) * d;
  }

  x = clamp(x + dx, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
  y = clamp(y + dy, MAP_BOUNDS.minY, MAP_BOUNDS.maxY);
  const moved = Math.hypot(dx, dy);
  walked += moved;

  while (!finished && distance(x, y, waypointAt(nextIndex).x, waypointAt(nextIndex).y) < WAYPOINT_REACH) {
    if (nextIndex >= ROUTE.length - 1) {
      finished = true;
      autopilot = false;
    } else nextIndex++;
  }

  const moving = moved > 0;
  const exertion = moving ? 1 + ctx.slope / 18 : 0.75;
  const o2Rate = 0.0025 * exertion;
  const storm = isStorm(s);
  const t = s.telemetry;

  // Noisy sensors update once per real second; consumables integrate continuously.
  let noiseAcc = s.noiseAcc + dtReal;
  const noisy = noiseAcc >= 1;
  if (noisy) noiseAcc = 0;
  const j = (n: number) => (noisy ? (rnd() - 0.5) * n : 0);
  const ease = Math.min(1, dtReal * 0.6);

  const telemetry: Telemetry = {
    oxygen: clamp(t.oxygen - o2Rate * simDt, 0, 100),
    battery: clamp(t.battery - 0.0018 * exertion * simDt - (storm ? 0.002 * simDt : 0), 0, 100),
    water: clamp(t.water - 0.0012 * exertion * simDt, 0, 100),
    pressure: clamp(noisy ? 29.6 + j(0.25) - (t.oxygen < 10 ? 2 : 0) : t.pressure, 20, 32),
    radiation: clamp(noisy ? (storm ? 135 : 24) + j(storm ? 25 : 6) : t.radiation, 0, 200),
    heartRate: clamp(t.heartRate + ((moving ? 75 + ctx.slope * 3.2 : 72) - t.heartRate) * ease + j(4), 50, 200),
    suitTemp: clamp(t.suitTemp + ((moving ? 20.5 + ctx.slope * 0.22 : 20.5) - t.suitTemp) * ease * 0.5 + j(0.2), 10, 36),
  };

  const env = noisy
    ? {
        dust: clamp(s.env.dust + (0.42 - s.env.dust) * 0.2 + j(0.04), 0.1, 2),
        extTemp: Math.round(clamp(s.env.extTemp + (-63 - s.env.extTemp) * 0.2 + j(3), -110, 0)),
        wind: Math.round(clamp(s.env.wind + (7 - s.env.wind) * 0.2 + j(2), 0, 40)),
      }
    : s.env;

  return {
    ...s,
    running: true,
    x,
    y,
    heading,
    walked,
    nextIndex,
    finished,
    autopilot,
    moving,
    missionTime: s.missionTime + simDt,
    telemetry,
    o2Rate,
    env,
    noiseAcc,
  };
}
