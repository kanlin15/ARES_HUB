export type HudPanelKey = "alerts" | "supportVital" | "route" | "materials" | "map" | "comms" | "compass";

export type HudLayout = Record<HudPanelKey, boolean>;

export const DEFAULT_HUD_LAYOUT: HudLayout = {
  alerts: true,
  supportVital: true,
  route: true,
  materials: true,
  map: true,
  comms: true,
  compass: true,
};

export const HUD_PANEL_OPTIONS = [
  { key: "alerts", label: "Alertas" },
  { key: "supportVital", label: "Soporte vital" },
  { key: "route", label: "Ruta" },
  { key: "materials", label: "Materiales" },
  { key: "map", label: "Mapa" },
  { key: "comms", label: "Comunicaciones" },
  { key: "compass", label: "Brújula" },
] as const;

const FIXED_COMPACT_PANELS: HudPanelKey[] = ["alerts", "route", "supportVital"];

export function isHudPanelVisible(panel: HudPanelKey, layout: HudLayout, compactMode: boolean) {
  if (compactMode) {
    return FIXED_COMPACT_PANELS.includes(panel);
  }

  return layout[panel];
}
