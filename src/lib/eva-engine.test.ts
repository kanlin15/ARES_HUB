import { describe, expect, it } from "vitest";
import { computeAlerts } from "./alerts";
import { applyCommand, INITIAL_EVA, step } from "./eva-engine";
import { contextAt, waypointAt } from "./mission";

const still = () => 0.5;

describe("live movement", () => {
  it("walks forward along the heading while W is held", () => {
    let s = { ...INITIAL_EVA, heading: 0, speed: 1 };
    s = applyCommand(s, { type: "input", value: { forward: 1, turn: 0, strafe: 0 } });
    s = step(s, 1, still);
    expect(s.y).toBeGreaterThan(0.5);
    expect(s.x).toBeCloseTo(0);
    expect(s.running).toBe(true);
  });
  it("turning changes heading but does not move the astronaut", () => {
    let s = applyCommand(INITIAL_EVA, { type: "input", value: { forward: 0, turn: 1, strafe: 0 } });
    s = step(s, 1, still);
    expect(s.heading).not.toBe(INITIAL_EVA.heading);
    expect(s.x).toBe(0);
    expect(s.y).toBe(0);
  });
  it("manual walking cancels the autopilot", () => {
    let s = applyCommand(INITIAL_EVA, { type: "setAutopilot", value: true });
    s = applyCommand(s, { type: "input", value: { forward: 1, turn: 0, strafe: 0 } });
    expect(step(s, 0.1, still).autopilot).toBe(false);
  });
  it("Reabastecer refills oxygen, battery and water to 100%", () => {
    const low = { ...INITIAL_EVA, telemetry: { ...INITIAL_EVA.telemetry, oxygen: 12, battery: 9, water: 20 } };
    const t = applyCommand(low, { type: "refill" }).telemetry;
    expect([t.oxygen, t.battery, t.water]).toEqual([100, 100, 100]);
  });
});

describe("terrain alerts", () => {
  it("the WP-4 segment reads 32° extreme danger", () => {
    const wp4 = waypointAt(4);
    expect(contextAt(wp4.x - 10, wp4.y - 20).slope).toBe(32);
  });
  it("warns when more than 150 m off the route", () => {
    const ids = computeAlerts(INITIAL_EVA.telemetry, contextAt(-300, 300)).map((a) => a.id);
    expect(ids).toContain("off-route");
    expect(computeAlerts(INITIAL_EVA.telemetry, contextAt(0, 0)).map((a) => a.id)).not.toContain("off-route");
  });
});
