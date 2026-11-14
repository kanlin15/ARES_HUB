import { describe, expect, it } from "vitest";
import { DEFAULT_HUD_LAYOUT, isHudPanelVisible } from "./visor-layout";

describe("visor HUD layout", () => {
  it("keeps route and vital panels visible in compact mode", () => {
    expect(isHudPanelVisible("route", DEFAULT_HUD_LAYOUT, true)).toBe(true);
    expect(isHudPanelVisible("alerts", DEFAULT_HUD_LAYOUT, true)).toBe(true);
    expect(isHudPanelVisible("supportVital", DEFAULT_HUD_LAYOUT, true)).toBe(true);
  });

  it("allows turning specific panels off in full layout", () => {
    expect(isHudPanelVisible("materials", { ...DEFAULT_HUD_LAYOUT, materials: false }, false)).toBe(false);
    expect(isHudPanelVisible("map", { ...DEFAULT_HUD_LAYOUT, map: false }, false)).toBe(false);
  });
});
