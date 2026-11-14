// Simulated EVA: walks the route and evolves life-support telemetry once per second.
import { useCallback, useEffect, useRef, useState } from "react";
import { INITIAL_TELEMETRY, positionAt, type Telemetry } from "@/lib/mission";

const WALK_SPEED = 1.1; // m/s on flat ground
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const jitter = (n: number) => (Math.random() - 0.5) * n;

export function useEvaSim() {
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(10);
  const [missionTime, setMissionTime] = useState(0);
  const [distance, setDistance] = useState(0);
  const [telemetry, setTelemetry] = useState<Telemetry>(INITIAL_TELEMETRY);
  const [stormUntil, setStormUntil] = useState(0);
  const [o2Rate, setO2Rate] = useState(0.0025);

  const state = useRef({ distance, missionTime, stormUntil, speed, running });
  state.current = { distance, missionTime, stormUntil, speed, running };

  useEffect(() => {
    const id = window.setInterval(() => {
      const s = state.current;
      if (!s.running) return;
      const dt = s.speed; // simulated seconds per real second
      const pos = positionAt(s.distance);
      if (pos.finished) {
        setRunning(false);
        return;
      }
      const exertion = 1 + pos.slope / 18; // steeper terrain = more effort
      const walk = (WALK_SPEED / (1 + pos.slope / 20)) * dt;
      const storm = s.missionTime < s.stormUntil;
      const rate = 0.0025 * exertion; // % O2 per simulated second
      setO2Rate(rate);
      setDistance((d) => d + walk);
      setMissionTime((t) => t + dt);
      setTelemetry((t) => ({
        oxygen: clamp(t.oxygen - rate * dt, 0, 100),
        battery: clamp(t.battery - 0.0018 * exertion * dt - (storm ? 0.002 * dt : 0), 0, 100),
        water: clamp(t.water - 0.0012 * exertion * dt, 0, 100),
        pressure: clamp(29.6 + jitter(0.25) - (t.oxygen < 10 ? 2 : 0), 20, 32),
        radiation: clamp((storm ? 135 : 24) + jitter(storm ? 25 : 6), 0, 200),
        heartRate: clamp(t.heartRate + (70 + pos.slope * 3.2 - t.heartRate) * 0.15 + jitter(4), 50, 200),
        suitTemp: clamp(t.suitTemp + (20.5 + pos.slope * 0.22 - t.suitTemp) * 0.1 + jitter(0.2), 10, 36),
      }));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const triggerStorm = useCallback(() => {
    setStormUntil(state.current.missionTime + 300);
    setTelemetry((t) => ({ ...t, radiation: 128 }));
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setMissionTime(0);
    setDistance(0);
    setStormUntil(0);
    setTelemetry(INITIAL_TELEMETRY);
  }, []);

  const position = positionAt(distance);
  const stormActive = missionTime < stormUntil;

  return {
    running,
    setRunning,
    speed,
    setSpeed,
    missionTime,
    distance,
    position,
    telemetry,
    o2Rate,
    stormActive,
    triggerStorm,
    reset,
  };
}
