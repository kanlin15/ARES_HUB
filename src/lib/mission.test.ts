import { describe, expect, it } from "vitest";
import { positionAt, resourceStatus, ROUTE, ROUTE_LENGTH, slopeLevel } from "./mission";

describe("slope risk", () => {
  it("flags 32° (Olympus Mons basal scarp) as extreme danger", () => {
    expect(slopeLevel(32)).toEqual({ status: "critico", label: "PELIGRO EXTREMO" });
  });
  it("treats gentle terrain under 15° as safe", () => {
    expect(slopeLevel(14).status).toBe("nominal");
  });
});

describe("resource alert monitor", () => {
  it("warns on oxygen at 40% and goes critical at 20%", () => {
    expect(resourceStatus("oxygen", 41)).toBe("nominal");
    expect(resourceStatus("oxygen", 40)).toBe("advertencia");
    expect(resourceStatus("oxygen", 20)).toBe("critico");
  });
  it("warns on battery at 35% and goes critical at 15%", () => {
    expect(resourceStatus("battery", 35)).toBe("advertencia");
    expect(resourceStatus("battery", 15)).toBe("critico");
  });
  it("treats high radiation as the danger direction", () => {
    expect(resourceStatus("radiation", 24)).toBe("nominal");
    expect(resourceStatus("radiation", 100)).toBe("critico");
  });
});

describe("route position", () => {
  it("starts at the habitat and ends at the last waypoint", () => {
    expect(positionAt(0).x).toBe(0);
    const end = positionAt(ROUTE_LENGTH);
    expect(end.finished).toBe(true);
    expect(end.x).toBeCloseTo(ROUTE[ROUTE.length - 1].x);
  });
});
